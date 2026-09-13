# Memento web

React + UIKit sender and recipient journeys, backed by the Memento API. Privy handles email login and sponsored recipient transactions; wagmi and ENSForge handle wallet identity and sender batches.

Run `pnpm --filter @memento/web dev` for http://localhost:3000. Configure the public Privy app ID and API origin using this app’s environment example. The API and a fresh deployed escrow are required for real gifting.

Run `pnpm --filter @memento/web test`, `typecheck`, or `build`. The build regenerates the route tree. Route-owned screens live in `_components`; shared controls and artwork live under `components`.

See [frontend architecture](../../architecture/frontend/README.md) and [deployment](../../architecture/deployment/README.md).

After registration, recipients can optionally set the new name as their wallet’s primary name. ENSForge prepares and verifies the reverse-record call; the existing Privy-sponsored claim transport sends it and waits for confirmation, then refreshes the shared primary-name lookup. This adds one optional transaction and needs no escrow redeployment. Live Privy sponsorship must allow the ENS reverse registrar adapter.

Successful claims celebrate with a short, lazy-loaded `canvas-confetti` sequence using the theme’s lavender, blush and sage colors. Reduced-motion preferences disable it; navigating away cancels it. The celebration plays whenever a successfully claimed gift is opened, including on refresh.
