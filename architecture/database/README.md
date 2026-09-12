# Database

The fresh schema contains four tables: `gifts`, `claims`, `jobs`, and `audit_events`.

Gifts store funding policy, encrypted invitation/contact data and delivery status. Claims bind the selected name, recipient wallet, resolver, commitment secret and signed authorization. Jobs handle email delivery and claim observation. Audit events record workflow changes.

Amounts cross JSON boundaries as decimal strings. Application timestamps use milliseconds; contract policy deadlines use seconds. Recipient email identities use an HMAC; contact details and claim secrets are encrypted with associated data.

Repositories join `TransactionService` when present. Gift transitions, jobs and audit entries commit together; provider calls run outside transactions. PostgreSQL jobs use SKIP LOCKED, expiring leases and fencing tokens. Migrations serialize startup with an advisory lock.

The migration history is intentionally replaced by a single initial migration. It is for an empty development database, not an upgrade of an existing installation. The operator must reset the database before starting this version. Server startup applies migrations automatically.

PGlite tests run the checked-in migration. `pnpm test:postgres` checks migration concurrency and worker leases on real PostgreSQL. Generate a schema change with `pnpm --filter @memento/database db:generate --name <name>`.
