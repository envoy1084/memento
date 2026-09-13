# Backend

`apps/server` composes the Effect HTTP API, Privy, ENSForge, PostgreSQL, email delivery and background worker. `protocol` owns schemas, `api` owns HTTP contracts, `application` owns workflows, and `database` owns transaction-aware repositories. Provider calls happen outside database transactions.

## Sender

Creating a gift prepares an email-bound gift and an atomic USDC approval/deposit batch. Funding confirmation checks the successful onchain gift before marking it ready and inserting a deduplicated email job in the same database transaction. The sender UI does not expose manual invitation copying or delivery. The form requires a sender display name (1–100 characters, not whitespace-only), stored alongside the recipient in the existing encrypted contact payload. Gift views expose the sender name, and email jobs snapshot it for delivery; both development and production email bodies identify the sender. Existing gifts and queued emails without a sender name retain the generic wording. No database migration is required. The worker delivers to the encrypted saved contact; development logs the message, production uses Resend. `packages/emails` owns the React Email invitation and production, development, and test delivery Layers. New email jobs snapshot recipient/sender names, note, and expiry inside their encrypted payload. Older queued payloads render with optional-field fallbacks. The server chooses the delivery Layer; the existing worker retains transactional scheduling, retries, and idempotency.

## Recipient

The invitation secret arrives in a URL fragment and is sent in an authenticated request body. Privy verifies the recipient email. The backend checks name availability, price and gift limits, then binds the wallet, label, resolver, commitment, nonce and deadline. Recipient consent and a coordinator email attestation authorize registration. See [registration flow](ensforge.md).

Only the recipient’s embedded wallet broadcasts sponsored claim transactions. The backend coordinator signs attestations; it does not broadcast registrations. The worker observes completion and verifies recipient ownership and resolver permissions before marking the gift claimed.

## Reliability

Jobs use expiring leases and fenced updates. Gift changes, audit events and job scheduling share transactions. Encrypted secrets are cleared after terminal completion. HTTP boundaries enforce authentication, request limits, rate limits and noncacheable responses. Public errors omit provider internals.

Funding/refund receipts and claim completion are verified independently of browser reports. Failed or uncertain wallet submissions are never blindly replayed. The sender can recover unclaimed escrow through the refund flow.
