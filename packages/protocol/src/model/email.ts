import { Schema } from "effect";

// Optional presentation fields keep already-queued invitations readable.
export const GiftEmail = Schema.Struct({
  to: Schema.String,
  url: Schema.String,
  idempotencyKey: Schema.String,
  senderName: Schema.optionalKey(Schema.String),
  recipientName: Schema.optionalKey(Schema.String),
  message: Schema.optionalKey(Schema.String),
  expiresAt: Schema.optionalKey(Schema.Number),
});
export type GiftEmail = typeof GiftEmail.Type;
