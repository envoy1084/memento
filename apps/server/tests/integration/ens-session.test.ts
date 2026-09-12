import { Effect, Layer } from "effect";

import { sepoliaHcaDeployment } from "@ensforge/contracts/deployments";
import type { PreparedHcaCalls, VerifiedHcaSession } from "@ensforge/core/hca";
import type * as RhinestoneModule from "@ensforge/hca/rhinestone";
import { Cryptography } from "@memento/application";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { expect, it, vi } from "vitest";

import { Ethereum } from "../../src/integrations/ens/client.js";
import { EnsConfig } from "../../src/integrations/ens/config.js";
import { Hca } from "../../src/integrations/ens/hca.js";
import { ensClaim, ensConfig, ensGift, verifiedHca } from "../fixtures/ens.js";
import { Providers, address, digest } from "../fixtures/providers.js";

// ENSForge verifies canonical receipts and validator events; these tests cover Memento's claim binding.
vi.mock("@ensforge/hca/rhinestone", async (importOriginal) => {
  const original = await importOriginal<typeof RhinestoneModule>();
  return {
    rhinestone: (...args: Parameters<typeof original.rhinestone>) => {
      const execution = original.rhinestone(...args);
      const session = {
        parameters: {
          hca: address,
          resolver: address,
          sessionKey: args[0].sessionSigner.address,
          validUntil: 86400,
          permissionId: digest,
        },
        sessionNonce: 0n,
        chainId: 11155111,
        profileId: sepoliaHcaDeployment.generation.id,
      };
      return {
        ...execution,
        extensions: {
          ...execution.extensions,
          sessions: {
            ...execution.extensions.sessions,
            prepare: Object.assign(async () => session, { effect: () => Effect.succeed(session) }),
          },
        },
      };
    },
  };
});

const dependencies = Layer.mergeAll(
  Providers,
  Layer.succeed(EnsConfig, ensConfig),
  Ethereum.layer.pipe(Layer.provide(Layer.succeed(EnsConfig, ensConfig))),
);

it("accepts only the confirmed claim-bound session and rejects legacy signatures, changed scope and refunds", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const ethereum = yield* Ethereum;
      const crypto = yield* Cryptography;
      const key = generatePrivateKey();
      const signer = privateKeyToAccount(key);
      const claim = {
        ...ensClaim,
        sessionPayload: {
          version: 2,
          salt: digest,
          sessionKey: signer.address,
          validUntil: ensClaim.sessionExpiry,
        },
        sessionKeyCiphertext: crypto.seal(key, `claim:${ensClaim.id}:key`),
      };
      const sdk = ethereum.forOwner(claim.recipientWallet as `0x${string}`);
      let session: VerifiedHcaSession = {
        permissionId: digest,
        enableTransactionHash: digest,
        sessionKey: signer.address,
        resolver: address,
        validUntil: claim.sessionExpiry,
        sessionNonce: 0n,
      };
      const prepare = vi.fn<typeof sdk.hca.prepareHcaCalls.effect>().mockImplementation(() =>
        Effect.succeed({
          account: verifiedHca,
          authorization: { kind: "session", permissionId: digest, enableTransactionHash: digest },
          session,
          calls: [],
          value: 0n,
          data: "0x",
          fingerprint: digest,
          simulation: "required",
        } satisfies PreparedHcaCalls),
      );
      const testSdk = {
        ...sdk,
        hca: {
          ...sdk.hca,
          prepareHcaCalls: Object.assign(sdk.hca.prepareHcaCalls.bind(sdk.hca), {
            effect: prepare,
          }),
        },
      };
      // The receipt body is SDK-owned; Memento additionally waits for its confirmation policy.
      const receipt = vi
        .spyOn(ethereum.publicClient, "getTransactionReceipt")
        .mockResolvedValue({ status: "success", blockNumber: 100n } as Awaited<
          ReturnType<typeof ethereum.publicClient.getTransactionReceipt>
        >);
      const height = vi.spyOn(ethereum.publicClient, "getBlockNumber").mockResolvedValue(101n);
      const layer = Hca.layer.pipe(
        Layer.provide(Layer.succeed(Ethereum, { ...ethereum, forOwner: () => testSdk })),
      );
      const authorize = (input: unknown) =>
        Hca.pipe(
          Effect.flatMap((hca) => hca.authorize(claim, input)),
          Effect.provide(layer),
        );
      const authorization = { permissionId: digest, enableTransactionHash: digest };

      expect(yield* authorize(authorization)).toBe(JSON.stringify(authorization));
      expect((yield* authorize({ signature: digest }).pipe(Effect.flip))._tag).toBe("Forbidden");
      expect(
        (yield* authorize({ ...authorization, permissionId: `0x${"99".repeat(32)}` }).pipe(
          Effect.flip,
        ))._tag,
      ).toBe("Forbidden");
      const valid = session;
      for (const change of [
        { sessionKey: ethereum.account.address },
        { resolver: ensConfig.registrar },
        { validUntil: claim.sessionExpiry + 1 },
        {
          refund: {
            token: ensConfig.token,
            maxExchangeRate: 1n,
            maxGasOverhead: 0n,
            maxAmount: 1n,
          },
        },
      ]) {
        session = { ...valid, ...change };
        expect((yield* authorize(authorization).pipe(Effect.flip))._tag).toBe("Forbidden");
      }
      session = valid;
      height.mockResolvedValue(100n);
      const pending = yield* authorize(authorization).pipe(Effect.flip);
      expect(pending._tag === "Conflict" && pending.code).toBe("SESSION_ENABLE_PENDING");
      receipt.mockRestore();
      height.mockRestore();
    }).pipe(Effect.provide(dependencies)),
  );
});

it("returns staged owner-wallet setup calls without broadcasting", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const ethereum = yield* Ethereum;
      const crypto = yield* Cryptography;
      const key = generatePrivateKey();
      const claim = {
        ...ensClaim,
        sessionPayload: {
          version: 2,
          salt: digest,
          sessionKey: privateKeyToAccount(key).address,
          validUntil: ensClaim.sessionExpiry,
        },
        sessionKeyCiphertext: crypto.seal(key, `claim:${ensClaim.id}:key`),
      };
      const sdk = ethereum.forOwner(claim.recipientWallet as `0x${string}`);
      let deployed = false;
      const verify = vi
        .fn<typeof sdk.hca.verifyHca.effect>()
        .mockImplementation(() => Effect.succeed({ ...verifiedHca, deployed }));
      const batch = vi.fn<typeof sdk.batch.prepareCalls.effect>().mockReturnValue(
        Effect.succeed([
          {
            to: address,
            data: "0x1234",
            value: 0n,
            protocol: "v2",
            id: "setup",
            operation: "deployHca",
            account: address,
            chainId: 11155111,
          },
        ]),
      );
      const owner = vi.fn<typeof sdk.hca.prepareHcaCalls.effect>().mockReturnValue(
        Effect.succeed({
          account: verifiedHca,
          authorization: { kind: "owner" },
          calls: [],
          value: 0n,
          data: "0xabcd",
          fingerprint: digest,
          simulation: "required",
        }),
      );
      const testSdk = {
        ...sdk,
        hca: {
          ...sdk.hca,
          verifyHca: Object.assign(sdk.hca.verifyHca.bind(sdk.hca), { effect: verify }),
          prepareHcaCalls: Object.assign(sdk.hca.prepareHcaCalls.bind(sdk.hca), { effect: owner }),
        },
        batch: {
          ...sdk.batch,
          prepareCalls: Object.assign(sdk.batch.prepareCalls.bind(sdk.batch), { effect: batch }),
        },
      };
      const block = vi
        .spyOn(ethereum.publicClient, "getBlock")
        .mockResolvedValue({ timestamp: 1n } as Awaited<
          ReturnType<typeof ethereum.publicClient.getBlock>
        >);
      const code = vi.spyOn(ethereum.publicClient, "getCode").mockResolvedValue(undefined);
      const broadcast = vi.spyOn(ethereum.walletClient, "sendTransaction");
      const layer = Hca.layer.pipe(
        Layer.provide(Layer.succeed(Ethereum, { ...ethereum, forOwner: () => testSdk })),
      );
      const setup = Hca.pipe(
        Effect.flatMap((hca) => hca.setup(ensGift, claim)),
        Effect.provide(layer),
      );

      expect((yield* setup).stage).toBe("deploy-hca");
      deployed = true;
      expect((yield* setup).stage).toBe("deploy-resolver");
      code.mockResolvedValue("0x1234");
      const ready = yield* setup;
      expect(ready).toMatchObject({
        stage: "enable-session",
        from: claim.recipientWallet,
        authorization: { permissionId: digest },
        calls: [{ to: claim.hca, data: "0xabcd", value: "0" }],
      });
      expect(owner.mock.calls[0]?.[0].authorization).toEqual({ kind: "owner" });
      expect(broadcast).not.toHaveBeenCalled();

      block.mockResolvedValue({ timestamp: 86400n } as Awaited<
        ReturnType<typeof ethereum.publicClient.getBlock>
      >);
      const expired = yield* setup.pipe(Effect.flip);
      expect(expired._tag === "Conflict" && expired.code).toBe("HCA_SESSION_EXPIRED");
      block.mockRestore();
      code.mockRestore();
      broadcast.mockRestore();
    }).pipe(Effect.provide(dependencies)),
  );
});
