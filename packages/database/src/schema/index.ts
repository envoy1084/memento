import type {
  GiftPolicy,
  RecipientConstraint,
  GiftState,
  ClaimState,
  JobKind,
  JobState,
} from "@memento/protocol";
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const gift = pgTable(
  "gifts",
  {
    id: text().primaryKey(),
    sponsorWallet: text().notNull(),
    recipient: jsonb().$type<RecipientConstraint>().notNull(),
    policy: jsonb().$type<GiftPolicy>().notNull(),
    claimHash: text().notNull(),
    secretCiphertext: text(),
    messageCiphertext: text().notNull(),
    recipientContactCiphertext: text(),
    theme: text().notNull(),
    metadataHash: text().notNull(),
    status: text().$type<typeof GiftState.Type>().notNull(),
    fundingHash: text(),
    createdAt: bigint({ mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("gift_claim_hash").on(t.claimHash),
    index("gift_sponsor").on(t.sponsorWallet, t.createdAt),
  ],
);

export const claim = pgTable(
  "claims",
  {
    id: text().primaryKey(),
    giftId: text()
      .notNull()
      .references(() => gift.id),
    userId: text().notNull(),
    recipientWallet: text().notNull(),
    label: text().notNull(),
    resolver: text().notNull(),
    resolverSalt: text().notNull(),
    labelhash: text().notNull(),
    state: text().$type<typeof ClaimState.Type>().notNull(),
    nonce: text().notNull(),
    deadline: bigint({ mode: "number" }).notNull(),
    commitmentSecretCiphertext: text(),
    commitment: text().notNull(),
    commitmentAt: bigint({ mode: "number" }),
    signature: text(),
    recipientAuthorizationCiphertext: text(),
    price: numeric({ precision: 39, scale: 0 }).notNull(),
    lastError: text(),
    createdAt: bigint({ mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("claim_gift").on(t.giftId),
    uniqueIndex("claim_nonce").on(t.recipientWallet, t.nonce),
  ],
);

export const job = pgTable(
  "jobs",
  {
    kind: text().$type<typeof JobKind.Type>().notNull(),
    id: text().primaryKey(),
    subjectId: text().notNull(),
    dedupeKey: text().notNull(),
    state: text().$type<typeof JobState.Type>().notNull(),
    runAt: bigint({ mode: "number" }).notNull(),
    attempts: integer().notNull().default(0),
    leaseToken: text(),
    leaseUntil: bigint({ mode: "number" }),
    lastError: text(),
    payloadCiphertext: text(),
  },
  (t) => [
    uniqueIndex("job_dedupe").on(t.dedupeKey),
    index("job_due").on(t.state, t.runAt),
    check("job_attempts", sql`${t.attempts} >= 0`),
  ],
);

export const auditEvent = pgTable("audit_events", {
  id: text().primaryKey(),
  subjectId: text().notNull(),
  action: text().notNull(),
  actorId: text().notNull(),
  createdAt: bigint({ mode: "number" }).notNull(),
});
