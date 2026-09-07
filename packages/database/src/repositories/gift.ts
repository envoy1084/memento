import { Context, Effect, Layer, Schema } from "effect";

import { DatabaseError, Gift } from "@memento/protocol";
import { and, eq, inArray } from "drizzle-orm";

import { mapRepositoryError } from "#/core/errors";
import { Database } from "#/core/layer";
import { transactionOrDatabase } from "#/core/transaction";
import { gift } from "#/schema/index";

const decode = Schema.decodeUnknownEffect(Gift);
const make = Effect.gen(function* () {
  const database = yield* Database;
  return {
    create: Effect.fn("GiftRepository.create")(function* (row: Gift) {
      const db = yield* transactionOrDatabase(database);
      yield* db.insert(gift).values(row);
    }, mapRepositoryError),
    find: Effect.fn("GiftRepository.find")(function* (id: string) {
      const db = yield* transactionOrDatabase(database);
      const [row] = yield* db.select().from(gift).where(eq(gift.id, id));
      return row
        ? yield* decode(row).pipe(
            Effect.mapError(
              (cause) => new DatabaseError({ cause, message: "Invalid stored gift" }),
            ),
          )
        : undefined;
    }, mapRepositoryError),
    list: Effect.fn("GiftRepository.list")(function* (wallets: readonly string[]) {
      const db = yield* transactionOrDatabase(database);
      return yield* Schema.decodeUnknownEffect(Schema.Array(Gift))(
        yield* db
          .select()
          .from(gift)
          .where(inArray(gift.sponsorWallet, [...wallets]))
          .limit(100),
      ).pipe(
        Effect.mapError((cause) => new DatabaseError({ cause, message: "Invalid stored gifts" })),
      );
    }, mapRepositoryError),
    campaign: Effect.fn("GiftRepository.campaign")(function* (id: string) {
      const db = yield* transactionOrDatabase(database);
      return yield* Schema.decodeUnknownEffect(Schema.Array(Gift))(
        yield* db.select().from(gift).where(eq(gift.campaignId, id)).orderBy(gift.invitationIndex),
      ).pipe(
        Effect.mapError((cause) => new DatabaseError({ cause, message: "Invalid invitations" })),
      );
    }, mapRepositoryError),
    transition: Effect.fn("GiftRepository.transition")(function* (
      id: string,
      expected: Gift["status"],
      status: Gift["status"],
      fundingHash?: string,
    ) {
      const db = yield* transactionOrDatabase(database);
      const rows = yield* db
        .update(gift)
        .set({ status, ...(fundingHash ? { fundingHash } : {}) })
        .where(and(eq(gift.id, id), eq(gift.status, expected)))
        .returning({ id: gift.id });
      return rows.length === 1;
    }, mapRepositoryError),
  };
});
export class GiftRepository extends Context.Service<GiftRepository, Effect.Success<typeof make>>()(
  "@memento/database/GiftRepository",
) {
  static readonly layer = Layer.effect(GiftRepository, make);
}
