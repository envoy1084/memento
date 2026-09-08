# @memento/server

Node composition root, HTTP handlers, live provider adapters, and durable background worker.

Run `pnpm --filter @memento/server typecheck`, `test`, or `build` from the repository root.

## Sepolia RPC proxy

`POST /rpc/sepolia` forwards standard Ethereum reads, gas estimates and already-signed raw transactions to the server-only `RPC_URL`. Use your Alchemy Ethereum Sepolia HTTPS endpoint. The browser must use the Memento API origin plus this path, never the Alchemy URL. No incoming authorization headers are forwarded.

Requests require JSON-RPC 2.0 IDs. Batches contain 1–20 calls, with four concurrent upstream calls; bodies are capped at 128 KiB and individual responses at 2 MiB, with a 15-second upstream timeout. The global IP rate limit and CORS policy apply. Debug/admin, log scans, account signing, notifications and state overrides are intentionally unsupported. Provider error text is replaced; numeric error codes and hex revert data are retained.

`pnpm --filter @memento/server test` covers proxy envelopes, method filtering, body/batch/response limits, fixed upstream forwarding and error redaction without an Alchemy account.
