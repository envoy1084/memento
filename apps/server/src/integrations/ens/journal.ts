import { Context, DateTime, Effect, Layer } from "effect";

import { Cryptography } from "@memento/application";
import { ChainTransactionRepository, TransactionService } from "@memento/database";
import { Conflict, ProviderError } from "@memento/protocol";
import { type Hex, keccak256, TransactionReceiptNotFoundError } from "viem";

import { Ethereum, provider } from "./client.js";
import { EnsConfig } from "./config.js";

export const jsonValue = (input: unknown): unknown =>
  JSON.parse(
    JSON.stringify(input, (_, value: unknown) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );

const make = Effect.gen(function* () {
  const journal = yield* ChainTransactionRepository;
  const tx = yield* TransactionService;
  const crypto = yield* Cryptography;
  const { publicClient, walletClient } = yield* Ethereum;
  const config = yield* EnsConfig;

  const receipt = Effect.fn("Journal.receipt")(function* (hash: Hex) {
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

  return {
    receipt,

    send: Effect.fn("Journal.send")(function* (
      subjectId: string,
      purpose: string,
      to: Hex,
      data: Hex,
    ) {
      const record = yield* tx.run(
        Effect.gen(function* () {
          // Serialize nonce allocation across workers before signing a transaction.
          yield* journal.lock();

          const existing = yield* journal.find(subjectId, purpose);

          if (existing) return existing;

          const pending = yield* provider("rpc", () =>
            publicClient.getTransactionCount({
              address: walletClient.account.address,
              blockTag: "pending",
            }),
          );

          const nonce = Math.max(pending, yield* journal.nextNonce());
          const request = yield* provider("rpc", () =>
            walletClient.prepareTransactionRequest({ to, data, value: 0n, nonce }),
          );
          const raw = yield* provider("signer", () => walletClient.signTransaction(request));
          const id = crypto.random();
          const hash = keccak256(raw);
          const createdAt = yield* DateTime.now.pipe(Effect.map(DateTime.toEpochMillis));

          const row = {
            id,
            subjectId,
            purpose,
            hash,
            rawCiphertext: crypto.seal(raw, `transaction:${id}`),
            nonce,
            status: "prepared" as const,
            createdAt,
          };

          yield* journal.create(row);

          return row;
        }),
      );

      if (!record.hash || !record.rawCiphertext)
        return yield* new Conflict({
          code: "INVALID_JOURNAL",
          message: "Transaction journal is incomplete",
        });

      // The signed payload is durable before any broadcast, so retries reuse its nonce and hash.
      const hash = record.hash as Hex;

      if (record.status === "reverted")
        return yield* new Conflict({
          code: "CHAIN_TRANSACTION_REVERTED",
          message: "Transaction reverted; operator review required",
        });

      if (record.status !== "confirmed") {
        const raw = yield* crypto.open(record.rawCiphertext, `transaction:${record.id}`);

        // Resubmit exactly the stored transaction. A timeout never allocates a new nonce.
        yield* provider("rpc", () =>
          publicClient.sendRawTransaction({ serializedTransaction: raw as Hex }),
        ).pipe(Effect.catch(() => receipt(hash).pipe(Effect.as(hash))));
        yield* journal.status(record.id, "submitted");
      }

      const confirmed = yield* receipt(hash);

      yield* journal.status(record.id, "confirmed");

      return confirmed;
    }),
  };
});

export class TransactionJournal extends Context.Service<
  TransactionJournal,
  Effect.Success<typeof make>
>()("@memento/server/TransactionJournal") {
  static readonly layer = Layer.effect(TransactionJournal, make);
}
