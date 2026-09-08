# Memento contributor guide

## Repository shape

- `apps/` contains deployable applications and runtime composition roots.
- `packages/` contains focused libraries shared by more than one application or owning a distinct domain boundary.
- The repository root owns workspace-wide tooling only.
- `research/` contains local planning material and is intentionally ignored by Git.

Do not create packages for symmetry. Add a workspace package only when it has a distinct runtime,
dependency direction, build lifecycle, or multiple consumers.

## Tooling

- Use Node.js 24 and the exact pnpm version declared in `package.json`.
- Use the Klarity presets for TypeScript, Oxlint, Oxfmt, Commitlint, Turbo, and Lefthook.
- Do not introduce Prettier, ESLint, Husky, or lint-staged alongside the existing toolchain.
- Run `pnpm check` before committing.
- Use Conventional Commits with kebab-case scopes.

## Package conventions

- Give every application or package its own `package.json`, `README.md`, and environment-appropriate
  Klarity `tsconfig.json`.
- Keep deployment-specific values and secrets in environment variables; keep stable product policy in
  typed code.
- Use package imports across workspace boundaries and keep dependency direction explicit.
- Never commit secrets or files from `research/`.

## Effect and backend conventions

Before writing Effect code, read `node_modules/effect/AGENTS.md` completely and follow its local documentation. Use class-based `Context.Service`, `Layer`, `Effect.gen`, and named `Effect.fn` operations.

Follow the Namera reference conventions: `#/*` package imports, `memento-source` source exports, transaction-aware repositories, and package-owned provider test Layers. Public contracts belong in `api`/`protocol`; workflows belong in `application`; runtime composition belongs in `apps/server`. Tests use migrated PGlite, with real PostgreSQL for concurrency. Do not implement frontend work until requested.

## Architecture documentation

Read the relevant document in `architecture/` before cross-package changes. Update it with implemented behavior, invariants, tests, and concrete remaining integration work. Keep package-specific commands in package READMEs. A placeholder or schema alone is not a completed feature.

## Frontend organization

- Group routes in folders matching URL segments; use `index.tsx` for collection indexes and `route.tsx` for exact pages. Avoid dotted flat route filenames.
- Keep route modules focused on routing, parameters, and search. Put route-owned screens and journeys in that group’s `_components/` folder. Vite excludes these folders from route generation.
- Keep shared controls and page compositions in `apps/web/src/components/common/`, and branding/artwork in `components/display/`. Shared persisted types derive from `@memento/protocol`.
- Use `#/*` imports inside the web app. Let the Router plugin regenerate `routeTree.gen.ts` after route moves. Preserve URLs when reorganizing code.

## Source readability and commit size

- Separate setup, guards, computation, state changes, external calls, and results with blank lines when they form distinct logical phases. Keep closely related declarations and assignments together.
- Separate independent functions, service operations, and test phases. Avoid adding a blank line after every statement.
- Add comments only for non-obvious intent, ordering constraints, invariants, or compatibility decisions; do not narrate the code. Preserve generated output rather than hand-formatting it.
- Keep each commit at or below 3,000 changed lines (additions plus deletions). Split larger work into focused commits.
