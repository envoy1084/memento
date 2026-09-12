// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {MementoSponsorship} from "./MementoSponsorship.sol";
import {IEnsRegistry, IVerifiableFactory, IPermissionedResolver} from "./interfaces/IEnsV2.sol";
import {IDirectRegistrar} from "./interfaces/IDirectRegistrar.sol";

/// @notice Registration-only gifts: recipient commits first, then claims in one atomic transaction.
/// @dev No USDC is released to a wallet. The fixed registrar receives only its quoted price;
///      registration, recipient-owned resolver creation and sponsor refund revert together.
contract MementoRegistration is MementoSponsorship {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    IDirectRegistrar public immutable REGISTRAR;
    IVerifiableFactory public immutable RESOLVER_FACTORY;
    address public immutable RESOLVER_IMPLEMENTATION;

    constructor(
        IERC20 token_,
        IEnsRegistry registry_,
        address owner_,
        address coordinator_,
        IDirectRegistrar registrar_,
        IVerifiableFactory resolverFactory_,
        address resolverImplementation_
    ) MementoSponsorship(token_, registry_, owner_, coordinator_) {
        if (
            address(registrar_) == address(0) || address(resolverFactory_) == address(0)
                || resolverImplementation_ == address(0)
        ) revert InvalidClaim();
        REGISTRAR = registrar_;
        RESOLVER_FACTORY = resolverFactory_;
        RESOLVER_IMPLEMENTATION = resolverImplementation_;
    }

    /// @notice Consumes recipient consent, registers their name and refunds unused funding.
    /// @dev Commit directly to REGISTRAR first. Duration comes from the funded policy.
    // Deadlines are second-based; this is not a source of randomness.
    // forge-lint: disable-next-item(block-timestamp)
    function registerGift(
        Intent calldata intent,
        bytes32 invitationSecret,
        string calldata label,
        bytes32 registrationSecret,
        bytes calldata signature,
        bytes calldata recipientAuthorization
    ) external nonReentrant {
        Gift storage g = gifts[intent.giftId];
        // forge-lint: disable-next-line(block-timestamp)
        if (
            g.status != Status.Ready || block.timestamp > g.policy.expiresAt
                || intent.deadline > g.policy.expiresAt
                || keccak256(abi.encodePacked(invitationSecret)) != g.claimHash
                || keccak256(bytes(label)) != intent.labelhash
        ) revert InvalidClaim();

        uint256 length = 0;
        bytes memory encoded = bytes(label);
        for (uint256 i = 0; i < encoded.length; ++i) {
            if (uint8(encoded[i]) & 0xc0 != 0x80) ++length;
        }
        if (length < g.policy.minLength || length > g.policy.maxLength) revert InvalidClaim();
        _authorize(intent, g.recipientId, signature, recipientAuthorization);

        (uint256 base, uint256 premium) =
            REGISTRAR.getRegisterPrice(label, g.policy.duration, paymentToken);
        uint256 price = base + premium;
        if (price > g.remaining) revert InvalidClaim();

        g.recipient = intent.recipient;
        g.labelhash = intent.labelhash;
        g.status = Status.Complete;
        g.remaining -= price.toUint96();

        bytes32 ethNode = keccak256(abi.encodePacked(bytes32(0), keccak256("eth")));
        bytes[] memory setters = new bytes[](1);
        setters[0] = abi.encodeCall(
            IPermissionedResolver.setAddr,
            (keccak256(abi.encodePacked(ethNode, intent.labelhash)), intent.recipient)
        );
        address resolver = RESOLVER_FACTORY.deployProxy(
            RESOLVER_IMPLEMENTATION,
            uint256(intent.giftId),
            abi.encodeCall(
                IPermissionedResolver.initialize,
                (
                    intent.recipient,
                    0x1111111111111111111111111111111111111111111111111111111111111111,
                    setters
                )
            )
        );
        if (
            resolver != intent.resolver
                || RESOLVER_FACTORY.verifyContract(resolver) != RESOLVER_IMPLEMENTATION
        ) {
            revert InvalidClaim();
        }

        paymentToken.forceApprove(address(REGISTRAR), price);
        uint256 tokenId = REGISTRAR.register(
            label,
            intent.recipient,
            registrationSecret,
            address(0),
            resolver,
            g.policy.duration,
            paymentToken,
            bytes32(0)
        );
        paymentToken.forceApprove(address(REGISTRAR), 0);
        if (
            registry.getTokenId(uint256(intent.labelhash)) != tokenId
                || registry.getOwner(uint256(intent.labelhash)) != intent.recipient
                || registry.getResolver(label) != resolver
        ) revert InvalidState();
        uint96 refund = g.remaining;
        g.remaining = 0;
        if (refund > 0) paymentToken.safeTransfer(g.sponsor, refund);
        // Protected by the inherited reentrancy guard.
        // forge-lint: disable-next-line(reentrancy-events)
        emit Refunded(intent.giftId, g.sponsor, refund);
        // Protected by the inherited reentrancy guard.
        // forge-lint: disable-next-line(reentrancy-events)
        emit Completed(intent.giftId);
    }
}
