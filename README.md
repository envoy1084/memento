# Memento

Memento is an ETHGlobal ETHOnline hackathon project for gifting a complete, self-custodial ENS
identity.

The backend implements chosen-name gifts, existing-name gifts, and invitation campaigns.
`apps/server` runs an Effect HttpApi and durable workers in one Node process. Focused packages own
protocol schemas, application workflows, Drizzle/PostgreSQL, Privy, World ID, and Solidity contracts.
The frontend is not implemented. See [architecture](architecture/README.md) for boundaries and tests.

## Requirements

- Node.js 24 (see `.node-version`)
- Corepack
- Foundry (Solidity builds and contract tests)

## Getting started

```sh
corepack enable
pnpm install
pnpm check
```

## Commands

| Command              | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `pnpm dev`           | Run every package's development task                         |
| `pnpm build`         | Build the workspace in dependency order                      |
| `pnpm test:postgres` | Verify real PostgreSQL concurrency in a disposable container |
| `pnpm test`          | Run workspace tests                                          |
| `pnpm typecheck`     | Type-check root configuration and workspace code             |
| `pnpm lint`          | Lint root configuration and workspace code                   |
| `pnpm format`        | Format supported files with Oxfmt                            |
| `pnpm format:check`  | Check formatting without writing                             |
| `pnpm check`         | Run formatting, linting, type-checks, tests/build            |

Klarity supplies the shared configuration for TypeScript, Oxfmt, Oxlint, Commitlint, Turborepo, and
Lefthook. The research material is intentionally local-only and ignored by Git.

For environment setup and a single VPS deployment, see [deployment](architecture/deployment/README.md).

## Frontend preview

Run `pnpm --filter @memento/web dev` and open http://localhost:3000. The Aura app includes sender, recipient, campaign, and profile journeys using local preview state; no backend or credentials are needed. See [frontend architecture](architecture/frontend/README.md) for the integration boundary.
