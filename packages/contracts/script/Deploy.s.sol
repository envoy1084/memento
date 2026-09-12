// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IDeployVm} from "./IDeployVm.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IEnsRegistry, IVerifiableFactory} from "../src/interfaces/IEnsV2.sol";
import {MementoRegistration} from "../src/MementoRegistration.sol";
import {IDirectRegistrar} from "../src/interfaces/IDirectRegistrar.sol";

/// @title Memento Sepolia deployment
/// @notice Deploys the Memento registration escrow using the checked-in public chain manifest.
/// @dev Configure CONTRACT_ADMIN and COORDINATOR_ADDRESS independently of the Foundry signer.
///      Broadcasting requires the explicit Foundry --broadcast flag; ENS is not deployed here.
contract Deploy {
    IDeployVm private constant VM =
        IDeployVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    /// @notice Builds the deployment transaction after checking the manifest chain ID.
    /// @dev Run from packages/contracts so the allowlisted manifest path resolves correctly.
    /// @return sponsorship Newly deployed sponsorship escrow.
    function run() external returns (MementoRegistration sponsorship) {
        // Read only the checked-in public deployment manifest allowed by foundry.toml.
        // forge-lint: disable-next-line(unsafe-cheatcode)
        string memory manifest = VM.readFile("../chain/src/deployments/sepolia.json");
        require(
            block.chainid == VM.parseJsonUint(manifest, ".chainId"),
            "Use the configured Sepolia chain"
        );

        address admin = VM.envAddress("CONTRACT_ADMIN");
        address coordinator = VM.envAddress("COORDINATOR_ADDRESS");
        IEnsRegistry registry = IEnsRegistry(VM.parseJsonAddress(manifest, ".contracts.registry"));
        IVerifiableFactory factory =
            IVerifiableFactory(VM.parseJsonAddress(manifest, ".contracts.verifiableFactory"));
        IERC20 token = IERC20(VM.parseJsonAddress(manifest, ".contracts.token"));
        address resolver = VM.parseJsonAddress(manifest, ".contracts.resolverImplementation");

        VM.startBroadcast();
        sponsorship = new MementoRegistration(
            token,
            registry,
            admin,
            coordinator,
            IDirectRegistrar(VM.parseJsonAddress(manifest, ".contracts.registrar")),
            factory,
            resolver
        );

        VM.stopBroadcast();
    }
}
