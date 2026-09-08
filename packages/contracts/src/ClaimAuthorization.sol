// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

abstract contract ClaimAuthorization is EIP712, Ownable2Step {
    struct Recipient {
        uint8 kind;
        bytes32 id;
    }

    struct Intent {
        bytes32 giftId;
        address recipient;
        address hca;
        address resolver;
        bytes32 labelhash;
        bytes32 nonce;
        uint64 deadline;
    }

    bytes32 public constant INTENT_TYPEHASH = keccak256(
        "ClaimIntent(bytes32 giftId,address recipient,address hca,address resolver,bytes32 labelhash,bytes32 nonce,uint64 deadline)"
    );
    bytes32 private constant AUTH_TYPEHASH =
        keccak256("ClaimAuthorization(bytes32 intentHash,bytes32 recipientId,bool eligible)");
    address public coordinator;
    address public pendingCoordinator;
    uint64 public coordinatorActivation;
    mapping(address => mapping(bytes32 => bool)) public usedNonces;

    error InvalidClaim();
    error Unauthorized();
    error InvalidState();

    event CoordinatorProposed(address indexed next, uint64 activation);
    event CoordinatorChanged(address indexed next);

    constructor(string memory name, address owner_, address coordinator_)
        EIP712(name, "1")
        Ownable(owner_)
    {
        if (coordinator_ == address(0)) revert InvalidClaim();

        coordinator = coordinator_;
    }

    modifier onlyCoordinator() {
        if (msg.sender != coordinator) revert Unauthorized();

        _;
    }

    function proposeCoordinator(address next) external onlyOwner {
        if (next == address(0)) revert InvalidClaim();

        pendingCoordinator = next;
        coordinatorActivation = uint64(block.timestamp + 1 days);

        emit CoordinatorProposed(next, coordinatorActivation);
    }

    function activateCoordinator() external onlyOwner {
        if (pendingCoordinator == address(0) || block.timestamp < coordinatorActivation) {
            revert InvalidState();
        }

        coordinator = pendingCoordinator;
        pendingCoordinator = address(0);

        emit CoordinatorChanged(coordinator);
    }

    function intentDigest(Intent calldata intent) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(INTENT_TYPEHASH, intent)));
    }

    function authorizationDigest(Intent calldata intent, bytes32 recipientId, bool eligible)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(abi.encode(AUTH_TYPEHASH, intentDigest(intent), recipientId, eligible))
        );
    }

    function _validateRecipient(Recipient memory restriction) internal pure {
        if (
            restriction.kind > 2 || (restriction.kind == 0 && restriction.id != bytes32(0))
                || (restriction.kind != 0 && restriction.id == bytes32(0))
        ) revert InvalidClaim();
    }

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

        usedNonces[intent.recipient][intent.nonce] = true;
    }
}
