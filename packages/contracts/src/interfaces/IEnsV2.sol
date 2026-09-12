// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// Minimal integration surfaces pinned to ensdomains/contracts-v2 ENSForge 0.4.0 deployed generation
// 09bf3ac64a6fb1b215573c019b17e8c501bb3ca0.
interface IEnsRegistry {
    function getResource(uint256 anyId) external view returns (uint256);

    function roles(uint256 resource, address account) external view returns (uint256);

    function roleCount(uint256 resource) external view returns (uint256);

    function getOwner(uint256 anyId) external view returns (address);

    function getTokenId(uint256 anyId) external view returns (uint256);

    function getResolver(string calldata label) external view returns (address);

    function setResolver(uint256 anyId, address resolver) external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external;
}

interface IHcaFactory {
    function authorizedOwnerOf(address hca) external view returns (address);
}

interface IVerifiableFactory {
    function deployProxy(address implementation, uint256 salt, bytes calldata initData)
        external
        returns (address);

    function verifyContract(address proxy) external view returns (address);
}

interface IPermissionedResolver {
    function initialize(address admin, uint256 roles, bytes[] calldata calls) external;

    function setAddr(bytes32 node, address value) external;

    function setText(bytes32 node, string calldata key, string calldata value) external;
}
