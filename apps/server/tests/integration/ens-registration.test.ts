import { Effect, Layer } from "effect";

import { Cryptography, claimSecret } from "@memento/application";
import { MementoRegistrationAbi } from "@memento/chain";
import { decodeFunctionData, zeroAddress, type Block } from "viem";
import { expect, it, vi } from "vitest";

import { Ethereum } from "../../src/integrations/ens/client.js";
import { EnsConfig } from "../../src/integrations/ens/config.js";
import { DirectRegistration } from "../../src/integrations/ens/direct-registration.js";
import { ensClaim, ensConfig, ensGift } from "../fixtures/ens.js";
import { Providers, digest } from "../fixtures/providers.js";

it("waits for the registrar, then returns one atomic registration call without releasing funds", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const ethereum = yield* Ethereum;
      const crypto = yield* Cryptography;
      const gift = {
        ...ensGift,
        secretCiphertext: crypto.seal(digest, `gift:${ensGift.id}:secret`),
        policy: ensGift.policy,
      };
      const claim = {
        ...ensClaim,
        signature: "0x1234",
        commitmentSecretCiphertext: crypto.seal(digest, `claim:${ensClaim.id}:commitment-secret`),
        recipientAuthorizationCiphertext: crypto.seal(
          "0xabcd",
          `claim:${ensClaim.id}:recipient-authorization`,
        ),
      };
      const actual = [
        zeroAddress,
        digest,
        digest,
        {
          maxPrice: 1000n,
          expiresAt: 86400n,
          duration: 31536000n,
          minLength: 3,
          maxLength: 63,
        },
        digest,
        zeroAddress,
        digest,
        1000n,
        1,
      ] as const;
      const read = vi.spyOn(ethereum.publicClient, "readContract").mockResolvedValue(actual);
      const status = vi
        .fn<typeof ethereum.ensforge.registration.getCommitmentStatus.effect>()
        .mockReturnValue(
          Effect.succeed({
            status: "pending",
            protocol: "v2",
            submittedAt: 10n,
            readyAt: 70n,
            expiresAt: 1000n,
            remainingSeconds: 40n,
          }),
        );
      const original = ethereum.ensforge.registration.getCommitmentStatus;
      const action = Object.assign(original.bind(undefined), original, { effect: status });
      const sdk = {
        ...ethereum.ensforge,
        registration: { ...ethereum.ensforge.registration, getCommitmentStatus: action },
      };
      const service = yield* DirectRegistration.pipe(
        Effect.provide(DirectRegistration.layer),
        Effect.provideService(Ethereum, { ...ethereum, ensforge: sdk }),
      );
      const block = vi
        .spyOn(ethereum.publicClient, "getBlock")
        .mockResolvedValue({ number: 100n } as Block);
      status.mockReturnValue(Effect.succeed({ status: "not-found", protocol: "v2" }));
      const reservation = yield* service.setup(gift, claim);
      expect(reservation).toMatchObject({ stage: "commit-name", from: claim.recipientWallet });
      expect(reservation.calls).toHaveLength(1);
      expect(reservation.calls[0]).toMatchObject({ to: ensConfig.registrar, value: "0" });
      block.mockRestore();
      status.mockReturnValue(
        Effect.succeed({
          status: "pending",
          protocol: "v2",
          submittedAt: 10n,
          readyAt: 70n,
          expiresAt: 1000n,
          remainingSeconds: 40n,
        }),
      );
      const waiting = yield* service.setup(gift, claim);
      expect(waiting).toMatchObject({ stage: "waiting", readyAt: 70, calls: [] });
      expect(yield* service.view(claim)).toMatchObject({ status: "waiting", readyAt: 70 });
      status.mockReturnValue(
        Effect.succeed({
          status: "ready",
          protocol: "v2",
          submittedAt: 10n,
          readyAt: 70n,
          expiresAt: 1000n,
          remainingSeconds: 0n,
        }),
      );
      const plan = yield* service.setup(gift, claim);
      expect(plan.stage).toBe("register-name");
      expect(plan.calls).toHaveLength(1);
      const call = plan.calls[0];
      if (!call) throw new Error("Missing registration call");
      expect(call.to).toBe(ensConfig.sponsorship);
      const decoded = decodeFunctionData({
        abi: MementoRegistrationAbi,
        data: call.data as `0x${string}`,
      });
      expect(decoded.functionName).toBe("registerGift");
      if (decoded.functionName !== "registerGift") throw new Error("Expected atomic registration");
      expect(decoded.args[0]).toMatchObject({
        recipient: claim.recipientWallet,
        resolver: claim.resolver,
        deadline: 86400n,
      });
      expect(decoded.args.slice(1)).toEqual([
        claimSecret(digest),
        claim.label,
        digest,
        "0x1234",
        "0xabcd",
      ]);
      const view = yield* service.view(claim);
      expect(JSON.stringify(view)).not.toContain("abcd");
      status.mockReturnValue(
        Effect.succeed({
          status: "expired",
          protocol: "v2",
          submittedAt: 10n,
          readyAt: 70n,
          expiresAt: 1000n,
        }),
      );
      expect((yield* service.setup(gift, claim).pipe(Effect.flip))._tag).toBe("Conflict");
      read.mockRestore();
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Providers,
          Layer.succeed(EnsConfig, ensConfig),
          Ethereum.layer.pipe(Layer.provide(Layer.succeed(EnsConfig, ensConfig))),
        ),
      ),
    ),
  );
});
