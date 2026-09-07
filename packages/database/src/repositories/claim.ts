import { Context, Effect, Layer, Schema } from "effect";

import { Claim, DatabaseError } from "@memento/protocol";
import { and, eq } from "drizzle-orm";

import { mapRepositoryError } from "#/core/errors";
import { Database } from "#/core/layer";
import { transactionOrDatabase } from "#/core/transaction";
import { claim } from "#/schema/index";

const make = Effect.gen(function* () {
  const database = yield* Database;
  const decode = Schema.decodeUnknownEffect(Claim);
  return {
    create: Effect.fn("ClaimRepository.create")(function* (row: Claim) {
      const db = yield* transactionOrDatabase(database);
      yield* db.insert(claim).values(row);
    }, mapRepositoryError),
    find: Effect.fn("ClaimRepository.find")(function* (id: string) {
      const db = yield* transactionOrDatabase(database);
      const [row] = yield* db.select().from(claim).where(eq(claim.id, id));
      return row
        ? yield* decode(row).pipe(
            Effect.mapError(
              (cause) => new DatabaseError({ cause, message: "Invalid stored claim" }),
            ),
          )
        : undefined;
    }, mapRepositoryError),
    forGift: Effect.fn("ClaimRepository.forGift")(function* (giftId: string) {
      const db = yield* transactionOrDatabase(database);
      const [row] = yield* db.select().from(claim).where(eq(claim.giftId, giftId));
      return row
        ? yield* decode(row).pipe(
            Effect.mapError(
              (cause) => new DatabaseError({ cause, message: "Invalid stored claim" }),
            ),
          )
        : undefined;
    }, mapRepositoryError),
    transition: Effect.fn("ClaimRepository.transition")(function* (
      id: string,
      expected: Claim["state"],
      patch: Partial<Omit<Claim, "id" | "giftId" | "userId" | "recipientWallet">>,
    ) {
      const db = yield* transactionOrDatabase(database);
      const rows = yield* db
        .update(claim)
        .set(patch)
        .where(and(eq(claim.id, id), eq(claim.state, expected)))
        .returning({ id: claim.id });
      return rows.length === 1;
    }, mapRepositoryError),
  };
});
export class ClaimRepository extends Context.Service<
  ClaimRepository,
  Effect.Success<typeof make>
>()("@memento/database/ClaimRepository") {
  static readonly layer = Layer.effect(ClaimRepository, make);
}
