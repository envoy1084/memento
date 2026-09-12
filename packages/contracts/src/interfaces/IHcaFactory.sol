// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title ENS HCA certification surface
/// @dev Pinned to the ENSForge 0.4.0 deployed factory generation.
interface IHcaFactory {
    /// @notice Returns the authorized owner certified for a factory-created HCA.
    /// @param hca HCA address to verify.
    /// @return Certified owner; an uncertified address must not be accepted as recipient-owned.
    function authorizedOwnerOf(address hca) external view returns (address);
}
