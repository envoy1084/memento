import { Effect, Layer } from "effect";

import {
  Chain,
  Cryptography,
  claimIntent,
  recipientId,
  type ChainProgress,
} from "@memento/application";
import {
  MementoSponsorshipAbi as escrowAbi,
  MementoNameVaultAbi as vaultAbi,
} from "@memento/contracts";
import type { ApplicationError } from "@memento/protocol";
import {
  type Gift,
  type Claim,
  type ClaimIntent,
  Conflict,
  Forbidden,
  ProviderError,
} from "@memento/protocol";
import {
  encodeFunctionData,
  hashTypedData,
  type Address,
  type Hex,
  zeroAddress,
  zeroHash,
} from "viem";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";

import { factoryAbi, registrarAbi, registryAbi, resolverAbi } from "./abi.js";
import { Ethereum, provider } from "./client.js";
import { EnsConfig } from "./config.js";
import { Hca, proxyAddress } from "./hca.js";
import { TransactionJournal } from "./journal.js";
import { makePlans, restriction } from "./plans.js";
const intentTypes = {
  ClaimIntent: [
    { name: "giftId", type: "bytes32" },
    { name: "recipient", type: "address" },
    { name: "hca", type: "address" },
    { name: "resolver", type: "address" },
    { name: "labelhash", type: "bytes32" },
    { name: "nonce", type: "bytes32" },
    { name: "deadline", type: "uint64" },
  ],
} as const;
const authorizationTypes = {
  ClaimAuthorization: [
    { name: "intentHash", type: "bytes32" },
    { name: "recipientId", type: "bytes32" },
    { name: "eligible", type: "bool" },
  ],
} as const;
const contractIntent = (intent: ClaimIntent) => ({
  giftId: intent.giftId as Hex,
  recipient: intent.recipient as Address,
  hca: intent.hca as Address,
  resolver: intent.resolver as Address,
  labelhash: intent.labelhash as Hex,
  nonce: intent.nonce as Hex,
  deadline: BigInt(intent.deadline),
});
const make = Effect.gen(function* () {
  const config = yield* EnsConfig;
  const { publicClient, account, ensforge } = yield* Ethereum;
  const crypto = yield* Cryptography;
  const journal = yield* TransactionJournal;
  const hca = yield* Hca;
  const plans = yield* makePlans;
  const domain = (gift: Gift) => ({
    name: gift.kind === "chosen_name" ? "MementoSponsorship" : "MementoNameVault",
    version: "1",
    chainId: sepolia.id,
    verifyingContract: gift.kind === "chosen_name" ? config.sponsorship : config.vault,
  });
  const typedIntent = (gift: Gift, intent: ClaimIntent) => ({
    domain: domain(gift),
    primaryType: "ClaimIntent" as const,
    types: intentTypes,
    message: contractIntent(intent),
  });
  const quote = Effect.fn("Chain.quote")(function* (label: string, duration: number) {
    // ENSForge's public config pins deployments. Custom post-audit deployments use the exact branch ABI.
    if (
      ensforge.config.deployments.protocol === "v2" &&
      ensforge.config.deployments.v2.contracts.ethRegistrar.toLowerCase() ===
        config.registrar.toLowerCase()
    ) {
      const price = yield* provider("ensforge", () =>
        ensforge.registration.getRegistrationPrice({
          name: `${label}.eth`,
          duration: BigInt(duration),
          paymentToken: config.token,
        }),
      );
      if (price.status === "available")
        return { label, duration, available: true, price: price.total.toString() };
      if (price.status === "unavailable") return { label, duration, available: false, price: "0" };
      return yield* new ProviderError({
        provider: "ensforge",
        retryable: false,
        message: "Configured payment token is unsupported by the registrar",
      });
    }
    const available = yield* provider("rpc", () =>
      publicClient.readContract({
        address: config.registrar,
        abi: registrarAbi,
        functionName: "isAvailable",
        args: [label],
      }),
    );
    if (!available) return { label, duration, available: false, price: "0" };
    const [base, premium] = yield* provider("rpc", () =>
      publicClient.readContract({
        address: config.registrar,
        abi: registrarAbi,
        functionName: "getRegisterPrice",
        args: [label, BigInt(duration), config.token],
      }),
    );
    return { label, duration, available, price: (base + premium).toString() };
  });
  const verifyOwnership = Effect.fn("Chain.verifyOwnership")(function* (gift: Gift, claim: Claim) {
    const owner = yield* provider("rpc", () =>
      publicClient.readContract({
        address: config.registry,
        abi: registryAbi,
        functionName: "getOwner",
        args: [BigInt(claim.labelhash)],
      }),
    );
    const resolver = yield* provider("rpc", () =>
      publicClient.readContract({
        address: config.registry,
        abi: registryAbi,
        functionName: "getResolver",
        args: [claim.label],
      }),
    );
    if (
      owner.toLowerCase() !== claim.recipientWallet ||
      resolver.toLowerCase() !== claim.resolver.toLowerCase()
    )
      return yield* new Conflict({
        code: "OWNERSHIP_NOT_CONFIRMED",
        message: "Recipient ownership and resolver are not confirmed",
      });
    const implementation = yield* provider("rpc", () =>
      publicClient.readContract({
        address: config.verifiableFactory,
        abi: factoryAbi,
        functionName: "verifyContract",
        args: [resolver],
      }),
    );
    const address = yield* provider("rpc", () =>
      publicClient.readContract({
        address: resolver,
        abi: resolverAbi,
        functionName: "addr",
        args: [namehash(`${claim.label}.eth`)],
      }),
    );
    const roles = yield* provider("rpc", () =>
      publicClient.readContract({
        address: resolver,
        abi: resolverAbi,
        functionName: "roles",
        args: [0n, claim.recipientWallet as Address],
      }),
    );
    if (
      implementation.toLowerCase() !== config.resolverImplementation.toLowerCase() ||
      address.toLowerCase() !== claim.recipientWallet ||
      roles !== BigInt(`0x${"1".repeat(64)}`)
    )
      return yield* new Conflict({
        code: "RESOLVER_HANDOFF_FAILED",
        message: "Recipient resolver control is not confirmed",
      });
    if (gift.kind === "chosen_name")
      yield* hca.verify(claim.hca as Address, claim.recipientWallet as Address);
  });
  const auth = Effect.fn("Chain.storedAuthorization")(function* (gift: Gift, claim: Claim) {
    if (
      !gift.secretCiphertext ||
      !claim.signature ||
      !claim.recipientAuthorizationCiphertext ||
      !claim.eligibilityCiphertext
    )
      return yield* new Conflict({
        code: "AUTHORIZATION_UNAVAILABLE",
        message: "Claim authorization is incomplete",
      });
    return {
      intent: contractIntent(claimIntent(claim)),
      secret: (yield* crypto.open(gift.secretCiphertext, `gift:${gift.id}:secret`)) as Hex,
      signature: claim.signature as Hex,
      recipientAuthorization: (yield* crypto.open(
        claim.recipientAuthorizationCiphertext,
        `claim:${claim.id}:recipient-authorization`,
      )) as Hex,
      eligibility: (yield* crypto.open(
        claim.eligibilityCiphertext,
        `claim:${claim.id}:eligibility`,
      )) as Hex,
    };
  });
  return Chain.of({
    ...plans,
    chainId: sepolia.id,
    quote,
    typedIntent,
    prepare: (gift, recipient, label, _nonce, deadline) =>
      gift.kind === "chosen_name"
        ? hca.prepare(gift, recipient as Address, label, deadline)
        : Effect.succeed({
            hca: zeroAddress,
            resolver: proxyAddress(
              config.verifiableFactory,
              config.proxyLogic,
              config.vault,
              BigInt(gift.id),
            ),
            resolverSalt: gift.id,
            session: null,
            sessionKey: "",
            commitmentSecret: "",
            commitment: zeroHash,
            typedData: null,
          }),
    authorize: Effect.fn("Chain.authorize")(
      function* (gift, claim, signature, sessionAuthorization) {
        const typed = typedIntent(gift, claimIntent(claim));
        const valid = yield* provider("rpc", () =>
          publicClient.verifyTypedData({
            ...typed,
            address: claim.recipientWallet as Address,
            signature: signature as Hex,
          }),
        );
        if (!valid) return yield* new Forbidden({ message: "Invalid recipient claim signature" });
        const session =
          gift.kind === "chosen_name" ? yield* hca.authorize(claim, sessionAuthorization) : "";
        const authorization = (eligible: boolean) =>
          account.signTypedData({
            domain: domain(gift),
            primaryType: "ClaimAuthorization",
            types: authorizationTypes,
            message: {
              intentHash: hashTypedData(typed),
              recipientId: recipientId(gift.recipient),
              eligible,
            },
          });
        return {
          session,
          recipientAuthorization:
            gift.recipient.kind === "email"
              ? yield* provider("signer", () => authorization(false))
              : "0x",
          eligibility: gift.policy.worldRequired
            ? yield* provider("signer", () => authorization(true))
            : "0x",
        };
      },
    ),
    advance: Effect.fn("Chain.advance")(function* (gift, claim): Effect.fn.Return<
      ChainProgress,
      ApplicationError
    > {
      if (claim.state === "complete" || claim.state === "refunded") return { state: claim.state };
      const block = yield* provider("rpc", () => publicClient.getBlock());
      const owner = yield* provider("rpc", () =>
        publicClient.readContract({
          address: config.registry,
          abi: registryAbi,
          functionName: "getOwner",
          args: [BigInt(claim.labelhash)],
        }),
      );
      if (gift.kind === "existing_name") {
        const actual = yield* plans.vaultGift(gift);
        if (actual[2] === 4) return { state: "refunded" };
        if (actual[2] === 3) {
          yield* verifyOwnership(gift, claim);
          return { state: "complete" };
        }
        if (block.timestamp > BigInt(gift.policy.expiresAt))
          return yield* new Conflict({
            code: "GIFT_EXPIRED",
            message: "Gift expired; sponsor can recover the name",
          });
        const signed = yield* auth(gift, claim);
        yield* journal.send(
          claim.id,
          "vault:claim",
          config.vault,
          encodeFunctionData({
            abi: vaultAbi,
            functionName: "claimName",
            args: [
              signed.intent,
              signed.secret,
              claim.label,
              gift.records,
              signed.signature,
              signed.recipientAuthorization,
              signed.eligibility,
            ],
          }),
        );
        yield* verifyOwnership(gift, claim);
        return { state: "complete" };
      }
      const actual = yield* plans.escrowGift(gift);
      if (actual[9] === 5) return { state: "refunded" };
      if (
        actual[9] >= 2 &&
        (actual[5].toLowerCase() !== claim.recipientWallet ||
          actual[6].toLowerCase() !== claim.hca.toLowerCase() ||
          actual[7] !== claim.labelhash)
      )
        return yield* new Forbidden({ message: "Onchain reservation differs from this claim" });
      if (owner.toLowerCase() === claim.recipientWallet && actual[9] >= 2) {
        yield* verifyOwnership(gift, claim);
        if (actual[9] !== 4)
          yield* journal.send(
            claim.id,
            "escrow:complete",
            config.sponsorship,
            encodeFunctionData({
              abi: escrowAbi,
              functionName: "completeGift",
              args: [gift.id as Hex],
            }),
          );
        return { state: "complete" };
      }
      if (block.timestamp > BigInt(claim.deadline))
        return yield* new Conflict({
          code: "HCA_SESSION_EXPIRED",
          message:
            "Claim authorization expired; sponsor can recover unspent escrow after gift expiry",
        });
      if (actual[9] < 2) {
        const signed = yield* auth(gift, claim);
        const data =
          gift.campaignId && gift.invitationIndex !== null
            ? encodeFunctionData({
                abi: escrowAbi,
                functionName: "reserveCampaignClaim",
                args: [
                  gift.campaignId as Hex,
                  gift.invitationIndex,
                  restriction(gift),
                  signed.secret,
                  gift.proof as Hex[],
                  signed.intent,
                  signed.signature,
                  signed.recipientAuthorization,
                  signed.eligibility,
                ],
              })
            : encodeFunctionData({
                abi: escrowAbi,
                functionName: "reserveGift",
                args: [
                  signed.intent,
                  signed.secret,
                  signed.signature,
                  signed.recipientAuthorization,
                  signed.eligibility,
                ],
              });
        yield* journal.send(claim.id, "escrow:reserve", config.sponsorship, data);
        return { state: "reserved" };
      }
      const committedAt = yield* provider("rpc", () =>
        publicClient.readContract({
          address: config.registrar,
          abi: registrarAbi,
          functionName: "commitmentAt",
          args: [claim.commitment as Hex],
        }),
      );
      if (committedAt === 0n) {
        yield* hca.execute(gift, claim, "commit");
        return { state: "committing" };
      }
      const minimum = yield* provider("rpc", () =>
        publicClient.readContract({
          address: config.registrar,
          abi: registrarAbi,
          functionName: "MIN_COMMITMENT_AGE",
        }),
      );
      const maximum = yield* provider("rpc", () =>
        publicClient.readContract({
          address: config.registrar,
          abi: registrarAbi,
          functionName: "MAX_COMMITMENT_AGE",
        }),
      );
      if (block.timestamp >= committedAt + maximum)
        return yield* new Conflict({
          code: "COMMITMENT_EXPIRED",
          message: "Commitment expired; recover unspent escrow after gift expiry",
        });
      if (block.timestamp < committedAt + minimum)
        return {
          state: "waiting",
          commitmentAt: Number(committedAt),
          retryAt: Number(committedAt + minimum) * 1000 + 1000,
        };
      const fresh = yield* quote(claim.label, gift.policy.duration);
      if (!fresh.available)
        return yield* new Conflict({
          code: "NAME_UNAVAILABLE",
          message: "Name was registered by someone else",
        });
      if (BigInt(fresh.price) > BigInt(gift.policy.maxPrice))
        return yield* new Conflict({
          code: "PRICE_EXCEEDS_BUDGET",
          message: "Current registrar price exceeds the gift budget",
        });
      if (actual[9] === 2) {
        yield* hca.verify(claim.hca as Address, claim.recipientWallet as Address);
        if (BigInt(fresh.price) === 0n)
          return yield* new Conflict({
            code: "ZERO_QUOTE",
            message: "Registrar returned an unsupported zero quote",
          });
        yield* journal.send(
          claim.id,
          "escrow:release",
          config.sponsorship,
          encodeFunctionData({
            abi: escrowAbi,
            functionName: "releaseToHca",
            args: [gift.id as Hex, BigInt(fresh.price)],
          }),
        );
        return { state: "registering", price: fresh.price, commitmentAt: Number(committedAt) };
      }
      const released = BigInt(gift.policy.maxPrice) - actual[8];
      if (BigInt(fresh.price) > released)
        return yield* new Conflict({
          code: "PRICE_CHANGED_AFTER_FUNDING",
          message: "Price increased after funding; recipient can recover their HCA balance",
        });
      yield* hca.execute(gift, { ...claim, price: released.toString() }, "register");
      return { state: "verifying", price: released.toString(), commitmentAt: Number(committedAt) };
    }),
  });
});
export const ChainLive = Layer.effect(Chain, make);
