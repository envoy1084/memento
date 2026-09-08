import { Effect } from "effect";

import { Unauthorized } from "@memento/protocol";

import { ApiClient } from "#/atoms/api";

// A fresh atom per login keeps account data out of another user's session and preview storage.
export const makeSessionAtom = (userId: string | undefined) =>
  ApiClient.runtime.atom(
    Effect.gen(function* () {
      if (!userId) return undefined;

      const api = yield* ApiClient;
      const actor = yield* api.session.current();

      if (actor.userId !== userId)
        return yield* new Unauthorized({ message: "Your account changed. Please sign in again." });

      return actor;
    }).pipe(Effect.timeout("15 seconds")),
  );
