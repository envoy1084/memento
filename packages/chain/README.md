# @memento/chain

Browser-safe TypeScript contract ABIs shared by the server and frontend. Solidity, deployment scripts, and Foundry tests stay in `@memento/contracts`.

- `pnpm --filter @memento/chain generate` rebuilds Solidity and regenerates the checked-in Memento ABIs.
- `pnpm --filter @memento/chain build` builds the TypeScript exports without Foundry.
- `pnpm --filter @memento/contracts build` checks the generated ABIs against Foundry artifacts.

`@memento/chain/abi/ens` owns integration signatures for the pinned ENSv2 post-audit-2 revision. Do not place private RPC URLs or credentials in this package.
