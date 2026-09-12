import { Schema } from "effect";

import { Address, Call, Timestamp } from "../common/index.js";

export const ClaimSetup = Schema.Struct({
  stage: Schema.Literals(["commit-name", "register-name", "waiting", "not-required"]),
  readyAt: Schema.optionalKey(Timestamp),
  chainId: Schema.Literal(11155111),
  from: Address,
  calls: Schema.Array(Call),
});
export type ClaimSetup = typeof ClaimSetup.Type;

export const RegistrationView = Schema.Struct({
  status: Schema.Literals(["not-started", "created", "waiting", "registered", "expired"]),
  readyAt: Schema.NullOr(Timestamp),
  reason: Schema.NullOr(Schema.String),
  step: Schema.NullOr(Schema.Literals(["commit", "register"])),
});
export type RegistrationView = typeof RegistrationView.Type;
