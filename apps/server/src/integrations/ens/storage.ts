import { Context, Effect, Layer } from "effect";

import type { WorkflowStorage, WorkflowStoredRecord } from "@ensforge/core/storage";
import { Cryptography } from "@memento/application";
import { EnsWorkflowRepository } from "@memento/database";

const make = Effect.gen(function* () {
  const repository = yield* EnsWorkflowRepository;
  const crypto = yield* Cryptography;

  return {
    forClaim: (claimId: string): WorkflowStorage => {
      const scoped = (namespace: string) => JSON.stringify([claimId, namespace]);
      const context = (namespace: string, id: string, revision: number) =>
        JSON.stringify(["ens-workflow", scoped(namespace), id, revision]);
      const seal = (namespace: string, record: WorkflowStoredRecord) => ({
        namespace: scoped(namespace),
        id: record.id,
        revision: record.revision,
        valueCiphertext: crypto.seal(record.value, context(namespace, record.id, record.revision)),
      });

      return {
        kind: "workflow-storage",
        create: ({ namespace, record }) =>
          Effect.runPromise(repository.create(seal(namespace, record))),
        get: ({ namespace, id }) =>
          Effect.runPromise(
            Effect.gen(function* () {
              const record = yield* repository.get(scoped(namespace), id);
              if (!record) return null;

              return {
                id,
                revision: record.revision,
                value: yield* crypto.open(
                  record.valueCiphertext,
                  context(namespace, id, record.revision),
                ),
              };
            }),
          ),
        compareAndSwap: ({ namespace, id, expectedRevision, record }) => {
          if (id !== record.id) return Promise.resolve(false);
          return Effect.runPromise(
            repository.compareAndSwap(expectedRevision, seal(namespace, record)),
          );
        },
        list: ({ namespace, after, limit }) =>
          Effect.runPromise(
            Effect.gen(function* () {
              const records = yield* repository.list(scoped(namespace), after, limit);

              return yield* Effect.forEach(records, (record) =>
                crypto
                  .open(record.valueCiphertext, context(namespace, record.id, record.revision))
                  .pipe(
                    Effect.map((value) => ({ id: record.id, revision: record.revision, value })),
                  ),
              );
            }),
          ),
      };
    },
  };
});

export class EnsWorkflowStorage extends Context.Service<
  EnsWorkflowStorage,
  Effect.Success<typeof make>
>()("@memento/server/EnsWorkflowStorage") {
  static readonly layer = Layer.effect(EnsWorkflowStorage, make);
}
