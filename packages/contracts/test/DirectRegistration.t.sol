// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {MementoRegistration} from "../src/MementoRegistration.sol";
import {MementoSponsorship} from "../src/MementoSponsorship.sol";
import {IDirectRegistrar} from "../src/interfaces/IDirectRegistrar.sol";
import {ClaimAuthorization} from "../src/ClaimAuthorization.sol";
import {Token, Registry, ResolverFactory, TestBase} from "./Fixtures.sol";

// The doubles model only the registrar's commit delay, payment and ownership effects.
// forge-lint: disable-start(multi-contract-file, literal-instead-of-constant, incorrect-strict-equality, block-timestamp)
contract DirectRegistrar is IDirectRegistrar {
    Registry public registry;
    uint256 public price = 70;
    bytes32 public commitment;
    uint256 public readyAt;
    bool public fail;

    constructor(Registry registry_) {
        registry = registry_;
    }

    function configure(uint256 price_, bool fail_) external {
        price = price_;
        fail = fail_;
    }

    function commit(bytes32 value) external {
        commitment = value;
        readyAt = block.timestamp + 60;
    }

    function getRegisterPrice(string calldata, uint64, IERC20)
        external
        view
        returns (uint256, uint256)
    {
        return (price, 0);
    }

    function register(
        string calldata label,
        address owner,
        bytes32 secret,
        address subregistry,
        address resolver,
        uint64 duration,
        IERC20 token,
        bytes32 referrer
    ) external returns (uint256) {
        require(!fail && readyAt != 0 && block.timestamp >= readyAt);
        require(
            commitment
                == keccak256(
                    abi.encode(label, owner, secret, subregistry, resolver, duration, referrer)
                )
        );
        commitment = 0;
        require(token.transferFrom(msg.sender, address(this), price));
        bytes32 hash = keccak256(bytes(label));
        registry.mint(hash, address(this));
        registry.setResolver(uint256(hash), resolver);
        registry.mint(hash, owner);
        return uint256(hash);
    }
}

contract DirectRegistrationTest is TestBase {
    Token token;
    Registry registry;
    ResolverFactory factory;
    DirectRegistrar registrar;
    MementoRegistration escrow;
    MementoSponsorship.Policy policy;

    function setUp() public {
        bob = VM.addr(BOB_KEY);
        token = new Token();
        registry = new Registry();
        factory = new ResolverFactory();
        registrar = new DirectRegistrar(registry);
        escrow = new MementoRegistration(
            token,
            registry,
            address(this),
            VM.addr(COORDINATOR_KEY),
            registrar,
            factory,
            factory.implementation()
        );
        policy = MementoSponsorship.Policy(
            100, SafeCast.toUint64(block.timestamp + 1 days), 365 days, 3, 63
        );
        token.mint(alice, 1000);
        VM.prank(alice);
        require(token.approve(address(escrow), 100));
        VM.prank(alice);
        escrow.createGift(ID, keccak256(abi.encodePacked(SECRET)), ID, policy, 0);
    }

    function intent() internal view returns (ClaimAuthorization.Intent memory) {
        return ClaimAuthorization.Intent(
            ID, bob, address(factory.next()), keccak256("bob"), ID, policy.expiresAt
        );
    }

    function commit() internal {
        registrar.commit(
            keccak256(
                abi.encode(
                    "bob",
                    bob,
                    SECRET,
                    address(0),
                    address(factory.next()),
                    policy.duration,
                    bytes32(0)
                )
            )
        );
    }

    function claim(bool shouldRevert) internal {
        ClaimAuthorization.Intent memory i = intent();
        bytes memory sig = signature(escrow, i);
        bytes memory auth = authorization(escrow, i);
        if (shouldRevert) VM.expectRevert();
        escrow.registerGift(i, SECRET, "bob", SECRET, sig, auth);
    }

    function testTwoTransactionsRegisterAndRefundWithNoRecipientFunds() public {
        commit();
        VM.warp(block.timestamp + 60);
        claim(false);
        require(registry.getOwner(uint256(keccak256("bob"))) == bob);
        require(token.balanceOf(bob) == 0 && token.balanceOf(address(registrar)) == 70);
        require(token.balanceOf(alice) == 930 && token.balanceOf(address(escrow)) == 0);
        require(token.allowance(address(escrow), address(registrar)) == 0);
        require(factory.next().controller() == bob);
        claim(true);
    }

    function testCannotSkipWaitAndFailedRegistrationKeepsAllFunding() public {
        commit();
        claim(true);
        require(token.balanceOf(address(escrow)) == 100 && !factory.next().initialized());
        VM.warp(block.timestamp + 60);
        registrar.configure(70, true);
        claim(true);
        require(token.balanceOf(address(escrow)) == 100 && !factory.next().initialized());
        registrar.configure(70, false);
        claim(false);
    }

    function testPriceAboveGiftBudgetCannotSpend() public {
        commit();
        VM.warp(block.timestamp + 60);
        registrar.configure(101, false);
        claim(true);
        require(token.balanceOf(address(escrow)) == 100);
    }

    function testCannotRedirectRecipientOrResolver() public {
        commit();
        VM.warp(block.timestamp + 60);
        ClaimAuthorization.Intent memory i = intent();
        bytes memory sig = signature(escrow, i);
        i.recipient = alice;
        bytes memory auth = authorization(escrow, i);
        VM.expectRevert();
        escrow.registerGift(i, SECRET, "bob", SECRET, sig, auth);
        i = intent();
        i.resolver = alice;
        sig = signature(escrow, i);
        auth = authorization(escrow, i);
        VM.expectRevert();
        escrow.registerGift(i, SECRET, "bob", SECRET, sig, auth);
        require(token.balanceOf(address(escrow)) == 100);
    }

    function testBoundNameAndDurationCannotBeChanged() public {
        commit();
        VM.warp(block.timestamp + 60);
        ClaimAuthorization.Intent memory i = intent();
        bytes memory sig = signature(escrow, i);
        bytes memory auth = authorization(escrow, i);
        VM.expectRevert();
        escrow.registerGift(i, SECRET, "alice", SECRET, sig, auth);
        registrar.commit(
            keccak256(
                abi.encode(
                    "bob",
                    bob,
                    SECRET,
                    address(0),
                    address(factory.next()),
                    uint64(1 days),
                    bytes32(0)
                )
            )
        );
        VM.warp(block.timestamp + 60);
        claim(true);
        require(token.balanceOf(address(escrow)) == 100);
    }

    function testEmailAttestationIsRequired() public {
        commit();
        VM.warp(block.timestamp + 60);
        ClaimAuthorization.Intent memory i = intent();
        bytes memory sig = signature(escrow, i);
        VM.expectRevert();
        escrow.registerGift(i, SECRET, "bob", SECRET, sig, hex"");
        require(token.balanceOf(address(escrow)) == 100);
        require(!escrow.usedNonces(bob, ID));
    }

    function testOnlySponsorCanCancelAndCannotClaimAfterRefund() public {
        VM.prank(bob);
        VM.expectRevert();
        escrow.cancel(ID);
        VM.prank(alice);
        escrow.cancel(ID);
        require(token.balanceOf(alice) == 1000);
        require(token.balanceOf(address(escrow)) == 0);
        commit();
        VM.warp(block.timestamp + 60);
        claim(true);
    }

    function testExpiryRefundReturnsOnlyToSponsor() public {
        VM.warp(policy.expiresAt);
        VM.expectRevert();
        escrow.refundExpired(ID);
        VM.warp(uint256(policy.expiresAt) + 1);
        VM.prank(bob);
        escrow.refundExpired(ID);
        require(token.balanceOf(alice) == 1000 && token.balanceOf(bob) == 0);
        VM.expectRevert();
        escrow.refundExpired(ID);
    }
}
// forge-lint: disable-end(multi-contract-file, literal-instead-of-constant, incorrect-strict-equality, block-timestamp)
