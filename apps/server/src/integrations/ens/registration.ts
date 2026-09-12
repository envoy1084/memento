import { Context, Effect, Layer, Schema } from "effect";

import { HcaRegistrationOperation } from "@ensforge/core/hca";
import { Cryptography } from "@memento/application";
import {
  HcaAuthorization,
  type Claim,
  type Gift,
  type HcaRecovery,
  type RegistrationView,
  type ApplicationError,
  Conflict,
} from "@memento/protocol";
import type { Address, Hex } from "viem";

import { Ethereum, ensRequest, provider } from "./client.js";
import { EnsConfig } from "./config.js";
import { Hca } from "./hca.js";
import { EnsWorkflowStorage } from "./storage.js";

const make = Effect.gen(function* () {
  const hca = yield* Hca;
  const storage = yield* EnsWorkflowStorage;
  const crypto = yield* Cryptography;
  const config = yield* EnsConfig;
  const { publicClient } = yield* Ethereum;

  return {
    view: Effect.fn("Registration.view")(function* (
      claim: Claim,
    ): Effect.fn.Return<RegistrationView, ApplicationError> {
      const empty = {
        readyAt: null,
        transactionHash: null,
        reason: null,
        step: null,
        planFingerprint: null,
      };
      const store = storage.forClaim(claim.id);
      const existing = yield* provider("ens-storage", () =>
        store.get({ namespace: "ens/registration", id: claim.id }),
      );
      if (!existing) return { ...empty, status: "not-started" };

      // Decode persisted state without requiring the session key, which is erased at completion.
      const operation = yield* Schema.decodeUnknownEffect(
        Schema.fromJsonString(Schema.toCodecJson(HcaRegistrationOperation)),
      )(existing.value).pipe(
        Effect.mapError(
          () =>
            new Conflict({ code: "INVALID_WORKFLOW", message: "Stored registration is invalid" }),
        ),
      );
      const progress = operation.progress;
      return {
        ...empty,
        status: progress.status,
        ...(progress.status === "waiting" ? { readyAt: Number(progress.readyAt) } : {}),
        ...(progress.status === "registered" ? { transactionHash: progress.transactionHash } : {}),
        ...("reason" in progress ? { reason: progress.reason } : {}),
        ...("attempt" in progress
          ? { step: progress.attempt.step, planFingerprint: progress.attempt.planFingerprint }
          : {}),
      };
    }),

    recover: Effect.fn("Registration.recover")(function* (claim: Claim, recovery: HcaRecovery) {
      const { sdk, execution } = yield* hca.context(claim);
      const parameters = { id: claim.id, storage: storage.forClaim(claim.id), execution };
      const operation = yield* ensRequest(sdk.hca.getHcaRegistration.effect(parameters));
      const progress = operation.progress;
      const block = yield* provider("rpc", () => publicClient.getBlock());
      if (block.timestamp >= BigInt(claim.deadline))
        return yield* new Conflict({
          code: "HCA_SESSION_EXPIRED",
          message: "Claim authorization expired; its spending bounds cannot be extended",
        });

      if (recovery.kind === "session") {
        if (progress.status !== "needs-authorization")
          return yield* new Conflict({
            code: "RECOVERY_NOT_REQUIRED",
            message: "Registration is not awaiting a replacement session",
          });
        yield* hca.authorize(claim, recovery.authorization);
        yield* ensRequest(
          sdk.hca.resumeHcaRegistration.effect({
            ...parameters,
            authorization: {
              kind: "session",
              permissionId: recovery.authorization.permissionId as Hex,
              enableTransactionHash: recovery.authorization.enableTransactionHash as Hex,
            },
          }),
        );
      } else {
        if (
          (progress.status !== "submitting" && progress.status !== "submitted") ||
          progress.attempt.tracking
        )
          return yield* new Conflict({
            code: "RECOVERY_NOT_REQUIRED",
            message: "Registration has no untracked submission",
          });
        const submission = yield* Effect.try({
          try: () =>
            execution.restoreSubmission(recovery.serialized, {
              chainId: operation.chainId,
              hca: operation.hca,
              profileId: operation.profileId,
              planFingerprint: progress.attempt.planFingerprint,
            }),
          catch: () =>
            new Conflict({
              code: "INVALID_SUBMISSION",
              message: "Submission does not match this registration attempt",
            }),
        });
        yield* ensRequest(sdk.hca.resumeHcaRegistration.effect({ ...parameters, submission }));
      }
    }),

    advance: Effect.fn("Registration.advance")(function* (gift: Gift, claim: Claim) {
      const { sdk, execution } = yield* hca.context(claim);
      const store = storage.forClaim(claim.id);
      const parameters = { id: claim.id, storage: store, execution };
      const existing = yield* provider("ens-storage", () =>
        store.get({ namespace: "ens/registration", id: claim.id }),
      );

      if (existing)
        return (yield* ensRequest(sdk.hca.resumeHcaRegistration.effect(parameters))).progress;
      if (!claim.authorizationCiphertext)
        return yield* new Conflict({
          code: "SESSION_UNAVAILABLE",
          message: "Claim session authorization is missing",
        });

      const serialized = yield* crypto.open(
        claim.authorizationCiphertext,
        `claim:${claim.id}:authorization`,
      );
      const authorization = yield* Schema.decodeUnknownEffect(
        Schema.fromJsonString(HcaAuthorization),
      )(serialized).pipe(
        Effect.mapError(
          () =>
            new Conflict({
              code: "LEGACY_HCA_SESSION",
              message: "Stored session authorization is unsupported",
            }),
        ),
      );
      const operation = yield* ensRequest(
        sdk.hca.startHcaRegistration.effect({
          ...parameters,
          hca: claim.hca as Address,
          name: `${claim.label}.eth`,
          duration: BigInt(gift.policy.duration),
          resolver: claim.resolver as Address,
          paymentToken: config.token,
          primaryName: gift.policy.setPrimaryName,
          authorization: {
            kind: "session",
            permissionId: authorization.permissionId as Hex,
            enableTransactionHash: authorization.enableTransactionHash as Hex,
          },
          signerReference: `claim:${claim.id}:key`,
          limits: { registrationPrice: BigInt(gift.policy.maxPrice), fees: [] },
        }),
      );
      return operation.progress;
    }),
  };
});

export class Registration extends Context.Service<Registration, Effect.Success<typeof make>>()(
  "@memento/server/Registration",
) {
  static readonly layer = Layer.effect(Registration, make);
}
