import { Context, Effect, Layer } from "effect";

import { Cryptography, claimSecret } from "@memento/application";
import { MementoRegistrationAbi } from "@memento/chain";
import {
  type Claim,
  type Gift,
  type ClaimSetup,
  type RegistrationView,
  type ApplicationError,
  Conflict,
} from "@memento/protocol";
import { encodeFunctionData, type Address, type Hex, zeroAddress, zeroHash } from "viem";

import { Ethereum, ensRequest, provider } from "./client.js";
import { EnsConfig } from "./config.js";

const make = Effect.gen(function* () {
  const config = yield* EnsConfig;
  const { ensforge, forOwner, publicClient } = yield* Ethereum;
  const crypto = yield* Cryptography;

  const status = (claim: Claim) =>
    ensRequest(
      ensforge.registration.getCommitmentStatus.effect({ commitment: claim.commitment as Hex }),
    );
  const resolverAddress = (owner: Address, salt: string) =>
    ensRequest(forOwner(owner).resolution.predictResolverAddress.effect({ salt: BigInt(salt) }));

  return {
    status,
    resolverAddress,
    prepare: Effect.fn("DirectRegistration.prepare")(function* (
      gift: Gift,
      recipient: Address,
      label: string,
    ) {
      // Fail before asking the receiver to sign if the fresh deployment has not been activated.
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
          message: "Gift registration is not configured yet",
        });
      const resolver = yield* resolverAddress(config.sponsorship, gift.id);
      const commitmentSecret = crypto.random();
      const commitment = yield* ensRequest(
        ensforge.registration.makeRegistrationCommitment.effect({
          name: `${label}.eth`,
          owner: recipient,
          secret: commitmentSecret as Hex,
          resolver,
          subregistry: zeroAddress,
          duration: BigInt(gift.policy.duration),
          referrer: zeroHash,
        }),
      );
      return {
        resolver,
        resolverSalt: gift.id,
        commitmentSecret,
        commitment: commitment.commitment,
      };
    }),
    view: Effect.fn("DirectRegistration.view")(function* (
      claim: Claim,
    ): Effect.fn.Return<RegistrationView, ApplicationError> {
      const empty = {
        readyAt: null,
        reason: null,
        step: null,
      };
      if (claim.state === "complete") return { ...empty, status: "registered" };
      const commitment = yield* status(claim);
      if (commitment.status === "not-found")
        return { ...empty, status: "not-started", step: "commit" };
      if (commitment.status === "expired")
        return { ...empty, status: "expired", reason: "The name reservation expired." };
      return {
        ...empty,
        status: commitment.status === "pending" ? "waiting" : "created",
        readyAt: Number(commitment.readyAt),
        step: "register",
      };
    }),
    setup: Effect.fn("DirectRegistration.setup")(function* (
      gift: Gift,
      claim: Claim,
    ): Effect.fn.Return<ClaimSetup, ApplicationError> {
      const base = { chainId: 11155111 as const, from: claim.recipientWallet };
      const actual = yield* provider("rpc", () =>
        publicClient.readContract({
          address: config.sponsorship,
          abi: MementoRegistrationAbi,
          functionName: "gifts",
          args: [gift.id as Hex],
        }),
      );
      if (actual[8] === 2) return { ...base, stage: "not-required", calls: [] };
      if (actual[8] !== 1)
        return yield* new Conflict({
          code: "GIFT_NOT_READY",
          message: "This gift is no longer available.",
        });
      const commitment = yield* status(claim);
      if (commitment.status === "expired")
        return yield* new Conflict({
          code: "COMMITMENT_EXPIRED",
          message: "The name reservation expired.",
        });
      if (commitment.status === "not-found") {
        const recipientSdk = forOwner(claim.recipientWallet as Address);
        const calls = yield* ensRequest(
          recipientSdk.batch.prepareCalls.effect({
            calls: [
              recipientSdk.registration.commitName.call({ commitment: claim.commitment as Hex }),
            ],
          }),
        );
        return {
          ...base,
          stage: "commit-name",
          calls: calls.map((call) => ({
            to: call.to,
            data: call.data ?? "0x",
            value: call.value.toString(),
          })),
        };
      }
      if (commitment.status === "pending" || !claim.signature)
        return { ...base, stage: "waiting", readyAt: Number(commitment.readyAt), calls: [] };
      if (
        !gift.secretCiphertext ||
        !claim.commitmentSecretCiphertext ||
        !claim.recipientAuthorizationCiphertext
      )
        return yield* new Conflict({
          code: "AUTHORIZATION_UNAVAILABLE",
          message: "Please confirm your claim first.",
        });
      const invitation = yield* crypto.open(gift.secretCiphertext, `gift:${gift.id}:secret`);
      const secret = yield* crypto.open(
        claim.commitmentSecretCiphertext,
        `claim:${claim.id}:commitment-secret`,
      );
      const recipientAuthorization = yield* crypto.open(
        claim.recipientAuthorizationCiphertext,
        `claim:${claim.id}:recipient-authorization`,
      );
      return {
        ...base,
        stage: "register-name",
        calls: [
          {
            to: config.sponsorship,
            value: "0",
            data: encodeFunctionData({
              abi: MementoRegistrationAbi,
              functionName: "registerGift",
              args: [
                {
                  giftId: gift.id as Hex,
                  recipient: claim.recipientWallet as Address,
                  resolver: claim.resolver as Address,
                  labelhash: claim.labelhash as Hex,
                  nonce: claim.nonce as Hex,
                  deadline: BigInt(claim.deadline),
                },
                claimSecret(invitation),
                claim.label,
                secret as Hex,
                claim.signature as Hex,
                recipientAuthorization as Hex,
              ],
            }),
          },
        ],
      };
    }),
  };
});

export class DirectRegistration extends Context.Service<
  DirectRegistration,
  Effect.Success<typeof make>
>()("@memento/server/DirectRegistration") {
  static readonly layer = Layer.effect(DirectRegistration, make);
}
