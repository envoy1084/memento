import { Context, Effect, Layer } from "effect";

import { and, eq, sql } from "drizzle-orm";

import { mapRepositoryError } from "../core/errors.js";
import { Database } from "../core/layer.js";
import { transactionOrDatabase } from "../core/transaction.js";
import { chainTransaction } from "../schema/index.js";
const make = Effect.gen(function* () {
  const database = yield* Database;
  return {
    lock: Effect.fn("ChainTransactionRepository.lock")(function* () {
      const db = yield* transactionOrDatabase(database);
      // Serializes coordinator nonce assignment across processes. Caller owns the transaction.
      yield* db.execute(sql`lock table chain_transactions in exclusive mode`);
    }, mapRepositoryError),
    find: Effect.fn("ChainTransactionRepository.find")(function* (
      subjectId: string,
      purpose: string,
    ) {
      const db = yield* transactionOrDatabase(database);
      const [row] = yield* db
        .select()
        .from(chainTransaction)
        .where(
          and(eq(chainTransaction.subjectId, subjectId), eq(chainTransaction.purpose, purpose)),
        );
      return row;
    }, mapRepositoryError),
    nextNonce: Effect.fn("ChainTransactionRepository.nextNonce")(function* () {
      const db = yield* transactionOrDatabase(database);
      const [row] = yield* db
        .select({ nonce: sql<number>`coalesce(max(${chainTransaction.nonce}), -1)` })
        .from(chainTransaction);
      return Number(row?.nonce ?? -1) + 1;
    }, mapRepositoryError),
    create: Effect.fn("ChainTransactionRepository.create")(function* (
      row: typeof chainTransaction.$inferInsert,
    ) {
      const db = yield* transactionOrDatabase(database);
      yield* db.insert(chainTransaction).values(row);
    }, mapRepositoryError),
    status: Effect.fn("ChainTransactionRepository.status")(function* (
      id: string,
      status: typeof chainTransaction.$inferInsert.status,
    ) {
      const db = yield* transactionOrDatabase(database);
      yield* db.update(chainTransaction).set({ status }).where(eq(chainTransaction.id, id));
    }, mapRepositoryError),
  };
});
export class ChainTransactionRepository extends Context.Service<
  ChainTransactionRepository,
  Effect.Success<typeof make>
>()("@memento/database/ChainTransactionRepository") {
  static readonly layer = Layer.effect(ChainTransactionRepository, make);
}
