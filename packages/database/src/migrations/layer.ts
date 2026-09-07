import { fileURLToPath } from "node:url";

import { Effect, Layer } from "effect";

import { migrate } from "drizzle-orm/effect-postgres/migrator";

import { Database } from "../core/layer.js";
export const MigrationsLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const db = yield* Database;
    yield* migrate(db, {
      migrationsFolder: fileURLToPath(new URL("../../migrations", import.meta.url)),
    });
  }),
);
