import { Effect } from "effect";

import { Conflict, ProviderError } from "@memento/protocol";
import { type Hex, TransactionReceiptNotFoundError } from "viem";

import { Ethereum, provider } from "./client.js";
import { EnsConfig } from "./config.js";
export const makeConfirmedReceipt = Effect.gen(function* () {
  const { publicClient } = yield* Ethereum;
  const config = yield* EnsConfig;
  return Effect.fn("Chain.confirmedReceipt")(function* (hash: Hex) {
    const result = yield* Effect.tryPromise({
      try: () => publicClient.getTransactionReceipt({ hash }),

      catch: (error) =>
        error instanceof TransactionReceiptNotFoundError
          ? new Conflict({ code: "TRANSACTION_PENDING", message: "Transaction is pending" })
          : new ProviderError({
              provider: "rpc",
              retryable: true,
              message: "Receipt lookup failed",
            }),
    });

    if (result.status !== "success")
      return yield* new Conflict({
        code: "CHAIN_TRANSACTION_REVERTED",
        message: "Transaction reverted",
      });

    const height = yield* provider("rpc", () => publicClient.getBlockNumber());

    if (height < result.blockNumber + BigInt(config.confirmations - 1))
      return yield* new Conflict({
        code: "TRANSACTION_PENDING",
        message: "Waiting for confirmations",
      });

    return result;
  });
});
