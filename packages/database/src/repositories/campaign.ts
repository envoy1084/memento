import { Context, Effect, Layer, Schema } from "effect";

import { Campaign, DatabaseError } from "@memento/protocol";
import { and, desc, eq, inArray } from "drizzle-orm";

import { mapRepositoryError } from "#/core/errors";
import { Database } from "#/core/layer";
import { transactionOrDatabase } from "#/core/transaction";
import { campaign } from "#/schema/index";
const make = Effect.gen(function* () {
  const database = yield* Database;
  return {
    list: Effect.fn("CampaignRepository.list")(function* (wallets: readonly string[], offset = 0) {
      const db = yield* transactionOrDatabase(database);
      return yield* Schema.decodeUnknownEffect(Schema.Array(Campaign))(
        yield* db
          .select()
          .from(campaign)
          .where(inArray(campaign.sponsorWallet, [...wallets]))
          .orderBy(desc(campaign.createdAt), campaign.id)
          .limit(100)
          .offset(offset),
      ).pipe(
        Effect.mapError(
          (cause) => new DatabaseError({ cause, message: "Invalid stored campaigns" }),
        ),
      );
    }, mapRepositoryError),
    create: Effect.fn("CampaignRepository.create")(function* (row: Campaign) {
      const db = yield* transactionOrDatabase(database);
      yield* db.insert(campaign).values(row);
    }, mapRepositoryError),
    find: Effect.fn("CampaignRepository.find")(function* (id: string) {
      const db = yield* transactionOrDatabase(database);
      const [row] = yield* db.select().from(campaign).where(eq(campaign.id, id));
      return row
        ? yield* Schema.decodeUnknownEffect(Campaign)(row).pipe(
            Effect.mapError(
              (cause) => new DatabaseError({ cause, message: "Invalid stored campaign" }),
            ),
          )
        : undefined;
    }, mapRepositoryError),
    transition: Effect.fn("CampaignRepository.transition")(function* (
      id: string,
      status: Campaign["status"],
      next: Campaign["status"],
      fundingHash?: string,
    ) {
      const db = yield* transactionOrDatabase(database);
      const rows = yield* db
        .update(campaign)
        .set({ status: next, ...(fundingHash ? { fundingHash } : {}) })
        .where(and(eq(campaign.id, id), eq(campaign.status, status)))
        .returning({ id: campaign.id });
      return rows.length === 1;
    }, mapRepositoryError),
  };
});
export class CampaignRepository extends Context.Service<
  CampaignRepository,
  Effect.Success<typeof make>
>()("@memento/database/CampaignRepository") {
  static readonly layer = Layer.effect(CampaignRepository, make);
}
