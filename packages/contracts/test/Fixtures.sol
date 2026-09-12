// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {
    IEnsRegistry,
    IHcaFactory,
    IVerifiableFactory,
    IPermissionedResolver
} from "../src/interfaces/IEnsV2.sol";
import {ClaimAuthorization} from "../src/ClaimAuthorization.sol";

interface Vm {
    function addr(uint256 key) external returns (address);

    function sign(uint256 key, bytes32 digest) external returns (uint8, bytes32, bytes32);

    function prank(address sender) external;

    function warp(uint256 time) external;

    function expectRevert() external;

    function expectRevert(bytes4 selector) external;
}

contract Token is ERC20 {
    constructor() ERC20("Test", "TST") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract HcaFactory is IHcaFactory {
    mapping(address => address) public authorizedOwnerOf;

    function certify(address hca, address owner) external {
        authorizedOwnerOf[hca] = owner;
    }
}

contract Hca {}

contract Registry is IEnsRegistry {
    bool public hasDelegate;

    function delegate(bool value) external {
        hasDelegate = value;
    }

    function getResource(uint256 id) external pure returns (uint256) {
        return id;
    }

    function roles(uint256 id, address account) external view returns (uint256) {
        return owners[id] == account ? (uint256(1) << 24) | (uint256(1) << 156) : 0;
    }

    function roleCount(uint256) external view returns (uint256) {
        return (uint256(hasDelegate ? 2 : 1) << 24) | (uint256(1) << 156);
    }

    mapping(uint256 => address) public owners;
    mapping(uint256 => uint256) public versions;
    mapping(uint256 => address) public resolvers;

    function mint(bytes32 label, address to) external {
        owners[uint256(label)] = to;
    }

    function getOwner(uint256 id) external view returns (address) {
        return owners[id];
    }

    function getTokenId(uint256 id) public view returns (uint256) {
        return id + versions[id];
    }

    function getResolver(string calldata label) external view returns (address) {
        return resolvers[uint256(keccak256(bytes(label)))];
    }

    function setResolver(uint256 id, address resolver) external {
        require(owners[id] == msg.sender);
        resolvers[id] = resolver;
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external {
        require(msg.sender == from && owners[id] == from && amount == 1);
        owners[id] = to;

        if (to.code.length > 0) {
            require(
                IERC1155Receiver(to).onERC1155Received(msg.sender, from, id, amount, data)
                    == IERC1155Receiver.onERC1155Received.selector
            );
        }
    }
}

contract Resolver is IPermissionedResolver {
    address public controller;
    bool public initialized;
    bool private initializing;
    mapping(bytes32 => address) public addresses;
    mapping(bytes32 => mapping(string => string)) public texts;

    function initialize(address admin, uint256 roles, bytes[] calldata calls) external {
        require(
            !initialized
                && roles == 0x1111111111111111111111111111111111111111111111111111111111111111
        );
        initialized = true;
        controller = admin;
        require(calls.length >= 1);
        initializing = true;
        for (uint256 i; i < calls.length; i++) {
            (bool success,) = address(this).delegatecall(calls[i]);
            require(success);
        }
        initializing = false;
    }

    function setAddr(bytes32 node, address value) external {
        require(initializing || msg.sender == controller);
        addresses[node] = value;
    }

    function setText(bytes32 node, string calldata key, string calldata value) external {
        require(initializing || msg.sender == controller);
        texts[node][key] = value;
    }
}

contract ResolverFactory is IVerifiableFactory {
    Resolver public next = new Resolver();
    address public implementation = address(0x1234);

    function deployProxy(address implementation_, uint256, bytes calldata initData)
        external
        returns (address)
    {
        require(implementation_ == implementation);
        (bool success,) = address(next).call(initData);
        require(success);

        return address(next);
    }

    function verifyContract(address proxy) external view returns (address) {
        require(proxy == address(next));

        return implementation;
    }
}

abstract contract TestBase {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 internal constant BOB_KEY = 1234;
    address internal bob;
    address internal alice = address(0xa11ce);
    bytes32 internal constant ID = keccak256("gift");
    bytes32 internal constant SECRET = keccak256("secret");

    function signature(ClaimAuthorization contract_, ClaimAuthorization.Intent memory intent)
        internal
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(BOB_KEY, contract_.intentDigest(intent));

        return abi.encodePacked(r, s, v);
    }
}
