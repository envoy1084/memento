import { Schema } from "effect";

import { Address, Call, Digest, Timestamp } from "../common/index.js";

export const HcaSession = Schema.Struct({
  version: Schema.Literal(2),
  salt: Digest,
  sessionKey: Address,
  validUntil: Timestamp,
});

export const HcaAuthorization = Schema.Struct({
  permissionId: Digest,
  enableTransactionHash: Digest,
});

export const ClaimSetup = Schema.Struct({
  stage: Schema.Literals(["deploy-hca", "deploy-resolver", "enable-session", "not-required"]),
  chainId: Schema.Literal(11155111),
  from: Address,
  calls: Schema.Array(Call),
  authorization: Schema.NullOr(Schema.Struct({ permissionId: Digest })),
});
export type ClaimSetup = typeof ClaimSetup.Type;

export const HcaRecovery = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("session"), authorization: HcaAuthorization }),
  Schema.Struct({
    kind: Schema.Literal("submission"),
    serialized: Schema.NonEmptyString.check(Schema.isMaxLength(65536)),
  }),
]);
export type HcaRecovery = typeof HcaRecovery.Type;

export const RegistrationView = Schema.Struct({
  status: Schema.Literals([
    "not-started",
    "created",
    "waiting",
    "needs-review",
    "needs-funding",
    "needs-authorization",
    "submitting",
    "submitted",
    "registered",
    "cancelled",
    "failed",
    "expired",
  ]),
  readyAt: Schema.NullOr(Timestamp),
  transactionHash: Schema.NullOr(Digest),
  reason: Schema.NullOr(Schema.String),
  step: Schema.NullOr(Schema.Literals(["commit", "register"])),
  planFingerprint: Schema.NullOr(Digest),
});
export type RegistrationView = typeof RegistrationView.Type;
