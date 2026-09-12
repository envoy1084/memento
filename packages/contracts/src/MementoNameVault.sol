// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// Timestamp comparisons implement second-based deadlines, not randomness or exact scheduling.
// forge-lint: disable-start(block-timestamp)

import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ClaimAuthorization} from "./ClaimAuthorization.sol";
import {IEnsRegistry, IVerifiableFactory, IPermissionedResolver} from "./interfaces/IEnsV2.sol";

/// @title Memento existing-name vault
/// @notice Holds ENSv2 names for a named recipient and atomically installs a fresh resolver on claim.
/// @dev Accepts only prepared single-token deposits with no competing token-level delegates.
///      Claims and expiry recovery transfer the current registry token ID, not a cached version.
contract MementoNameVault is ClaimAuthorization, IERC1155Receiver, ReentrancyGuard {
    /// @notice Gift lifecycle; deposited names can be claimed or recovered after expiry.
    /// @dev Complete and Recovered are terminal; a preparation alone does not establish custody.
    enum Status {
        None,
        Prepared,
        Deposited,
        Complete,
        Recovered
    }

    /// @notice Sponsor commitments for an existing-name gift.
    /// @param labelhash Keccak-256 of the normalized label without .eth.
    /// @param claimHash Keccak-256 of the 32-byte claim secret.
    /// @param restriction Wallet or email restriction; bearer gifts are rejected.
    /// @param recordsHash Keccak-256 of ABI-encoded TextRecord[] in the exact claim order.
    /// @param expiresAt Inclusive Unix timestamp in seconds for depositing and claiming.
    /// @param worldRequired Whether the coordinator must attest to recipient World ID eligibility.
    struct Input {
        bytes32 labelhash;
        bytes32 claimHash;
        Recipient restriction;
        bytes32 recordsHash;
        uint64 expiresAt;
        bool worldRequired;
    }

    /// @notice Prepared gift and custody state.
    /// @param sponsor Preparing owner and sole expiry recovery destination.
    /// @param input Sponsor commitments.
    /// @param status Current lifecycle state.
    struct Gift {
        address sponsor;
        Input input;
        Status status;
    }

    /// @notice Resolver text record included in the sponsor commitment.
    /// @param key ENS text-record key.
    /// @param value Corresponding text value.
    struct TextRecord {
        string key;
        string value;
    }

    /// @notice ENS registry whose single-token transfers are accepted.
    // Preserve the existing public getter ABI.
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IEnsRegistry public immutable registry;
    /// @notice Factory that deploys and certifies the fresh resolver proxy.
    // Preserve the existing public getter ABI.
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IVerifiableFactory public immutable factory;
    /// @notice Fixed implementation required for recipient resolver proxies.
    // Preserve the existing public getter ABI.
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    address public immutable resolverImplementation;
    /// @notice Gift commitments and custody state, keyed by gift ID.
    mapping(bytes32 => Gift) public gifts;
    /// @notice Deposited gift ID for a labelhash; zero when no gift holds that name.
    mapping(bytes32 => bytes32) public activeGift;

    /// @notice A name owner committed gift terms; custody has not yet transferred.
    /// @param id Gift ID.
    /// @param sponsor Preparing owner.
    /// @param labelhash Name label hash.
    event Prepared(bytes32 indexed id, address indexed sponsor, bytes32 labelhash);
    /// @notice The registry transferred the prepared name into verified vault custody.
    /// @param id Gift ID.
    event Deposited(bytes32 indexed id);
    /// @notice A recipient received the name with a fresh resolver.
    /// @param id Gift ID.
    /// @param recipient Final verified owner.
    /// @param resolver Installed resolver controlled by the recipient.
    event Claimed(bytes32 indexed id, address indexed recipient, address resolver);
    /// @notice An expired deposited name was transferred back to its sponsor.
    /// @param id Gift ID.
    /// @param sponsor Recovery transfer destination.
    event Recovered(bytes32 indexed id, address indexed sponsor);

    /// @notice Creates a vault with fixed registry and resolver dependencies.
    /// @param registry_ ENSv2 registry.
    /// @param factory_ Verifiable resolver factory.
    /// @param resolverImplementation_ Permissioned resolver implementation.
    /// @param owner_ Administrator for two-step ownership and coordinator rotation.
    /// @param coordinator_ Initial email and eligibility attestation signer.
    constructor(
        IEnsRegistry registry_,
        IVerifiableFactory factory_,
        address resolverImplementation_,
        address owner_,
        address coordinator_
    ) ClaimAuthorization("MementoNameVault", owner_, coordinator_) {
        if (
            address(registry_) == address(0) || address(factory_) == address(0)
                || resolverImplementation_ == address(0)
        ) revert InvalidClaim();

        registry = registry_;
        factory = factory_;
        resolverImplementation = resolverImplementation_;
    }

    /// @notice Records gift terms for a name currently owned by the caller.
    /// @dev Deposit separately via registry.safeTransferFrom with abi.encode(id) as transfer data.
    ///      Preparation does not lock the name or prevent other preparations.
    /// @param id Nonzero unused gift ID.
    /// @param input Recipient, expiry, secret and record commitments.
    function prepareGift(bytes32 id, Input calldata input) external {
        _validateRecipient(input.restriction);

        // Existing names must identify their recipient; leaked bearer links cannot redirect them.
        if (
            id == 0 || input.claimHash == 0 || input.restriction.kind == 0
                || gifts[id].status != Status.None || input.expiresAt <= block.timestamp
                || registry.getOwner(uint256(input.labelhash)) != msg.sender
        ) revert InvalidClaim();

        // Prepared below records the sponsor bound by this assignment.
        // forge-lint: disable-next-line(missing-events-access-control)
        gifts[id] = Gift({sponsor: msg.sender, input: input, status: Status.Prepared});

        emit Prepared(id, msg.sender, input.labelhash);
    }

    /// @notice Accepts a prepared registry transfer after checking ownership and exclusive roles.
    /// @dev The registry must have updated ownership before invoking this callback. Operator is
    ///      unused: authorization is bound to the registry, original sponsor and current token ID.
    /// @param from Original sponsor transferring the name.
    /// @param tokenId Current versioned registry token ID.
    /// @param value Must equal one.
    /// @param giftData ABI-encoded bytes32 gift ID, exactly 32 bytes.
    /// @return ERC-1155 single-transfer acceptance selector.
    function onERC1155Received(
        address,
        address from,
        uint256 tokenId,
        uint256 value,
        bytes calldata giftData
    ) external returns (bytes4) {
        if (msg.sender != address(registry) || value != 1 || giftData.length != 32) {
            revert InvalidClaim();
        }

        bytes32 id = abi.decode(giftData, (bytes32));
        Gift storage g = gifts[id];

        if (
            g.status != Status.Prepared || from != g.sponsor || block.timestamp > g.input.expiresAt
                || activeGift[g.input.labelhash] != 0
                || registry.getTokenId(uint256(g.input.labelhash)) != tokenId
                || registry.getOwner(uint256(g.input.labelhash)) != address(this)
        ) revert InvalidState();

        uint256 resource = registry.getResource(uint256(g.input.labelhash));
        uint256 ownedRoles = registry.roles(resource, address(this));
        uint256 requiredRoles = (uint256(1) << 24) | (uint256(1) << 156);

        // Reject delegated token authority. Each role count must equal the vault's sole assignment.
        if (
            registry.roleCount(resource) != ownedRoles
                || (ownedRoles & requiredRoles) != requiredRoles
        ) revert InvalidClaim();

        g.status = Status.Deposited;
        activeGift[g.input.labelhash] = id;

        emit Deposited(id);

        return IERC1155Receiver.onERC1155Received.selector;
    }

    /// @notice Rejects all batch deposits; names must be prepared and deposited individually.
    /// @dev Always reverts with InvalidClaim; all callback arguments are unused.
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        revert InvalidClaim();
    }

    /// @notice Reports ERC-165 and ERC-1155 receiver support.
    /// @param id Interface identifier to query.
    /// @return True only for the supported receiver and introspection interfaces.
    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == type(IERC1155Receiver).interfaceId || id == type(IERC165).interfaceId;
    }

    /// @notice Claims a deposited name with a fresh resolver owned solely by the recipient.
    /// @dev Any relayer may submit. Initialization, registry updates and transfer are atomic;
    ///      callback-induced ownership changes revert the entire claim. At most ten text records
    ///      and 63 label bytes are accepted; clients must normalize the label before signing.
    /// @param intent Recipient consent, including the expected factory-derived resolver address.
    /// @param secret Preimage of the committed claim hash.
    /// @param label Normalized label without the .eth suffix.
    /// @param records Exact ordered text records matching the sponsor commitment.
    /// @param signature Recipient signature over intentDigest.
    /// @param recipientAuthorization Coordinator email attestation, or empty for a wallet restriction.
    /// @param eligibility Coordinator World ID attestation, or empty if not required.
    function claimName(
        Intent calldata intent,
        bytes32 secret,
        string calldata label,
        TextRecord[] calldata records,
        bytes calldata signature,
        bytes calldata recipientAuthorization,
        bytes calldata eligibility
    ) external nonReentrant {
        Gift storage g = gifts[intent.giftId];

        if (
            g.status != Status.Deposited || block.timestamp > g.input.expiresAt
                || intent.deadline > g.input.expiresAt
                || g.input.claimHash != keccak256(abi.encodePacked(secret))
                || intent.labelhash != g.input.labelhash
                || keccak256(bytes(label)) != g.input.labelhash || records.length > 10
                || bytes(label).length > 63 || keccak256(abi.encode(records)) != g.input.recordsHash
        ) revert InvalidClaim();

        _authorize(
            intent,
            g.input.restriction,
            g.input.worldRequired,
            signature,
            recipientAuthorization,
            eligibility
        );

        g.status = Status.Complete;
        delete activeGift[g.input.labelhash];

        bytes32 ethNode = keccak256(abi.encodePacked(bytes32(0), keccak256("eth")));
        bytes32 node = keccak256(abi.encodePacked(ethNode, g.input.labelhash));
        bytes[] memory calls = new bytes[](records.length + 1);
        calls[0] = abi.encodeCall(IPermissionedResolver.setAddr, (node, intent.recipient));

        for (uint256 i = 0; i < records.length; i++) {
            calls[i + 1] = abi.encodeCall(
                IPermissionedResolver.setText, (node, records[i].key, records[i].value)
            );
        }

        // Fresh resolver: neither sponsor nor vault receives resolver permissions.
        address resolver = factory.deployProxy(
            resolverImplementation,
            uint256(intent.giftId),
            abi.encodeCall(
                IPermissionedResolver.initialize,
                (
                    intent.recipient,
                    0x1111111111111111111111111111111111111111111111111111111111111111,
                    calls
                )
            )
        );

        if (
            resolver != intent.resolver
                || factory.verifyContract(resolver) != resolverImplementation
        ) revert InvalidClaim();

        registry.setResolver(uint256(g.input.labelhash), resolver);

        registry.safeTransferFrom(
            address(this), intent.recipient, registry.getTokenId(uint256(g.input.labelhash)), 1, ""
        );

        if (registry.getOwner(uint256(g.input.labelhash)) != intent.recipient) {
            revert InvalidState();
        }

        // Emit only after final ownership verification; nonReentrant protects this claim.
        // forge-lint: disable-next-line(reentrancy-events)
        emit Claimed(intent.giftId, intent.recipient, resolver);
    }

    /// @notice Returns an expired deposited name to its original sponsor; anyone may call.
    /// @dev Recovery is available strictly after expiresAt and never redirects to the caller.
    /// @param id Deposited gift ID.
    function recoverExpired(bytes32 id) external nonReentrant {
        Gift storage g = gifts[id];

        if (g.status != Status.Deposited || block.timestamp <= g.input.expiresAt) {
            revert InvalidState();
        }

        // Clear custody bookkeeping before the ERC-1155 recipient callback can run.
        g.status = Status.Recovered;
        delete activeGift[g.input.labelhash];

        registry.safeTransferFrom(
            address(this), g.sponsor, registry.getTokenId(uint256(g.input.labelhash)), 1, ""
        );

        // nonReentrant prevents nested recovery; a failed receiver callback rolls back custody.
        // forge-lint: disable-next-line(reentrancy-events)
        emit Recovered(id, g.sponsor);
    }
}

// forge-lint: disable-end(block-timestamp)
