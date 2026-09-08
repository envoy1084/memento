import { Effect } from "effect";

import {
  MementoSponsorshipAbi as escrowAbi,
  MementoNameVaultAbi as vaultAbi,
} from "@memento/chain";
import { hcaAbi, factoryAbi, hcaFactoryAbi } from "@memento/chain/abi/ens";
import { sepolia } from "@memento/chain/network";
import { ProviderError } from "@memento/protocol";
import { erc20Abi, parseAbi, type Address } from "viem";

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
    config.vault,
    config.hcaFactory,
    config.hcaImplementation,
    config.validator,
    config.verifiableFactory,
    config.proxyLogic,
    config.resolverImplementation,
    config.reverseAdapter,
  ]) {
    const code = yield* provider("rpc", () => publicClient.getCode({ address }));

    if (!code || code === "0x")
      return yield* fail("A configured contract has no deployed bytecode");
  }

  const decimals = yield* provider("rpc", () =>
    publicClient.readContract({ address: config.token, abi: erc20Abi, functionName: "decimals" }),
  );

  if (decimals !== 6) return yield* fail("Payment token must use six decimals");

  const id = yield* provider("rpc", () =>
    publicClient.readContract({
      address: config.hcaImplementation,
      abi: hcaAbi,
      functionName: "accountId",
    }),
  );

  if (id !== "ens-standalone-hca.1.1.0")
    return yield* fail("Unsupported HCA implementation version");

  const approved = yield* provider("rpc", () =>
    publicClient.readContract({
      address: config.hcaFactory,
      abi: hcaFactoryAbi,
      functionName: "approvedImplementations",
      args: [config.hcaImplementation],
    }),
  );

  if (!approved) return yield* fail("HCA implementation is not factory approved");

  const expectations: readonly [Address, string, Address][] = [
    [config.registrar, "ETH_REGISTRY", config.registry],
    [config.validator, "ETH_REGISTRY", config.registry],
    [config.validator, "PERMITTED_RESOLVER_IMPL", config.resolverImplementation],
    [config.validator, "VERIFIABLE_FACTORY", config.verifiableFactory],
    [config.validator, "VERIFIABLE_PROXY_LOGIC", config.proxyLogic],
    [config.validator, "DEFAULT_REVERSE_REGISTRAR_HCA_ADAPTER", config.reverseAdapter],
    [config.hcaFactory, "VERIFIABLE_FACTORY", config.verifiableFactory],
  ];

  for (const [address, getter, expected] of expectations) {
    const actual = yield* provider("rpc", () =>
      publicClient.readContract({
        address,
        abi: parseAbi([`function ${getter}() view returns (address)`]),
        functionName: getter,
      }),
    );

    if (typeof actual !== "string" || actual.toLowerCase() !== expected.toLowerCase())
      return yield* fail(`Deployment mismatch for ${getter}`);
  }

  const proxyLogic = yield* provider("rpc", () =>
    publicClient.readContract({
      address: config.verifiableFactory,
      abi: factoryAbi,
      functionName: "proxyLogic",
    }),
  );

  const coordinator = yield* provider("rpc", () =>
    publicClient.readContract({
      address: config.sponsorship,
      abi: escrowAbi,
      functionName: "coordinator",
    }),
  );

  const vaultCoordinator = yield* provider("rpc", () =>
    publicClient.readContract({
      address: config.vault,
      abi: vaultAbi,
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

  const factory = yield* provider("rpc", () =>
    publicClient.readContract({
      address: config.sponsorship,
      abi: escrowAbi,
      functionName: "hcaFactory",
    }),
  );

  const registry = yield* provider("rpc", () =>
    publicClient.readContract({
      address: config.sponsorship,
      abi: escrowAbi,
      functionName: "registry",
    }),
  );

  const vaultRegistry = yield* provider("rpc", () =>
    publicClient.readContract({ address: config.vault, abi: vaultAbi, functionName: "registry" }),
  );
  const vaultFactory = yield* provider("rpc", () =>
    publicClient.readContract({ address: config.vault, abi: vaultAbi, functionName: "factory" }),
  );

  const vaultResolver = yield* provider("rpc", () =>
    publicClient.readContract({
      address: config.vault,
      abi: vaultAbi,
      functionName: "resolverImplementation",
    }),
  );

  for (const [actual, expected] of [
    [proxyLogic, config.proxyLogic],
    [coordinator, account.address],
    [vaultCoordinator, account.address],
    [token, config.token],
    [factory, config.hcaFactory],
    [registry, config.registry],
    [vaultRegistry, config.registry],
    [vaultFactory, config.verifiableFactory],
    [vaultResolver, config.resolverImplementation],
  ]) {
    if (actual?.toLowerCase() !== expected?.toLowerCase())
      return yield* fail("Memento contract configuration differs from the server");
  }
});
