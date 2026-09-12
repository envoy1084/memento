import type {
  GiftPolicy,
  RecipientConstraint,
  StarterRecord,
  GiftState,
  ClaimState,
  JobKind,
  JobState,
} from "@memento/protocol";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const campaign = pgTable(
  "campaigns",
  {
    id: text().primaryKey(),
    sponsorWallet: text().notNull(),
    policy: jsonb().$type<GiftPolicy>().notNull(),
    root: text().notNull(),
    count: integer().notNull(),
    status: text().$type<"draft" | "ready" | "refunded">().notNull(),
    fundingHash: text(),
    createdAt: bigint({ mode: "number" }).notNull(),
  },
  (t) => [
    check("campaign_count", sql`${t.count} between 1 and 500`),
    uniqueIndex("campaign_funding").on(t.fundingHash),
  ],
);

export const gift = pgTable(
  "gifts",
  {
    id: text().primaryKey(),
    campaignId: text().references(() => campaign.id),
    invitationIndex: integer(),
    kind: text().$type<"chosen_name" | "existing_name">().notNull(),
    sponsorWallet: text().notNull(),
    recipient: jsonb().$type<RecipientConstraint>().notNull(),
    policy: jsonb().$type<GiftPolicy>().notNull(),
    claimHash: text().notNull(),
    secretCiphertext: text(),
    messageCiphertext: text().notNull(),
    records: jsonb().$type<readonly (typeof StarterRecord.Type)[]>().notNull(),
    theme: text().notNull(),
    label: text(),
    proof: jsonb().$type<readonly string[]>().notNull(),
    metadataHash: text().notNull(),
    status: text().$type<typeof GiftState.Type>().notNull(),
    fundingHash: text(),
    createdAt: bigint({ mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("gift_claim_hash").on(t.claimHash),
    uniqueIndex("campaign_invitation").on(t.campaignId, t.invitationIndex),
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
    hca: text().notNull(),
    resolver: text().notNull(),
    resolverSalt: text().notNull(),
    labelhash: text().notNull(),
    state: text().$type<typeof ClaimState.Type>().notNull(),
    nonce: text().notNull(),
    deadline: bigint({ mode: "number" }).notNull(),
    sessionExpiry: bigint({ mode: "number" }).notNull(),
    sessionKeyCiphertext: text(),
    authorizationCiphertext: text(),
    sessionPayload: jsonb().notNull(),
    commitmentSecretCiphertext: text(),
    commitment: text().notNull(),
    commitmentAt: bigint({ mode: "number" }),
    signature: text(),
    eligibilityCiphertext: text(),
    recipientAuthorizationCiphertext: text(),
    worldVerified: boolean().notNull(),
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
    id: text().primaryKey(),
    kind: text().$type<typeof JobKind.Type>().notNull(),
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

export const worldVerification = pgTable(
  "world_verifications",
  {
    claimId: text()
      .primaryKey()
      .references(() => claim.id),
    action: text().notNull(),
    nullifier: numeric({ precision: 78, scale: 0 }).notNull(),
    requestNonce: text().notNull(),
    verifiedAt: bigint({ mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("world_action_nullifier").on(t.action, t.nullifier),
    uniqueIndex("world_request_nonce").on(t.requestNonce),
  ],
);

export const worldRequest = pgTable("world_requests", {
  claimId: text()
    .primaryKey()
    .references(() => claim.id),
  nonce: text().notNull(),
  signal: text().notNull(),
  expiresAt: bigint({ mode: "number" }).notNull(),
  usedAt: bigint({ mode: "number" }),
});

export const chainTransaction = pgTable(
  "chain_transactions",
  {
    id: text().primaryKey(),
    subjectId: text().notNull(),
    purpose: text().notNull(),
    hash: text(),
    rawCiphertext: text(),
    nonce: bigint({ mode: "number" }),
    status: text().$type<"prepared" | "submitted" | "confirmed" | "reverted">().notNull(),
    createdAt: bigint({ mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("transaction_subject_purpose").on(t.subjectId, t.purpose),
    uniqueIndex("transaction_hash").on(t.hash),
  ],
);

export const auditEvent = pgTable("audit_events", {
  id: text().primaryKey(),
  subjectId: text().notNull(),
  action: text().notNull(),
  actorId: text().notNull(),
  createdAt: bigint({ mode: "number" }).notNull(),
});

export const ensWorkflow = pgTable(
  "ens_workflows",
  {
    namespace: text().notNull(),
    id: text().notNull(),
    revision: integer().notNull(),
    valueCiphertext: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.namespace, t.id] }),
    check("ens_workflow_revision", sql`${t.revision} >= 0`),
  ],
);
