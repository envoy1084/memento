# Memento

Gift someone a new ENS name. The sender chooses a USDC budget, registration years and name-length limits, then enters the recipient’s name, email and a note. The recipient signs in with that email and chooses their name without needing ETH or USDC.

The monorepo contains a React frontend, an Effect API and worker, PostgreSQL persistence, Privy authentication and sponsorship, ENSForge integration, and one registration escrow contract. See [architecture](architecture/README.md).

## Development

Use Node.js 24, the pinned pnpm version, and Foundry.

```sh
corepack enable
pnpm install
pnpm check
```

Copy `.env.example` to `.env` and configure providers using the [deployment guide](architecture/deployment/README.md). Start local PostgreSQL with `docker compose up -d --wait`, then run `pnpm dev`. The frontend runs at http://localhost:3000.

`pnpm check` runs formatting, lint, types, tests and builds. `pnpm test:postgres` runs concurrency checks against disposable PostgreSQL. `pnpm format` applies Oxfmt formatting.

This is a fresh development schema and contract interface. Reset the development database and deploy the new escrow before a live test; old gifts are not migrated. Deployment is a manual operator action.

Deploy the web and API Dockerfiles through Dokploy using the [VPS deployment guide](architecture/deployment/README.md#dokploy-vps).
