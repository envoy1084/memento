# Contracts

The backend targets ENSv2 on Sepolia and one configured payment token. MementoSponsorship funds recipient-owned HCAs; MementoNameVault holds existing names pending recipient claim. Neither contract may redirect active assets to an arbitrary coordinator destination.

Foundry tests cover recipient signatures, replay protection, bounded funding, campaign reservation accounting, expiry refunds, coordinator rotation, vault deposits, and clean resolver handoff. Existing-name deposits reject delegated registry roles; the sponsor must revoke those roles first. Never treat a source revision or historical deployment manifest as proof of live compatibility.

Campaign deposits reserve one maximum budget per invitation. Each onchain reservation moves that budget out of the campaign's withdrawable balance. Sponsors may close a campaign early, cancelling invitations that have not been reserved onchain; existing reservations retain their budgets. Unreleased balances return to the sponsor on completion or expiry. Price/length policy is enforced by the application coordinator; the contract enforces signed identity, bounded release and custody.

Existing-name deposits require no other token-level delegates. The vault creates a fresh resolver at claim time, grants all resolver roles solely to the recipient, writes approved records, switches the registry resolver and transfers the current token ID atomically. The sender's old resolver is not reused.

`packages/contracts/script/Deploy.s.sol` deploys both Memento contracts on Sepolia. It does not deploy ENS itself. Keep the admin separate from the coordinator, and use the checked-in ABI generation script after Solidity changes.
