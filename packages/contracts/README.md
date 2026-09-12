# Memento contracts

Nonupgradeable escrow for new ENS name gifts. ENS interfaces target contracts-v2
ENSForge 0.4.0 deployed source `d0c902eeb388c7fbde3f95d9eaf6076eeedff1d7`; upstream implementations are not copied.
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

## Direct registration

`Deploy.s.sol` deploys only `MementoRegistration`. Registration inherits deposit
and refund accounting from the sponsorship base. Its `registerGift` entrypoint combines resolver
creation, bounded registrar payment, recipient ownership verification and refund in one transaction
after a separate ENS commitment. `DirectRegistration.t.sol` covers the delay and atomic rollback.

Deployment is manual. See [commands and fresh setup](../../architecture/deployment/README.md).
