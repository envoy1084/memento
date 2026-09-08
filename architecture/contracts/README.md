# Contracts

The backend targets ENSv2 on Sepolia and one configured payment token. MementoSponsorship funds recipient-owned HCAs; MementoNameVault holds existing names pending recipient claim. Neither contract may redirect active assets to an arbitrary coordinator destination.

Foundry tests cover recipient signatures, replay protection, bounded funding, campaign reservation accounting, expiry refunds, coordinator rotation, vault deposits, and clean resolver handoff. Existing-name deposits reject delegated registry roles; the sponsor must revoke those roles first. Never treat a source revision or historical deployment manifest as proof of live compatibility.

Campaign deposits reserve one maximum budget per invitation. Each onchain reservation moves that budget out of the campaign's withdrawable balance. Sponsors may close a campaign early, cancelling invitations that have not been reserved onchain; existing reservations retain their budgets. Unreleased balances return to the sponsor on completion or expiry. Price/length policy is enforced by the application coordinator; the contract enforces signed identity, bounded release and custody.

Existing-name deposits require no other token-level delegates. The vault creates a fresh resolver at claim time, grants all resolver roles solely to the recipient, writes approved records, switches the registry resolver and transfers the current token ID atomically. The sender's old resolver is not reused.

`packages/contracts/script/Deploy.s.sol` deploys both Memento contracts on Sepolia. It does not deploy ENS itself. Keep the admin separate from the coordinator, and run `pnpm --filter @memento/chain generate` after Solidity changes.

`packages/contracts` owns Solidity, Foundry tests and deployment scripts only. `packages/chain` owns browser-safe TypeScript ABIs and pinned ENS integration signatures. The contracts build verifies checked-in ABIs against its artifacts; the server and frontend can build their TypeScript dependencies without Foundry.

## Public deployment configuration

`packages/chain/src/deployments/sepolia.json` is the shared public manifest used by the Node adapter and Foundry deployment script. The protocol schema pins Sepolia and the ENS revision and rejects incomplete or zero-address deployments. Two confirmations are fixed in `@memento/chain/network`. Live bytecode, immutable bindings and ownership checks still run after configuration decoding. No deployment addresses have been verified yet; null entries explicitly record that outstanding integration work.
