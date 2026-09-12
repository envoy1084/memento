// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title ENS permissioned resolver initialization surface
/// @dev Pinned to the ENSForge 0.4.0 deployed resolver generation.
interface IPermissionedResolver {
    /// @notice Initializes root permissions and executes initial record calls.
    /// @dev Upstream initialization permits these calls before ordinary permission checks apply.
    /// @param admin Recipient receiving root permissions.
    /// @param roles Packed root-role bitmap.
    /// @param calls ABI-encoded resolver setters executed atomically during initialization.
    function initialize(address admin, uint256 roles, bytes[] calldata calls) external;

    /// @notice Sets the Ethereum address record for a name.
    /// @param node Full ENS namehash, including the .eth parent.
    /// @param value Address record value.
    function setAddr(bytes32 node, address value) external;

    /// @notice Sets a text record for a name.
    /// @param node Full ENS namehash.
    /// @param key Text-record key.
    /// @param value Text-record value.
    function setText(bytes32 node, string calldata key, string calldata value) external;
}
