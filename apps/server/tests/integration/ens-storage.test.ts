import { Effect, Layer } from "effect";

import { EnsWorkflowRepository, RepositoriesLive } from "@memento/database";
import { TestDatabase } from "@memento/database/testing";
import { expect, it } from "vitest";

import { EnsWorkflowStorage } from "../../src/integrations/ens/storage.js";
import { Providers } from "../fixtures/providers.js";

it("stores encrypted opaque workflows with namespace isolation and atomic revision checks", async () => {
  const program = Effect.gen(function* () {
    const storage = yield* EnsWorkflowStorage;
    const repo = yield* EnsWorkflowRepository;
    const first = storage.forClaim("claim-a");
    const second = storage.forClaim("claim-b");
    const namespace = "ens/registration";
    const record = { id: "registration", revision: 0, value: '{"secret":"must-stay-encrypted"}' };

    expect(yield* Effect.promise(() => first.create({ namespace, record }))).toBe(true);
    expect(yield* Effect.promise(() => first.create({ namespace, record }))).toBe(false);
    expect(yield* Effect.promise(() => second.get({ namespace, id: record.id }))).toBeNull();
    const stored = yield* repo.get(JSON.stringify(["claim-a", namespace]), record.id);
    expect(stored?.valueCiphertext).not.toContain("must-stay-encrypted");

    const restored = storage.forClaim("claim-a");
    expect(yield* Effect.promise(() => restored.get({ namespace, id: record.id }))).toEqual(record);
    const updated = { ...record, revision: 1, value: "next" };
    const winners = yield* Effect.promise(() =>
      Promise.all(
        [first, restored].map((client) =>
          client.compareAndSwap({ namespace, id: record.id, expectedRevision: 0, record: updated }),
        ),
      ),
    );
    expect(winners.filter(Boolean)).toHaveLength(1);
    expect(
      yield* Effect.promise(() =>
        first.compareAndSwap({
          namespace,
          id: record.id,
          expectedRevision: 1,
          record: { ...updated, revision: 3 },
        }),
      ),
    ).toBe(false);
    if (!first.list) throw new Error("Workflow listing is unavailable");
    const list = first.list;
    expect(yield* Effect.promise(() => list({ namespace, limit: 10 }))).toEqual([updated]);
  });

  await Effect.runPromise(
    program.pipe(
      Effect.provide(
        EnsWorkflowStorage.layer.pipe(
          Layer.provideMerge(RepositoriesLive.pipe(Layer.provideMerge(TestDatabase.layer))),
          Layer.provideMerge(Providers),
        ),
      ),
    ),
  );
});
