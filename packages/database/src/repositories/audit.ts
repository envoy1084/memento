import { Context, Effect, Layer } from "effect";

import { mapRepositoryError } from "#/core/errors";
import { Database } from "#/core/layer";
import { transactionOrDatabase } from "#/core/transaction";
import { auditEvent } from "#/schema/index";

const make = Effect.gen(function* () {
  const database = yield* Database;

  return {
    record: Effect.fn("AuditRepository.record")(function* (row: typeof auditEvent.$inferInsert) {
      const db = yield* transactionOrDatabase(database);

      yield* db.insert(auditEvent).values(row);
    }, mapRepositoryError),
  };
});

export class AuditRepository extends Context.Service<
  AuditRepository,
  Effect.Success<typeof make>
>()("@memento/database/AuditRepository") {
  static readonly layer = Layer.effect(AuditRepository, make);
}
