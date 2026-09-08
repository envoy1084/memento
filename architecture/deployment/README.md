# Single VPS deployment

One Node.js 24 process runs the API and durable worker. PostgreSQL holds all workflow state. Caddy
terminates TLS for `api.memento.envoy1084.xyz`. The frontend origin is
`https://memento.envoy1084.xyz`; no frontend is deployed in this phase.

## Setup

1. Install Docker Compose. Point the API hostname's DNS A/AAAA records at the VPS.
2. Copy `.env.example` to `.env`, fill the provider settings and deployment addresses, and use a
   random hex PostgreSQL password. Generate separate encryption and email HMAC keys with
   `openssl rand -hex 32`. Back up those keys securely with the database.
3. Configure Privy for the frontend origin. Enable Selfie Check for the World app and configure the
   matching RP ID, signing key, and action. Use `staging` only with the simulator. Configure a verified
   sender domain in Resend and sponsored gas access in Rhinestone.
4. Use compatible ENSv2 Sepolia deployments from `post-audit-2` revision
   `6cd019f567c8eb0ca306c78851d4d58876a8e1df`. Historical deployment manifests are insufficient:
   startup checks the HCA version, approved implementation, immutable bindings, Memento contract
   configuration, and coordinator address.
5. Import the separate deployer wallet into an encrypted Foundry keystore with `cast wallet import memento-deployer --interactive`. Never place the deployer key in the server environment. Deploy Memento contracts with Foundry. From
   `packages/contracts`, with deployment variables exported, run
   `forge script script/Deploy.s.sol --account memento-deployer --rpc-url "$RPC_URL" --broadcast`. Put the two returned addresses
   in `MEMENTO_SPONSORSHIP` and `MEMENTO_NAME_VAULT`. Supply native Sepolia ETH to the coordinator for
   escrow/vault transactions. Registration costs use the configured six-decimal payment token;
   Rhinestone sponsors HCA execution gas separately.
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
docker compose -f compose.yaml -f compose.dev.yaml up -d db
pnpm --filter @memento/server dev
```

The API needs working provider configuration and compatible contracts. Tests run with scoped test
Layers and migrated PGlite, without live provider credentials. No bypass authentication mode exists.

## Operations and recovery

- Migrations run before the HTTP listener and worker start. Use `pg_dump` for backups, and test a
  restore together with the encryption/HMAC keys before relying on a backup.
- Jobs survive restarts. Leases fence stale workers; transaction journals preserve signed operations
  before broadcast. Use one coordinator key exclusively for this deployment. Rotating that key
  requires the contracts' delayed coordinator rotation and a planned journal/nonce migration.
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
