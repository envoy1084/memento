import { PgClient } from "@effect/sql-pg";
import { PgliteClient } from "@effect/sql-pglite";
import { Context, Layer, type Redacted } from "effect";

import * as PgliteDrizzle from "drizzle-orm/effect-pglite";
import * as PgDrizzle from "drizzle-orm/effect-postgres";

import { relations } from "#/relations";

export type DatabaseService = PgDrizzle.EffectPgDatabase<typeof relations>;

export class Database extends Context.Service<Database, DatabaseService>()(
  "@memento/database/Database",
) {
  static readonly live = (url: Redacted.Redacted<string>) =>
    Layer.effect(Database, PgDrizzle.makeWithDefaults({ relations })).pipe(
      Layer.provide(PgClient.layer({ url })),
    );

  static readonly testLayer = Layer.effect(
    Database,
    PgliteDrizzle.makeWithDefaults({ relations }),
  ).pipe(Layer.provide(PgliteClient.layer()));
}
