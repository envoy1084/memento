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
