import { Context, Effect, Layer } from "effect";

import { Forbidden, ProviderError } from "@memento/protocol";

export class WorldVerifier extends Context.Service<
  WorldVerifier,
  {
    readonly verify: (
      rpId: string,
      proof: unknown,
    ) => Effect.Effect<void, ProviderError | Forbidden>;
  }
>()("@memento/world-id/WorldVerifier") {
  static readonly live = Layer.succeed(
    WorldVerifier,
    WorldVerifier.of({
      verify: Effect.fn("WorldVerifier.verify")(function* (rpId, proof) {
        const response = yield* Effect.tryPromise({
          try: (signal) =>
            fetch(`https://developer.world.org/api/v4/verify/${encodeURIComponent(rpId)}`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(proof),
              signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
            }),

          catch: () =>
            new ProviderError({
              provider: "world-id",
              retryable: true,
              message: "World ID verification unavailable",
            }),
        });

        if (response.status >= 500 || response.status === 429)
          return yield* new ProviderError({
            provider: "world-id",
            retryable: true,
            message: "World ID verification unavailable",
          });

        if (!response.ok) return yield* new Forbidden({ message: "World ID rejected this proof" });

        yield* Effect.promise(() => response.body?.cancel() ?? Promise.resolve());
      }),
    }),
  );
}
