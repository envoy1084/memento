import { Schema } from "effect";

import {
  Address,
  Amount,
  Call,
  ClaimState,
  Digest,
  GiftKind,
  GiftPolicy,
  GiftState,
  Hex,
  RecipientConstraint,
  StarterRecord,
  Timestamp,
} from "../common/index.js";

export const CreateGift = Schema.Struct({
  sponsorWallet: Address,
  kind: GiftKind,
  recipient: RecipientConstraint,
  policy: GiftPolicy,
  message: Schema.String.check(Schema.isMaxLength(2000)),
  theme: Schema.String.check(Schema.isMaxLength(64)),
  records: Schema.Array(StarterRecord).check(Schema.isMaxLength(10)),
  label: Schema.NullOr(Schema.String),
});
export type CreateGift = typeof CreateGift.Type;
export const CreateCampaign = Schema.Struct({
  sponsorWallet: Address,
  policy: GiftPolicy,
  recipients: Schema.Array(RecipientConstraint).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(500),
  ),
  message: Schema.String.check(Schema.isMaxLength(2000)),
  theme: Schema.String.check(Schema.isMaxLength(64)),
});
export type CreateCampaign = typeof CreateCampaign.Type;
export const GiftView = Schema.Struct({
  id: Digest,
  campaignId: Schema.NullOr(Digest),
  kind: GiftKind,
  sponsorWallet: Address,
  policy: GiftPolicy,
  status: GiftState,
  theme: Schema.String,
  label: Schema.NullOr(Schema.String),
  message: Schema.String,
});
export const CampaignView = Schema.Struct({
  id: Digest,
  sponsorWallet: Address,
  policy: GiftPolicy,
  count: Schema.Int,
  status: Schema.Literals(["draft", "ready", "refunded"]),
  fundingHash: Schema.NullOr(Digest),
  createdAt: Timestamp,
});
export const CampaignDetail = Schema.Struct({
  campaign: CampaignView,
  invitations: Schema.Array(GiftView),
});
export const GiftPlan = Schema.Struct({
  id: Digest,
  chainId: Schema.Int,
  calls: Schema.Array(Call),
});
export const GiftLink = Schema.Struct({ id: Digest, url: Schema.String });
export const ConfirmFunding = Schema.Struct({ transactionHash: Digest });
export const OpenGift = Schema.Struct({ secret: Digest });
export const PrepareClaim = Schema.Struct({
  secret: Digest,
  recipientWallet: Address,
  label: Schema.String,
});
export type PrepareClaim = typeof PrepareClaim.Type;
export const ClaimIntent = Schema.Struct({
  giftId: Digest,
  recipient: Address,
  hca: Address,
  resolver: Address,
  labelhash: Digest,
  nonce: Digest,
  deadline: Timestamp,
});
export type ClaimIntent = typeof ClaimIntent.Type;
export const ClaimPreparation = Schema.Struct({
  id: Digest,
  intent: ClaimIntent,
  typedData: Schema.Unknown,
  session: Schema.Unknown,
  sessionExpiry: Timestamp,
});
export const AuthorizeClaim = Schema.Struct({
  signature: Hex,
  sessionAuthorization: Schema.Unknown,
});
export const ClaimView = Schema.Struct({
  id: Digest,
  giftId: Digest,
  recipientWallet: Address,
  label: Schema.String,
  state: ClaimState,
  hca: Address,
  resolver: Address,
  lastError: Schema.NullOr(Schema.String),
  commitmentAt: Schema.NullOr(Timestamp),
});
export const Quote = Schema.Struct({
  label: Schema.String,
  available: Schema.Boolean,
  price: Amount,
  duration: Schema.Int,
});
export type Quote = typeof Quote.Type;
export const EmailRequest = Schema.Struct({ to: Schema.String.check(Schema.isMaxLength(254)) });
export const WorldProof = Schema.Struct({ proof: Schema.Unknown });
export const Success = Schema.Struct({ ok: Schema.Boolean });
