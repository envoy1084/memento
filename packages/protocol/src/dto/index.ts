import { Schema } from "effect";

import {
  Address,
  Amount,
  Call,
  ClaimState,
  Digest,
  GiftPolicy,
  GiftState,
  Hex,
  RecipientEmail,
  SenderName,
  Timestamp,
} from "../common/index.js";

export const CreateGift = Schema.Struct({
  sponsorWallet: Address,
  recipient: Schema.Struct({ kind: Schema.Literal("email"), value: RecipientEmail }),
  senderName: SenderName,
  recipientName: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  policy: GiftPolicy,
  message: Schema.String.check(Schema.isMaxLength(2000)),
  theme: Schema.String.check(Schema.isMaxLength(64)),
});
export type CreateGift = typeof CreateGift.Type;

export const GiftView = Schema.Struct({
  emailStatus: Schema.optionalKey(
    Schema.NullOr(Schema.Literals(["pending", "running", "complete", "failed"])),
  ),
  id: Digest,
  recipientName: Schema.NullOr(Schema.String),
  senderName: Schema.NullOr(Schema.String),
  sponsorWallet: Address,
  policy: GiftPolicy,
  status: GiftState,
  theme: Schema.String,
  label: Schema.NullOr(Schema.String),
  message: Schema.String,
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
});

export const AuthorizeClaim = Schema.Struct({
  signature: Hex,
});

export const ClaimView = Schema.Struct({
  id: Digest,
  giftId: Digest,
  recipientWallet: Address,
  label: Schema.String,
  state: ClaimState,
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

export const EmailRequest = Schema.Struct({ to: Schema.optionalKey(RecipientEmail) });

export const Success = Schema.Struct({ ok: Schema.Boolean });

export * from "./rpc.js";

export * from "./registration.js";
