import { Context, Effect, Layer, Redacted, Schema } from "effect";

import { Forbidden, ProviderError } from "@memento/protocol";
import { hashSignal } from "@worldcoin/idkit-core/hashing";
import { signRequest } from "@worldcoin/idkit-core/signing";

export interface WorldRequest {
  readonly nonce: string;
  readonly expiresAt: number;
  readonly signal: string;
  readonly configuration: unknown;
}
export interface WorldExpectation {
  readonly nonce: string;
  readonly signal: string;
}
const ProofEnvelope = Schema.Struct({
  protocol_version: Schema.Literals(["3.0", "4.0"]),
  nonce: Schema.String,
  action: Schema.String,
  environment: Schema.String,
  responses: Schema.Array(
    Schema.Struct({
      identifier: Schema.String,
      signal_hash: Schema.String,
      nullifier: Schema.String.check(Schema.isPattern(/^0x[0-9a-fA-F]{1,64}$/)),
    }),
  ).check(Schema.isLengthBetween(1, 1)),
});
export class WorldId extends Context.Service<
  WorldId,
  {
    readonly action: string;
    readonly request: (signal: string) => Effect.Effect<WorldRequest, ProviderError>;
    readonly verify: (
      proof: unknown,
      expected: WorldExpectation,
    ) => Effect.Effect<string, ProviderError | Forbidden>;
  }
>()("@memento/world-id/WorldId") {
  static live(config: {
    appId: string;
    rpId: string;
    action: string;
    environment: "staging" | "production";
    signingKey: Redacted.Redacted<string>;
  }) {
    return Layer.succeed(
      WorldId,
      WorldId.of({
        action: config.action,
        request: Effect.fn("WorldId.request")((signal) =>
          Effect.try({
            try: () => {
              const signed = signRequest({
                action: config.action,
                signingKeyHex: Redacted.value(config.signingKey),
              });
              return {
                nonce: signed.nonce,
                expiresAt: signed.expiresAt,
                signal,
                configuration: {
                  app_id: config.appId,
                  action: config.action,
                  environment: config.environment,
                  allow_legacy_proofs: true,
                  preset: "selfieCheckLegacy",
                  signal,
                  rp_context: {
                    rp_id: config.rpId,
                    nonce: signed.nonce,
                    created_at: signed.createdAt,
                    expires_at: signed.expiresAt,
                    signature: signed.sig,
                  },
                },
              };
            },
            catch: () =>
              new ProviderError({
                provider: "world-id",
                retryable: false,
                message: "Unable to sign World ID request",
              }),
          }),
        ),
        verify: Effect.fn("WorldId.verify")(function* (proof, expected) {
          const envelope = yield* Schema.decodeUnknownEffect(ProofEnvelope)(proof).pipe(
            Effect.mapError(() => new Forbidden({ message: "Invalid World ID proof" })),
          );
          const response = envelope.responses[0];
          if (
            !response ||
            envelope.action !== config.action ||
            envelope.nonce !== expected.nonce ||
            envelope.environment !== config.environment ||
            response.identifier !== "selfie" ||
            response.signal_hash.toLowerCase() !== hashSignal(expected.signal).toLowerCase()
          ) {
            return yield* new Forbidden({ message: "World ID proof does not match this claim" });
          }
          const result = yield* Effect.tryPromise({
            try: (signal) =>
              fetch(
                `https://developer.world.org/api/v4/verify/${encodeURIComponent(config.rpId)}`,
                {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(proof),
                  signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
                },
              ),
            catch: () =>
              new ProviderError({
                provider: "world-id",
                retryable: true,
                message: "World ID verification unavailable",
              }),
          });
          if (result.status >= 500 || result.status === 429)
            return yield* new ProviderError({
              provider: "world-id",
              retryable: true,
              message: "World ID verification unavailable",
            });
          if (!result.ok) return yield* new Forbidden({ message: "World ID rejected this proof" });
          return BigInt(response.nullifier).toString();
        }),
      }),
    );
  }
}
