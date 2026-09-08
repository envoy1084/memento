# Memento contracts

Nonupgradeable sponsorship escrow and ENSv2 name vault. ENS interfaces target contracts-v2
`post-audit-2` at `6cd019f567c8eb0ca306c78851d4d58876a8e1df`; upstream implementations are not copied.
Run `pnpm --filter @memento/contracts test` with Foundry installed.

TypeScript ABIs live in `@memento/chain`. After changing Solidity, run `pnpm --filter @memento/chain generate`. `pnpm --filter @memento/contracts build` compiles contracts and verifies ABI freshness. This Foundry-only package has no TypeScript runtime exports.
