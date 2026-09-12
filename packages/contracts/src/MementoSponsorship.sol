// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// Timestamp comparisons implement second-based deadlines, not randomness or exact scheduling.
// forge-lint: disable-start(block-timestamp)

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ClaimAuthorization} from "./ClaimAuthorization.sol";
import {IEnsRegistry, IHcaFactory} from "./interfaces/IEnsV2.sol";

/// @title Memento sponsorship escrow
/// @notice Escrows token budgets for individual ENS gifts and Merkle invitation campaigns.
/// @dev The coordinator enforces name length, duration and registration pricing offchain. This
///      contract enforces consent, expiry, certified HCA ownership and a single bounded release.
///      Funds already released to an HCA cannot be recovered through this escrow.
contract MementoSponsorship is ClaimAuthorization, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Sponsor policy shared by each gift in a campaign.
    /// @param maxPrice Per-gift deposit and release ceiling in raw payment-token units.
    /// @param expiresAt Inclusive Unix timestamp in seconds for reservation and release.
    /// @param duration Requested registration duration in seconds, enforced offchain.
    /// @param minLength Minimum normalized label length, enforced offchain.
    /// @param maxLength Maximum normalized label length, enforced offchain.
    /// @param worldRequired Whether reservation requires a coordinator eligibility attestation.
    struct Policy {
        uint96 maxPrice;
        uint64 expiresAt;
        uint64 duration;
        uint8 minLength;
        uint8 maxLength;
        bool worldRequired;
    }

    /// @notice Gift lifecycle; Complete and Refunded are terminal.
    /// @dev Ready may be reserved or cancelled; Reserved may be funded or completed.
    ///      Any nonterminal existing gift may be refunded after expiry.
    enum Status {
        None,
        Ready,
        Reserved,
        Funded,
        Complete,
        Refunded
    }

    /// @notice Escrow accounting and signed destination for one gift.
    /// @param sponsor Depositor and sole refund destination.
    /// @param claimHash Keccak-256 of the 32-byte claim secret.
    /// @param restriction Recipient restriction selected by the sponsor.
    /// @param policy Budget and claim policy.
    /// @param metadataHash Opaque offchain metadata commitment; zero for campaign invitations.
    /// @param recipient Reserved recipient; zero until reservation.
    /// @param hca Reserved HCA; factory certification is checked at release.
    /// @param labelhash Reserved normalized label hash.
    /// @param remaining Unreleased token balance refundable to the sponsor.
    /// @param status Current lifecycle state.
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

    /// @notice Shared policy and unallocated funds for a Merkle invitation campaign.
    /// @param sponsor Depositor and sole refund destination.
    /// @param root Merkle root of double-hashed invitation leaves.
    /// @param policy Policy copied into each reserved invitation gift.
    /// @param count Maximum invitation count; valid indexes are zero through count minus one.
    /// @param reserved Number of invitations reserved onchain, including subsequently refunded ones.
    /// @param available Unreserved budget; excludes all individual gift balances.
    /// @param closed Whether new reservations are permanently disabled.
    struct Campaign {
        address sponsor;
        bytes32 root;
        Policy policy;
        uint32 count;
        uint32 reserved;
        uint256 available;
        bool closed;
    }

    /// @notice Token accepted for deposits and funding; deposits must arrive without transfer fees.
    // Preserve the existing public getter ABI.
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IERC20 public immutable paymentToken;
    /// @notice ENS factory used to certify each funded HCA and its authorized owner.
    // Preserve the existing public getter ABI.
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IHcaFactory public immutable hcaFactory;
    /// @notice ENS registry used to verify recipient ownership on completion.
    // Preserve the existing public getter ABI.
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IEnsRegistry public immutable registry;
    /// @notice Individual gifts and derived campaign invitation gifts, keyed by ID.
    mapping(bytes32 => Gift) public gifts;
    /// @notice Campaign accounting, keyed by sponsor-selected campaign ID.
    mapping(bytes32 => Campaign) public campaigns;
    /// @notice Whether an invitation index has already been reserved; never cleared on refund.
    mapping(bytes32 => mapping(uint32 => bool)) public invitationsUsed;

    /// @notice An individual gift was fully funded.
    /// @param id Gift ID.
    /// @param sponsor Depositor.
    /// @param amount Received payment-token units.
    event GiftCreated(bytes32 indexed id, address indexed sponsor, uint256 amount);
    /// @notice A campaign was fully funded.
    /// @param id Campaign ID.
    /// @param sponsor Depositor.
    /// @param root Invitation Merkle root.
    /// @param amount Total received payment-token units.
    event CampaignCreated(
        bytes32 indexed id, address indexed sponsor, bytes32 root, uint256 amount
    );

    /// @notice A gift budget was bound to signed claim terms.
    /// @param id Gift or derived invitation ID.
    /// @param recipient Consenting recipient.
    /// @param hca Reserved funding destination.
    /// @param labelhash Reserved normalized label hash.
    event Reserved(bytes32 indexed id, address indexed recipient, address hca, bytes32 labelhash);
    /// @notice The one permitted funding transfer was made to a certified HCA.
    /// @param id Gift ID.
    /// @param hca Certified destination.
    /// @param amount Released payment-token units.
    event Released(bytes32 indexed id, address indexed hca, uint96 amount);
    /// @notice Registry ownership was verified and remaining funds refunded.
    /// @param id Completed gift ID.
    event Completed(bytes32 indexed id);
    /// @notice Escrow funds were returned; amount may be zero after full release.
    /// @param id Gift ID or campaign ID.
    /// @param sponsor Refund destination.
    /// @param amount Refunded payment-token units.
    event Refunded(bytes32 indexed id, address indexed sponsor, uint256 amount);

    /// @notice Creates an escrow with fixed ENS dependencies and payment token.
    /// @param token_ Accepted token.
    /// @param factory_ HCA certification factory.
    /// @param registry_ ENS registry.
    /// @param owner_ Administrator for two-step ownership and coordinator rotation.
    /// @param coordinator_ Initial attestation signer and funding operator.
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
    /// @param id Nonzero unused gift ID, distinct from existing campaign IDs.
    /// @param claimHash Nonzero hash of a high-entropy 32-byte secret.
    /// @param restriction Allowed recipient kind and identity.
    /// @param policy Sponsor budget and eligibility policy.
    /// @param metadataHash Offchain metadata commitment; not interpreted by the escrow.
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

        gifts[id] = Gift({
            sponsor: msg.sender,
            claimHash: claimHash,
            restriction: restriction,
            policy: policy,
            metadataHash: metadataHash,
            recipient: address(0),
            hca: address(0),
            labelhash: 0,
            remaining: policy.maxPrice,
            status: Status.Ready
        });

        _pull(policy.maxPrice);

        emit GiftCreated(id, msg.sender, policy.maxPrice);
    }

    /// @notice Deposits maxPrice times count for a campaign of up to 500 invitations.
    /// @dev Caller must approve the entire deposit. A Merkle proof alone is insufficient to
    ///      reserve: an invitation index must also be below count and unused.
    /// @param id Nonzero unused campaign ID, distinct from existing gift IDs.
    /// @param root Nonzero Merkle root constructed using invitationLeaf.
    /// @param count Number of funded invitations, from 1 through 500.
    /// @param policy Policy shared by each invitation.
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
        campaigns[id] = Campaign({
            sponsor: msg.sender,
            root: root,
            policy: policy,
            count: count,
            reserved: 0,
            available: amount,
            closed: false
        });

        _pull(amount);

        emit CampaignCreated(id, msg.sender, root, amount);
    }

    /// @notice Derives the gift ID to sign for a campaign invitation.
    /// @param id Campaign ID.
    /// @param index Zero-based invitation index.
    /// @return Keccak-256 of ABI-encoded campaign ID and uint32 index.
    function campaignClaimId(bytes32 id, uint32 index) public pure returns (bytes32) {
        return keccak256(abi.encode(id, index));
    }

    /// @notice Computes an invitation leaf compatible with sorted-pair Merkle proofs.
    /// @param index Zero-based invitation index.
    /// @param claimHash Hash of the invitation secret.
    /// @param restriction Sponsor-committed recipient restriction.
    /// @return Double-hashed ABI encoding of index, claimHash, kind and recipient ID.
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

    /// @notice Reserves an individual gift using its secret and recipient consent; any relayer may call.
    /// @param intent Signed terms identifying the gift and funding destination.
    /// @param secret Preimage of the stored claimHash.
    /// @param signature Recipient signature over intentDigest.
    /// @param recipientAuthorization Coordinator email attestation, or empty if not required.
    /// @param eligibility Coordinator World ID attestation, or empty if not required.
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

    /// @notice Reserves one invitation and isolates its budget from campaign withdrawals.
    /// @dev Any relayer may submit; failed authorization rolls back invitation use and accounting.
    /// @param campaignId Existing open campaign.
    /// @param index Unused invitation index below the campaign count.
    /// @param restriction Recipient restriction committed by the Merkle leaf.
    /// @param secret Invitation secret whose hash is committed by the leaf.
    /// @param proof Sorted-pair Merkle proof for this invitation.
    /// @param intent Signed terms using campaignClaimId(campaignId, index) as giftId.
    /// @param signature Recipient signature over intentDigest.
    /// @param recipientAuthorization Coordinator email attestation, or empty if not required.
    /// @param eligibility Coordinator World ID attestation, or empty if not required.
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

        // Reserved invitation budgets must no longer be withdrawable by the campaign sponsor.
        invitationsUsed[campaignId][index] = true;
        c.reserved++;
        c.available -= c.policy.maxPrice;
        gifts[intent.giftId] = Gift({
            sponsor: c.sponsor,
            claimHash: keccak256(abi.encodePacked(secret)),
            restriction: restriction,
            policy: c.policy,
            metadataHash: 0,
            recipient: address(0),
            hca: address(0),
            labelhash: 0,
            remaining: c.policy.maxPrice,
            status: Status.Ready
        });

        _reserve(gifts[intent.giftId], intent, signature, recipientAuthorization, eligibility);
    }

    /// @dev Authorizes a ready gift and records its immutable claim destination.
    /// @param g Ready gift whose secret or Merkle proof the caller has already verified.
    /// @param intent Recipient-signed terms.
    /// @param signature Recipient consent signature.
    /// @param recipientAuthorization Optional coordinator email attestation.
    /// @param eligibility Optional coordinator eligibility attestation.
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

    /// @notice Releases funds once to the reserved, deployed, recipient-owned HCA.
    /// @dev Only the coordinator may release. It must verify registration policy offchain first.
    /// @param id Reserved, unexpired gift ID.
    /// @param amount Nonzero payment-token amount no greater than the remaining budget.
    function releaseToHca(bytes32 id, uint96 amount) external nonReentrant onlyCoordinator {
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

    /// @notice Completes a reserved or funded gift and refunds its unreleased balance.
    /// @dev Anyone may call once the registry reports the recipient as owner. Resolver records
    ///      and registration duration are not checked here; ownership is the onchain condition.
    /// @param id Gift ID to complete.
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

    /// @notice Cancels an unreserved gift and returns its full budget to its sponsor.
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

    /// @notice Closes a campaign and refunds only unreserved invitation budgets.
    /// @dev Sponsor may close early; anyone may close after expiry. Reserved gifts remain usable
    ///      under their own policy and cannot be withdrawn through this function.
    /// @param id Open campaign ID.
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
