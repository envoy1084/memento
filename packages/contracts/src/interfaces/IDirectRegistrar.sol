// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice ENSv2 registrar surface pinned to the ENSForge deployment.
interface IDirectRegistrar {
    function getRegisterPrice(string calldata label, uint64 duration, IERC20 token)
        external
        view
        returns (uint256 base, uint256 premium);

    function register(
        string calldata label,
        address owner,
        bytes32 secret,
        address subregistry,
        address resolver,
        uint64 duration,
        IERC20 token,
        bytes32 referrer
    ) external returns (uint256);
}
