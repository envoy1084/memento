CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY,
	"subjectId" text NOT NULL,
	"action" text NOT NULL,
	"actorId" text NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" text PRIMARY KEY,
	"giftId" text NOT NULL,
	"userId" text NOT NULL,
	"recipientWallet" text NOT NULL,
	"label" text NOT NULL,
	"resolver" text NOT NULL,
	"resolverSalt" text NOT NULL,
	"labelhash" text NOT NULL,
	"state" text NOT NULL,
	"nonce" text NOT NULL,
	"deadline" bigint NOT NULL,
	"commitmentSecretCiphertext" text,
	"commitment" text NOT NULL,
	"commitmentAt" bigint,
	"signature" text,
	"recipientAuthorizationCiphertext" text,
	"price" numeric(39,0) NOT NULL,
	"lastError" text,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gifts" (
	"id" text PRIMARY KEY,
	"sponsorWallet" text NOT NULL,
	"recipient" jsonb NOT NULL,
	"policy" jsonb NOT NULL,
	"claimHash" text NOT NULL,
	"secretCiphertext" text,
	"messageCiphertext" text NOT NULL,
	"recipientContactCiphertext" text,
	"theme" text NOT NULL,
	"metadataHash" text NOT NULL,
	"status" text NOT NULL,
	"fundingHash" text,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"kind" text NOT NULL,
	"id" text PRIMARY KEY,
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
CREATE UNIQUE INDEX "claim_gift" ON "claims" ("giftId");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_nonce" ON "claims" ("recipientWallet","nonce");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_claim_hash" ON "gifts" ("claimHash");--> statement-breakpoint
CREATE INDEX "gift_sponsor" ON "gifts" ("sponsorWallet","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "job_dedupe" ON "jobs" ("dedupeKey");--> statement-breakpoint
CREATE INDEX "job_due" ON "jobs" ("state","runAt");--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_giftId_gifts_id_fkey" FOREIGN KEY ("giftId") REFERENCES "gifts"("id");