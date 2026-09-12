// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import {MementoNameVault} from "../src/MementoNameVault.sol";
import {ClaimAuthorization} from "../src/ClaimAuthorization.sol";
import {Registry, Resolver, ResolverFactory, TestBase} from "./Fixtures.sol";

contract NameVaultTest is TestBase {
    Registry registry;
    ResolverFactory factory;
    MementoNameVault vault;
    bytes32 labelhash = keccak256("bob");
    uint64 expiry;

    function setUp() public {
        bob = VM.addr(BOB_KEY);
        registry = new Registry();
        factory = new ResolverFactory();
        vault = new MementoNameVault(
            registry, factory, factory.implementation(), address(this), address(this)
        );
        registry.mint(labelhash, alice);
        expiry = SafeCast.toUint64(block.timestamp + 1 days);
        MementoNameVault.TextRecord[] memory records = new MementoNameVault.TextRecord[](0);

        VM.prank(alice);
        vault.prepareGift(
            ID,
            MementoNameVault.Input(
                labelhash,
                keccak256(abi.encodePacked(SECRET)),
                ClaimAuthorization.Recipient(1, bytes32(uint256(uint160(bob)))),
                keccak256(abi.encode(records)),
                expiry,
                false
            )
        );
    }

    function testRejectsHiddenRegistryDelegates() public {
        registry.delegate(true);

        VM.expectRevert();
        VM.prank(alice);

        registry.safeTransferFrom(alice, address(vault), uint256(labelhash), 1, abi.encode(ID));
    }

    function deposit() internal {
        VM.prank(alice);

        registry.safeTransferFrom(alice, address(vault), uint256(labelhash), 1, abi.encode(ID));
    }

    function testClaimTransfersToRecipientWithFreshResolver() public {
        deposit();
        ClaimAuthorization.Intent memory i = ClaimAuthorization.Intent(
            ID, bob, address(0), address(factory.next()), labelhash, keccak256("nonce"), expiry
        );
        vault.claimName(
            i, SECRET, "bob", new MementoNameVault.TextRecord[](0), signature(vault, i), "", ""
        );
        require(registry.getOwner(uint256(labelhash)) == bob && factory.next().controller() == bob);
        bytes32 ethNode = keccak256(abi.encodePacked(bytes32(0), keccak256("eth")));
        require(factory.next().addresses(keccak256(abi.encodePacked(ethNode, labelhash))) == bob);
        Resolver resolver = factory.next();
        VM.prank(alice);
        VM.expectRevert();
        resolver.setAddr(labelhash, alice);
    }

    function testRejectUnsolicitedDeposits() public {
        VM.prank(alice);
        VM.expectRevert();

        registry.safeTransferFrom(
            alice, address(vault), uint256(labelhash), 1, abi.encode(bytes32(uint256(2)))
        );
    }

    function testRecoveryOnlyAfterExpiryAndOnlyToSponsor() public {
        deposit();

        VM.expectRevert();
        vault.recoverExpired(ID);
        VM.warp(expiry);
        VM.expectRevert(ClaimAuthorization.InvalidState.selector);
        vault.recoverExpired(ID);

        VM.warp(uint256(expiry) + 1);
        vault.recoverExpired(ID);
        require(registry.getOwner(uint256(labelhash)) == alice);
    }

    function testRejectChangedRecords() public {
        deposit();
        ClaimAuthorization.Intent memory i = ClaimAuthorization.Intent(
            ID, bob, address(0), address(factory.next()), labelhash, keccak256("nonce"), expiry
        );
        MementoNameVault.TextRecord[] memory records = new MementoNameVault.TextRecord[](1);
        records[0] = MementoNameVault.TextRecord("url", "changed");
        bytes memory sig = signature(vault, i);

        VM.expectRevert();
        vault.claimName(i, SECRET, "bob", records, sig, "", "");
    }
}
