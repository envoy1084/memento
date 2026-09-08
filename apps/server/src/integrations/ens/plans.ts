import { Effect } from "effect";

import { recipientId, recipientKind, hashText } from "@memento/application";
import {
  MementoSponsorshipAbi as escrowAbi,
  MementoNameVaultAbi as vaultAbi,
} from "@memento/contracts";
import {
  type Gift,
  type Campaign,
  type GiftPolicy,
  Conflict,
  InvalidRequest,
} from "@memento/protocol";
import {
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  keccak256,
  parseEventLogs,
  type Hex,
} from "viem";

import { registryAbi } from "./abi.js";
import { Ethereum, provider } from "./client.js";
import { EnsConfig } from "./config.js";
import { TransactionJournal } from "./journal.js";
export const onchainPolicy = (policy: GiftPolicy) => ({
  maxPrice: BigInt(policy.maxPrice),
  duration: BigInt(policy.duration),
  expiresAt: BigInt(policy.expiresAt),
  minLength: policy.minLength,
  maxLength: policy.maxLength,
  worldRequired: policy.worldRequired,
});
export const restriction = (gift: Gift) => ({
  kind: recipientKind(gift.recipient),
  id: recipientId(gift.recipient),
});
export const recordsHash = (gift: Gift) =>
  keccak256(
    encodeAbiParameters(
      [
        {
          type: "tuple[]",
          components: [
            { name: "key", type: "string" },
            { name: "value", type: "string" },
          ],
        },
      ],
      [gift.records],
    ),
  );
const samePolicy = (expected: GiftPolicy, actual: ReturnType<typeof onchainPolicy>) =>
  Object.entries(onchainPolicy(expected)).every(
    ([key, value]) => actual[key as keyof typeof actual] === value,
  );
const call = (to: Hex, data: Hex) => ({ to, data, value: "0" });
export const makePlans = Effect.gen(function* () {
  const config = yield* EnsConfig;
  const { publicClient } = yield* Ethereum;
  const journal = yield* TransactionJournal;

  const escrowGift = (gift: Gift) =>
    provider("rpc", () =>
      publicClient.readContract({
        address: config.sponsorship,
        abi: escrowAbi,
        functionName: "gifts",
        args: [gift.id as Hex],
      }),
    );
  const vaultGift = (gift: Gift) =>
    provider("rpc", () =>
      publicClient.readContract({
        address: config.vault,
        abi: vaultAbi,
        functionName: "gifts",
        args: [gift.id as Hex],
      }),
    );
  return {
    escrowGift,
    vaultGift,
    giftPlan: Effect.fn("Chain.giftPlan")(function* (gift: Gift) {
      if (gift.kind === "chosen_name")
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
      if (!gift.label)
        return yield* new InvalidRequest({
          code: "MISSING_NAME",
          message: "Existing name is required",
        });
      if (gift.policy.setPrimaryName)
        return yield* new InvalidRequest({
          code: "PRIMARY_NAME_REQUIRES_RECIPIENT",
          message: "For existing-name gifts, the recipient sets their primary name after claiming",
        });
      const labelhash = hashText(gift.label);
      const owner = yield* provider("rpc", () =>
        publicClient.readContract({
          address: config.registry,
          abi: registryAbi,
          functionName: "getOwner",
          args: [BigInt(labelhash)],
        }),
      );
      if (owner.toLowerCase() !== gift.sponsorWallet)
        return yield* new Conflict({
          code: "NOT_NAME_OWNER",
          message: "Sponsor does not own this ENSv2 name",
        });
      const resource = yield* provider("rpc", () =>
        publicClient.readContract({
          address: config.registry,
          abi: registryAbi,
          functionName: "getResource",
          args: [BigInt(labelhash)],
        }),
      );
      const counts = yield* provider("rpc", () =>
        publicClient.readContract({
          address: config.registry,
          abi: registryAbi,
          functionName: "roleCount",
          args: [resource],
        }),
      );
      const roles = yield* provider("rpc", () =>
        publicClient.readContract({
          address: config.registry,
          abi: registryAbi,
          functionName: "roles",
          args: [resource, owner],
        }),
      );
      const required = (1n << 24n) | (1n << 156n);
      if (counts !== roles || (roles & required) !== required)
        return yield* new Conflict({
          code: "REGISTRY_DELEGATES_PRESENT",
          message:
            "Revoke delegated name permissions and enable resolver changes and transfers before gifting",
        });
      const tokenId = yield* provider("rpc", () =>
        publicClient.readContract({
          address: config.registry,
          abi: registryAbi,
          functionName: "getTokenId",
          args: [BigInt(labelhash)],
        }),
      );
      return [
        call(
          config.vault,
          encodeFunctionData({
            abi: vaultAbi,
            functionName: "prepareGift",
            args: [
              gift.id as Hex,
              {
                labelhash,
                claimHash: gift.claimHash as Hex,
                restriction: restriction(gift),
                recordsHash: recordsHash(gift),
                expiresAt: BigInt(gift.policy.expiresAt),
                worldRequired: gift.policy.worldRequired,
              },
            ],
          }),
        ),
        call(
          config.registry,
          encodeFunctionData({
            abi: registryAbi,
            functionName: "safeTransferFrom",
            args: [
              owner,
              config.vault,
              tokenId,
              1n,
              encodeAbiParameters([{ type: "bytes32" }], [gift.id as Hex]),
            ],
          }),
        ),
      ];
    }),
    campaignPlan: (campaign: Campaign) =>
      Effect.succeed([
        call(
          config.token,
          encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [config.sponsorship, BigInt(campaign.policy.maxPrice) * BigInt(campaign.count)],
          }),
        ),
        call(
          config.sponsorship,
          encodeFunctionData({
            abi: escrowAbi,
            functionName: "createCampaign",
            args: [
              campaign.id as Hex,
              campaign.root as Hex,
              campaign.count,
              onchainPolicy(campaign.policy),
            ],
          }),
        ),
      ]),
    confirmGift: Effect.fn("Chain.confirmGift")(function* (gift: Gift, hash: string) {
      const receipt = yield* journal.receipt(hash as Hex);
      if (gift.kind === "chosen_name") {
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
          actual[2].kind !== expectedRestriction.kind ||
          actual[2].id.toLowerCase() !== expectedRestriction.id.toLowerCase() ||
          !samePolicy(gift.policy, actual[3]) ||
          actual[4] !== gift.metadataHash ||
          actual[9] !== 1
        )
          return yield* new Conflict({
            code: "FUNDING_MISMATCH",
            message: "Transaction does not fund this gift and policy",
          });
      } else {
        const event = parseEventLogs({
          abi: vaultAbi,
          logs: receipt.logs,
          eventName: "Deposited",
        }).find(
          (log) =>
            log.address.toLowerCase() === config.vault.toLowerCase() && log.args.id === gift.id,
        );
        const [sponsor, input, status] = yield* vaultGift(gift);
        const expectedRestriction = restriction(gift);
        const owner = yield* provider("rpc", () =>
          publicClient.readContract({
            address: config.registry,
            abi: registryAbi,
            functionName: "getOwner",
            args: [BigInt(input.labelhash)],
          }),
        );
        if (
          !event ||
          sponsor.toLowerCase() !== gift.sponsorWallet ||
          input.labelhash !== hashText(gift.label ?? "") ||
          input.claimHash !== gift.claimHash ||
          input.recordsHash !== recordsHash(gift) ||
          input.restriction.kind !== expectedRestriction.kind ||
          input.restriction.id.toLowerCase() !== expectedRestriction.id.toLowerCase() ||
          input.expiresAt !== BigInt(gift.policy.expiresAt) ||
          input.worldRequired !== gift.policy.worldRequired ||
          status !== 2 ||
          owner.toLowerCase() !== config.vault.toLowerCase()
        )
          return yield* new Conflict({
            code: "DEPOSIT_MISMATCH",
            message: "Name has not been deposited under this gift policy",
          });
      }
    }),
    confirmCampaign: Effect.fn("Chain.confirmCampaign")(function* (
      campaign: Campaign,
      hash: string,
    ) {
      const receipt = yield* journal.receipt(hash as Hex);
      const event = parseEventLogs({
        abi: escrowAbi,
        logs: receipt.logs,
        eventName: "CampaignCreated",
      }).find(
        (log) =>
          log.address.toLowerCase() === config.sponsorship.toLowerCase() &&
          log.args.id === campaign.id,
      );
      const actual = yield* provider("rpc", () =>
        publicClient.readContract({
          address: config.sponsorship,
          abi: escrowAbi,
          functionName: "campaigns",
          args: [campaign.id as Hex],
        }),
      );
      if (
        !event ||
        actual[0].toLowerCase() !== campaign.sponsorWallet ||
        actual[1] !== campaign.root ||
        !samePolicy(campaign.policy, actual[2]) ||
        actual[3] !== campaign.count ||
        actual[6] ||
        event.args.amount !== BigInt(campaign.policy.maxPrice) * BigInt(campaign.count)
      )
        return yield* new Conflict({
          code: "FUNDING_MISMATCH",
          message: "Transaction does not fund this campaign",
        });
    }),
    confirmRefund: Effect.fn("Chain.confirmRefund")(function* (gift: Gift, hash: string) {
      const receipt = yield* journal.receipt(hash as Hex);
      if (gift.kind === "existing_name") {
        const event = parseEventLogs({
          abi: vaultAbi,
          logs: receipt.logs,
          eventName: "Recovered",
        }).find(
          (log) =>
            log.address.toLowerCase() === config.vault.toLowerCase() && log.args.id === gift.id,
        );
        if (!event || (yield* vaultGift(gift))[2] !== 4)
          return yield* new Conflict({
            code: "REFUND_NOT_CONFIRMED",
            message: "Name recovery is not confirmed",
          });
      } else {
        const event = parseEventLogs({
          abi: escrowAbi,
          logs: receipt.logs,
          eventName: "Refunded",
        }).find(
          (log) =>
            log.address.toLowerCase() === config.sponsorship.toLowerCase() &&
            log.args.id === gift.id,
        );
        if (!event || (yield* escrowGift(gift))[9] !== 5)
          return yield* new Conflict({
            code: "REFUND_NOT_CONFIRMED",
            message: "Gift refund is not confirmed",
          });
      }
    }),
    confirmCampaignRefund: Effect.fn("Chain.confirmCampaignRefund")(function* (
      campaign: Campaign,
      hash: string,
    ) {
      const receipt = yield* journal.receipt(hash as Hex);
      const event = parseEventLogs({
        abi: escrowAbi,
        logs: receipt.logs,
        eventName: "Refunded",
      }).find(
        (log) =>
          log.address.toLowerCase() === config.sponsorship.toLowerCase() &&
          log.args.id === campaign.id,
      );
      const actual = yield* provider("rpc", () =>
        publicClient.readContract({
          address: config.sponsorship,
          abi: escrowAbi,
          functionName: "campaigns",
          args: [campaign.id as Hex],
        }),
      );
      if (!event || !actual[6])
        return yield* new Conflict({
          code: "REFUND_NOT_CONFIRMED",
          message: "Campaign refund is not confirmed",
        });
    }),
    refundPlan: Effect.fn("Chain.refundPlan")(function* (gift: Gift) {
      const block = yield* provider("rpc", () => publicClient.getBlock());
      const expired = block.timestamp > BigInt(gift.policy.expiresAt);
      if (gift.kind === "existing_name") {
        if (!expired)
          return yield* new Conflict({
            code: "GIFT_NOT_EXPIRED",
            message: "An existing name can be recovered after expiry",
          });
        return [
          call(
            config.vault,
            encodeFunctionData({
              abi: vaultAbi,
              functionName: "recoverExpired",
              args: [gift.id as Hex],
            }),
          ),
        ];
      }
      if (gift.campaignId && !expired)
        return yield* new Conflict({
          code: "USE_CAMPAIGN_REFUND",
          message: "Refund unused campaign invitations from the campaign",
        });
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
    campaignRefundPlan: (campaign: Campaign) =>
      Effect.succeed([
        call(
          config.sponsorship,
          encodeFunctionData({
            abi: escrowAbi,
            functionName: "refundCampaign",
            args: [campaign.id as Hex],
          }),
        ),
      ]),
  };
});
