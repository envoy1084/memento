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
///      wallets. Email ownership and World ID proofs are verified offchain by the coordinator.
abstract contract ClaimAuthorization is EIP712, Ownable2Step {
    /// @notice Restricts who may redeem a claim secret.
    /// @param kind 0 for bearer, 1 for a wallet, 2 for a coordinator-attested email identity.
    /// @param id Zero for bearer, left-padded address for wallet, opaque nonzero ID for email.
    struct Recipient {
        uint8 kind;
        bytes32 id;
    }

    /// @notice Recipient-signed claim terms; changing any field invalidates consent.
    /// @param giftId Gift ID, or the derived campaign invitation ID.
    /// @param recipient Wallet that signs and ultimately owns the name.
    /// @param hca Recipient HCA for sponsorship; unused by the existing-name vault.
    /// @param resolver Expected resolver address; must be nonzero.
    /// @param labelhash Keccak-256 of the normalized label without the .eth suffix.
    /// @param nonce One-use value scoped to the recipient and this contract.
    /// @param deadline Inclusive Unix timestamp in seconds for accepting this intent.
    struct Intent {
        bytes32 giftId;
        address recipient;
        address hca;
        address resolver;
        bytes32 labelhash;
        bytes32 nonce;
        uint64 deadline;
    }

    /// @notice EIP-712 type hash shared with client-side claim signing.
    bytes32 public constant INTENT_TYPEHASH = keccak256(
        "ClaimIntent(bytes32 giftId,address recipient,address hca,address resolver,bytes32 labelhash,bytes32 nonce,uint64 deadline)"
    );
    bytes32 private constant AUTH_TYPEHASH =
        keccak256("ClaimAuthorization(bytes32 intentHash,bytes32 recipientId,bool eligible)");
    /// @notice Current signer of identity/eligibility attestations and sponsorship funding operator.
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
    /// @param coordinator_ Initial attestation signer and funding operator; must be nonzero.
    constructor(string memory name, address owner_, address coordinator_)
        EIP712(name, "1")
        Ownable(owner_)
    {
        if (coordinator_ == address(0)) revert InvalidClaim();

        coordinator = coordinator_;
    }

    /// @dev Restricts sponsorship funding to the active coordinator.
    modifier onlyCoordinator() {
        _checkCoordinator();
        _;
    }

    /// @dev Keeps the authorization check out of the expanded modifier body.
    function _checkCoordinator() private view {
        if (msg.sender != coordinator) revert Unauthorized();
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

    /// @notice Returns the digest for a coordinator identity or eligibility attestation.
    /// @param intent Recipient claim being attested.
    /// @param recipientId Restriction ID committed by the sponsor.
    /// @param eligible False for email ownership, true for the World ID eligibility attestation.
    /// @return Digest that cannot be reused for different claim terms or attestation purposes.
    function authorizationDigest(Intent calldata intent, bytes32 recipientId, bool eligible)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(abi.encode(AUTH_TYPEHASH, intentDigest(intent), recipientId, eligible))
        );
    }

    /// @dev Enforces supported recipient kinds and their zero/nonzero ID convention.
    /// @param restriction Sponsor-selected recipient restriction.
    function _validateRecipient(Recipient memory restriction) internal pure {
        if (
            restriction.kind > 2 || (restriction.kind == 0 && restriction.id != bytes32(0))
                || (restriction.kind != 0 && restriction.id == bytes32(0))
        ) revert InvalidClaim();
    }

    /// @dev Validates consent and optional attestations, then consumes the recipient nonce.
    ///      Callers must validate gift state and bind the intent to the stored gift first.
    /// @param intent Signed claim terms.
    /// @param restriction Stored recipient restriction.
    /// @param worldRequired Whether coordinator-attested World ID eligibility is mandatory.
    /// @param signature Recipient EOA or ERC-1271 signature over intentDigest.
    /// @param recipientAuthorization Coordinator email signature; ignored for other recipient kinds.
    /// @param eligibility Coordinator eligibility signature; ignored when worldRequired is false.
    function _authorize(
        Intent calldata intent,
        Recipient memory restriction,
        bool worldRequired,
        bytes calldata signature,
        bytes calldata recipientAuthorization,
        bytes calldata eligibility
    ) internal {
        if (
            intent.recipient == address(0) || intent.resolver == address(0)
                || intent.deadline < block.timestamp || usedNonces[intent.recipient][intent.nonce]
        ) revert InvalidClaim();

        if (!SignatureChecker.isValidSignatureNow(
                intent.recipient, intentDigest(intent), signature
            )) revert Unauthorized();

        if (restriction.kind == 1 && bytes32(uint256(uint160(intent.recipient))) != restriction.id) revert Unauthorized();

        if (
            restriction.kind == 2
                && !SignatureChecker.isValidSignatureNow(
                    coordinator,
                    authorizationDigest(intent, restriction.id, false),
                    recipientAuthorization
                )
        ) revert Unauthorized();

        if (
            worldRequired
                && !SignatureChecker.isValidSignatureNow(
                    coordinator, authorizationDigest(intent, restriction.id, true), eligibility
                )
        ) revert Unauthorized();

        // Any subsequent escrow failure reverts nonce consumption with the rest of the claim.
        usedNonces[intent.recipient][intent.nonce] = true;
    }
}

// forge-lint: disable-end(block-timestamp)
