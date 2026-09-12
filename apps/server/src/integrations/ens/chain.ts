import { Effect, Layer } from "effect";

import { Chain, claimIntent, recipientId, type ChainProgress } from "@memento/application";
import { registrarAbi } from "@memento/chain/abi/ens";
import type { ApplicationError } from "@memento/protocol";
import {
  type Gift,
  type ClaimIntent,
  Conflict,
  Forbidden,
  InvalidRequest,
  ProviderError,
} from "@memento/protocol";
import { hashTypedData, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";

import { Ethereum, provider } from "./client.js";
import { EnsConfig } from "./config.js";
import { DirectRegistration } from "./direct-registration.js";
import { makePlans } from "./plans.js";
import { makeOwnershipVerification } from "./verification.js";

const intentTypes = {
  ClaimIntent: [
    { name: "giftId", type: "bytes32" },
    { name: "recipient", type: "address" },
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
  ],
} as const;

const contractIntent = (intent: ClaimIntent) => ({
  giftId: intent.giftId as Hex,
  recipient: intent.recipient as Address,
  resolver: intent.resolver as Address,
  labelhash: intent.labelhash as Hex,
  nonce: intent.nonce as Hex,
  deadline: BigInt(intent.deadline),
});

const make = Effect.gen(function* () {
  const config = yield* EnsConfig;
  const { publicClient, account, ensforge } = yield* Ethereum;
  const registration = yield* DirectRegistration;
  const plans = yield* makePlans;

  const domain = () => ({
    name: "MementoSponsorship",
    version: "1",
    chainId: sepolia.id,
    verifyingContract: config.sponsorship,
  });

  const typedIntent = (_gift: Gift, intent: ClaimIntent) => ({
    domain: domain(),
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

  return Chain.of({
    ...plans,
    chainId: sepolia.id,
    quote,

    typedIntent: (gift, intent) => ({
      ...typedIntent(gift, intent),
      message: { ...contractIntent(intent), deadline: String(intent.deadline) },
    }),

    setup: registration.setup,
    registrationView: registration.view,
    prepare: Effect.fn("Chain.prepare")(function* (gift, recipient, label, _nonce, _deadline) {
      return yield* registration.prepare(gift, recipient as Address, label);
    }),

    authorize: Effect.fn("Chain.authorize")(function* (gift, claim, signature) {
      const typed = typedIntent(gift, claimIntent(claim));

      const valid = yield* provider("rpc", () =>
        publicClient.verifyTypedData({
          ...typed,
          address: claim.recipientWallet as Address,
          signature: signature as Hex,
        }),
      );

      if (!valid) return yield* new Forbidden({ message: "Invalid recipient claim signature" });

      const authorization = () =>
        account.signTypedData({
          domain: domain(),
          primaryType: "ClaimAuthorization",
          types: authorizationTypes,
          message: {
            intentHash: hashTypedData(typed),
            recipientId: recipientId(gift.recipient),
          },
        });

      return {
        recipientAuthorization: yield* provider("signer", authorization),
      };
    }),

    advance: Effect.fn("Chain.advance")(function* (gift, claim): Effect.fn.Return<
      ChainProgress,
      ApplicationError
    > {
      if (claim.state === "complete" || claim.state === "refunded") return { state: claim.state };

      const block = yield* provider("rpc", () => publicClient.getBlock());

      const actual = yield* plans.escrowGift(gift);
      if (actual[8] === 3) return { state: "refunded" };
      if (actual[8] === 2) {
        yield* verifyOwnership(gift, claim);
        return { state: "complete" };
      }
      if (block.timestamp > BigInt(claim.deadline))
        return yield* new Conflict({
          code: "CLAIM_EXPIRED",
          message: "Your name reservation has expired.",
        });
      const commitment = yield* registration.status(claim);
      if (commitment.status === "expired")
        return yield* new Conflict({
          code: "COMMITMENT_EXPIRED",
          message: "Your name reservation has expired.",
        });
      if (commitment.status === "not-found")
        return { state: "committing", retryAt: Date.now() + 5000 };
      return {
        state: commitment.status === "pending" ? "waiting" : "registering",
        commitmentAt: Number(commitment.submittedAt),
        retryAt: Date.now() + 5000,
      };
    }),
  });
});

export const ChainLive = Layer.effect(Chain, make);
