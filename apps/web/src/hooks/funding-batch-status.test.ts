import { TransactionError } from "@ensforge/core";
import { Ensforge } from "@ensforge/sdk";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia } from "viem/chains";
import { expect, it } from "vitest";

import { fundingBatchStatusError } from "#/hooks/funding-batch-status";

const hash = `0x${"1".repeat(64)}`;
const chainId = 11155111;
const invalid = (cause: unknown) =>
  new TransactionError({ code: "INVALID_BATCH_STATUS", message: "Invalid batch status", cause });
const receipt = { chainId: "0xaa36a7", transactionHash: hash };

it("handles Ambire's response through real viem and ENSForge status decoding", async () => {
  const sdk = new Ensforge({
    network: "sepolia",
    publicClient: createPublicClient({ chain: sepolia, transport: http("http://unused.test") }),
    walletClient: createWalletClient({
      chain: sepolia,
      account: `0x${"2".repeat(40)}`,
      transport: custom({
        request: async () => ({
          version: "2.0.0",
          status: 200,
          atomic: true,
          receipts: [
            { ...receipt, status: "0x1", blockNumber: "0x100", gasUsed: "0x5208", logs: [] },
          ],
        }),
      }),
    }),
  });
  const result = await sdk.batch
    .getCallsStatus({ id: `Transaction:${hash}` })
    .catch((error: unknown) => fundingBatchStatusError(error, chainId));
  expect(result).toMatchObject({
    chainId,
    status: "success",
    atomic: true,
    receipts: [expect.objectContaining({ transactionHash: hash })],
  });
});

it("keeps waiting for Ambire's pending response without treating it as payment", () => {
  const status = fundingBatchStatusError(
    invalid({ status: "pending", atomic: false, receipts: [] }),
    chainId,
  );
  expect(status).toEqual({ chainId, status: "pending", atomic: false, receipts: [] });
});

it("takes the network from confirmed receipts when the top-level network is omitted", () => {
  expect(
    fundingBatchStatusError(
      invalid({ status: "success", atomic: true, receipts: [receipt] }),
      chainId,
    ),
  ).toMatchObject({ chainId, status: "success", atomic: true, receipts: [receipt] });
});

it("rejects missing, inconsistent, wrong-network, or malformed receipt evidence", () => {
  for (const cause of [
    { chainId: 1, status: "success", atomic: true, receipts: [receipt] },
    { status: "success", atomic: true, receipts: [] },
    { status: "success", atomic: true, receipts: [{ transactionHash: hash }] },
    { status: "success", atomic: true, receipts: [receipt, { ...receipt, chainId: "0x1" }] },
    { status: "success", atomic: true, receipts: [{ ...receipt, transactionHash: "invalid" }] },
  ]) {
    const error = invalid(cause);
    expect(() => fundingBatchStatusError(error, chainId)).toThrow(error);
  }
});

it("retries temporary status failures but propagates unrelated errors", () => {
  expect(
    fundingBatchStatusError(
      new TransactionError({
        code: "BATCH_STATUS_FAILED",
        message: "Not available yet",
        cause: null,
      }),
      chainId,
    ),
  ).toBeUndefined();
  const error = new Error("Unexpected error");
  expect(() => fundingBatchStatusError(error, chainId)).toThrow(error);
});
