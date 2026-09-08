import { Schema } from "effect";

export const RpcId = Schema.Union([Schema.String, Schema.Number, Schema.Null]);

export const RpcRequest = Schema.Struct({
  jsonrpc: Schema.Literal("2.0"),
  id: RpcId,
  method: Schema.String,
  params: Schema.optional(Schema.Array(Schema.Unknown)),
});
export type RpcRequest = typeof RpcRequest.Type;

export const RpcResponse = Schema.Union([
  Schema.Struct({ jsonrpc: Schema.Literal("2.0"), id: RpcId, result: Schema.Unknown }),
  Schema.Struct({
    jsonrpc: Schema.Literal("2.0"),
    id: RpcId,
    error: Schema.Struct({
      code: Schema.Int,
      message: Schema.String,
      data: Schema.optional(Schema.Unknown),
    }),
  }),
]);
export type RpcResponse = typeof RpcResponse.Type;
