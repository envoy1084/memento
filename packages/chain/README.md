# @memento/chain

Browser-safe TypeScript contract ABIs shared by the server and frontend. Solidity, deployment scripts, and Foundry tests stay in `@memento/contracts`.

- `pnpm --filter @memento/chain generate` rebuilds Solidity and regenerates the checked-in Memento ABIs.
- `pnpm --filter @memento/chain build` checks ENS profile drift and builds TypeScript exports without Foundry.
- `pnpm --filter @memento/contracts build` checks the generated ABIs against Foundry artifacts.

`@memento/chain/abi/ens` re-exports the ENSForge 0.4.0 ENSv2 ABIs. Do not place private RPC URLs or credentials in this package.

## Public settings

`@memento/chain/network` exposes Sepolia, two-confirmation policy and the `/rpc/sepolia` proxy path. `frontendSepolia(apiOrigin)` produces wallet/client chain configuration with only the proxy URL.

`src/deployments/sepolia.json` stores public contract addresses and the pinned ENS revision. ENS entries are generated from the ENSForge package; fill `contracts.sponsorship` after deployment. Null entries mean unconfigured, not zero-address contracts. The server validates the manifest with the protocol schema before connecting providers; Foundry reads the same file. Secrets, origins and provider environments stay in runtime environment variables.

Run `node packages/chain/scripts/sync-ens-deployment.mjs` from the root after upgrading ENSForge. The generator preserves the Memento address; do not edit generated ENS addresses independently.
