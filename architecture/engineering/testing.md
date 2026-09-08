# Testing conventions

Follow Namera's boundary testing approach: real workflows and repositories, migrated PGlite, and package-owned provider substitutes backed by scoped Effect services. Tests do not mock application internals.

Use tests/unit for pure rules, tests/integration for persistence/provider/HTTP boundaries, and tests/fixtures for shared setup. Resolve workspace modules through memento-source in normal and SSR paths. Reset shared PGlite and provider state before each test, and keep shared suites non-concurrent.

Use Effect TestClock for application deadlines and retries. SQL time and chain timestamps require explicit test inputs. Invoke one worker iteration in API tests rather than starting an uncontrolled loop. Use PostgreSQL for real locking and concurrency and Foundry for contracts.

Run pnpm check before each meaningful commit. Test TypeScript is included in package typechecks. Public API tests must assert authorization, validation, state changes, replay protection, and safe error responses.

## Commands and coverage

- `pnpm check`: formatting, lint, TypeScript (including tests), migrated PGlite workflows, provider/HTTP boundaries, Solidity tests and builds.
- `pnpm test:postgres`: starts a private disposable PostgreSQL 17 container, verifies concurrency and removes it in a finally block. It does not use the development database.
- `docker build -t memento-backend:local .`: verifies the production dependency graph and Node image.

HTTP boundary tests exercise real Request/Response routing, authentication, CORS, body/rate limits, SSE and refund confirmation. ENS verification tests encode real ABI calls through a controlled RPC transport, including ENSIP-10 and reverse-name reads. Foundry tests exercise local registry/factory/token substitutes. These do not establish live ENS, Rhinestone, Privy, World or Resend configuration.

CI runs the same checks, the PostgreSQL test, a generated-ABI drift check and the container build.
