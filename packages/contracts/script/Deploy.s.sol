// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IEnsRegistry, IHcaFactory, IVerifiableFactory} from "../src/interfaces/IEnsV2.sol";
import {MementoSponsorship} from "../src/MementoSponsorship.sol";
import {MementoNameVault} from "../src/MementoNameVault.sol";

interface DeployVm {
    function envAddress(string calldata name) external returns (address);
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract Deploy {
    DeployVm private constant VM =
        DeployVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (MementoSponsorship sponsorship, MementoNameVault vault) {
        require(block.chainid == 11155111, "Use the configured Sepolia chain");
        address admin = VM.envAddress("CONTRACT_ADMIN");
        address coordinator = VM.envAddress("COORDINATOR_ADDRESS");
        IEnsRegistry registry = IEnsRegistry(VM.envAddress("ENS_REGISTRY"));
        IHcaFactory hcaFactory = IHcaFactory(VM.envAddress("HCA_FACTORY"));
        IVerifiableFactory factory = IVerifiableFactory(VM.envAddress("VERIFIABLE_FACTORY"));
        IERC20 token = IERC20(VM.envAddress("PAYMENT_TOKEN"));
        address resolver = VM.envAddress("PERMISSIONED_RESOLVER_IMPLEMENTATION");
        VM.startBroadcast();
        sponsorship = new MementoSponsorship(token, hcaFactory, registry, admin, coordinator);
        vault = new MementoNameVault(registry, factory, resolver, admin, coordinator);
        VM.stopBroadcast();
    }
}
