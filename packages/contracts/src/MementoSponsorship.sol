// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ClaimAuthorization} from "./ClaimAuthorization.sol";
import {IEnsRegistry, IHcaFactory} from "./interfaces/IEnsV2.sol";

contract MementoSponsorship is ClaimAuthorization, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Policy {
        uint96 maxPrice;
        uint64 expiresAt;
        uint64 duration;
        uint8 minLength;
        uint8 maxLength;
        bool worldRequired;
    }
    enum Status {
        None,
        Ready,
        Reserved,
        Funded,
        Complete,
        Refunded
    }

    struct Gift {
        address sponsor;
        bytes32 claimHash;
        Recipient restriction;
        Policy policy;
        bytes32 metadataHash;
        address recipient;
        address hca;
        bytes32 labelhash;
        uint96 remaining;
        Status status;
    }

    struct Campaign {
        address sponsor;
        bytes32 root;
        Policy policy;
        uint32 count;
        uint32 reserved;
        uint256 available;
        bool closed;
    }
    IERC20 public immutable paymentToken;
    IHcaFactory public immutable hcaFactory;
    IEnsRegistry public immutable registry;
    mapping(bytes32 => Gift) public gifts;
    mapping(bytes32 => Campaign) public campaigns;
    mapping(bytes32 => mapping(uint32 => bool)) public invitationsUsed;
    event GiftCreated(bytes32 indexed id, address indexed sponsor, uint256 amount);
    event CampaignCreated(
        bytes32 indexed id, address indexed sponsor, bytes32 root, uint256 amount
    );
    event Reserved(bytes32 indexed id, address indexed recipient, address hca, bytes32 labelhash);
    event Released(bytes32 indexed id, address indexed hca, uint96 amount);
    event Completed(bytes32 indexed id);
    event Refunded(bytes32 indexed id, address indexed sponsor, uint256 amount);

    constructor(
        IERC20 token_,
        IHcaFactory factory_,
        IEnsRegistry registry_,
        address owner_,
        address coordinator_
    ) ClaimAuthorization("MementoSponsorship", owner_, coordinator_) {
        if (
            address(token_) == address(0) || address(factory_) == address(0)
                || address(registry_) == address(0)
        ) revert InvalidClaim();
        paymentToken = token_;
        hcaFactory = factory_;
        registry = registry_;
    }

    function _policy(Policy calldata p) private view {
        if (
            p.maxPrice == 0 || p.expiresAt <= block.timestamp || p.duration < 1 days
                || p.minLength < 3 || p.maxLength > 63 || p.minLength > p.maxLength
        ) revert InvalidClaim();
    }

    function _pull(uint256 amount) private {
        uint256 beforeBalance = paymentToken.balanceOf(address(this));
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        if (paymentToken.balanceOf(address(this)) - beforeBalance != amount) revert InvalidClaim();
    }

    function createGift(
        bytes32 id,
        bytes32 claimHash,
        Recipient calldata restriction,
        Policy calldata policy,
        bytes32 metadataHash
    ) external nonReentrant {
        _policy(policy);
        _validateRecipient(restriction);
        if (
            id == 0 || claimHash == 0 || gifts[id].status != Status.None
                || campaigns[id].sponsor != address(0)
        ) revert InvalidState();
        gifts[id] = Gift(
            msg.sender,
            claimHash,
            restriction,
            policy,
            metadataHash,
            address(0),
            address(0),
            0,
            policy.maxPrice,
            Status.Ready
        );
        _pull(policy.maxPrice);
        emit GiftCreated(id, msg.sender, policy.maxPrice);
    }

    function createCampaign(bytes32 id, bytes32 root, uint32 count, Policy calldata policy)
        external
        nonReentrant
    {
        _policy(policy);
        if (
            id == 0 || root == 0 || count == 0 || count > 500 || campaigns[id].sponsor != address(0)
                || gifts[id].status != Status.None
        ) revert InvalidState();
        uint256 amount = uint256(policy.maxPrice) * count;
        campaigns[id] = Campaign(msg.sender, root, policy, count, 0, amount, false);
        _pull(amount);
        emit CampaignCreated(id, msg.sender, root, amount);
    }

    function campaignClaimId(bytes32 id, uint32 index) public pure returns (bytes32) {
        return keccak256(abi.encode(id, index));
    }

    function invitationLeaf(uint32 index, bytes32 claimHash, Recipient calldata restriction)
        public
        pure
        returns (bytes32)
    {
        // Double hashing separates leaves from internal nodes.
        return keccak256(
            bytes.concat(keccak256(abi.encode(index, claimHash, restriction.kind, restriction.id)))
        );
    }

    function reserveGift(
        Intent calldata intent,
        bytes32 secret,
        bytes calldata signature,
        bytes calldata recipientAuthorization,
        bytes calldata eligibility
    ) external nonReentrant {
        Gift storage g = gifts[intent.giftId];
        if (g.status != Status.Ready || g.claimHash != keccak256(abi.encodePacked(secret))) {
            revert InvalidState();
        }
        _reserve(g, intent, signature, recipientAuthorization, eligibility);
    }

    function reserveCampaignClaim(
        bytes32 campaignId,
        uint32 index,
        Recipient calldata restriction,
        bytes32 secret,
        bytes32[] calldata proof,
        Intent calldata intent,
        bytes calldata signature,
        bytes calldata recipientAuthorization,
        bytes calldata eligibility
    ) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        _validateRecipient(restriction);
        if (
            c.sponsor == address(0) || c.closed || index >= c.count
                || invitationsUsed[campaignId][index]
                || intent.giftId != campaignClaimId(campaignId, index)
                || gifts[intent.giftId].status != Status.None
                || !MerkleProof.verifyCalldata(
                    proof,
                    c.root,
                    invitationLeaf(index, keccak256(abi.encodePacked(secret)), restriction)
                )
        ) revert InvalidClaim();
        invitationsUsed[campaignId][index] = true;
        c.reserved++;
        c.available -= c.policy.maxPrice;
        gifts[intent.giftId] = Gift(
            c.sponsor,
            keccak256(abi.encodePacked(secret)),
            restriction,
            c.policy,
            0,
            address(0),
            address(0),
            0,
            c.policy.maxPrice,
            Status.Ready
        );
        _reserve(gifts[intent.giftId], intent, signature, recipientAuthorization, eligibility);
    }

    function _reserve(
        Gift storage g,
        Intent calldata intent,
        bytes calldata signature,
        bytes calldata recipientAuthorization,
        bytes calldata eligibility
    ) private {
        if (
            g.policy.expiresAt < block.timestamp || intent.deadline > g.policy.expiresAt
                || intent.hca == address(0)
        ) revert InvalidClaim();
        _authorize(
            intent,
            g.restriction,
            g.policy.worldRequired,
            signature,
            recipientAuthorization,
            eligibility
        );
        g.recipient = intent.recipient;
        g.hca = intent.hca;
        g.labelhash = intent.labelhash;
        g.status = Status.Reserved;
        emit Reserved(intent.giftId, intent.recipient, intent.hca, intent.labelhash);
    }

    function releaseToHca(bytes32 id, uint96 amount) external onlyCoordinator nonReentrant {
        Gift storage g = gifts[id];
        if (
            g.status != Status.Reserved || block.timestamp > g.policy.expiresAt || amount == 0
                || amount > g.remaining || g.hca.code.length == 0
                || hcaFactory.authorizedOwnerOf(g.hca) != g.recipient
        ) revert InvalidState();
        g.status = Status.Funded;
        g.remaining -= amount;
        paymentToken.safeTransfer(g.hca, amount);
        emit Released(id, g.hca, amount);
    }

    function completeGift(bytes32 id) external nonReentrant {
        Gift storage g = gifts[id];
        if (
            (g.status != Status.Funded && g.status != Status.Reserved)
                || registry.getOwner(uint256(g.labelhash)) != g.recipient
        ) revert InvalidState();
        g.status = Status.Complete;
        _refund(id, g);
        emit Completed(id);
    }

    function cancel(bytes32 id) external nonReentrant {
        Gift storage g = gifts[id];
        if (g.sponsor != msg.sender || g.status != Status.Ready) revert Unauthorized();
        g.status = Status.Refunded;
        _refund(id, g);
    }

    function refundExpired(bytes32 id) external nonReentrant {
        Gift storage g = gifts[id];
        if (
            g.status == Status.None || g.status == Status.Complete || g.status == Status.Refunded
                || block.timestamp <= g.policy.expiresAt
        ) revert InvalidState();
        g.status = Status.Refunded;
        _refund(id, g);
    }

    function refundCampaign(bytes32 id) external nonReentrant {
        Campaign storage c = campaigns[id];
        if (
            c.sponsor == address(0) || c.closed
                || (msg.sender != c.sponsor && block.timestamp <= c.policy.expiresAt)
        ) revert Unauthorized();
        c.closed = true;
        uint256 amount = c.available;
        c.available = 0;
        paymentToken.safeTransfer(c.sponsor, amount);
        emit Refunded(id, c.sponsor, amount);
    }

    function _refund(bytes32 id, Gift storage g) private {
        uint96 amount = g.remaining;
        g.remaining = 0;
        if (amount > 0) paymentToken.safeTransfer(g.sponsor, amount);
        emit Refunded(id, g.sponsor, amount);
    }
}
