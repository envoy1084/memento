// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import {MementoSponsorship} from "../src/MementoSponsorship.sol";
import {ClaimAuthorization} from "../src/ClaimAuthorization.sol";
import {Token, HcaFactory, Hca, Registry, TestBase} from "./Fixtures.sol";

// Exact balances are the assertions under test; literal amounts keep each scenario readable.
// forge-lint: disable-next-item(incorrect-strict-equality, literal-instead-of-constant)
contract SponsorshipTest is TestBase {
    Token token;
    HcaFactory factory;
    Hca hca;
    Registry registry;
    MementoSponsorship escrow;
    MementoSponsorship.Policy policy;

    function setUp() public {
        bob = VM.addr(BOB_KEY);
        token = new Token();
        factory = new HcaFactory();
        hca = new Hca();
        registry = new Registry();
        escrow = new MementoSponsorship(token, factory, registry, address(this), address(this));
        factory.certify(address(hca), bob);
        token.mint(alice, 1000);

        VM.prank(alice);
        require(token.approve(address(escrow), 1000));
        policy = MementoSponsorship.Policy(
            100, SafeCast.toUint64(block.timestamp + 1 days), 365 days, 3, 63, false
        );
    }

    function create() internal {
        VM.prank(alice);
        escrow.createGift(
            ID, keccak256(abi.encodePacked(SECRET)), ClaimAuthorization.Recipient(0, 0), policy, 0
        );
    }

    function intent(bytes32 id) internal view returns (ClaimAuthorization.Intent memory) {
        return ClaimAuthorization.Intent(
            id,
            bob,
            address(hca),
            address(0x777),
            keccak256("bob"),
            keccak256(abi.encode(id)),
            policy.expiresAt
        );
    }

    function reserve(bytes32 id) internal {
        ClaimAuthorization.Intent memory i = intent(id);
        escrow.reserveGift(i, SECRET, signature(escrow, i), "", "");
    }

    function testFundingAndCompletionRefundOnlyLeftover() public {
        create();
        reserve(ID);
        escrow.releaseToHca(ID, 70);
        require(token.balanceOf(address(hca)) == 70);
        registry.mint(keccak256("bob"), bob);
        escrow.completeGift(ID);
        require(token.balanceOf(alice) == 930 && token.balanceOf(address(escrow)) == 0);
    }

    function testRejectRecipientRedirectionAndWrongSecret() public {
        create();
        ClaimAuthorization.Intent memory i = intent(ID);
        bytes memory sig = signature(escrow, i);
        i.recipient = alice;

        VM.expectRevert();
        escrow.reserveGift(i, SECRET, sig, "", "");
        i.recipient = bob;

        VM.expectRevert();
        escrow.reserveGift(i, bytes32(uint256(1)), sig, "", "");
    }

    function testReserveCannotBeCancelledOrReplayed() public {
        create();
        reserve(ID);

        VM.prank(alice);
        VM.expectRevert();
        escrow.cancel(ID);
        ClaimAuthorization.Intent memory i = intent(ID);
        bytes memory sig = signature(escrow, i);

        VM.expectRevert();
        escrow.reserveGift(i, SECRET, sig, "", "");
    }

    function testFundingRequiresCertifiedOwnerAndCannotRepeat() public {
        create();
        reserve(ID);
        factory.certify(address(hca), alice);

        VM.expectRevert();
        escrow.releaseToHca(ID, 50);
        factory.certify(address(hca), bob);

        VM.expectRevert();
        escrow.releaseToHca(ID, 101);
        escrow.releaseToHca(ID, 50);

        VM.expectRevert();
        escrow.releaseToHca(ID, 1);
    }

    function testExpiryCannotRecoverAlreadyReleasedFunds() public {
        create();
        reserve(ID);
        escrow.releaseToHca(ID, 70);
        VM.warp(uint256(policy.expiresAt) + 1);
        escrow.refundExpired(ID);
        require(token.balanceOf(alice) == 930 && token.balanceOf(address(hca)) == 70);
    }

    function testCampaignWithdrawalPreservesReservedBudget() public {
        ClaimAuthorization.Recipient memory restriction = ClaimAuthorization.Recipient(0, 0);
        bytes32 root = escrow.invitationLeaf(0, keccak256(abi.encodePacked(SECRET)), restriction);

        VM.prank(alice);
        escrow.createCampaign(ID, root, 2, policy);
        bytes32 claimId = escrow.campaignClaimId(ID, 0);
        ClaimAuthorization.Intent memory i = intent(claimId);
        escrow.reserveCampaignClaim(
            ID, 0, restriction, SECRET, new bytes32[](0), i, signature(escrow, i), "", ""
        );

        VM.prank(alice);
        escrow.refundCampaign(ID);
        require(token.balanceOf(address(escrow)) == 100);
        escrow.releaseToHca(claimId, 80);
        require(token.balanceOf(address(hca)) == 80);
    }

    function testWorldRequiredCannotSkipEligibility() public {
        policy.worldRequired = true;
        create();
        ClaimAuthorization.Intent memory i = intent(ID);
        bytes memory sig = signature(escrow, i);

        VM.expectRevert();
        escrow.reserveGift(i, SECRET, sig, "", "");
    }

    function testCoordinatorRotationIsDelayed() public {
        escrow.proposeCoordinator(bob);

        VM.expectRevert();
        escrow.activateCoordinator();
        VM.warp(block.timestamp + 1 days);
        escrow.activateCoordinator();
        require(escrow.coordinator() == bob);
    }

    function testCoordinatorRotationRejectsTimestampTruncation() public {
        VM.warp(uint256(type(uint64).max) - 1 days + 1);

        VM.expectRevert(
            abi.encodeWithSelector(
                SafeCast.SafeCastOverflowedUintDowncast.selector,
                uint8(64),
                uint256(type(uint64).max) + 1
            )
        );
        escrow.proposeCoordinator(bob);

        require(escrow.pendingCoordinator() == address(0));
        require(escrow.coordinator() == address(this));
    }

    function testReplacingCoordinatorProposalRestartsDelay() public {
        escrow.proposeCoordinator(bob);
        uint256 firstActivation = escrow.coordinatorActivation();
        VM.warp(firstActivation - 1);
        escrow.proposeCoordinator(alice);

        VM.warp(firstActivation);
        VM.expectRevert(ClaimAuthorization.InvalidState.selector);
        escrow.activateCoordinator();

        VM.warp(escrow.coordinatorActivation());
        escrow.activateCoordinator();
        require(escrow.coordinator() == alice);
        require(escrow.pendingCoordinator() == address(0));
    }

    function testOnlyCoordinatorCanReleaseReservedFunds() public {
        create();
        reserve(ID);

        VM.prank(alice);
        VM.expectRevert(ClaimAuthorization.Unauthorized.selector);
        escrow.releaseToHca(ID, 70);

        require(token.balanceOf(address(hca)) == 0);
        escrow.releaseToHca(ID, 70);
        require(token.balanceOf(address(hca)) == 70);
    }
}
