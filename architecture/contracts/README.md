# Contracts

The backend targets ENSv2 on Sepolia and one configured payment token. MementoSponsorship funds recipient-owned HCAs; MementoNameVault holds existing names pending recipient claim. Neither contract may redirect active assets to an arbitrary coordinator destination.

Foundry tests cover recipient signatures, replay protection, bounded funding, campaign reservation accounting, expiry refunds, coordinator rotation, vault deposits, and clean resolver handoff. Existing-name deposits reject delegated registry roles; the sponsor must revoke those roles first. Never treat a source revision or historical deployment manifest as proof of live compatibility.

Campaign deposits reserve one maximum budget per invitation. Each onchain reservation moves that budget out of the campaign's withdrawable balance. Sponsors may close a campaign early, cancelling invitations that have not been reserved onchain; existing reservations retain their budgets. Unreleased balances return to the sponsor on completion or expiry. Price/length policy is enforced by the application coordinator; the contract enforces signed identity, bounded release and custody.

Existing-name deposits require no other token-level delegates. The vault creates a fresh resolver at claim time, grants all resolver roles solely to the recipient, writes approved records, switches the registry resolver and transfers the current token ID atomically. The sender's old resolver is not reused.

`packages/contracts/script/Deploy.s.sol` deploys both Memento contracts on Sepolia. It does not deploy ENS itself. Keep the admin separate from the coordinator, and run `pnpm --filter @memento/chain generate` after Solidity changes.

`packages/contracts` owns Solidity, Foundry tests and deployment scripts only. `packages/chain` owns browser-safe TypeScript ABIs and ENSForge ABI re-exports. The contracts build verifies checked-in ABIs against its artifacts; the server and frontend can build their TypeScript dependencies without Foundry.

## Public deployment configuration

`packages/chain/src/deployments/sepolia.json` is the shared public manifest used by the Node adapter and Foundry deployment script. The protocol schema pins Sepolia and the ENS revision and rejects incomplete or zero-address deployments. Two confirmations are fixed in `@memento/chain/network`. Live bytecode, immutable bindings and ownership checks still run after configuration decoding. ENS addresses are generated from the ENSForge 0.4.0 profile. Both Memento addresses are populated from successful Sepolia deployments at block 11689610 and verified on Etherscan. Receipt status, deployed bytecode, owner/coordinator and immutable dependency bindings were checked against the manifest. Both contracts currently use the Memento wallet (`0x94fa4de058f958db3e808cf4a365760f3b61754d`) as owner and coordinator for the hackathon; package provenance does not replace runtime live checks.

The supported resolver uses `initialize(address,uint256,bytes[])`, `setAddr(bytes32,address)` and `setText(bytes32,string,string)`. Vault record nodes are the namehash of `<label>.eth`. Initializer setters run under upstream initialization semantics; afterward only the recipient controls the fresh resolver.

## Solidity documentation and lint invariants

NatSpec covers both escrow APIs, claim authorization, ENS adapter interfaces and the deployment
script. Existing interface imports remain available through `IEnsV2.sol`; definitions live in
individual interface files. Public getter names and function/event signatures are preserved.
Coordinator activation uses a checked uint64 timestamp conversion; its overflow error is included
in the generated TypeScript ABIs. Sponsorship release applies `nonReentrant` before authorization.

Forge lint rejects warnings and notes in the package lint task. Intentional timestamp deadlines,
exact deposit deltas, guarded post-transfer events and public getter naming have documented
exceptions. The contracts README records the temporary Foundry nightly preprocessing and
OpenZeppelin storage-analysis workarounds. Tests cover timestamp overflow rollback, replacing a
coordinator proposal, unauthorized funding, and the inclusive claim/exclusive recovery expiry
boundary in addition to the existing escrow scenarios. Live ENS compatibility and deployment
remain separate integration checks; these local tests use provider doubles.
