import { Schema } from "effect";

export const PreviewGift = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literals(["choice", "owned"]),
  recipient: Schema.String,
  name: Schema.String,
  budget: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1000 })),
  years: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 3 })),
  minLength: Schema.Int.check(Schema.isBetween({ minimum: 3, maximum: 63 })),
  maxLength: Schema.Int.check(Schema.isBetween({ minimum: 3, maximum: 63 })),
  message: Schema.String,
  theme: Schema.Literals(["aura", "rose", "mint"]),
  state: Schema.Literals(["ready", "claimed", "expired", "refunded"]),
  created: Schema.String,
});
export type PreviewGift = typeof PreviewGift.Type;
export const PreviewCampaign = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  quantity: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 500 })),
  budget: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1000 })),
  years: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 3 })),
  minLength: Schema.Int.check(Schema.isBetween({ minimum: 3, maximum: 63 })),
  maxLength: Schema.Int.check(Schema.isBetween({ minimum: 3, maximum: 63 })),
  worldId: Schema.Boolean,
  claimed: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 500 })),
  paused: Schema.Boolean,
  closed: Schema.Boolean,
  invitations: Schema.Array(
    Schema.Struct({ id: Schema.String, recipient: Schema.String, claimed: Schema.Boolean }),
  ),
});
export type PreviewCampaign = typeof PreviewCampaign.Type;
export const PreviewProfile = Schema.Struct({
  name: Schema.String,
  bio: Schema.String,
  website: Schema.String,
  theme: Schema.Literals(["aura", "rose", "mint"]),
  primary: Schema.Boolean,
});
export type PreviewProfile = typeof PreviewProfile.Type;
export const PreviewState = Schema.Struct({
  version: Schema.Literal(1),
  connected: Schema.Boolean,
  gifts: Schema.Array(PreviewGift),
  campaigns: Schema.Array(PreviewCampaign),
  profiles: Schema.Array(PreviewProfile),
});
export type PreviewState = typeof PreviewState.Type;
