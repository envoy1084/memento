import { expect, layer } from "@effect/vitest";
import { Effect, Layer, Redacted } from "effect";

import { Application, Chain } from "@memento/application";
import {
  factoryAbi,
  profileAbi,
  registryAbi,
  resolverAbi,
  reverseAbi,
  defaultReverseAbi,
} from "@memento/chain/abi/ens";
import { ClaimRepository, GiftRepository, RepositoriesLive } from "@memento/database";
import { TestDatabase } from "@memento/database/testing";
import { createPublicClient, decodeFunctionData, encodeFunctionResult, http, type Hex } from "viem";
import { generatePrivateKey } from "viem/accounts";
import { sepolia } from "viem/chains";

import { ChainLive } from "../../src/integrations/ens/chain.js";
import { Ethereum } from "../../src/integrations/ens/client.js";
import { EnsConfig } from "../../src/integrations/ens/config.js";
import { Hca } from "../../src/integrations/ens/hca.js";
import { TransactionJournal } from "../../src/integrations/ens/journal.js";
import { Registration } from "../../src/integrations/ens/registration.js";
import { makeOwnershipVerification } from "../../src/integrations/ens/verification.js";
import { Providers, address, alice, bob, digest } from "../fixtures/providers.js";

const contract = (digit: string): Hex => `0x${digit.repeat(40)}`;

const config = EnsConfig.of({
  rpcUrl: Redacted.make("http://unused.test"),
  coordinatorKey: Redacted.make(generatePrivateKey()),
  rhinestoneKey: Redacted.make("test"),
  registrar: contract("1"),
  registry: contract("2"),
  token: contract("3"),
  sponsorship: contract("4"),
  vault: contract("6"),
  hcaFactory: contract("7"),
  hcaImplementation: contract("8"),
  validator: contract("9"),
  verifiableFactory: contract("a"),
  resolverImplementation: contract("c"),
  reverseAdapter: contract("d"),
  confirmations: 1,
});

const infrastructure = Layer.mergeAll(
  Providers,
  RepositoriesLive.pipe(Layer.provideMerge(TestDatabase.layer)),
);

const application = Application.layer.pipe(Layer.provideMerge(infrastructure));

layer(application)("ENSv2 final ownership verification", (it) => {
  it.effect(
    "uses ENSIP-10 resolution and checks starter records and primary name before completion",
    () =>
      Effect.gen(function* () {
        yield* (yield* TestDatabase).reset;

        const app = yield* Application;

        const plan = yield* app.createGift(alice, {
          sponsorWallet: alice.wallets[0] ?? "",
          kind: "chosen_name",
          recipient: { kind: "any", value: "" },
          policy: {
            maxPrice: "1000",
            expiresAt: 86400,
            duration: 31536000,
            minLength: 3,
            maxLength: 63,
            worldRequired: false,
            setPrimaryName: true,
          },
          message: "Hello",
          theme: "moon",
          records: [{ key: "url", value: "https://example.test" }],
          label: null,
        });

        const link = yield* app.confirmGift(alice, plan.id, digest);

        const prepared = yield* app.prepareClaim(bob, plan.id, {
          secret: new URL(link.url).hash.slice(1),
          recipientWallet: bob.wallets[0] ?? "",
          label: "bobbbb",
        });

        const gift = yield* (yield* GiftRepository).find(plan.id);
        const claim = yield* (yield* ClaimRepository).find(prepared.id);

        if (!gift || !claim) return yield* Effect.die("Missing test gift");

        let primary = "bobbbb.eth";
        let text = "https://example.test";
        let resolves = 0;

        const publicClient = createPublicClient({
          chain: sepolia,
          transport: http("http://unused.test", {
            fetchFn: async (input, init) => {
              const rpc = JSON.parse(
                input instanceof Request ? await input.text() : String(init?.body),
              ) as { id: number; method: string; params: [{ to: string; data: Hex }] };

              expect(rpc.method).toBe("eth_call");

              const call = rpc.params[0];
              let result: Hex;

              if (call.to.toLowerCase() === config.registry) {
                const decoded = decodeFunctionData({ abi: registryAbi, data: call.data });

                result =
                  decoded.functionName === "getOwner"
                    ? encodeFunctionResult({
                        abi: registryAbi,
                        functionName: "getOwner",
                        result: (bob.wallets[0] ?? "") as Hex,
                      })
                    : encodeFunctionResult({
                        abi: registryAbi,
                        functionName: "getResolver",
                        result: address,
                      });
              } else if (call.to.toLowerCase() === config.verifiableFactory) {
                result = encodeFunctionResult({
                  abi: factoryAbi,
                  functionName: "verifyContract",
                  result: config.resolverImplementation,
                });
              } else if (call.to.toLowerCase() === config.reverseAdapter) {
                result = encodeFunctionResult({
                  abi: reverseAbi,
                  functionName: "DEFAULT_REVERSE_REGISTRAR",
                  result: contract("e"),
                });
              } else if (call.to.toLowerCase() === contract("e")) {
                result = encodeFunctionResult({
                  abi: defaultReverseAbi,
                  functionName: "nameForAddr",
                  result: primary,
                });
              } else {
                expect(call.to).toBe(address);

                const decoded = decodeFunctionData({ abi: resolverAbi, data: call.data });

                if (decoded.functionName === "roles")
                  result = encodeFunctionResult({
                    abi: resolverAbi,
                    functionName: "roles",
                    result: BigInt(`0x${"1".repeat(64)}`),
                  });
                else {
                  if (decoded.functionName !== "resolve")
                    throw new Error("Expected ENSIP-10 resolution");

                  resolves++;

                  const profile = decodeFunctionData({ abi: profileAbi, data: decoded.args[1] });

                  const value =
                    profile.functionName === "addr"
                      ? encodeFunctionResult({
                          abi: profileAbi,
                          functionName: "addr",
                          result: (bob.wallets[0] ?? "") as Hex,
                        })
                      : encodeFunctionResult({
                          abi: profileAbi,
                          functionName: "text",
                          result: text,
                        });

                  result = encodeFunctionResult({
                    abi: resolverAbi,
                    functionName: "resolve",
                    result: value,
                  });
                }
              }

              return Response.json({ jsonrpc: "2.0", id: rpc.id, result });
            },
          }),
        });

        const ethereum = Layer.effect(
          Ethereum,
          Ethereum.pipe(Effect.map((live) => ({ ...live, publicClient }))),
        ).pipe(Layer.provide(Ethereum.layer), Layer.provide(Layer.succeed(EnsConfig, config)));

        const dependencies = Layer.mergeAll(
          ethereum,
          Layer.mock(Registration, {}),
          Layer.succeed(EnsConfig, config),
          Layer.mock(Hca, {
            verify: () => Effect.succeed(0n),
          }),
        );

        const liveChain = yield* Chain.pipe(
          Effect.provide(
            ChainLive.pipe(
              Layer.provide(dependencies),
              Layer.provide(Layer.mock(TransactionJournal, {})),
            ),
          ),
        );

        const encodedIntent = JSON.stringify(liveChain.typedIntent(gift, prepared.intent));

        expect(JSON.parse(encodedIntent)).toMatchObject({
          message: {
            giftId: gift.id,
            recipient: prepared.intent.recipient,
            deadline: String(prepared.intent.deadline),
          },
        });

        const verify = makeOwnershipVerification.pipe(
          Effect.flatMap((checkOwnership) => checkOwnership(gift, claim)),
          Effect.provide(dependencies),
        );

        yield* verify;
        expect(resolves).toBe(2);
        primary = "wrong.eth";

        const wrongPrimary = yield* verify.pipe(Effect.flip);

        expect(wrongPrimary._tag === "Conflict" && wrongPrimary.code).toBe(
          "PRIMARY_NAME_NOT_CONFIRMED",
        );
        primary = "bobbbb.eth";
        text = "wrong";

        const wrongRecord = yield* verify.pipe(Effect.flip);

        expect(wrongRecord._tag === "Conflict" && wrongRecord.code).toBe("RECORDS_NOT_CONFIRMED");
      }),
  );
});
