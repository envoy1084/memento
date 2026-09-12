import { Effect } from "effect";

import { recipientId } from "@memento/application";
import { MementoSponsorshipAbi as escrowAbi, MementoRegistrationAbi } from "@memento/chain";
import { type Gift, type GiftPolicy, Conflict } from "@memento/protocol";
import { encodeFunctionData, erc20Abi, parseEventLogs, type Hex } from "viem";

import { Ethereum, provider } from "./client.js";
import { EnsConfig } from "./config.js";
import { makeConfirmedReceipt } from "./receipts.js";

export const onchainPolicy = (policy: GiftPolicy) => ({
  maxPrice: BigInt(policy.maxPrice),
  duration: BigInt(policy.duration),
  expiresAt: BigInt(policy.expiresAt),
  minLength: policy.minLength,
  maxLength: policy.maxLength,
});

export const restriction = (gift: Gift) => recipientId(gift.recipient);

const samePolicy = (expected: GiftPolicy, actual: ReturnType<typeof onchainPolicy>) =>
  Object.entries(onchainPolicy(expected)).every(
    ([key, value]) => actual[key as keyof typeof actual] === value,
  );

const call = (to: Hex, data: Hex) => ({ to, data, value: "0" });

export const makePlans = Effect.gen(function* () {
  const config = yield* EnsConfig;
  const confirmedReceipt = yield* makeConfirmedReceipt;
  const { publicClient } = yield* Ethereum;

  const escrowGift = (gift: Gift) =>
    provider("rpc", () =>
      publicClient.readContract({
        address: config.sponsorship,
        abi: escrowAbi,
        functionName: "gifts",
        args: [gift.id as Hex],
      }),
    );

  return {
    escrowGift,

    giftPlan: Effect.fn("Chain.giftPlan")(function* (gift: Gift) {
      {
        const registrar = yield* provider("deployment", () =>
          publicClient.readContract({
            address: config.sponsorship,
            abi: MementoRegistrationAbi,
            functionName: "REGISTRAR",
          }),
        );
        if (registrar.toLowerCase() !== config.registrar.toLowerCase())
          return yield* new Conflict({
            code: "REGISTRAR_MISMATCH",
            message: "Gift registration is not configured yet.",
          });
        return [
          call(
            config.token,
            encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [config.sponsorship, BigInt(gift.policy.maxPrice)],
            }),
          ),
          call(
            config.sponsorship,
            encodeFunctionData({
              abi: escrowAbi,
              functionName: "createGift",
              args: [
                gift.id as Hex,
                gift.claimHash as Hex,
                restriction(gift),
                onchainPolicy(gift.policy),
                gift.metadataHash as Hex,
              ],
            }),
          ),
        ];
      }
    }),

    confirmGift: Effect.fn("Chain.confirmGift")(function* (gift: Gift, hash: string) {
      const receipt = yield* confirmedReceipt(hash as Hex);

      {
        const event = parseEventLogs({
          abi: escrowAbi,
          logs: receipt.logs,
          eventName: "GiftCreated",
        }).find(
          (log) =>
            log.address.toLowerCase() === config.sponsorship.toLowerCase() &&
            log.args.id === gift.id,
        );

        const actual = yield* escrowGift(gift);
        const expectedRestriction = restriction(gift);

        if (
          !event ||
          event.args.sponsor.toLowerCase() !== gift.sponsorWallet ||
          event.args.amount !== BigInt(gift.policy.maxPrice) ||
          actual[0].toLowerCase() !== gift.sponsorWallet ||
          actual[1] !== gift.claimHash ||
          actual[2].toLowerCase() !== expectedRestriction.toLowerCase() ||
          !samePolicy(gift.policy, actual[3]) ||
          actual[4] !== gift.metadataHash ||
          actual[8] !== 1
        )
          return yield* new Conflict({
            code: "FUNDING_MISMATCH",
            message: "Transaction does not fund this gift and policy",
          });
      }
    }),

    confirmRefund: Effect.fn("Chain.confirmRefund")(function* (gift: Gift, hash: string) {
      const receipt = yield* confirmedReceipt(hash as Hex);

      const event = parseEventLogs({
        abi: escrowAbi,
        logs: receipt.logs,
        eventName: "Refunded",
      }).find(
        (log) =>
          log.address.toLowerCase() === config.sponsorship.toLowerCase() && log.args.id === gift.id,
      );

      if (!event || (yield* escrowGift(gift))[8] !== 3)
        return yield* new Conflict({
          code: "REFUND_NOT_CONFIRMED",
          message: "Gift refund is not confirmed",
        });
    }),

    refundPlan: Effect.fn("Chain.refundPlan")(function* (gift: Gift) {
      const block = yield* provider("rpc", () => publicClient.getBlock());
      const expired = block.timestamp > BigInt(gift.policy.expiresAt);

      return [
        call(
          config.sponsorship,
          expired
            ? encodeFunctionData({
                abi: escrowAbi,
                functionName: "refundExpired",
                args: [gift.id as Hex],
              })
            : encodeFunctionData({
                abi: escrowAbi,
                functionName: "cancel",
                args: [gift.id as Hex],
              }),
        ),
      ];
    }),
  };
});
