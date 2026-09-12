# Frontend

The React app uses UIKit, TanStack Router, Privy, wagmi and ENSForge React. Shared persisted types derive from `@memento/protocol`; there is no demo store.

- `/`: product introduction.
- `/send`: budget, duration and name limits; recipient name/email, note and wrapping; review and atomic funding.
- `/gifts` and `/gifts/:giftId`: sent gifts, delivery status and refunds.
- `/g/:giftId` and `/claim/:giftId`: invitation and authenticated name claim.
- `/help`: product explanation.

Route modules handle routing; `_components` owns each journey. `components/common` holds shared controls and `components/display` owns branding and artwork. The Router plugin generates the route tree.

The sender uses ENSForge `useSendCalls` with required atomic wallet batching. The receiver uses Privy-sponsored transactions prepared by ENSForge and the backend. There is no paid receiver fallback. Registration has two onchain transactions separated by the ENS commitment delay; the UI shows progress and continues while open. A separate typed signature binds recipient consent. Profile editing is outside the current product.

Amounts use the shared UIKit number display, dates use human-readable date helpers, and wallet identity uses ENSForge primary name/avatar lookup with the Memento logo as fallback. Secrets are not stored in the demo/localStorage state. Session transaction markers prevent accidental replay after an uncertain wallet response.

Tests cover transport, wallet identity, formatting, funding batch receipts and recipient signature construction. Live wallet UX and sponsorship still need a fresh end-to-end test after deployment.
