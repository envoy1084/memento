import { Schema } from "effect";

import {
  Address,
  Amount,
  ClaimState,
  Digest,
  GiftPolicy,
  GiftState,
  JobKind,
  JobState,
  RecipientConstraint,
  Timestamp,
} from "../common/index.js";

export const Gift = Schema.Struct({
  id: Digest,
  sponsorWallet: Address,
  recipient: RecipientConstraint,
  policy: GiftPolicy,
  claimHash: Digest,
  secretCiphertext: Schema.NullOr(Schema.String),
  messageCiphertext: Schema.String,
  recipientContactCiphertext: Schema.optionalKey(Schema.NullOr(Schema.String)),
  theme: Schema.String,
  metadataHash: Digest,
  status: GiftState,
  fundingHash: Schema.NullOr(Digest),
  createdAt: Timestamp,
});
export type Gift = typeof Gift.Type;

export const Claim = Schema.Struct({
  id: Digest,
  giftId: Digest,
  userId: Schema.String,
  recipientWallet: Address,
  label: Schema.String,
  resolver: Address,
  resolverSalt: Digest,
  labelhash: Digest,
  state: ClaimState,
  nonce: Digest,
  deadline: Timestamp,
  commitmentSecretCiphertext: Schema.NullOr(Schema.String),
  commitment: Digest,
  commitmentAt: Schema.NullOr(Timestamp),
  signature: Schema.NullOr(Schema.String),
  recipientAuthorizationCiphertext: Schema.NullOr(Schema.String),
  price: Amount,
  lastError: Schema.NullOr(Schema.String),
  createdAt: Timestamp,
});
export type Claim = typeof Claim.Type;

export const Job = Schema.Struct({
  id: Schema.String,
  kind: JobKind,
  subjectId: Digest,
  dedupeKey: Schema.String,
  state: JobState,
  runAt: Timestamp,
  attempts: Schema.Int,
  leaseToken: Schema.NullOr(Schema.String),
  leaseUntil: Schema.NullOr(Timestamp),
  lastError: Schema.NullOr(Schema.String),
  payloadCiphertext: Schema.NullOr(Schema.String),
});
export type Job = typeof Job.Type;

export * from "./deployment.js";
