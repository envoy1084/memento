import { fileURLToPath } from "node:url";

import { Effect, Layer } from "effect";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/effect-postgres/migrator";

import { Database } from "../core/layer.js";
export const MigrationsLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const db = yield* Database;
    yield* db.transaction((transaction) =>
      Effect.gen(function* () {
        // Serialize startup across overlapping deployments, including the migration-table creation.
        yield* transaction.execute(sql`select pg_advisory_xact_lock(723456123)`);
        yield* migrate(transaction, {
          migrationsFolder: fileURLToPath(new URL("../../migrations", import.meta.url)),
        });
      }),
    );
  }),
);
