import { fileURLToPath } from "node:url";

import { Context, Effect, Layer } from "effect";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/effect-pglite/migrator";

import { Database } from "#/core/layer";

export class TestDatabase extends Context.Service<
  TestDatabase,
  { readonly reset: Effect.Effect<void> }
>()("@memento/database/TestDatabase") {
  static readonly layer = Layer.effect(
    TestDatabase,
    Effect.gen(function* () {
      const db = yield* Database;

      yield* migrate(db, {
        migrationsFolder: fileURLToPath(
          new URL("./migrations", import.meta.resolve("@memento/database/package.json")),
        ),
      });

      return {
        reset: db
          .execute(
            sql`truncate table ens_workflows, audit_events, chain_transactions, world_verifications, world_requests, jobs, claims, gifts, campaigns cascade`,
          )
          .pipe(Effect.asVoid, Effect.orDie),
      };
    }),
  ).pipe(Layer.provideMerge(Database.testLayer));
}
