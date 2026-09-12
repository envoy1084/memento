# ENSForge backend flow

Memento uses ENSForge 0.4.0 and its published Rhinestone 1.8.0 patch. The recorded Sepolia profile
owns ENS addresses and ABIs. Memento still owns sponsorship/vault contracts and their durable EOA
transaction journal. No Pimlico execution path is configured.

## Recipient setup

1. Prepare a claim. Its v2 session payload contains a random salt, public session signer and expiry.
   The private session key is encrypted with claim-bound associated data. ENSForge predicts the
   canonical HCA and a claim resolver deployed by the recipient wallet.
2. Call `POST /v1/claims/:id/setup`. Submit the returned calls from its `from` wallet on Sepolia,
   wait for confirmation, then request setup again. Stages are `deploy-hca`, `deploy-resolver` and
   `enable-session`. Existing-name gifts return `not-required`.
3. Resolver initialization sets the forward address and approved text records, with initial control
   held by the HCA. ENSForge registration grants the recipient resolver control atomically.
4. Sign the Memento claim intent. Authorize with `signature` and `sessionAuthorization` containing
   `permissionId` and `enableTransactionHash`. The backend requires two confirmations and asks
   ENSForge to validate canonical receipt evidence, enabled state and revocation nonce. It also binds
   the permission, signer, resolver and expiry to the claim and rejects gas-refund sessions.

Setup returns unsigned owner calls; the coordinator never signs as the recipient. Owner setup needs
Sepolia ETH. Rhinestone sponsorship applies to subsequent registration execution. Setup is repeatable
for session recovery until the original deadline; it cannot extend the signed claim's authority.

## Durable registration

The worker reserves Memento escrow before starting ENSForge registration with the claim ID, fixed
name/recipient/resolver, original maximum price, no paid execution fees and a protected signer reference.
`startHcaRegistration` creates the commitment secret. Subsequent iterations use
`resumeHcaRegistration` with the saved operation, original adapter configuration and encrypted
PostgreSQL WorkflowStorage. Memento never constructs commit/register execution batches itself.

ENSForge's `needs-funding` result may release its requested registration price only for the configured
token, within budget, and from a reserved escrow that has not released funds. A later funding request
fails for review. `waiting` schedules another worker iteration; tracked submissions are reconciled.
Untracked submissions stop for explicit recovery. Price review, expired/cancelled/failed operations
and missing authorization stop without increasing limits or generating a new commitment.

Final completion independently checks ownership, resolver implementation/control, forward address,
starter records and requested primary name, then closes escrow. Session signing material is erased
from the claim at completion. Encrypted SDK state remains for audit/status; it contains no private key.

## Status and recovery

`GET /v1/claims/:id/registration` returns a redacted projection, including status, wait time,
transaction hash or pending step/fingerprint. It never returns the commitment secret, signed payload
or provider credential. All setup, status and recovery routes require the claim's linked recipient.

`POST /v1/claims/:id/registration/recover` accepts one of:

- `{ kind: "session", authorization: { permissionId, enableTransactionHash } }`: only when the SDK
  reports `needs-authorization`; verifies a replacement session with the original key/scope/deadline.
- `{ kind: "submission", serialized }`: only for an untracked submitting/submitted attempt. Restore
  the adapter's serialized submission against the saved chain, HCA, profile and plan fingerprint.
  The reference must come from the matching Rhinestone submission; do not invent a provider ID.

Recovery resumes the existing operation and requeues the worker; no endpoint increases its budget.
Ordinary `/retry` reconciles existing work. Expired claims use sponsor recovery for unreleased escrow;
only recipients can recover funds already held by their HCA. Legacy signature-based session payloads
are rejected, not silently upgraded. Do not reuse funded legacy claims with the new deployment.

## Verification and external setup

Tests cover migrated encrypted storage, concurrent PostgreSQL revision checks, resume after restart,
claim-bound sessions, unsigned setup, funding bounds and authenticated HTTP boundaries. Solidity tests
cover the single-admin resolver initializer and recipient forward record. Provider substitutes do not
prove live Rhinestone execution. The two Memento contract addresses remain unconfigured until deployed;
verify a real sponsored registration and existing-name transfer before the demo.
