// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title ENS verifiable proxy factory surface
/// @dev Pinned to the ENSForge 0.4.0 deployed factory generation.
interface IVerifiableFactory {
    /// @notice Deploys and initializes a verifiable proxy.
    /// @param implementation Resolver implementation to clone.
    /// @param salt Caller-supplied deterministic deployment salt.
    /// @param initData Encoded initialization call.
    /// @return Deployed proxy address, which Memento compares with recipient-signed consent.
    function deployProxy(address implementation, uint256 salt, bytes calldata initData)
        external
        returns (address);

    /// @notice Queries the implementation certified by this factory.
    /// @param proxy Proxy to verify.
    /// @return Certified implementation address; Memento requires its configured implementation.
    function verifyContract(address proxy) external view returns (address);
}
