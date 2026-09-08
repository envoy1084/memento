# @memento/web

Memento’s Aura frontend: React 19, Vite, TanStack Router, Effect Atom, Namespace UIKit, Tailwind CSS v4, Motion, and Paper Shaders.

## Commands

- `pnpm --filter @memento/web dev` — preview on http://localhost:3000.
- `pnpm --filter @memento/web build` — production SPA in `dist/`.
- `pnpm --filter @memento/web preview` — serve the built SPA.
- `pnpm --filter @memento/web typecheck` and `test` — validate types and preview transitions.
- `pnpm check` — all workspace checks, required before commits.

No environment variables, backend, credentials, or wallet extensions are required for the existing preview UI. The app intentionally makes no API calls. Names, prices, authentication, World ID, payments, and registrations are simulated.

## Ownership

`routes/` groups file routes in folders. Collection pages use `index.tsx`; standalone and detail pages use `route.tsx` to preserve their existing URLs. The Router plugin owns `routeTree.gen.ts` and excludes `_components` folders from route discovery. Route-owned screens and journeys live in `routes/<group>/_components/`; route files handle parameters/search and pass them as props. The recipient journey is owned by `routes/claim/_components/` and reused by campaign invitations. `components/common/` contains shared controls, navigation, and page compositions built with UIKit; `components/display/` contains branding and gift artwork. The wrapping picker is shared by gift creation and profile editing, with its type derived from the protocol preview schema. `atoms/` owns preview state and deterministic transitions; `hooks/` adapts atoms to React. Runtime schemas live in `@memento/protocol`.

One Effect Atom registry is created per router and shared with React. Non-sensitive demo state persists under `memento:demo:v1` in localStorage and is schema-decoded on restoration. Saved previews are local to a browser; links for newly created gifts are not portable to another browser. Clearing this key resets fixtures. Do not store real claim credentials or auth tokens here.

Static hosting must fall back to `index.html` for route paths. The backend Docker image remains independent; see [frontend architecture](../../architecture/frontend/README.md).

## Real-service RPC configuration

`src/config/chain.ts` exposes the Sepolia `chain` for wallet providers and a shared viem `publicClient` for real-data atoms. Both use the Memento `/rpc/sepolia` proxy with no direct RPC fallback. Existing preview screens remain local until their integration is implemented.

Set public `VITE_API_URL` in `apps/web/.env` to the API origin when overriding the defaults: `http://localhost:3001` in development and `https://api.memento.envoy1084.xyz` in production. No paths, credentials, queries, or fragments are accepted. Keep Alchemy in server-only `RPC_URL` and use matching `WEB_ORIGIN` for CORS. The frontend tests verify that viem sends its JSON-RPC requests to the proxy.
