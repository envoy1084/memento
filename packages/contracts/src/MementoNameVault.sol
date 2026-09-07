// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ClaimAuthorization} from "./ClaimAuthorization.sol";
import {IEnsRegistry, IVerifiableFactory, IPermissionedResolver} from "./interfaces/IEnsV2.sol";

contract MementoNameVault is ClaimAuthorization, IERC1155Receiver, ReentrancyGuard {
    enum Status {
        None,
        Prepared,
        Deposited,
        Complete,
        Recovered
    }

    struct Input {
        bytes32 labelhash;
        bytes32 claimHash;
        Recipient restriction;
        bytes32 recordsHash;
        uint64 expiresAt;
        bool worldRequired;
    }

    struct Gift {
        address sponsor;
        Input input;
        Status status;
    }

    struct TextRecord {
        string key;
        string value;
    }
    IEnsRegistry public immutable registry;
    IVerifiableFactory public immutable factory;
    address public immutable resolverImplementation;
    mapping(bytes32 => Gift) public gifts;
    mapping(bytes32 => bytes32) public activeGift;
    event Prepared(bytes32 indexed id, address indexed sponsor, bytes32 labelhash);
    event Deposited(bytes32 indexed id);
    event Claimed(bytes32 indexed id, address indexed recipient, address resolver);
    event Recovered(bytes32 indexed id, address indexed sponsor);

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

    function prepareGift(bytes32 id, Input calldata input) external {
        _validateRecipient(input.restriction);
        // Existing names must identify their recipient; leaked bearer links cannot redirect them.
        if (
            id == 0 || input.claimHash == 0 || input.restriction.kind == 0
                || gifts[id].status != Status.None || input.expiresAt <= block.timestamp
                || registry.getOwner(uint256(input.labelhash)) != msg.sender
        ) revert InvalidClaim();
        gifts[id] = Gift(msg.sender, input, Status.Prepared);
        emit Prepared(id, msg.sender, input.labelhash);
    }

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

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        revert InvalidClaim();
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == type(IERC1155Receiver).interfaceId || id == type(IERC165).interfaceId;
    }

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
        bytes memory dnsName = abi.encodePacked(uint8(bytes(label).length), label, hex"0365746800");
        bytes[] memory calls = new bytes[](records.length + 1);
        calls[0] = abi.encodeCall(
            IPermissionedResolver.setAddress, (dnsName, 60, abi.encodePacked(intent.recipient))
        );
        for (uint256 i; i < records.length; i++) {
            calls[i + 1] = abi.encodeCall(
                IPermissionedResolver.setText, (dnsName, records[i].key, records[i].value)
            );
        }
        IPermissionedResolver.Grant[] memory grants = new IPermissionedResolver.Grant[](1);
        // Fresh resolver: neither sponsor nor vault ever receives resolver permissions.
        grants[0] = IPermissionedResolver.Grant(
            intent.recipient, 0x1111111111111111111111111111111111111111111111111111111111111111
        );
        address resolver = factory.deployProxy(
            resolverImplementation,
            uint256(intent.giftId),
            abi.encodeCall(IPermissionedResolver.initialize, (grants, calls))
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
        emit Claimed(intent.giftId, intent.recipient, resolver);
    }

    function recoverExpired(bytes32 id) external nonReentrant {
        Gift storage g = gifts[id];
        if (g.status != Status.Deposited || block.timestamp <= g.input.expiresAt) {
            revert InvalidState();
        }
        g.status = Status.Recovered;
        delete activeGift[g.input.labelhash];
        registry.safeTransferFrom(
            address(this), g.sponsor, registry.getTokenId(uint256(g.input.labelhash)), 1, ""
        );
        emit Recovered(id, g.sponsor);
    }
}
