// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// Timestamp comparisons implement second-based deadlines, not randomness or exact scheduling.
// forge-lint: disable-start(block-timestamp)

import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title Memento claim authorization
/// @notice Verifies recipient consent and coordinator attestations for relayed claims.
/// @dev EIP-712 domains bind signatures to this contract and chain. Supports EOAs and ERC-1271
///      wallets. Email ownership is verified offchain by the coordinator.
abstract contract ClaimAuthorization is EIP712, Ownable2Step {
    /// @notice Recipient-signed claim terms; changing any field invalidates consent.
    /// @param giftId Gift ID.
    /// @param recipient Wallet that signs and ultimately owns the name.
    /// @param resolver Expected resolver address; must be nonzero.
    /// @param labelhash Keccak-256 of the normalized label without the .eth suffix.
    /// @param nonce One-use value scoped to the recipient and this contract.
    /// @param deadline Inclusive Unix timestamp in seconds for accepting this intent.
    struct Intent {
        bytes32 giftId;
        address recipient;
        address resolver;
        bytes32 labelhash;
        bytes32 nonce;
        uint64 deadline;
    }

    /// @notice EIP-712 type hash shared with client-side claim signing.
    bytes32 public constant INTENT_TYPEHASH = keccak256(
        "ClaimIntent(bytes32 giftId,address recipient,address resolver,bytes32 labelhash,bytes32 nonce,uint64 deadline)"
    );
    bytes32 private constant AUTH_TYPEHASH =
        keccak256("ClaimAuthorization(bytes32 intentHash,bytes32 recipientId)");
    /// @notice Current signer of email attestations.
    address public coordinator;
    /// @notice Proposed coordinator, or zero when no rotation is pending.
    address public pendingCoordinator;
    /// @notice Earliest activation time in seconds; meaningful only while a proposal is pending.
    uint64 public coordinatorActivation;
    /// @notice Whether a recipient nonce has been consumed by a successful reservation or claim.
    mapping(address => mapping(bytes32 => bool)) public usedNonces;

    /// @notice Claim input, policy, or configured dependency is invalid.
    error InvalidClaim();
    /// @notice Caller or signature does not satisfy the required authority.
    error Unauthorized();
    /// @notice Current lifecycle state or external ownership prevents this operation.
    error InvalidState();

    /// @notice A coordinator rotation was proposed; subsequent proposals restart the delay.
    /// @param next Proposed coordinator.
    /// @param activation Earliest activation timestamp in seconds.
    event CoordinatorProposed(address indexed next, uint64 activation);
    /// @notice A pending coordinator became active.
    /// @param next Newly active coordinator.
    event CoordinatorChanged(address indexed next);

    /// @dev Initializes the EIP-712 domain and two-step ownership.
    /// @param name Domain name for the concrete escrow.
    /// @param owner_ Initial administrator; must be nonzero.
    /// @param coordinator_ Initial email attestation signer; must be nonzero.
    constructor(string memory name, address owner_, address coordinator_)
        EIP712(name, "1")
        Ownable(owner_)
    {
        if (coordinator_ == address(0)) revert InvalidClaim();

        coordinator = coordinator_;
    }

    /// @notice Proposes a nonzero coordinator with a one-day activation delay.
    /// @dev Only the owner may propose; replacing a pending proposal restarts the delay.
    /// @param next Address to activate after the delay.
    function proposeCoordinator(address next) external onlyOwner {
        if (next == address(0)) revert InvalidClaim();

        pendingCoordinator = next;
        coordinatorActivation = SafeCast.toUint64(block.timestamp + 1 days);

        emit CoordinatorProposed(next, coordinatorActivation);
    }

    /// @notice Activates the pending coordinator after its delay; callable only by the owner.
    /// @dev Future attestations must validate against the new coordinator, including old intents.
    function activateCoordinator() external onlyOwner {
        if (pendingCoordinator == address(0) || block.timestamp < coordinatorActivation) {
            revert InvalidState();
        }

        // CoordinatorChanged below records the new access-control authority.
        // forge-lint: disable-next-line(missing-events-access-control)
        coordinator = pendingCoordinator;
        pendingCoordinator = address(0);

        emit CoordinatorChanged(coordinator);
    }

    /// @notice Returns the EIP-712 digest the recipient must sign.
    /// @param intent Complete claim terms.
    /// @return Digest bound to this escrow and chain.
    function intentDigest(Intent calldata intent) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(INTENT_TYPEHASH, intent)));
    }

    /// @notice Returns the digest for a coordinator email attestation.
    /// @param intent Recipient claim being attested.
    /// @param recipientId Restriction ID committed by the sponsor.
    /// @return Digest that cannot be reused for different claim terms or attestation purposes.
    function authorizationDigest(Intent calldata intent, bytes32 recipientId)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(abi.encode(AUTH_TYPEHASH, intentDigest(intent), recipientId))
        );
    }

    /// @dev Validates consent and the email attestation, then consumes the recipient nonce.
    ///      Callers must validate gift state and bind the intent to the stored gift first.
    /// @param intent Signed claim terms.
    /// @param recipientId Stored recipient email identity.
    /// @param signature Recipient EOA or ERC-1271 signature over intentDigest.
    /// @param recipientAuthorization Coordinator signature attesting to the recipient email.
    function _authorize(
        Intent calldata intent,
        bytes32 recipientId,
        bytes calldata signature,
        bytes calldata recipientAuthorization
    ) internal {
        if (
            intent.recipient == address(0) || intent.resolver == address(0)
                || intent.deadline < block.timestamp || usedNonces[intent.recipient][intent.nonce]
        ) revert InvalidClaim();

        if (!SignatureChecker.isValidSignatureNow(
                intent.recipient, intentDigest(intent), signature
            )) revert Unauthorized();

        if (!SignatureChecker.isValidSignatureNow(
                coordinator, authorizationDigest(intent, recipientId), recipientAuthorization
            )) revert Unauthorized();

        // Any subsequent escrow failure reverts nonce consumption with the rest of the claim.
        usedNonces[intent.recipient][intent.nonce] = true;
    }
}

// forge-lint: disable-end(block-timestamp)
