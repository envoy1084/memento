import assert from "node:assert/strict";

import { Config, Effect, Layer } from "effect";

import {
  ChainTransactionRepository,
  EnsWorkflowRepository,
  Database,
  JobRepository,
  MigrationsLive,
  RepositoriesLive,
  TransactionService,
} from "../../src/index.js";

const program = Effect.gen(function* () {
  const url = yield* Config.redacted("TEST_DATABASE_URL");

  // Separate layer scopes simulate two deployments migrating the same initially empty database.
  yield* Effect.all(
    Array.from({ length: 2 }, () =>
      Layer.build(MigrationsLive).pipe(Effect.scoped, Effect.provide(Database.live(url))),
    ),
    { concurrency: 2 },
  );
  yield* Effect.gen(function* () {
    const workflows = yield* EnsWorkflowRepository;
    const record = {
      namespace: "ens/registration",
      id: "cas-race",
      revision: 0,
      valueCiphertext: "encrypted",
    };
    const creates = yield* Effect.all(
      Array.from({ length: 12 }, () => workflows.create(record)),
      { concurrency: 12 },
    );
    assert.equal(creates.filter(Boolean).length, 1);
    const updates = yield* Effect.all(
      Array.from({ length: 12 }, (_, index) =>
        workflows.compareAndSwap(0, { ...record, revision: 1, valueCiphertext: `winner-${index}` }),
      ),
      { concurrency: 12 },
    );
    assert.equal(updates.filter(Boolean).length, 1);
    assert.equal((yield* workflows.get(record.namespace, record.id))?.revision, 1);

    const jobs = yield* JobRepository;

    for (let index = 0; index < 12; index++) {
      yield* jobs.enqueue({
        id: `job-${index}`,
        kind: "claim",
        subjectId: `0x${index.toString(16).padStart(64, "0")}`,
        dedupeKey: `claim-${index}`,
        state: "pending",
        runAt: 1,
        attempts: 0,
        leaseToken: null,
        leaseUntil: null,
        lastError: null,
        payloadCiphertext: null,
      });
    }

    const leases = yield* Effect.all(
      Array.from({ length: 20 }, (_, index) => jobs.lease(1, `worker-${index}`)),
      { concurrency: 20 },
    );
    const claimed = leases.filter((lease) => lease !== undefined);

    assert.equal(claimed.length, 12);
    assert.equal(new Set(claimed.map((lease) => lease.id)).size, 12);

    const original = claimed[0];

    assert.ok(original?.leaseToken);

    const recovered = yield* jobs.lease(120002, "replacement");

    assert.ok(recovered);
    assert.equal(
      yield* jobs.finish(
        recovered.id,
        claimed.find((lease) => lease.id === recovered.id)?.leaseToken ?? "",
        "complete",
        120002,
      ),
      false,
    );
    assert.equal(yield* jobs.finish(recovered.id, "replacement", "pending", 0), true);

    const next = yield* jobs.lease(120002, "next");

    assert.equal(next?.attempts, 1, "successful progress resets the consecutive-failure budget");

    const journal = yield* ChainTransactionRepository;
    const transaction = yield* TransactionService;

    const nonces = yield* Effect.all(
      Array.from({ length: 12 }, (_, index) =>
        transaction.run(
          Effect.gen(function* () {
            yield* journal.lock();

            const nonce = yield* journal.nextNonce();

            yield* journal.create({
              id: `tx-${index}`,
              subjectId: `0x${index.toString(16).padStart(64, "0")}`,
              purpose: "reserve",
              hash: null,
              rawCiphertext: "encrypted-test-operation",
              nonce,
              status: "prepared",
              createdAt: 0,
            });

            return nonce;
          }),
        ),
      ),
      { concurrency: 12 },
    );

    assert.deepEqual(
      nonces.toSorted((left, right) => left - right),
      Array.from({ length: 12 }, (_, index) => index),
    );
    yield* Effect.logInfo(
      "PostgreSQL verified: concurrent migrations, exclusive leases, stale-worker fencing, consecutive retry budget, serialized nonces",
    );
  }).pipe(Effect.provide(RepositoriesLive.pipe(Layer.provideMerge(Database.live(url)))));
});

await Effect.runPromise(program);
