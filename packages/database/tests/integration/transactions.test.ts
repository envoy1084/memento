import { expect, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";

import { Conflict, type Gift } from "@memento/protocol";

import {
  AuditRepository,
  Database,
  GiftRepository,
  JobRepository,
  RepositoriesLive,
  TransactionService,
  auditEvent,
  job,
} from "../../src/index.js";
import { TestDatabase } from "../../src/testing/layer.js";

const testLayer = RepositoriesLive.pipe(Layer.provideMerge(TestDatabase.layer));

const fixture: Gift = {
  id: `0x${"11".repeat(32)}`,
  sponsorWallet: `0x${"22".repeat(20)}`,
  recipient: { kind: "email", value: "recipient-hash" },
  policy: {
    maxPrice: "10000000",
    duration: 31536000,
    expiresAt: 2000000000,
    minLength: 5,
    maxLength: 63,
  },
  claimHash: `0x${"33".repeat(32)}`,
  secretCiphertext: "encrypted",
  messageCiphertext: "encrypted",
  theme: "moon",
  metadataHash: `0x${"44".repeat(32)}`,
  status: "draft",
  fundingHash: null,
  createdAt: 0,
};

layer(testLayer)("database transactions", (it) => {
  it.effect("rolls back repository writes and nested transactions together", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;

      const gifts = yield* GiftRepository;
      const tx = yield* TransactionService;
      const audit = yield* AuditRepository;

      const error = yield* tx
        .run(
          Effect.gen(function* () {
            yield* gifts.create(fixture);
            yield* tx.run(
              audit.record({
                id: "event",
                subjectId: fixture.id,
                action: "created",
                actorId: "alice",
                createdAt: 0,
              }),
            );

            return yield* new Conflict({ code: "TEST_ROLLBACK", message: "rollback" });
          }),
        )
        .pipe(Effect.flip);

      expect(error._tag).toBe("Conflict");
      expect(yield* gifts.find(fixture.id)).toBeUndefined();
      expect(yield* (yield* Database).select().from(auditEvent)).toHaveLength(0);
    }),
  );
  it.effect("commits a state transition and its job atomically", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;

      const gifts = yield* GiftRepository;
      const jobs = yield* JobRepository;
      const tx = yield* TransactionService;

      yield* gifts.create(fixture);
      yield* tx.run(
        Effect.gen(function* () {
          expect(yield* gifts.transition(fixture.id, "draft", "ready")).toBe(true);
          yield* jobs.enqueue({
            id: "job",
            kind: "claim",
            subjectId: fixture.id,
            dedupeKey: "claim:gift",
            state: "pending",
            runAt: 0,
            attempts: 0,
            leaseToken: null,
            leaseUntil: null,
            lastError: null,
            payloadCiphertext: null,
          });
        }),
      );
      expect((yield* gifts.find(fixture.id))?.status).toBe("ready");
      expect(yield* (yield* Database).select().from(job)).toHaveLength(1);
      expect(yield* gifts.transition(fixture.id, "draft", "ready")).toBe(false);
    }),
  );
  it.effect("deduplicates jobs and fences stale leases", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;

      const jobs = yield* JobRepository;

      const row = {
        id: "one",
        kind: "claim",
        subjectId: fixture.id,
        dedupeKey: "unique",
        state: "pending",
        runAt: 0,
        attempts: 0,
        leaseToken: null,
        leaseUntil: null,
        lastError: null,
        payloadCiphertext: null,
      } as const;

      yield* jobs.enqueue(row);
      yield* jobs.enqueue({ ...row, id: "two" });
      expect((yield* jobs.lease(0, "worker-one"))?.id).toBe("one");
      expect(yield* jobs.lease(1, "worker-two")).toBeUndefined();
      expect((yield* jobs.lease(120001, "worker-two"))?.attempts).toBe(2);
      expect(yield* jobs.finish("one", "worker-one", "complete", 120001)).toBe(false);
      expect(yield* jobs.finish("one", "worker-two", "complete", 120001)).toBe(true);
    }),
  );
});
