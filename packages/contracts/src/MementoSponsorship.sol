// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// Timestamp comparisons implement second-based deadlines, not randomness or exact scheduling.
// forge-lint: disable-start(block-timestamp)

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ClaimAuthorization} from "./ClaimAuthorization.sol";
import {IEnsRegistry} from "./interfaces/IEnsV2.sol";

/// @title Memento sponsorship escrow
/// @notice Escrows token budgets for individual ENS name gifts.
/// @dev Registration pays the registrar directly; unused funds return to the sponsor.
abstract contract MementoSponsorship is ClaimAuthorization, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Funding and registration limits for a gift.
    /// @param maxPrice Per-gift deposit and release ceiling in raw payment-token units.
    /// @param expiresAt Inclusive Unix timestamp in seconds for reservation and release.
    /// @param duration Registration duration in seconds.
    /// @param minLength Minimum normalized label length.
    /// @param maxLength Maximum normalized label length.
    struct Policy {
        uint96 maxPrice;
        uint64 expiresAt;
        uint64 duration;
        uint8 minLength;
        uint8 maxLength;
    }

    /// @notice Gift lifecycle; Complete and Refunded are terminal.
    /// @dev Ready may be registered or cancelled.
    ///      An unclaimed gift may be refunded after expiry.
    enum Status {
        None,
        Ready,
        Complete,
        Refunded
    }

    /// @notice Escrow accounting and signed destination for one gift.
    /// @param sponsor Depositor and sole refund destination.
    /// @param claimHash Keccak-256 of the 32-byte claim secret.
    /// @param recipientId HMAC of the verified recipient email.
    /// @param policy Budget and claim policy.
    /// @param metadataHash Opaque offchain metadata commitment; committed by the sender.
    /// @param recipient Reserved recipient; zero until reservation.
    /// @param labelhash Reserved normalized label hash.
    /// @param remaining Unreleased token balance refundable to the sponsor.
    /// @param status Current lifecycle state.
    struct Gift {
        address sponsor;
        bytes32 claimHash;
        bytes32 recipientId;
        Policy policy;
        bytes32 metadataHash;
        address recipient;
        bytes32 labelhash;
        uint96 remaining;
        Status status;
    }

    /// @notice Token accepted for deposits and funding; deposits must arrive without transfer fees.
    // Preserve the existing public getter ABI.
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IERC20 public immutable paymentToken;
    /// @notice ENS registry used to verify recipient ownership on completion.
    // Preserve the existing public getter ABI.
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IEnsRegistry public immutable registry;
    /// @notice Individual gifts, keyed by ID.
    mapping(bytes32 => Gift) public gifts;
    /// @notice An individual gift was fully funded.
    /// @param id Gift ID.
    /// @param sponsor Depositor.
    /// @param amount Received payment-token units.
    event GiftCreated(bytes32 indexed id, address indexed sponsor, uint256 amount);
    /// @notice Registry ownership was verified and remaining funds refunded.
    /// @param id Completed gift ID.
    event Completed(bytes32 indexed id);
    /// @notice Escrow funds were returned; amount may be zero after full release.
    /// @param id Gift ID.
    /// @param sponsor Refund destination.
    /// @param amount Refunded payment-token units.
    event Refunded(bytes32 indexed id, address indexed sponsor, uint256 amount);

    /// @notice Creates an escrow with fixed ENS dependencies and payment token.
    /// @param token_ Accepted token.
    /// @param registry_ ENS registry.
    /// @param owner_ Administrator for two-step ownership and coordinator rotation.
    /// @param coordinator_ Initial email attestation signer.
    constructor(IERC20 token_, IEnsRegistry registry_, address owner_, address coordinator_)
        ClaimAuthorization("MementoSponsorship", owner_, coordinator_)
    {
        if (address(token_) == address(0) || address(registry_) == address(0)) {
            revert InvalidClaim();
        }

        paymentToken = token_;
        registry = registry_;
    }

    /// @dev Rejects expired, empty or unsupported policy bounds before accepting deposits.
    /// @param p Sponsor policy to validate.
    function _policy(Policy calldata p) private view {
        if (
            p.maxPrice == 0 || p.expiresAt <= block.timestamp || p.duration < 1 days
                || p.minLength < 3 || p.maxLength > 63 || p.minLength > p.maxLength
        ) revert InvalidClaim();
    }

    /// @dev Requires exact receipt so fee-on-transfer tokens cannot undercollateralize gifts.
    /// @param amount Payment-token units to collect from the caller.
    function _pull(uint256 amount) private {
        uint256 beforeBalance = paymentToken.balanceOf(address(this));
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        // Compare the transfer delta, not the total balance, so unsolicited tokens cannot block deposits.
        // forge-lint: disable-next-line(incorrect-strict-equality)
        if (paymentToken.balanceOf(address(this)) - beforeBalance != amount) revert InvalidClaim();
    }

    /// @notice Deposits one full budget for a new individual gift.
    /// @dev Caller must approve paymentToken for policy.maxPrice before calling.
    /// @param id Nonzero unused gift ID, chosen by the sender.
    /// @param claimHash Nonzero hash of a high-entropy 32-byte secret.
    /// @param recipientId Nonzero recipient email identity.
    /// @param policy Sponsor budget and eligibility policy.
    /// @param metadataHash Offchain metadata commitment; not interpreted by the escrow.
    function createGift(
        bytes32 id,
        bytes32 claimHash,
        bytes32 recipientId,
        Policy calldata policy,
        bytes32 metadataHash
    ) external nonReentrant {
        _policy(policy);
        if (recipientId == bytes32(0)) revert InvalidClaim();

        if (id == 0 || claimHash == 0 || gifts[id].status != Status.None) revert InvalidState();

        gifts[id] = Gift({
            sponsor: msg.sender,
            claimHash: claimHash,
            recipientId: recipientId,
            policy: policy,
            metadataHash: metadataHash,
            recipient: address(0),
            labelhash: 0,
            remaining: policy.maxPrice,
            status: Status.Ready
        });

        _pull(policy.maxPrice);

        emit GiftCreated(id, msg.sender, policy.maxPrice);
    }

    /// @notice Cancels an unclaimed gift and returns its full budget to its sponsor.
    /// @param id Ready gift ID owned by the caller.
    function cancel(bytes32 id) external nonReentrant {
        Gift storage g = gifts[id];

        if (g.sponsor != msg.sender || g.status != Status.Ready) revert Unauthorized();

        g.status = Status.Refunded;

        _refund(id, g);
    }

    /// @notice Returns only unreleased funds after expiry; anyone may trigger the refund.
    /// @param id Nonterminal gift whose expiry timestamp has passed.
    function refundExpired(bytes32 id) external nonReentrant {
        Gift storage g = gifts[id];

        if (
            g.status == Status.None || g.status == Status.Complete || g.status == Status.Refunded
                || block.timestamp <= g.policy.expiresAt
        ) revert InvalidState();

        g.status = Status.Refunded;

        _refund(id, g);
    }

    /// @dev Clears accounting before transferring funds to the original sponsor.
    /// @param id Gift ID emitted in the refund event.
    /// @param g Gift whose lifecycle must already be updated by the caller.
    function _refund(bytes32 id, Gift storage g) private {
        uint96 amount = g.remaining;
        g.remaining = 0;

        if (amount > 0) paymentToken.safeTransfer(g.sponsor, amount);

        emit Refunded(id, g.sponsor, amount);
    }
}

// forge-lint: disable-end(block-timestamp)
