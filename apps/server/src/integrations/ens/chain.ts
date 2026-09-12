import { Effect, Layer } from "effect";

import {
  Chain,
  Cryptography,
  claimIntent,
  claimSecret,
  recipientId,
  type ChainProgress,
} from "@memento/application";
import {
  MementoSponsorshipAbi as escrowAbi,
  MementoNameVaultAbi as vaultAbi,
} from "@memento/chain";
import { registrarAbi, registryAbi } from "@memento/chain/abi/ens";
import type { ApplicationError } from "@memento/protocol";
import {
  type Gift,
  type Claim,
  type ClaimIntent,
  Conflict,
  Forbidden,
  InvalidRequest,
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

import { Ethereum, provider } from "./client.js";
import { EnsConfig } from "./config.js";
import { registrationFunding } from "./funding.js";
import { Hca } from "./hca.js";
import { TransactionJournal, jsonValue } from "./journal.js";
import { makePlans, restriction } from "./plans.js";
import { Registration } from "./registration.js";
import { makeOwnershipVerification } from "./verification.js";

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
  const registration = yield* Registration;
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
    const minimum = yield* provider("rpc", () =>
      publicClient.readContract({
        address: config.registrar,
        abi: registrarAbi,
        functionName: "MIN_REGISTER_DURATION",
      }),
    );

    if (BigInt(duration) < minimum)
      return yield* new InvalidRequest({
        code: "REGISTRATION_DURATION_TOO_SHORT",
        message: `Registrar requires at least ${minimum} seconds`,
      });

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
      message: "Configured payment token is unsupported",
    });
  });

  const verifyOwnership = yield* makeOwnershipVerification;

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
      secret: claimSecret(yield* crypto.open(gift.secretCiphertext, `gift:${gift.id}:secret`)),
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

    typedIntent: (gift, intent) => jsonValue(typedIntent(gift, intent)),

    setup: hca.setup,
    registrationView: registration.view,
    recoverRegistration: registration.recover,

    prepare: Effect.fn("Chain.prepare")(function* (gift, recipient, label, _nonce, deadline) {
      if (gift.kind === "chosen_name")
        return yield* hca.prepare(gift, recipient as Address, label, deadline);
      return {
        hca: zeroAddress,
        resolver: yield* hca.resolverAddress(config.vault, gift.id),
        resolverSalt: gift.id,
        session: null,
        sessionKey: "",
        commitmentSecret: "",
        commitment: zeroHash,
        typedData: null,
      };
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

      if (gift.campaignId && actual[9] === 0) {
        const campaign = yield* provider("rpc", () =>
          publicClient.readContract({
            address: config.sponsorship,
            abi: escrowAbi,
            functionName: "campaigns",
            args: [gift.campaignId as Hex],
          }),
        );

        if (campaign[6]) return { state: "refunded" };
      }

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

      const progress = yield* registration.advance(gift, claim);
      switch (progress.status) {
        case "registered":
          return { state: "verifying" };
        case "waiting":
          return { state: "waiting", retryAt: Number(progress.readyAt) * 1000 + 1000 };
        case "created":
          return { state: "committing" };
        case "submitted":
        case "submitting":
          if (!progress.attempt.tracking)
            return yield* new Conflict({
              code: "ENSFORGE_SUBMISSION_UNCERTAIN",
              message:
                "Submission outcome is uncertain; reconcile its provider reference before retrying",
            });
          return {
            state: progress.attempt.step === "commit" ? "committing" : "registering",
            retryAt: Date.now() + 10000,
          };
        case "needs-funding": {
          const amount = yield* registrationFunding(
            progress,
            config.token,
            BigInt(gift.policy.maxPrice),
            actual[9],
          );

          yield* hca.verify(claim.hca as Address, claim.recipientWallet as Address);
          yield* journal.send(
            claim.id,
            "escrow:release",
            config.sponsorship,
            encodeFunctionData({
              abi: escrowAbi,
              functionName: "releaseToHca",
              args: [gift.id as Hex, amount],
            }),
          );
          return { state: "registering", price: amount.toString() };
        }
        case "needs-authorization":
        case "needs-review":
        case "failed":
        case "expired":
        case "cancelled":
          return yield* new Conflict({
            code: `ENSFORGE_${progress.status.toUpperCase().replaceAll("-", "_")}`,
            message: progress.reason,
          });
      }
    }),
  });
});

export const ChainLive = Layer.effect(Chain, make);
