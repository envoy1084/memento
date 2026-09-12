# Single VPS deployment

One Node.js 24 process runs the API and durable worker. PostgreSQL holds all workflow state. Caddy
terminates TLS for `api.memento.envoy1084.xyz`. The frontend origin is
`https://memento.envoy1084.xyz`; no frontend is deployed in this phase.

## Setup

1. Install Docker Compose. Point the API hostname's DNS A/AAAA records at the VPS.
2. Copy `.env.example` to `.env`, fill the provider settings, and use a
   random hex PostgreSQL password. Contract addresses belong in `packages/chain/src/deployments/sepolia.json`. Generate separate encryption and email HMAC keys with
   `openssl rand -hex 32`. Back up those keys securely with the database.
3. Configure Privy for the frontend origin. Enable Selfie Check for the World app and configure the
   matching RP ID and signing key. The action is `memento-claim`, defined in server product policy. Use `staging` only with the simulator. Configure a verified
   sender domain in Resend and sponsored gas access in Rhinestone.
4. Use the ENSForge 0.4.0 recorded Sepolia profile (source
   `09bf3ac64a6fb1b215573c019b17e8c501bb3ca0`). Run
   `node packages/chain/scripts/sync-ens-deployment.mjs` after an intentional SDK upgrade; it preserves
   Memento addresses. The build checks profile drift. ENS addresses are populated from the package;
   `sponsorship` and `vault` remain null until deployment. Startup verifies live HCA wiring through
   ENSForge and checks Memento bindings and the coordinator. Old branch-tip vault deployments cannot
   be reused with the changed single-admin resolver initializer.
5. Import the separate deployer wallet into an encrypted Foundry keystore with `cast wallet import memento-deployer --interactive`. Never place the deployer key in the server environment. Deploy Memento contracts with Foundry. From
   `packages/contracts`, with deployment variables exported, run
   `forge script script/Deploy.s.sol --account memento-deployer --rpc-url "$RPC_URL" --broadcast`. Put the two returned addresses
   in the manifest’s `contracts.sponsorship` and `contracts.vault` fields. The deployment script reads its ENS/token addresses from that same manifest; only `CONTRACT_ADMIN` and `COORDINATOR_ADDRESS` remain deployment-time environment inputs. Supply native Sepolia ETH to the coordinator for
   escrow/vault transactions. Registration costs use the configured six-decimal payment token;
   Rhinestone sponsors HCA registration execution gas separately. Recipients need Sepolia ETH for the
   three owner-wallet setup stages; the adapter does not sponsor counterfactual deployment.
6. Run `docker compose up -d --build`. Inspect `docker compose logs server` and
   `https://api.memento.envoy1084.xyz/health/ready`. API documentation is at `/docs` and `/openapi.json`.

Only Caddy publishes ports. Do not expose the application port: it trusts the client-IP header that
Caddy overwrites. Every API response is noncacheable; claim secrets stay in URL fragments. The proxy
and application limit request bodies to 128 KiB. API access logs are disabled to avoid logging claim
payloads or authorization material.

## Local development

Copy and fill the same root `.env`, then run:

```sh
pnpm install
# Starts only PostgreSQL and binds it to localhost.
docker compose -f compose.yml up -d --wait
pnpm --filter @memento/server dev
```

The standalone local `compose.yml` uses the installed `postgres:17-alpine` image without pulling.
It only requires `POSTGRES_PASSWORD` in `.env`; no API domain or provider credentials are needed to
start the database. Set `DATABASE_URL=postgresql://memento:<password>@localhost:5432/memento` for the
server. Data persists in the `memento-local` project's volume, separate from the VPS stack. Use
`docker compose -f compose.yml down` to stop it while retaining data. Always pass `-f compose.yml`
for local use because Docker otherwise prefers the existing VPS `compose.yaml`.

Set `WEB_ORIGIN=http://localhost:3000` for local browser integration. Keep the Alchemy Ethereum Sepolia HTTPS URL in server-only `RPC_URL`; browser clients use `http://localhost:3001/rpc/sepolia`. Production clients use the API origin plus `/rpc/sepolia`.

The API needs working provider configuration and compatible contracts. Tests run with scoped test
Layers and migrated PGlite, without live provider credentials. No bypass authentication mode exists.

## Operations and recovery

- Migrations run before the HTTP listener and worker start. Use `pg_dump` for backups, and test a
  restore together with the encryption/HMAC keys before relying on a backup.
- Jobs survive restarts. Leases fence stale workers; transaction journals preserve signed operations
  before broadcast. Use one coordinator key exclusively for this deployment. Rotating that key
  requires the contracts' delayed coordinator rotation and a planned journal/nonce migration.
- ENSForge registration state lives in encrypted `ens_workflows` records. Keep the session signer,
  original adapter settings and encryption key available across restarts. See
  [ENSForge recovery](../backend/ensforge.md) for session replacement and uncertain submissions.
- A failed claim retains its phase and a safe error. The recipient can request a retry. Permanent
  onchain reverts reuse the recorded operation and require operator review or expiry recovery;
  retries do not authorize replacement transactions.
- Sponsors receive refund calldata. Unreleased escrow is recoverable; funds already sent to a
  recipient-owned HCA can only be recovered by that recipient. Campaign refunds protect budgets
  already reserved onchain.
- Existing-name gifts require clean registry permissions and use a fresh resolver controlled only by
  the recipient. The recipient can set a primary name after claiming. New-name HCA sessions can set
  a primary name when requested.

Provider credentials, contract deployments, live email delivery, and a real sponsored HCA execution
must be verified separately before a public demo. The repository's local tests do not prove those
external services are configured.
