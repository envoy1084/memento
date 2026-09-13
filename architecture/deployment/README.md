# Deployment and fresh development setup

Use Node.js 24, pinned pnpm, PostgreSQL 17 and Foundry. Copy `.env.example` to `.env`; set separate encryption/HMAC keys, Privy credentials, RPC URL and coordinator signing key. Keep all secrets outside Git. Set `WEB_ORIGIN=http://localhost:3000` locally.

Enable email login and Sepolia gas sponsorship for embedded wallets in Privy. Browser RPC uses the API proxy. Development email prints the full invitation on the server console; production requires `NODE_ENV=production`, Resend credentials and a verified sender domain.

## Manual contract deployment

The following command broadcasts only when **you** run it. Import an encrypted deployer keystore first, and export `RPC_URL`, `CONTRACT_ADMIN`, `COORDINATOR_ADDRESS` and `ETHERSCAN_API_KEY` in your shell. The coordinator address must match the server signing key. The deployer needs Sepolia ETH.

```sh
cast wallet import memento-deployer --interactive
cd packages/contracts
forge script script/Deploy.s.sol:Deploy \
  --account memento-deployer \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --verify \
  --etherscan-api-key "$ETHERSCAN_API_KEY"
```

The command deploys and submits the source for Etherscan verification. Check both results before recording the address.

The script deploys one `MementoRegistration` using the checked-in ENS/token dependencies. Put its address into `contracts.sponsorship` in `packages/chain/src/deployments/sepolia.json`, then rebuild/restart the apps. No old contract address is compatible with this fresh interface. ENS itself is not redeployed. The coordinator only signs attestations and does not need funds for broadcasting claims.

## Fresh database

Stop the old server first. The operator must wipe the development database before starting this version; the single initial migration cannot upgrade the old schema. No existing gifts are migrated. Server startup applies the checked-in migrations to the empty database.

```sh
pnpm install
docker compose up -d --wait
pnpm --filter @memento/server dev
pnpm --filter @memento/web dev
```

The local `compose.yaml` runs PostgreSQL only and retains the existing `memento-local` volume. Stopping Compose alone does not reset it. VPS deployment uses Dokploy as described below.

## Verify before the demo

Check `/health/ready`, create and fund a new gift, inspect the development email, then sign in as its recipient. Confirm both sponsored transactions complete and that ownership, resolver, leftover refund and gift status match. Local tests do not prove Privy sponsorship or live ENS configuration.

The receiver needs no ETH or USDC when sponsorship is configured. The sender funds the registration budget. A price above that budget is rejected. Unclaimed gifts remain refundable; registration and its leftover refund are atomic. Keep database and encryption-key backups together outside development resets.

## Dokploy VPS

Create one project with PostgreSQL and two **Application** services from this repository. Dokploy
handles routing and HTTPS; the API includes its background worker, so no separate worker is needed.
These containers still use **Sepolia**, not Ethereum mainnet.

| Service | Build type | Dockerfile path       | Docker context | Container port |
| ------- | ---------- | --------------------- | -------------- | -------------- |
| API     | Dockerfile | `Dockerfile`          | `.`            | `3001`         |
| Web     | Dockerfile | `apps/web/Dockerfile` | `.`            | `80`           |

Leave Docker Build Stage and command overrides empty. Both apps use the repository root as the
build context. See Dokploy's [Dockerfile settings](https://docs.dokploy.com/docs/core/applications/build-type)
and [domain settings](https://docs.dokploy.com/docs/core/domains).

1. Create a PostgreSQL service using `postgres:17-alpine`, database `memento`, and a strong password.
   Deploy it and copy its internal connection URL into the API's `DATABASE_URL`. Keep PostgreSQL
   private, with persistent storage and scheduled backups.
2. Create the API application, connect the repository/branch and select the settings above.
   Enter the runtime variables below in its Environment tab. Deploy it, then attach your API
   hostname (for example `api.memento.example`) to container port **3001**, with HTTPS enabled.
3. Create the web application with the settings above. In Environment → **Build Time Arguments**,
   enter the two public values below. Deploy and attach your web hostname (for example
   `memento.example`) to container port **80**, with HTTPS enabled. Point both DNS records at the VPS.
4. Add the actual HTTPS web origin to your Privy app's allowed origins. Keep email login, embedded
   wallets and Sepolia gas sponsorship enabled, including the registrar, Memento contract and
   optional primary-name call. Verify your Resend sender domain and configure `EMAIL_FROM`.
5. Open `https://<api-host>/health/ready`, then create a small test gift and complete its emailed
   invitation. Check actual email delivery, both sponsored transactions and the final name owner.

Do not publish application ports through Dokploy's Advanced → Ports. Use domain routing only.
`TRUST_PROXY=true` assumes Traefik is the only public ingress and appends the client address to
`X-Forwarded-For`; do not enable Traefik's insecure forwarded-header trust. The API uses the last
address, ignoring untrusted prefixes. Keep one API replica for the initial deployment.

### API runtime variables

```dotenv
NODE_ENV=production
PORT=3001
TRUST_PROXY=true
WEB_ORIGIN=https://memento.example
DATABASE_URL=postgresql://<user>:<encoded-password>@<dokploy-internal-host>:5432/memento
ENCRYPTION_KEY=<64-hex-characters>
EMAIL_HMAC_KEY=<different-64-hex-characters>
PRIVY_APP_ID=<your-app-id>
PRIVY_APP_SECRET=<your-app-secret>
RPC_URL=<your-Sepolia-HTTPS-RPC>
COORDINATOR_PRIVATE_KEY=<existing-coordinator-private-key>
RESEND_API_KEY=<your-resend-key>
EMAIL_FROM=Memento <gifts@your-verified-domain.example>
```

Use origins without a trailing slash. Generate each encryption/HMAC key separately with
`openssl rand -hex 32`. If retaining an existing database, retain its existing keys instead.
The coordinator key must match the deployed contract's coordinator. Never put these secrets in
Docker build arguments or the web application. The API image defaults to production and sends real
emails through Resend; it will not silently use console delivery.

### Web build arguments

```dotenv
VITE_API_URL=https://api.memento.example
VITE_PRIVY_APP_ID=<same-public-Privy-app-id>
```

These values are public and embedded in the JavaScript bundle. Changing them requires rebuilding
and redeploying the web application; runtime variables alone do not update a Vite build. The image
serves direct `/g/...` links and refreshed routes through the SPA fallback, with long caching only
for hashed assets. Local `.env` files and email previews are excluded from both Docker build contexts.

### Startup and updates

The API applies checked-in database migrations under a PostgreSQL advisory lock before listening,
then validates the RPC chain, deployed contracts and coordinator. Its image includes migrations and
built workspace dependencies, and runs as the non-root Node user. Allow startup time for RPC checks.
If deployment stays unhealthy, inspect API logs for missing configuration, database connection or
contract checks. `/health/ready` confirms startup completed; it does not verify Privy or email delivery.

Push changes, then redeploy the affected application in Dokploy. Database contents survive app
rebuilds. Back up the database and encryption keys together before schema changes; reverting an image
does not roll back migrations. Do not wipe the VPS database on ordinary deployments. No Foundry,
contract deployment, email preview server or local Compose stack runs in these images.

### Local image checks

```sh
docker build -t memento-api .
docker build -f apps/web/Dockerfile \
  --build-arg VITE_API_URL=https://api.memento.example \
  --build-arg VITE_PRIVY_APP_ID=your-public-app-id \
  -t memento-web .
docker run --rm -p 127.0.0.1:8080:80 memento-web
```

The API needs the runtime variables and a reachable PostgreSQL instance to start. These commands
only build images and preview the web app; they do not deploy contracts or send gifts.

## Vercel frontend alternative

The frontend can run on Vercel while the API and PostgreSQL stay on Dokploy. Set the Vercel project's
Root Directory to `apps/web` and enable inclusion of files outside the root for workspace imports.
Choose Vite, build with `pnpm build`, and publish `dist`. Configure the same two public Vite variables
listed above and redeploy whenever they change. `apps/web/vercel.json` supplies the SPA fallback for
direct invitation links; the URL and its private fragment remain unchanged. Add the frontend domain
to Vercel and Privy, and use that exact origin for the API's `WEB_ORIGIN`.

If `/` works but `/send` returns Vercel `NOT_FOUND`, check that this rewrite was included in the latest
production deployment. `DEPLOYMENT_NOT_FOUND` on the homepage instead indicates a deployment/domain
mapping problem. See [Vercel's Vite SPA guide](https://vercel.com/docs/frameworks/frontend/vite).
