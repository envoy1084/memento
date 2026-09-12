import { Context, Effect, Layer, Schema } from "effect";

import { DatabaseError, EnsWorkflowRecord } from "@memento/protocol";
import { and, eq, gt } from "drizzle-orm";

import { mapRepositoryError } from "#/core/errors";
import { Database } from "#/core/layer";
import { transactionOrDatabase } from "#/core/transaction";
import { ensWorkflow } from "#/schema/index";

const make = Effect.gen(function* () {
  const database = yield* Database;
  const decode = Schema.decodeUnknownEffect(EnsWorkflowRecord);

  return {
    create: Effect.fn("EnsWorkflowRepository.create")(function* (record: EnsWorkflowRecord) {
      if (record.revision !== 0) return false;
      const db = yield* transactionOrDatabase(database);
      const rows = yield* db
        .insert(ensWorkflow)
        .values(record)
        .onConflictDoNothing()
        .returning({ id: ensWorkflow.id });

      return rows.length === 1;
    }, mapRepositoryError),

    get: Effect.fn("EnsWorkflowRepository.get")(function* (namespace: string, id: string) {
      const db = yield* transactionOrDatabase(database);
      const [row] = yield* db
        .select()
        .from(ensWorkflow)
        .where(and(eq(ensWorkflow.namespace, namespace), eq(ensWorkflow.id, id)));

      return row
        ? yield* decode(row).pipe(
            Effect.mapError(
              (cause) => new DatabaseError({ cause, message: "Invalid ENS workflow record" }),
            ),
          )
        : null;
    }, mapRepositoryError),

    compareAndSwap: Effect.fn("EnsWorkflowRepository.compareAndSwap")(function* (
      expectedRevision: number,
      record: EnsWorkflowRecord,
    ) {
      if (record.revision !== expectedRevision + 1) return false;
      const db = yield* transactionOrDatabase(database);
      const rows = yield* db
        .update(ensWorkflow)
        .set({ revision: record.revision, valueCiphertext: record.valueCiphertext })
        .where(
          and(
            eq(ensWorkflow.namespace, record.namespace),
            eq(ensWorkflow.id, record.id),
            eq(ensWorkflow.revision, expectedRevision),
          ),
        )
        .returning({ id: ensWorkflow.id });

      return rows.length === 1;
    }, mapRepositoryError),

    list: Effect.fn("EnsWorkflowRepository.list")(function* (
      namespace: string,
      after: string | undefined,
      limit: number,
    ) {
      const db = yield* transactionOrDatabase(database);
      const rows = yield* db
        .select()
        .from(ensWorkflow)
        .where(
          and(
            eq(ensWorkflow.namespace, namespace),
            after === undefined ? undefined : gt(ensWorkflow.id, after),
          ),
        )
        .orderBy(ensWorkflow.id)
        .limit(Math.max(1, Math.min(100, limit)));

      return yield* Schema.decodeUnknownEffect(Schema.Array(EnsWorkflowRecord))(rows).pipe(
        Effect.mapError(
          (cause) => new DatabaseError({ cause, message: "Invalid ENS workflow records" }),
        ),
      );
    }, mapRepositoryError),
  };
});

export class EnsWorkflowRepository extends Context.Service<
  EnsWorkflowRepository,
  Effect.Success<typeof make>
>()("@memento/database/EnsWorkflowRepository") {
  static readonly layer = Layer.effect(EnsWorkflowRepository, make);
}
