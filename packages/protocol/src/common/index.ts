import { Schema } from "effect";

export const Hex = Schema.String.check(Schema.isPattern(/^0x(?:[0-9a-fA-F]{2})*$/));

export const Address = Schema.String.check(Schema.isPattern(/^0x[0-9a-fA-F]{40}$/));

export const Digest = Schema.String.check(Schema.isPattern(/^0x[0-9a-fA-F]{64}$/));

export const Amount = Schema.String.check(Schema.isPattern(/^(0|[1-9][0-9]{0,38})$/));

export const Timestamp = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

export const GiftKind = Schema.Literals(["chosen_name", "existing_name"]);

export const GiftState = Schema.Literals([
  "draft",
  "ready",
  "reserved",
  "complete",
  "cancelled",
  "refunded",
  "action_required",
]);

export const ClaimState = Schema.Literals([
  "prepared",
  "authorized",
  "reserving",
  "reserved",
  "committing",
  "waiting",
  "funding",
  "registering",
  "transferring",
  "verifying",
  "completing",
  "complete",
  "action_required",
  "refunded",
]);

export const JobKind = Schema.Literals(["claim", "email", "refund"]);

export const JobState = Schema.Literals(["pending", "running", "complete", "failed"]);

export const RecipientConstraint = Schema.Struct({
  kind: Schema.Literals(["any", "wallet", "email"]),
  value: Schema.String,
});
export type RecipientConstraint = typeof RecipientConstraint.Type;

export const GiftPolicy = Schema.Struct({
  maxPrice: Amount,
  duration: Schema.Int.check(Schema.isBetween({ minimum: 86400, maximum: 315360000 })),
  expiresAt: Timestamp,
  minLength: Schema.Int.check(Schema.isBetween({ minimum: 3, maximum: 63 })),
  maxLength: Schema.Int.check(Schema.isBetween({ minimum: 3, maximum: 63 })),
  worldRequired: Schema.Boolean,
  setPrimaryName: Schema.Boolean,
});
export type GiftPolicy = typeof GiftPolicy.Type;

export const StarterRecord = Schema.Struct({
  key: Schema.String.check(Schema.isMaxLength(100)),
  value: Schema.String.check(Schema.isMaxLength(1000)),
});

export const Actor = Schema.Struct({
  userId: Schema.String,
  wallets: Schema.Array(Address),
  emails: Schema.Array(Schema.String),
});
export type Actor = typeof Actor.Type;

export const Call = Schema.Struct({ to: Address, data: Hex, value: Amount });
export type Call = typeof Call.Type;
