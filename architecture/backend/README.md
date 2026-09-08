# Backend boundaries

| Boundary      | Responsibility                                                                           |
| ------------- | ---------------------------------------------------------------------------------------- |
| `protocol`    | Request, response, domain schemas and expected errors                                    |
| `api`         | Schema-first HttpApi endpoints and authentication middleware contract                    |
| `database`    | Drizzle schema, migrations, repositories, transactions, job leases and operation journal |
| `privy`       | Access-token verification and verified linked identities                                 |
| `world-id`    | RP context signing, unchanged proof forwarding and proof binding                         |
| `application` | Gift/campaign/claim workflows, eligibility, encryption and worker iteration              |
| `contracts`   | Sponsorship escrow and existing-name custody                                             |
| `chain`       | Shared TypeScript ABIs and ENS integration signatures                                    |
| `apps/server` | Live providers, HTTP handlers, startup checks and one Node runtime                       |

The server hosts HTTP and one scoped worker loop in the same Node process. PostgreSQL persists work;
no Redis, external queue, cron service or separate worker deployment is needed. Development uses
`memento-source` exports; production runs built ESM. `#/*` imports remain package-local. The frontend
is a standalone local preview; see [frontend](../frontend/README.md).

## Request flow

Privy middleware constructs the actor from verified linked wallets and emails. An HTTP handler calls
an application workflow, which enforces ownership and policy and uses transaction-aware repositories.
Funding and refund routes return calldata for the sponsor's wallet. Confirmation validates the exact
contract event and current chain state before updating the database. No server key signs for a user.

New-name and campaign recipients prepare a claim, optionally verify World ID, then authorize their
EIP-712 claim and HCA session. Authorization commits the encrypted signing material and a job together.
The worker reserves, commits, waits, re-quotes, releases bounded funds, registers and verifies the
result. Existing-name claims use the vault and skip the HCA stages.

Completion checks registry ownership, resolver implementation, recipient roles, forward address,
starter text records and requested primary name. ENSv2 profile reads use ENSIP-10 `resolve(name, data)`.

## Public API

`packages/api/src/index.ts` is the endpoint source of truth. `/openapi.json` and `/docs` expose its
contract. Sponsor routes cover gift and campaign preparation, funding confirmation, detail/list,
private link recovery, invitation export, email, refund plans and refund confirmation. Lists use
`offset` and return up to 100 rows; campaign details include all invitations (at most 500).

Claim routes cover preparation, authorization, World requests/verification, status, retry and SSE.
SSE requires an Authorization header, so browser clients should consume it with authenticated fetch;
never put a token in the URL. Streams close after about one minute and clients reconnect or poll.
Public gift opening requires the fragment secret in a POST body. The contract receives a domain-separated one-way derivative, so its onchain reservation does not reveal the original private link. Responses, including errors, are
noncacheable. Privileged fields never appear in public DTOs.

Private links can be exported again by their verified sponsor to recover from interrupted downloads.
Email delivery is explicit and deduplicated per gift and recipient. Repeating the email request retries
a failed job. Prepared claims bind one wallet/name; after authorization, retries reuse that intent and
signed operation. Expired sessions, unavailable reserved names and permanent reverts require the
expiry recovery described in [deployment](../deployment/README.md), rather than new spending authority.

## Integration choices

ENSv2 targets `ensdomains/contracts-v2` branch `post-audit-2`, revision
`6cd019f567c8eb0ca306c78851d4d58876a8e1df`. Temporary HCA actions are confined to the server adapter.
ENSForge handles compatible public quotes; custom deployments use the pinned branch ABI. The patched
Rhinestone SDK transports stateless HCA sessions, with enable data on every operation.

World uses IDKit 4's `selfieCheckLegacy` preset and the v4 verification endpoint. Provider verification
checks the original proof; the server additionally binds its action, RP nonce, environment, signal and
credential. Database uniqueness is scoped to a campaign or individual gift. The provider action is
configured globally, so this does not promise cross-campaign unlinkability from Memento.

Provider credentials and compatible deployments still require live verification before a public demo.
