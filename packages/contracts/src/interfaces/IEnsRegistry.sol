// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title ENSv2 registry integration surface
/// @dev Pinned to ENSForge 0.4.0 deployed revision d0c902eeb388c7fbde3f95d9eaf6076eeedff1d7.
///      This is a minimal adapter interface, not the full upstream registry ABI.
interface IEnsRegistry {
    /// @notice Returns the owner associated with a name identifier.
    /// @param anyId Label or versioned token identifier.
    /// @return Current registry owner.
    function getOwner(uint256 anyId) external view returns (address);

    /// @notice Resolves the current versioned token ID for transfers.
    /// @param anyId Label or prior token identifier.
    /// @return Current transferable token ID.
    function getTokenId(uint256 anyId) external view returns (uint256);

    /// @notice Returns the resolver associated with a label.
    /// @param label Normalized label without its parent suffix.
    /// @return Configured resolver address.
    function getResolver(string calldata label) external view returns (address);
}
