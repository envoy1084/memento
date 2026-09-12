# @memento/server

Node composition root, HTTP handlers, live provider adapters, and durable background worker.

Run `pnpm --filter @memento/server typecheck`, `test`, or `build` from the repository root.

## Sepolia RPC proxy

`POST /rpc/sepolia` forwards standard Ethereum reads, gas estimates and already-signed raw transactions to the server-only `RPC_URL`. Use your Alchemy Ethereum Sepolia HTTPS endpoint. The browser must use the Memento API origin plus this path, never the Alchemy URL. No incoming authorization headers are forwarded.

Requests require JSON-RPC 2.0 IDs. Batches contain 1–20 calls, with four concurrent upstream calls; bodies are capped at 128 KiB and individual responses at 2 MiB, with a 15-second upstream timeout. The global IP rate limit and CORS policy apply. Debug/admin, log scans, account signing, notifications and state overrides are intentionally unsupported. Provider error text is replaced; numeric error codes and hex revert data are retained.

`pnpm --filter @memento/server test` covers proxy envelopes, method filtering, body/batch/response limits, fixed upstream forwarding and error redaction without an Alchemy account.

`GET /v1/session` requires a Privy bearer token and returns the verified actor (Privy user ID, linked Ethereum wallets, verified emails). It does not create a database user or persist tokens.

## ENSForge registration

New-name claims use ENSForge for quotes, commitments and readiness, and Privy for two sponsored
receiver transactions. Setup returns `commit-name`, `waiting`, `register-name`, or `not-required`.
The final MementoRegistration call atomically registers and refunds unused funding. No Rhinestone
credentials or HCA session is required. See [backend flow](../../architecture/backend/ensforge.md).

Browser CORS allows the configured `WEB_ORIGIN` and the `authorization`, `content-type`, `b3` and `traceparent` request headers. The tracing headers are emitted by Effect HttpClient, including session verification; omitting them blocks browser preflight before authentication runs.

## Email delivery

Funding confirmation automatically creates a durable email job in the same database transaction as
the funded gift. The worker sends it with a per-gift/recipient idempotency key. The sender page polls
the backend delivery state and displays “Gift email sent” only after the job completes.

With `NODE_ENV=development` (the default) or `test`, the Mailer console Layer prints the recipient,
subject and private claim link to the server console without contacting Resend or requiring email
credentials. These local previews contain private invitation links. `NODE_ENV=production` selects
Resend and requires `RESEND_API_KEY` and `EMAIL_FROM`; it never falls back to console delivery.
The production adapter currently sends plain text; designed templates remain future work.
