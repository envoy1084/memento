# Frontend

`apps/web` is a separate Vite SPA following Namera’s source-condition and package-boundary conventions. It uses React 19, TanStack file routes, a router-owned Effect Atom registry shared with React, Namespace UIKit controls, and Tailwind v4 utilities. Only semantic theme tokens and global Tailwind base/component applications live in CSS. Fonts are bundled locally. Paper’s shader is lazy-loaded; the gift illustration remains legible without WebGL and with reduced motion.

Shared controls and page compositions live in `components/common/`; brand marks and keepsake artwork live in `components/display/`. UIKit owns control semantics, while Tailwind theme ramps and utilities preserve the Aura presentation. Wrapping types derive from the protocol preview model.

Route folders mirror URL segments, including dynamic identifier folders. Use `index.tsx` for collection indexes and `route.tsx` for exact page paths. Vite excludes `_components` folders with `routeFileIgnorePattern`; these contain route-owned rendering and are never endpoints. Regenerate `routeTree.gen.ts` through the web build after moving route files. Route modules remain thin: they read URL parameters/search and pass props into `_components` screens. `send` owns its gift wizard, `campaigns` owns its wizard and management screens, and `claim` owns the recipient journey reused by `invite`. Home-specific presentation lives in `routes/_components/`. There is no separate `features/` layer.

## Implemented journeys

- `/`: Aura discovery and entry points for all three gift cases.
- `/send`: choose-your-own and owned-name gifts, policy, personal note/wrapping, review, local creation.
- `/gifts`, `/gifts/:giftId`: search/filter, detail, invitation copying, preview, cancellation/return.
- `/campaigns`, `/campaigns/new`, `/campaigns/:campaignId`: policy/review, local creation, claim progress, invitation creation/export, pause/resume/close.
- `/claim/:giftId`, `/invite/:campaignId/:invitationId`: gift opening, name selection, illustrative availability, real Privy login/verified wallet, optional simulated World ID, review, progress, completion; unavailable/expired/claimed states.
- `/profile`: claimed names, profile copy, bio, website, color, primary-name selection.
- `/help`: newcomer explanations and explicit preview limitations. Unknown routes have recovery UI.

## State and invariants

Preview schemas are explicitly named and owned by `packages/protocol/src/model/preview.ts`; they do not replace live API DTOs. `apps/web/src/atoms/demo.ts` owns deterministic demo transitions and seed records. Forms keep unsaved edits in React state. Mutations update the shared atom; localStorage persists only the preview, with versioned schema validation and a visible storage failure notice.

Gifts and invitations can be claimed only once. Expired/returned gifts and paused/closed/exhausted campaigns reject claims. An owned-name gift always transfers its exact preview name. Campaign claims consume one invitation and increment progress. Name availability and pricing are illustrative, bounded by the gift’s budget, length, and duration. Profile primary selection clears other primary flags.

## Verification and future integration

The preview transition tests cover name rules/budget/duration, one-time claims, exact-name gifts, campaign eligibility/state, and saved-state decoding. The folder reorganization was verified with the full workspace check and browser smoke checks of discovery, both sender modes, gift lists/details, campaign lists/creation/details, both invitation paths, profile, and help. This check verified route loading; it did not repeat the complete transaction simulations or responsive visual review.

A real-service viem client and wallet chain configuration now live in `src/config/chain.ts`, using the server’s `/rpc/sepolia` endpoint. Public `VITE_API_URL` selects the API origin; no provider key or direct Alchemy fallback is bundled. Tests verify the proxy destination and reject credential-bearing or non-origin URLs. Preview screens do not consume this client yet.

Privy login and the generated session API client are connected. No real World ID proof, ENS quote, payment, gifting email, or onchain write is connected to the UI. Integration must replace the preview adapter with the existing schema-first API client and provider flows. Real invitation secrets must follow the backend fragment/POST design and never enter localStorage. No real email address is required to explore the UI.

Deploy `dist/` on a static server with an index fallback; keep API deployment independent. This change does not publish the app or modify DNS.

## Authentication boundary

The router-owned registry wraps a lazy Privy provider. Privy owns login/token persistence; React exposes SDK readiness and the verified session atom. The API middleware asks the SDK for a current token per request, sends it only as a bearer header to the API origin, and refuses redirects. Session atoms are recreated when the Privy user changes; logout removes the actor from the UI. Wallet connection changes refresh the server profile, and only connected addresses also verified by the backend are usable. The legacy preview `connected` flag has been removed; creating a preview gift cannot authenticate a user.

Login does not create a local database account: `/v1/session` returns the verified Privy actor. Gift and claim persistence remains owned by existing workflows. Contract deployment and unrelated provider settings are still needed to start the full backend, so frontend login configuration alone does not guarantee session verification is reachable.

Verification uses injected transport for token refresh, missing/expired tokens, invalid response schemas, and account changes. Live email OTP, wallet signatures, refresh persistence, and dashboard-origin configuration require the real Privy app and have not been verified by these tests.
