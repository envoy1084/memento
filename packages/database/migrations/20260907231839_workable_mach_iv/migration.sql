CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY,
	"subjectId" text NOT NULL,
	"action" text NOT NULL,
	"actorId" text NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY,
	"sponsorWallet" text NOT NULL,
	"policy" jsonb NOT NULL,
	"root" text NOT NULL,
	"count" integer NOT NULL,
	"status" text NOT NULL,
	"fundingHash" text,
	"createdAt" bigint NOT NULL,
	CONSTRAINT "campaign_count" CHECK ("count" between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "chain_transactions" (
	"id" text PRIMARY KEY,
	"subjectId" text NOT NULL,
	"purpose" text NOT NULL,
	"hash" text,
	"rawCiphertext" text,
	"nonce" bigint,
	"status" text NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" text PRIMARY KEY,
	"giftId" text NOT NULL,
	"userId" text NOT NULL,
	"recipientWallet" text NOT NULL,
	"label" text NOT NULL,
	"hca" text NOT NULL,
	"resolver" text NOT NULL,
	"resolverSalt" text NOT NULL,
	"labelhash" text NOT NULL,
	"state" text NOT NULL,
	"nonce" text NOT NULL,
	"deadline" bigint NOT NULL,
	"sessionExpiry" bigint NOT NULL,
	"sessionKeyCiphertext" text,
	"authorizationCiphertext" text,
	"sessionPayload" jsonb NOT NULL,
	"commitmentSecretCiphertext" text,
	"commitment" text NOT NULL,
	"commitmentAt" bigint,
	"signature" text,
	"eligibilityCiphertext" text,
	"recipientAuthorizationCiphertext" text,
	"worldVerified" boolean NOT NULL,
	"price" numeric(39,0) NOT NULL,
	"lastError" text,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gifts" (
	"id" text PRIMARY KEY,
	"campaignId" text,
	"invitationIndex" integer,
	"kind" text NOT NULL,
	"sponsorWallet" text NOT NULL,
	"recipient" jsonb NOT NULL,
	"policy" jsonb NOT NULL,
	"claimHash" text NOT NULL,
	"secretCiphertext" text,
	"messageCiphertext" text NOT NULL,
	"records" jsonb NOT NULL,
	"theme" text NOT NULL,
	"label" text,
	"proof" jsonb NOT NULL,
	"metadataHash" text NOT NULL,
	"status" text NOT NULL,
	"fundingHash" text,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY,
	"kind" text NOT NULL,
	"subjectId" text NOT NULL,
	"dedupeKey" text NOT NULL,
	"state" text NOT NULL,
	"runAt" bigint NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"leaseToken" text,
	"leaseUntil" bigint,
	"lastError" text,
	"payloadCiphertext" text,
	CONSTRAINT "job_attempts" CHECK ("attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "world_requests" (
	"claimId" text PRIMARY KEY,
	"nonce" text NOT NULL,
	"signal" text NOT NULL,
	"expiresAt" bigint NOT NULL,
	"usedAt" bigint
);
--> statement-breakpoint
CREATE TABLE "world_verifications" (
	"claimId" text PRIMARY KEY,
	"action" text NOT NULL,
	"nullifier" numeric(78,0) NOT NULL,
	"requestNonce" text NOT NULL,
	"verifiedAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_funding" ON "campaigns" ("fundingHash");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_subject_purpose" ON "chain_transactions" ("subjectId","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_hash" ON "chain_transactions" ("hash");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_gift" ON "claims" ("giftId");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_nonce" ON "claims" ("recipientWallet","nonce");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_claim_hash" ON "gifts" ("claimHash");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_invitation" ON "gifts" ("campaignId","invitationIndex");--> statement-breakpoint
CREATE INDEX "gift_sponsor" ON "gifts" ("sponsorWallet","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "job_dedupe" ON "jobs" ("dedupeKey");--> statement-breakpoint
CREATE INDEX "job_due" ON "jobs" ("state","runAt");--> statement-breakpoint
CREATE UNIQUE INDEX "world_action_nullifier" ON "world_verifications" ("action","nullifier");--> statement-breakpoint
CREATE UNIQUE INDEX "world_request_nonce" ON "world_verifications" ("requestNonce");--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_giftId_gifts_id_fkey" FOREIGN KEY ("giftId") REFERENCES "gifts"("id");--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_campaignId_campaigns_id_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id");--> statement-breakpoint
ALTER TABLE "world_requests" ADD CONSTRAINT "world_requests_claimId_claims_id_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id");--> statement-breakpoint
ALTER TABLE "world_verifications" ADD CONSTRAINT "world_verifications_claimId_claims_id_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id");