# Memento web

React + UIKit sender and recipient journeys, backed by the Memento API. Privy handles email login and sponsored recipient transactions; wagmi and ENSForge handle wallet identity and sender batches.

Run `pnpm --filter @memento/web dev` for http://localhost:3000. Configure the public Privy app ID and API origin using this app’s environment example. The API and a fresh deployed escrow are required for real gifting.

Run `pnpm --filter @memento/web test`, `typecheck`, or `build`. The build regenerates the route tree. Route-owned screens live in `_components`; shared controls and artwork live under `components`.

See [frontend architecture](../../architecture/frontend/README.md) and [deployment](../../architecture/deployment/README.md).

After registration, recipients can optionally set the new name as their wallet’s primary name. ENSForge prepares and verifies the reverse-record call; the existing Privy-sponsored claim transport sends it and waits for confirmation, then refreshes the shared primary-name lookup. This adds one optional transaction and needs no escrow redeployment. Live Privy sponsorship must allow the ENS reverse registrar adapter.

Successful claims celebrate with a short, lazy-loaded `canvas-confetti` sequence using the theme’s lavender, blush and sage colors. Reduced-motion preferences disable it; navigating away cancels it. The celebration plays whenever a successfully claimed gift is opened, including on refresh.

## Deployment

Build `apps/web/Dockerfile` with repository-root context and public `VITE_API_URL` and
`VITE_PRIVY_APP_ID` build arguments. Nginx serves the compiled app on port 80 with SPA fallback.
See the [Dokploy guide](../../architecture/deployment/README.md#dokploy-vps).

For Vercel, set the project Root Directory to `apps/web`, enable access to files outside that
root for workspace dependencies, and use the Vite preset (build `pnpm build`, output `dist`).
Set `VITE_API_URL` and `VITE_PRIVY_APP_ID` in Vercel's environment settings before building.
The app-owned `vercel.json` rewrites direct routes to `index.html` so invitation URLs and browser
refreshes load the SPA. Redeploy after adding the configuration. The API remains on Dokploy.

SEO metadata lives in `index.html`: title, description, canonical URL, Open Graph and Twitter cards.
Public assets include a 1200×630 PNG share image, SVG/PNG favicon and Apple touch icon. The sitemap
lists the homepage, which is the canonical landing page for this SPA. Both Vercel and Nginx send
`X-Robots-Tag: noindex, nofollow` for gift, claim and dashboard routes. Robots can crawl those routes
to read the directive; this is indexing policy, not access control. Social previews contain only
product copy, never recipient information. Update the production domain in metadata, sitemap and
robots.txt if the frontend moves. Full page-content SEO still depends on JavaScript rendering.
