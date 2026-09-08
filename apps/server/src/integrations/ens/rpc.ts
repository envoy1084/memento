import { Context, Effect, Layer, Redacted, Schema, Stream } from "effect";
import { FetchHttpClient, HttpBody, HttpClient } from "effect/unstable/http";

import { ProviderError, RpcResponse, type RpcRequest } from "@memento/protocol";

export class SepoliaRpc extends Context.Service<
  SepoliaRpc,
  {
    readonly execute: (request: RpcRequest) => Effect.Effect<RpcResponse, ProviderError>;
  }
>()("@memento/server/SepoliaRpc") {
  static live(url: Redacted.Redacted<string>) {
    return Layer.effect(
      SepoliaRpc,
      Effect.gen(function* () {
        const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);

        return SepoliaRpc.of({
          execute: Effect.fn("SepoliaRpc.execute")(
            function* (request) {
              // Only the JSON-RPC payload is forwarded, never browser credentials or headers.
              const response = yield* client.post(Redacted.value(url), {
                body: HttpBody.jsonUnsafe(request),
                headers: { "content-type": "application/json" },
              });
              const chunks: Uint8Array[] = [];
              let size = 0;

              yield* Stream.runForEach(response.stream, (chunk) => {
                size += chunk.byteLength;

                if (size > 2 * 1024 * 1024) {
                  return Effect.fail(
                    new ProviderError({
                      provider: "rpc",
                      retryable: false,
                      message: "RPC response is too large",
                    }),
                  );
                }

                chunks.push(chunk);

                return Effect.void;
              });

              const decoded = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(RpcResponse))(
                Buffer.concat(chunks).toString("utf8"),
              );

              if (decoded.id !== request.id) {
                return yield* new ProviderError({
                  provider: "rpc",
                  retryable: true,
                  message: "RPC response does not match the request",
                });
              }

              return decoded;
            },
            Effect.timeout("15 seconds"),
            Effect.mapError(
              () =>
                new ProviderError({
                  provider: "rpc",
                  retryable: true,
                  message: "Sepolia RPC is unavailable",
                }),
            ),
          ),
        });
      }),
    ).pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(Layer.succeed(FetchHttpClient.RequestInit, { redirect: "error" })),
    );
  }
}
