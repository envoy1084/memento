# Contracts

The backend targets ENSv2 on Sepolia and one configured payment token. MementoSponsorship funds recipient-owned HCAs; MementoNameVault holds existing names pending recipient claim. Neither contract may redirect active assets to an arbitrary coordinator destination.

Foundry tests cover recipient signatures, replay protection, bounded funding, campaign reservation accounting, expiry refunds, coordinator rotation, vault deposits, and clean resolver handoff. Existing-name deposits reject delegated registry roles; the sponsor must revoke those roles first. Never treat a source revision or historical deployment manifest as proof of live compatibility.
