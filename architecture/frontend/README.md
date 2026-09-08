# Frontend

`apps/web` is a separate Vite SPA following Namera’s source-condition and package-boundary conventions. It uses React 19, TanStack file routes, a router-owned Effect Atom registry shared with React, Namespace UIKit controls, and Tailwind v4 utilities. Only semantic theme tokens and global Tailwind base/component applications live in CSS. Fonts are bundled locally. Paper’s shader is lazy-loaded; the gift illustration remains legible without WebGL and with reduced motion.

Shared controls and page compositions live in `components/common/`; brand marks and keepsake artwork live in `components/display/`. UIKit owns control semantics, while Tailwind theme ramps and utilities preserve the Aura presentation. Wrapping types derive from the protocol preview model.

Route folders mirror URL segments, including dynamic identifier folders. Use `index.tsx` for collection indexes and `route.tsx` for exact page paths. Vite excludes `_components` folders with `routeFileIgnorePattern`; these contain route-owned rendering and are never endpoints. Regenerate `routeTree.gen.ts` through the web build after moving route files.

## Implemented journeys

- `/`: Aura discovery and entry points for all three gift cases.
- `/send`: choose-your-own and owned-name gifts, policy, personal note/wrapping, review, local creation.
- `/gifts`, `/gifts/:giftId`: search/filter, detail, invitation copying, preview, cancellation/return.
- `/campaigns`, `/campaigns/new`, `/campaigns/:campaignId`: policy/review, local creation, claim progress, invitation creation/export, pause/resume/close.
- `/claim/:giftId`, `/invite/:campaignId/:invitationId`: gift opening, name selection, illustrative availability, wallet choice, optional simulated World ID, review, progress, completion; unavailable/expired/claimed states.
- `/profile`: claimed names, profile copy, bio, website, color, primary-name selection.
- `/help`: newcomer explanations and explicit preview limitations. Unknown routes have recovery UI.

## State and invariants

Preview schemas are explicitly named and owned by `packages/protocol/src/model/preview.ts`; they do not replace live API DTOs. `apps/web/src/atoms/demo.ts` owns deterministic demo transitions and seed records. Forms keep unsaved edits in React state. Mutations update the shared atom; localStorage persists only the preview, with versioned schema validation and a visible storage failure notice.

Gifts and invitations can be claimed only once. Expired/returned gifts and paused/closed/exhausted campaigns reject claims. An owned-name gift always transfers its exact preview name. Campaign claims consume one invitation and increment progress. Name availability and pricing are illustrative, bounded by the gift’s budget, length, and duration. Profile primary selection clears other primary flags.

## Verification and future integration

The preview transition tests cover name rules/budget/duration, one-time claims, exact-name gifts, campaign eligibility/state, and saved-state decoding. Browser QA covers sender/recipient/campaign journeys and responsive layouts.

No live API client, Privy login, wallet call, real World ID proof, ENS quote, payment, email, or onchain write is connected. Integration must replace the preview adapter with the existing schema-first API client and provider flows. Real invitation secrets must follow the backend fragment/POST design and never enter localStorage. No real email address is required to explore the UI.

Deploy `dist/` on a static server with an index fallback; keep API deployment independent. This change does not publish the app or modify DNS.
