// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title Foundry deployment cheatcode surface
/// @dev Available only in Foundry script execution, not as an onchain dependency.
interface IDeployVm {
    /// @notice Reads a required address from the script environment.
    /// @param name Environment variable name.
    /// @return Parsed address; reverts for missing or malformed values.
    function envAddress(string calldata name) external returns (address);

    /// @notice Reads an allowlisted local file during script execution.
    /// @param path Path relative to the contracts package.
    /// @return UTF-8 file contents.
    function readFile(string calldata path) external view returns (string memory);

    /// @notice Decodes an address at a JSON path.
    /// @param json JSON document.
    /// @param key JSON path.
    /// @return Parsed address.
    function parseJsonAddress(string calldata json, string calldata key)
        external
        pure
        returns (address);

    /// @notice Decodes an unsigned integer at a JSON path.
    /// @param json JSON document.
    /// @param key JSON path.
    /// @return Parsed integer.
    function parseJsonUint(string calldata json, string calldata key)
        external
        pure
        returns (uint256);

    /// @notice Records subsequent calls as transactions from the selected Foundry signer.
    function startBroadcast() external;

    /// @notice Stops recording deployment transactions.
    function stopBroadcast() external;
}
