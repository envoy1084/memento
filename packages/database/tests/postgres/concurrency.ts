import assert from "node:assert/strict";

import { Config, Effect, Layer } from "effect";

import { Database, JobRepository, MigrationsLive, RepositoriesLive } from "../../src/index.js";

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

    yield* Effect.logInfo(
      "PostgreSQL verified: concurrent migrations, exclusive leases, stale-worker fencing, consecutive retry budget",
    );
  }).pipe(Effect.provide(RepositoriesLive.pipe(Layer.provideMerge(Database.live(url)))));
});

await Effect.runPromise(program);
