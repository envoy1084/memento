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
docker compose -f compose.yml up -d --wait
pnpm --filter @memento/server dev
pnpm --filter @memento/web dev
```

The local compose file retains its database volume. Stopping Compose alone does not reset it. For a VPS, `compose.yaml` runs the server, PostgreSQL and Caddy; configure DNS and production origins before launching it. Only Caddy should expose the API publicly.

## Verify before the demo

Check `/health/ready`, create and fund a new gift, inspect the development email, then sign in as its recipient. Confirm both sponsored transactions complete and that ownership, resolver, leftover refund and gift status match. Local tests do not prove Privy sponsorship or live ENS configuration.

The receiver needs no ETH or USDC when sponsorship is configured. The sender funds the registration budget. A price above that budget is rejected. Unclaimed gifts remain refundable; registration and its leftover refund are atomic. Keep database and encryption-key backups together outside development resets.
