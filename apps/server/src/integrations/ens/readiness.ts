import { Effect } from "effect";

import { MementoSponsorshipAbi as escrowAbi, MementoRegistrationAbi } from "@memento/chain";
import { sepolia } from "@memento/chain/network";
import { ProviderError } from "@memento/protocol";
import { erc20Abi } from "viem";

import { Ethereum, provider } from "./client.js";
import { EnsConfig } from "./config.js";

const fail = (message: string) =>
  new ProviderError({ provider: "deployment", retryable: false, message });

export const checkDeployment = Effect.gen(function* () {
  const config = yield* EnsConfig;
  const { publicClient, account } = yield* Ethereum;

  if ((yield* provider("rpc", () => publicClient.getChainId())) !== sepolia.id)
    return yield* fail("RPC must use the configured Sepolia chain");

  for (const address of [
    config.registrar,
    config.registry,
    config.token,
    config.sponsorship,
    config.verifiableFactory,
    config.resolverImplementation,
  ]) {
    const code = yield* provider("rpc", () => publicClient.getCode({ address }));

    if (!code || code === "0x")
      return yield* fail("A configured contract has no deployed bytecode");
  }

  const decimals = yield* provider("rpc", () =>
    publicClient.readContract({ address: config.token, abi: erc20Abi, functionName: "decimals" }),
  );

  if (decimals !== 6) return yield* fail("Payment token must use six decimals");

  for (const [functionName, expected] of [
    ["REGISTRAR", config.registrar],
    ["RESOLVER_FACTORY", config.verifiableFactory],
    ["RESOLVER_IMPLEMENTATION", config.resolverImplementation],
  ] as const) {
    const actual = yield* provider("deployment", () =>
      publicClient.readContract({
        address: config.sponsorship,
        abi: MementoRegistrationAbi,
        functionName,
      }),
    );
    if (actual.toLowerCase() !== expected.toLowerCase())
      return yield* fail("Direct registration configuration differs from the server");
  }

  const coordinator = yield* provider("rpc", () =>
    publicClient.readContract({
      address: config.sponsorship,
      abi: escrowAbi,
      functionName: "coordinator",
    }),
  );

  const token = yield* provider("rpc", () =>
    publicClient.readContract({
      address: config.sponsorship,
      abi: escrowAbi,
      functionName: "paymentToken",
    }),
  );

  const registry = yield* provider("rpc", () =>
    publicClient.readContract({
      address: config.sponsorship,
      abi: escrowAbi,
      functionName: "registry",
    }),
  );

  for (const [actual, expected] of [
    [coordinator, account.address],
    [token, config.token],
    [registry, config.registry],
  ]) {
    if (actual?.toLowerCase() !== expected?.toLowerCase())
      return yield* fail("Memento contract configuration differs from the server");
  }
});
