import type { RpcRequest, RpcResponse } from "@memento/protocol";

export { rpcProxyPath as rpcPath } from "@memento/chain/network";
export const maximumBatchSize = 20;

const methods = new Set([
  "eth_chainId",
  "net_version",
  "eth_blockNumber",
  "eth_getBalance",
  "eth_getTransactionCount",
  "eth_getCode",
  "eth_call",
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_sendRawTransaction",
]);

export const rpcError = (id: RpcRequest["id"], code: number, message: string): RpcResponse => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

export function validateRpcMethod(request: RpcRequest): RpcResponse | undefined {
  if (!methods.has(request.method)) {
    return rpcError(request.id, -32601, "RPC method is not available");
  }

  const params = request.params ?? [];

  if (
    (request.method === "eth_call" || request.method === "eth_estimateGas") &&
    params.length > 2
  ) {
    return rpcError(request.id, -32602, "State overrides are not supported");
  }

  if (request.method === "eth_feeHistory") {
    const count = params[0];
    const valid = typeof count === "string" && /^0x[0-9a-fA-F]{1,3}$/.test(count);

    if (!valid || Number.parseInt(count, 16) < 1 || Number.parseInt(count, 16) > 1024) {
      return rpcError(request.id, -32602, "Fee history must request 1–1024 blocks");
    }
  }

  return undefined;
}

export function publicRpcResponse(response: RpcResponse): RpcResponse {
  if (!("error" in response)) return response;

  // Provider errors can contain URLs and request details. Keep codes and hex revert data only.
  const data = response.error.data;
  const revertData = typeof data === "string" && /^0x[0-9a-fA-F]*$/.test(data) ? data : undefined;

  return {
    jsonrpc: "2.0",
    id: response.id,
    error: {
      code: response.error.code,
      message: response.error.code === 3 ? "Execution reverted" : "RPC request failed",
      ...(revertData === undefined ? {} : { data: revertData }),
    },
  };
}
