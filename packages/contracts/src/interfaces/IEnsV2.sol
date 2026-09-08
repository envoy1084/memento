// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// Minimal integration surfaces pinned to ensdomains/contracts-v2 post-audit-2
// 6cd019f567c8eb0ca306c78851d4d58876a8e1df.
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
    struct Grant {
        address account;
        uint256 roleBitmap;
    }

    function initialize(Grant[] calldata grants, bytes[] calldata calls) external;

    function setAddress(bytes calldata name, uint256 coinType, bytes calldata value) external;

    function setText(bytes calldata name, string calldata key, string calldata value) external;
}
