import { Effect, Layer, Schema, Stream } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";

import { RpcRequest } from "@memento/protocol";

import { SepoliaRpc } from "../../integrations/ens/rpc.js";
import {
  maximumBatchSize,
  publicRpcResponse,
  rpcError,
  rpcPath,
  validateRpcMethod,
} from "./policy.js";

export const RpcRoutes = Layer.unwrap(
  Effect.gen(function* () {
    const rpc = yield* SepoliaRpc;

    const execute = Effect.fn("RpcRoutes.execute")(function* (input: unknown) {
      const request = yield* Schema.decodeUnknownEffect(RpcRequest)(input).pipe(
        Effect.catch(() => Effect.succeed(undefined)),
      );

      if (!request) return rpcError(null, -32600, "Invalid JSON-RPC request");

      const rejected = validateRpcMethod(request);

      if (rejected) return rejected;

      return yield* rpc.execute(request).pipe(
        Effect.map(publicRpcResponse),
        Effect.catch(() =>
          Effect.succeed(rpcError(request.id, -32002, "Sepolia RPC is unavailable")),
        ),
      );
    });

    return HttpRouter.add("POST", rpcPath, (request) =>
      Effect.gen(function* () {
        const payload = yield* Effect.gen(function* () {
          const chunks: Uint8Array[] = [];
          let size = 0;

          yield* Stream.runForEach(request.stream, (chunk) => {
            size += chunk.byteLength;

            if (size > 131072) return Effect.fail("too-large" as const);

            chunks.push(chunk);

            return Effect.void;
          });

          return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown))(
            Buffer.concat(chunks).toString("utf8"),
          );
        }).pipe(
          Effect.map((value) => ({ valid: true as const, value })),
          Effect.catch(() => Effect.succeed({ valid: false as const })),
        );

        if (!payload.valid) {
          return HttpServerResponse.jsonUnsafe(
            rpcError(null, -32700, "Unable to parse JSON-RPC request"),
          );
        }

        if (Array.isArray(payload.value)) {
          if (payload.value.length === 0 || payload.value.length > maximumBatchSize) {
            return HttpServerResponse.jsonUnsafe(
              rpcError(null, -32600, "Batch must contain 1–20 requests"),
            );
          }

          const responses = yield* Effect.forEach(payload.value, execute, { concurrency: 4 });

          return HttpServerResponse.jsonUnsafe(responses);
        }

        return HttpServerResponse.jsonUnsafe(yield* execute(payload.value));
      }),
    );
  }),
);
