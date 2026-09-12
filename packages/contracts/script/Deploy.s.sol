// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IDeployVm} from "./IDeployVm.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IEnsRegistry, IHcaFactory, IVerifiableFactory} from "../src/interfaces/IEnsV2.sol";
import {MementoSponsorship} from "../src/MementoSponsorship.sol";
import {MementoNameVault} from "../src/MementoNameVault.sol";

/// @title Memento Sepolia deployment
/// @notice Deploys both Memento escrows using the checked-in public chain manifest.
/// @dev Configure CONTRACT_ADMIN and COORDINATOR_ADDRESS independently of the Foundry signer.
///      Broadcasting requires the explicit Foundry --broadcast flag; ENS is not deployed here.
contract Deploy {
    IDeployVm private constant VM =
        IDeployVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    /// @notice Builds the two deployment transactions after checking the manifest chain ID.
    /// @dev Run from packages/contracts so the allowlisted manifest path resolves correctly.
    /// @return sponsorship Newly deployed sponsorship escrow.
    /// @return vault Newly deployed existing-name vault.
    function run() external returns (MementoSponsorship sponsorship, MementoNameVault vault) {
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
        IHcaFactory hcaFactory = IHcaFactory(VM.parseJsonAddress(manifest, ".contracts.hcaFactory"));
        IVerifiableFactory factory =
            IVerifiableFactory(VM.parseJsonAddress(manifest, ".contracts.verifiableFactory"));
        IERC20 token = IERC20(VM.parseJsonAddress(manifest, ".contracts.token"));
        address resolver = VM.parseJsonAddress(manifest, ".contracts.resolverImplementation");

        VM.startBroadcast();
        sponsorship = new MementoSponsorship(token, hcaFactory, registry, admin, coordinator);
        vault = new MementoNameVault(registry, factory, resolver, admin, coordinator);

        VM.stopBroadcast();
    }
}
