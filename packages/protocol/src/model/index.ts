import { Schema } from "effect";

import {
  Address,
  Amount,
  ClaimState,
  Digest,
  GiftKind,
  GiftPolicy,
  GiftState,
  JobKind,
  JobState,
  RecipientConstraint,
  StarterRecord,
  Timestamp,
} from "../common/index.js";

export const Gift = Schema.Struct({
  id: Digest,
  campaignId: Schema.NullOr(Digest),
  invitationIndex: Schema.NullOr(Schema.Int),
  kind: GiftKind,
  sponsorWallet: Address,
  recipient: RecipientConstraint,
  policy: GiftPolicy,
  claimHash: Digest,
  secretCiphertext: Schema.NullOr(Schema.String),
  messageCiphertext: Schema.String,
  records: Schema.Array(StarterRecord),
  theme: Schema.String,
  label: Schema.NullOr(Schema.String),
  proof: Schema.Array(Digest),
  metadataHash: Digest,
  status: GiftState,
  fundingHash: Schema.NullOr(Digest),
  createdAt: Timestamp,
});
export type Gift = typeof Gift.Type;

export const Campaign = Schema.Struct({
  id: Digest,
  sponsorWallet: Address,
  policy: GiftPolicy,
  root: Digest,
  count: Schema.Int,
  status: Schema.Literals(["draft", "ready", "refunded"]),
  fundingHash: Schema.NullOr(Digest),
  createdAt: Timestamp,
});
export type Campaign = typeof Campaign.Type;

export const Claim = Schema.Struct({
  id: Digest,
  giftId: Digest,
  userId: Schema.String,
  recipientWallet: Address,
  label: Schema.String,
  hca: Address,
  resolver: Address,
  resolverSalt: Digest,
  labelhash: Digest,
  state: ClaimState,
  nonce: Digest,
  deadline: Timestamp,
  sessionExpiry: Timestamp,
  sessionKeyCiphertext: Schema.NullOr(Schema.String),
  authorizationCiphertext: Schema.NullOr(Schema.String),
  sessionPayload: Schema.Unknown,
  commitmentSecretCiphertext: Schema.NullOr(Schema.String),
  commitment: Digest,
  commitmentAt: Schema.NullOr(Timestamp),
  signature: Schema.NullOr(Schema.String),
  eligibilityCiphertext: Schema.NullOr(Schema.String),
  recipientAuthorizationCiphertext: Schema.NullOr(Schema.String),
  worldVerified: Schema.Boolean,
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

export * from "./preview.js";

export * from "./deployment.js";
