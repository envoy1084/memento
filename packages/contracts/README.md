# Memento contracts

Nonupgradeable sponsorship escrow and ENSv2 name vault. ENS interfaces target contracts-v2
ENSForge 0.4.0 deployed source `09bf3ac64a6fb1b215573c019b17e8c501bb3ca0`; upstream implementations are not copied.
Run `pnpm --filter @memento/contracts test` with Foundry installed.

TypeScript ABIs live in `@memento/chain`. After changing Solidity, run `pnpm --filter @memento/chain generate`. `pnpm --filter @memento/contracts build` compiles contracts and verifies ABI freshness. This Foundry-only package has no TypeScript runtime exports.
