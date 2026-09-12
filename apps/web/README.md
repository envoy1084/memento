# Memento web

React + UIKit sender and recipient journeys, backed by the Memento API. Privy handles email login and sponsored recipient transactions; wagmi and ENSForge handle wallet identity and sender batches.

Run `pnpm --filter @memento/web dev` for http://localhost:3000. Configure the public Privy app ID and API origin using this app’s environment example. The API and a fresh deployed escrow are required for real gifting.

Run `pnpm --filter @memento/web test`, `typecheck`, or `build`. The build regenerates the route tree. Route-owned screens live in `_components`; shared controls and artwork live under `components`.

See [frontend architecture](../../architecture/frontend/README.md) and [deployment](../../architecture/deployment/README.md).
