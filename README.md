# Memento

Memento is an ETHGlobal ETHOnline hackathon project for gifting a complete, self-custodial ENS
identity.

This repository currently contains a deliberately empty pnpm/Turborepo workspace. Deployable
applications belong in `apps/`; shared domain or infrastructure libraries belong in `packages/` only
when a real boundary or reuse case exists.

## Requirements

- Node.js 24 (see `.node-version`)
- Corepack

## Getting started

```sh
corepack enable
pnpm install
pnpm check
```

## Commands

| Command             | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | Run every package's development task              |
| `pnpm build`        | Build the workspace in dependency order           |
| `pnpm test`         | Run workspace tests                               |
| `pnpm typecheck`    | Type-check root configuration and workspace code  |
| `pnpm lint`         | Lint root configuration and workspace code        |
| `pnpm format`       | Format supported files with Oxfmt                 |
| `pnpm format:check` | Check formatting without writing                  |
| `pnpm check`        | Run formatting, linting, type-checks, tests/build |

Klarity supplies the shared configuration for TypeScript, Oxfmt, Oxlint, Commitlint, Turborepo, and
Lefthook. The research material is intentionally local-only and ignored by Git.
