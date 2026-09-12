import { Schema } from "effect";

import { TransactionError } from "@ensforge/core";
import { Digest } from "@memento/protocol";

const receiptNetworkStatus = Schema.Struct({
  chainId: Schema.optional(Schema.Number),
  status: Schema.Literals(["pending", "success"]),
  atomic: Schema.Boolean,
  receipts: Schema.Array(
    Schema.Struct({
      chainId: Schema.String.check(Schema.isPattern(/^0x[0-9a-f]+$/i)),
      transactionHash: Digest,
    }),
  ),
});

// Ambire omits the top-level chainId, including while pending, and reports it in receipts.
// Only completed receipts establish the network; a pending response never confirms payment.
export function fundingBatchStatusError(error: unknown, chainId: number) {
  if (!(error instanceof TransactionError)) throw error;
  if (error.code === "BATCH_STATUS_FAILED" || error.code === "CONFIRMATION_TIMEOUT")
    return undefined;
  if (error.code !== "INVALID_BATCH_STATUS" || !Schema.is(receiptNetworkStatus)(error.cause))
    throw error;

  const status = error.cause;
  if (status.chainId !== undefined) throw error;
  if (status.status === "pending" && status.receipts.length === 0) return { ...status, chainId };
  if (
    status.status !== "success" ||
    status.receipts.length === 0 ||
    status.receipts.some((receipt) => BigInt(receipt.chainId) !== BigInt(chainId))
  )
    throw error;

  return { ...status, chainId };
}
