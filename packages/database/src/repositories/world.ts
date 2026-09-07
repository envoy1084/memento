import { Context, Effect, Layer } from "effect";

import { and, eq, isNull } from "drizzle-orm";

import { mapRepositoryError } from "#/core/errors";
import { Database } from "#/core/layer";
import { transactionOrDatabase } from "#/core/transaction";
import { worldRequest, worldVerification } from "#/schema/index";
const make = Effect.gen(function* () {
  const database = yield* Database;
  return {
    request: Effect.fn("WorldRepository.request")(function* (
      row: typeof worldRequest.$inferInsert,
    ) {
      const db = yield* transactionOrDatabase(database);
      yield* db
        .insert(worldRequest)
        .values(row)
        .onConflictDoUpdate({ target: worldRequest.claimId, set: row });
    }, mapRepositoryError),
    find: Effect.fn("WorldRepository.find")(function* (claimId: string) {
      const db = yield* transactionOrDatabase(database);
      const [row] = yield* db.select().from(worldRequest).where(eq(worldRequest.claimId, claimId));
      return row;
    }, mapRepositoryError),
    verify: Effect.fn("WorldRepository.verify")(function* (
      row: typeof worldVerification.$inferInsert,
    ) {
      const db = yield* transactionOrDatabase(database);
      const consumed = yield* db
        .update(worldRequest)
        .set({ usedAt: row.verifiedAt })
        .where(
          and(
            eq(worldRequest.claimId, row.claimId),
            eq(worldRequest.nonce, row.requestNonce),
            isNull(worldRequest.usedAt),
          ),
        )
        .returning();
      if (consumed.length !== 1) return false;
      const inserted = yield* db
        .insert(worldVerification)
        .values(row)
        .onConflictDoNothing()
        .returning();
      return inserted.length === 1;
    }, mapRepositoryError),
  };
});
export class WorldRepository extends Context.Service<
  WorldRepository,
  Effect.Success<typeof make>
>()("@memento/database/WorldRepository") {
  static readonly layer = Layer.effect(WorldRepository, make);
}
