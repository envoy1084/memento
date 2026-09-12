import { Effect, Layer, Schema, Redacted } from "effect";

import { HcaRegistrationOperation } from "@ensforge/core/hca";
import { Cryptography } from "@memento/application";
import { RepositoriesLive } from "@memento/database";
import { TestDatabase } from "@memento/database/testing";
import type { HcaRecovery } from "@memento/protocol";
import { zeroAddress, zeroHash } from "viem";
import { expect, it, vi } from "vitest";

import { Ethereum } from "../../src/integrations/ens/client.js";
import { EnsConfig } from "../../src/integrations/ens/config.js";
import { Hca } from "../../src/integrations/ens/hca.js";
import { Registration } from "../../src/integrations/ens/registration.js";
import { EnsWorkflowStorage } from "../../src/integrations/ens/storage.js";
import { ensClaim, ensConfig, ensGift } from "../fixtures/ens.js";
import { Providers, address, digest } from "../fixtures/providers.js";

const infrastructure = Layer.mergeAll(
  Providers,
  RepositoriesLive.pipe(Layer.provideMerge(TestDatabase.layer)),
  Layer.succeed(EnsConfig, ensConfig),
  Ethereum.layer.pipe(Layer.provide(Layer.succeed(EnsConfig, ensConfig))),
);
const dependencies = EnsWorkflowStorage.layer.pipe(Layer.provideMerge(infrastructure));

it("starts with fixed claim limits, resumes persisted work after restart and exposes no secrets", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const ethereum = yield* Ethereum;
      const crypto = yield* Cryptography;
      const storage = yield* EnsWorkflowStorage;
      const sdk = ethereum.forOwner(ensClaim.recipientWallet as `0x${string}`);
      const authorization = { permissionId: digest, enableTransactionHash: digest };
      const claim = {
        ...ensClaim,
        authorizationCiphertext: crypto.seal(
          JSON.stringify(authorization),
          `claim:${ensClaim.id}:authorization`,
        ),
      };
      const operation: HcaRegistrationOperation = {
        schemaVersion: 1,
        id: claim.id,
        revision: 0,
        chainId: 11155111,
        profileId: "ens-standalone-hca-1.1.0",
        hca: address,
        owner: claim.recipientWallet as `0x${string}`,
        salt: 0n,
        registration: {
          name: "bobbbb.eth",
          duration: 31536000n,
          secret: digest,
          commitment: digest,
          registrar: ensConfig.registrar,
          resolver: address,
          paymentToken: ensConfig.token,
          subregistry: zeroAddress,
          referrer: zeroHash,
          primaryName: true,
        },
        authorization: { kind: "session", permissionId: digest, enableTransactionHash: digest },
        route: { kind: "adapter", id: "rhinestone", instanceId: "test" },
        signerReference: `claim:${claim.id}:key`,
        limits: { registrationPrice: 1000n, fees: [] },
        progress: { status: "waiting", readyAt: 100n, expiresAt: 1000n },
        createdAt: 0n,
        updatedAt: 0n,
      };
      const start = vi
        .fn<typeof sdk.hca.startHcaRegistration.effect>()
        .mockImplementation((parameters) =>
          Effect.gen(function* () {
            expect(parameters).toMatchObject({
              id: claim.id,
              name: "bobbbb.eth",
              primaryName: true,
              limits: { registrationPrice: 1000n, fees: [] },
              authorization: operation.authorization,
              signerReference: `claim:${claim.id}:key`,
            });
            const value = Schema.encodeSync(
              Schema.fromJsonString(Schema.toCodecJson(HcaRegistrationOperation)),
            )(operation);
            yield* Effect.promise(() =>
              storage.forClaim(claim.id).create({
                namespace: "ens/registration",
                record: { id: claim.id, revision: 0, value },
              }),
            );
            return operation;
          }),
        );
      const resume = vi
        .fn<typeof sdk.hca.resumeHcaRegistration.effect>()
        .mockReturnValue(Effect.succeed(operation));
      const hcaContext = yield* Hca.pipe(
        Effect.flatMap((hca) =>
          hca.context({
            ...claim,
            sessionKeyCiphertext: crypto.seal(
              Redacted.value(ensConfig.coordinatorKey),
              `claim:${claim.id}:key`,
            ),
            sessionPayload: {
              version: 2,
              salt: digest,
              sessionKey: ethereum.account.address,
              validUntil: claim.sessionExpiry,
            },
          }),
        ),
        Effect.provide(Hca.layer),
      );
      let recoveredOperation = operation;
      const get = vi
        .fn<typeof sdk.hca.getHcaRegistration.effect>()
        .mockImplementation(() => Effect.succeed(recoveredOperation));
      const authorize = vi.fn(() => Effect.succeed(JSON.stringify(authorization)));
      const testSdk = {
        ...sdk,
        hca: {
          ...sdk.hca,
          getHcaRegistration: Object.assign(sdk.hca.getHcaRegistration.bind(sdk.hca), {
            effect: get,
          }),
          startHcaRegistration: Object.assign(sdk.hca.startHcaRegistration.bind(sdk.hca), {
            effect: start,
          }),
          resumeHcaRegistration: Object.assign(sdk.hca.resumeHcaRegistration.bind(sdk.hca), {
            effect: resume,
          }),
        },
      };
      const layer = Registration.layer.pipe(
        Layer.provide(
          Layer.mock(Hca, {
            authorize,
            context: () => Effect.succeed({ ...hcaContext, sdk: testSdk }),
          }),
        ),
      );
      const advance = Registration.pipe(
        Effect.flatMap((registration) => registration.advance(ensGift, claim)),
        Effect.provide(layer),
      );

      expect((yield* advance).status).toBe("waiting");
      expect((yield* advance).status).toBe("waiting");
      expect(start).toHaveBeenCalledTimes(1);
      expect(resume).toHaveBeenCalledTimes(1);
      expect(resume.mock.calls[0]?.[0]).not.toHaveProperty("limits");
      expect(resume.mock.calls[0]?.[0]).not.toHaveProperty("authorization");

      const view = yield* Registration.pipe(
        Effect.flatMap((registration) =>
          registration.view({ ...claim, sessionKeyCiphertext: null }),
        ),
        Effect.provide(layer),
      );
      expect(view).toEqual({
        status: "waiting",
        readyAt: 100,
        transactionHash: null,
        reason: null,
        step: null,
        planFingerprint: null,
      });
      expect(JSON.stringify(view)).not.toContain(digest);

      const block = vi
        .spyOn(ethereum.publicClient, "getBlock")
        .mockResolvedValue({ timestamp: 1n } as Awaited<
          ReturnType<typeof ethereum.publicClient.getBlock>
        >);
      recoveredOperation = {
        ...operation,
        progress: { status: "needs-authorization", reason: "revoked" },
      };
      const recover = (input: HcaRecovery) =>
        Registration.pipe(
          Effect.flatMap((registration) => registration.recover(claim, input)),
          Effect.provide(layer),
        );
      yield* recover({ kind: "session", authorization });
      expect(authorize).toHaveBeenCalledWith(claim, authorization);
      expect(resume.mock.calls.at(-1)?.[0]).toMatchObject({
        id: claim.id,
        authorization: operation.authorization,
      });
      expect(resume.mock.calls.at(-1)?.[0]).not.toHaveProperty("limits");

      recoveredOperation = {
        ...operation,
        progress: { status: "submitting", attempt: { step: "register", planFingerprint: digest } },
      };
      const callsBeforeRecovery = resume.mock.calls.length;
      const malformed = yield* recover({ kind: "submission", serialized: "{}" }).pipe(Effect.flip);
      expect(malformed._tag === "Conflict" && malformed.code).toBe("INVALID_SUBMISSION");
      expect(resume).toHaveBeenCalledTimes(callsBeforeRecovery);

      block.mockResolvedValue({ timestamp: 86400n } as Awaited<
        ReturnType<typeof ethereum.publicClient.getBlock>
      >);
      const expired = yield* recover({ kind: "session", authorization }).pipe(Effect.flip);
      expect(expired._tag === "Conflict" && expired.code).toBe("HCA_SESSION_EXPIRED");
      block.mockRestore();
    }).pipe(Effect.provide(dependencies)),
  );
});
