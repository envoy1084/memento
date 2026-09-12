// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title ENSv2 registry integration surface
/// @dev Pinned to ENSForge 0.4.0 deployed revision 09bf3ac64a6fb1b215573c019b17e8c501bb3ca0.
///      This is a minimal adapter interface, not the full upstream registry ABI.
interface IEnsRegistry {
    /// @notice Resolves a name identifier to its permission resource.
    /// @param anyId Label or versioned token identifier accepted by the registry.
    /// @return Resource used for role queries.
    function getResource(uint256 anyId) external view returns (uint256);

    /// @notice Returns an account's packed role bitmap.
    /// @param resource Permission resource.
    /// @param account Account whose assignments are queried.
    /// @return Packed role assignments, one bit at each four-bit role slot.
    function roles(uint256 resource, address account) external view returns (uint256);

    /// @notice Returns packed assignment counts for each role on a resource.
    /// @param resource Permission resource.
    /// @return Four-bit counts aligned with the role bitmap slots.
    function roleCount(uint256 resource) external view returns (uint256);

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

    /// @notice Sets a name's resolver subject to registry permissions.
    /// @param anyId Name identifier.
    /// @param resolver New resolver address.
    function setResolver(uint256 anyId, address resolver) external;

    /// @notice Transfers a registry token and invokes the ERC-1155 receiver callback for contracts.
    /// @param from Current token owner.
    /// @param to Recipient address.
    /// @param id Current versioned token ID.
    /// @param value Token amount; Memento name transfers use one.
    /// @param data Callback payload, including the gift ID for vault deposits.
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external;
}
