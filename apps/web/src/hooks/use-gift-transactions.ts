/* eslint-disable no-await-in-loop -- Wallet calls must confirm in order before dependent calls. */
import { Effect, Schema } from "effect";

import { defineWriteAction, WalletError } from "@ensforge/core";
import { useSendCalls } from "@ensforge/react";
import { chainConfirmations } from "@memento/chain/network";
import { type Call, Digest } from "@memento/protocol";
import { useSendTransaction, useWallets } from "@privy-io/react-auth";
import { keccak256, stringToHex, toHex } from "viem";
import { useSwitchChain } from "wagmi";
import { getConnection } from "wagmi/actions";

import { publicClient, chain } from "#/config/chain";
import { ensforge } from "#/config/ensforge";
import { wagmiConfig } from "#/config/wagmi";
import {
  clearClaimSubmission,
  readClaimSubmission,
  isRejectedClaimSubmission,
} from "#/hooks/claim-submission-failure";
import { fundingBatchStatusError } from "#/hooks/funding-batch-status";
import { JourneyError, journeyError } from "#/hooks/use-api-task";

const plannedCall = defineWriteAction(
  "memento.plannedCall",
  (_config, call: typeof Call.Type) => Effect.succeed(call),
  (_config, call: typeof Call.Type) =>
    Effect.succeed({
      to: call.to as `0x${string}`,
      data: call.data as `0x${string}`,
      value: BigInt(call.value),
    }),
);

const journalEntry = Schema.Union([Digest, Schema.Literal("pending")]);

function isRejectedRequest(initialError: unknown): boolean {
  let error = initialError;
  // Privy wraps EIP-1193 rejections; ENSForge exposes its own wallet error.
  for (let depth = 0; depth < 5 && typeof error === "object" && error !== null; depth++) {
    if (error instanceof WalletError && error.code === "USER_REJECTED") return true;
    if ("code" in error && error.code === 4001) return true;
    error = "cause" in error ? error.cause : undefined;
  }
  return false;
}

export function useGiftTransactions() {
  const send = useSendCalls();
  const { sendTransaction } = useSendTransaction();
  const { wallets } = useWallets();
  const { switchChainAsync } = useSwitchChain();

  return async (
    operation: string,
    account: string,
    chainId: number,
    calls: readonly (typeof Call.Type)[],
  ) => {
    if (chainId !== chain.id || !calls.length)
      throw new JourneyError({ message: "The wallet plan is invalid." });
    if (operation.startsWith("fund:")) {
      const active = getConnection(wagmiConfig);
      if (!active.isConnected || active.address?.toLowerCase() !== account.toLowerCase())
        throw new JourneyError({ message: "Reconnect the wallet that started this gift." });
      if (active.chainId !== chain.id) await switchChainAsync({ chainId: chain.id });
      const wallet = account as `0x${string}`;
      const key = `memento:batch:${chainId}:${account.toLowerCase()}:${operation}:${keccak256(stringToHex(JSON.stringify(calls)))}`;
      let id = sessionStorage.getItem(key);
      if (id === "pending")
        throw new JourneyError({
          message:
            "A funding submission has an unknown outcome. Check wallet activity before retrying.",
        });
      if (!id) {
        const capabilities = await ensforge.batch.getWalletCapabilities({ account: wallet });
        if (!capabilities.nativeCalls || !["supported", "ready"].includes(capabilities.atomicity))
          throw new JourneyError({
            message:
              "This wallet does not support atomic batches. Connect a wallet with batch support to fund this gift in one transaction.",
          });
        sessionStorage.setItem(key, "pending");
        try {
          const result = await send.mutateAsync({
            calls: calls.map((call) => plannedCall.call(call)),
            account: wallet,
            mode: "batch",
            atomicity: "required",
            // The approval and funding call depend on one another inside the batch.
            simulation: "skip",
            confirmation: { type: "submitted" },
          });
          if (result.mode !== "batch")
            throw new JourneyError({ message: "The wallet did not return a batch identifier." });
          id = result.id;
          sessionStorage.setItem(key, id);
        } catch (error) {
          if (isRejectedRequest(error)) {
            sessionStorage.removeItem(key);
            sessionStorage.removeItem(`${key}:error`);
          } else {
            // Keep uncertain submissions blocked, but preserve the initial failure for diagnosis.
            sessionStorage.setItem(`${key}:error`, journeyError(error).message);
          }
          throw error;
        }
      }
      const deadline = Date.now() + 180000;
      while (Date.now() < deadline) {
        const status = await ensforge.batch
          .getCallsStatus({ id, account: wallet })
          .catch((error: unknown) => fundingBatchStatusError(error, chain.id));
        if (!status) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        if (status.chainId !== chain.id)
          throw new JourneyError({ message: "The funding batch is on the wrong network." });
        if (status.status === "failure") {
          sessionStorage.removeItem(key);
          throw new JourneyError({
            message: "The funding batch failed. Check your wallet balance and retry.",
          });
        }
        if (status.status === "success") {
          const hashes = [...new Set(status.receipts.map((receipt) => receipt.transactionHash))];
          if (!status.atomic || hashes.length !== 1)
            throw new JourneyError({
              message:
                "The wallet did not confirm a single atomic funding transaction. Check wallet activity.",
            });
          const hash = Schema.decodeUnknownSync(Digest)(hashes[0]) as `0x${string}`;
          const receipt = await publicClient.waitForTransactionReceipt({
            hash,
            confirmations: chainConfirmations,
            timeout: 180000,
          });
          if (receipt.status !== "success")
            throw new JourneyError({ message: "The funding transaction reverted." });
          return [receipt.transactionHash];
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      throw new JourneyError({
        message:
          "Funding is still pending. Retry to check the same batch without submitting again.",
      });
    }
    const sponsored = operation.startsWith("claim:");
    if (sponsored && calls.length !== 1)
      throw new JourneyError({
        message:
          "This claim needs one atomic transaction. Refresh the invitation to get an updated plan.",
      });
    if (
      sponsored &&
      !wallets.some(
        (wallet) =>
          wallet.walletClientType === "privy" &&
          wallet.address.toLowerCase() === account.toLowerCase(),
      )
    )
      throw new JourneyError({ message: "Choose your Memento wallet to claim without gas fees." });
    const hashes: `0x${string}`[] = [];

    for (const [index, call] of calls.entries()) {
      const active = getConnection(wagmiConfig);
      if (!active.isConnected || active.address?.toLowerCase() !== account.toLowerCase())
        throw new JourneyError({ message: "Reconnect the wallet that started this operation." });
      if (active.chainId !== chain.id) await switchChainAsync({ chainId: chain.id });

      const key = `memento:tx:${chainId}:${account.toLowerCase()}:${operation}:${index}:${keccak256(stringToHex(JSON.stringify(call)))}`;
      const stored = sponsored
        ? readClaimSubmission(sessionStorage, key)
        : sessionStorage.getItem(key);
      let hash = stored === null ? undefined : Schema.decodeUnknownSync(journalEntry)(stored);
      if (hash === "pending") {
        const previousError = sessionStorage.getItem(`${key}:error`);
        throw new JourneyError({
          message: `We couldn’t confirm the wallet request. No new request has been sent.${previousError ? ` Last error: ${previousError}` : ""}`,
        });
      }

      if (!hash) {
        // Record uncertainty before opening the wallet so a reload cannot silently resubmit.
        sessionStorage.setItem(key, "pending");
        if (sponsored) sessionStorage.setItem(`${key}:outcome`, "unknown");
        try {
          if (sponsored) {
            const result = await sendTransaction(
              { to: call.to, data: call.data, value: toHex(BigInt(call.value)), chainId },
              { address: account, sponsor: true, uiOptions: { showWalletUIs: false } },
            );
            hash = result.hash;
          } else {
            const result = await send.mutateAsync({
              calls: [plannedCall.call(call)],
              account: account as `0x${string}`,
              mode: "sequential",
              confirmation: { type: "submitted" },
            });
            hash = result.calls[0]?.hash ?? undefined;
          }
          if (!hash)
            throw new JourneyError({
              message:
                "The wallet did not return a transaction hash. Check its activity before retrying.",
            });
          sessionStorage.setItem(key, hash);
        } catch (error) {
          if (isRejectedRequest(error) || (sponsored && isRejectedClaimSubmission(error))) {
            clearClaimSubmission(sessionStorage, key);
          } else {
            // Keep uncertain submissions blocked, but preserve the initial failure for diagnosis.
            sessionStorage.setItem(`${key}:error`, journeyError(error).message);
          }
          throw error;
        }
      }

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        confirmations: chainConfirmations,
        timeout: 180000,
      });
      if (receipt.status !== "success") {
        sessionStorage.removeItem(key);
        throw new JourneyError({
          message:
            "The transaction reverted. Correct the wallet balance or contract requirements and try again.",
        });
      }
      hashes.push(receipt.transactionHash);
    }
    return hashes;
  };
}
