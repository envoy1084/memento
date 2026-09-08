# @memento/api

Shared Effect HttpApi contract. Handlers belong in apps/server.

Run `pnpm --filter @memento/api typecheck`, `test`, or `build` from the repository root.

`GET /v1/session` requires a Privy bearer token and returns the verified actor (Privy user ID, linked Ethereum wallets, verified emails). It does not create a database user or persist tokens.
