# @memento/web

Memento’s Aura frontend: React 19, Vite, TanStack Router, Effect Atom, Namespace UIKit, Tailwind CSS v4, Motion, and Paper Shaders.

## Commands

- `pnpm --filter @memento/web dev` — preview on http://localhost:3000.
- `pnpm --filter @memento/web build` — production SPA in `dist/`.
- `pnpm --filter @memento/web preview` — serve the built SPA.
- `pnpm --filter @memento/web typecheck` and `test` — validate types and preview transitions.
- `pnpm check` — all workspace checks, required before commits.

Names, prices, World ID, payments, and registrations remain previews. Authentication uses real Privy email/wallet login when configured. Without a public Privy App ID, browsing remains available and sign-in explains that it is unavailable.

## Ownership

`routes/` groups file routes in folders. Collection pages use `index.tsx`; standalone and detail pages use `route.tsx` to preserve their existing URLs. The Router plugin owns `routeTree.gen.ts` and excludes `_components` folders from route discovery. Route-owned screens and journeys live in `routes/<group>/_components/`; route files handle parameters/search and pass them as props. The recipient journey is owned by `routes/claim/_components/` and reused by campaign invitations. `components/common/` contains shared controls, navigation, and page compositions built with UIKit; `components/display/` contains branding and gift artwork. The wrapping picker is shared by gift creation and profile editing, with its type derived from the protocol preview schema. `atoms/` owns preview state and deterministic transitions; `hooks/` adapts atoms to React. Runtime schemas live in `@memento/protocol`.

One Effect Atom registry is created per router and shared with React. Non-sensitive demo state persists under `memento:demo:v1` in localStorage and is schema-decoded on restoration. Saved previews are local to a browser; links for newly created gifts are not portable to another browser. Clearing this key resets fixtures. Do not store real claim credentials or auth tokens here.

Static hosting must fall back to `index.html` for route paths. The backend Docker image remains independent; see [frontend architecture](../../architecture/frontend/README.md).

## Real-service RPC configuration

`src/config/chain.ts` exposes the Sepolia `chain` for wallet providers and a shared viem `publicClient` for real-data atoms. Both use the Memento `/rpc/sepolia` proxy with no direct RPC fallback. Existing preview screens remain local until their integration is implemented.

Set public `VITE_API_URL` in `apps/web/.env` to the API origin when overriding the defaults: `http://localhost:3001` in development and `https://api.memento.envoy1084.xyz` in production. No paths, credentials, queries, or fragments are accepted. Keep Alchemy in server-only `RPC_URL` and use matching `WEB_ORIGIN` for CORS. The frontend tests verify that viem sends its JSON-RPC requests to the proxy.

## Privy authentication

Set `VITE_PRIVY_APP_ID` in `apps/web/.env` to the same public App ID as the server’s `PRIVY_APP_ID`. Keep `PRIVY_APP_SECRET` server-only. In the Privy dashboard enable email and wallet login and allow `http://localhost:3000` plus the deployed web origin. The provider creates an Ethereum embedded wallet on login for users without wallets and uses the shared Sepolia chain/proxy. External wallets may use their own provider transport.

The shared connect dialog offers real login, verified account details, wallet reconnection, verification retry, and logout. An Effect Atom fetches `GET /v1/session` through the generated API client; it retrieves a fresh Privy access token per protected request. Memento does not copy tokens or authenticated identity into preview localStorage. Privy manages its own session persistence. Login itself creates no Memento database row. Claim preview continuation requires a connected wallet present in the server-verified actor.

`@privy-io/react-auth` owns authentication and wallet lifecycle. Optional native acceleration/install scripts from its transitive dependencies are disabled; browser builds use their JavaScript implementations. Vite preserves default browser export conditions alongside `memento-source` so SDK dependencies resolve correctly. Public environment inputs participate in the web build cache.

Tests cover bearer-token refresh, missing/expired credentials, malformed responses, and isolation between accounts and logout. Complete an email and external-wallet sign-in against the configured Privy app and running backend before considering the live login verified; a local test provider cannot validate dashboard settings or deliver an OTP.
