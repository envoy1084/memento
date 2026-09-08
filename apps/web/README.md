# @memento/web

Memento’s Aura frontend: React 19, Vite, TanStack Router, Effect Atom, Namespace UIKit, Tailwind CSS v4, Motion, and Paper Shaders.

## Commands

- `pnpm --filter @memento/web dev` — preview on http://localhost:3000.
- `pnpm --filter @memento/web build` — production SPA in `dist/`.
- `pnpm --filter @memento/web preview` — serve the built SPA.
- `pnpm --filter @memento/web typecheck` and `test` — validate types and preview transitions.
- `pnpm check` — all workspace checks, required before commits.

No environment variables, backend, credentials, or wallet extensions are required. The app intentionally makes no API calls. Names, prices, authentication, World ID, payments, and registrations are simulated.

## Ownership

`routes/` defines file routes; the Router plugin owns `routeTree.gen.ts`. `features/` composes individual journeys. `components/common/` contains shared controls, navigation, and page compositions built with UIKit; `components/display/` contains branding and gift artwork. The wrapping picker is shared by gift creation and profile editing, with its type derived from the protocol preview schema. `atoms/` owns preview state and deterministic transitions; `hooks/` adapts atoms to React. Runtime schemas live in `@memento/protocol`.

One Effect Atom registry is created per router and shared with React. Non-sensitive demo state persists under `memento:demo:v1` in localStorage and is schema-decoded on restoration. Saved previews are local to a browser; links for newly created gifts are not portable to another browser. Clearing this key resets fixtures. Do not store real claim credentials or auth tokens here.

Static hosting must fall back to `index.html` for route paths. The backend Docker image remains independent; see [frontend architecture](../../architecture/frontend/README.md).
