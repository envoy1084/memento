# Memento contracts

Nonupgradeable sponsorship escrow and ENSv2 name vault. ENS interfaces target contracts-v2
ENSForge 0.4.0 deployed source `09bf3ac64a6fb1b215573c019b17e8c501bb3ca0`; upstream implementations are not copied.
Run `pnpm --filter @memento/contracts test` with Foundry installed.

TypeScript ABIs live in `@memento/chain`. After changing Solidity, run `pnpm --filter @memento/chain generate`. `pnpm --filter @memento/contracts build` compiles contracts and verifies ABI freshness. This Foundry-only package has no TypeScript runtime exports.

## Contract checks and documentation

Run `pnpm --filter @memento/contracts lint` for formatting and Forge lint; both warnings and
notes fail the lint task. Run `pnpm check` before committing. NatSpec on the escrows and ENS
interfaces describes units, signed commitments, caller permissions and coordinator trust.

The Foundry configuration disables dynamic test linking because the installed 1.8.0 nightly
Solar preprocessor misresolves the indirect `Ownable` constructor. Tests use normal solc
compilation instead. That nightly also reports OpenZeppelin EIP-712 fallback strings as
uninitialized despite writes through `ShortStrings` storage helpers, including when dependencies
are excluded. The project-wide `uninitialized-state` lint is temporarily excluded until that
upstream analysis is fixed; compiler warnings remain enabled. Assembly-hashing and single-use
modifier suggestions are excluded to preserve readable digest code and explicit authorization.
Other intentional exceptions are scoped beside the relevant source with their rationale.
