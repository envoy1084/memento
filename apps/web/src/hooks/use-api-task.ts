import { useMemo, useRef } from "react";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Effect, Option, Schema } from "effect";
import { AsyncResult, type Atom } from "effect/unstable/reactivity";

import { ApiClient } from "#/atoms/api";

export class JourneyError extends Schema.TaggedError<JourneyError>()("JourneyError", {
  message: Schema.String,
}) {}

export const journeyError = (error: unknown) => {
  if (error instanceof JourneyError) return error;
  if (error instanceof Error && error.message && !error.message.includes("0x"))
    return new JourneyError({ message: error.message.slice(0, 250) });
  return new JourneyError({
    message: "This step could not finish. Check your connection and try again.",
  });
};

export function useApiTask() {
  const locked = useRef(false);
  const atom = useMemo(
    () =>
      ApiClient.runtime.fn((task: (api: ApiClient["Service"]) => Promise<void>) =>
        Effect.gen(function* () {
          const api = yield* ApiClient;
          yield* Effect.tryPromise({ try: () => task(api), catch: journeyError });
        }),
      ),
    [],
  );
  const result = useAtomValue(atom);
  const execute = useAtomSet(atom, { mode: "promise" });

  return {
    busy: result.waiting,
    error: Option.getOrUndefined(AsyncResult.error(result))?.message,
    run: async (task: (api: ApiClient["Service"]) => Promise<void>) => {
      if (locked.current) return;
      locked.current = true;
      try {
        await execute(task);
      } catch {
        /* The mutation result renders the error. */
      } finally {
        locked.current = false;
      }
    },
  };
}

export function useRemote<A, E>(atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>) {
  const result = useAtomValue(atom);
  return {
    data: Option.getOrUndefined(AsyncResult.value(result)),
    loading: AsyncResult.isInitial(result),
    failed: AsyncResult.isFailure(result),
    refresh: useAtomRefresh(atom),
  };
}
