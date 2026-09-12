import { Effect } from "effect";

import {
  MementoSponsorshipAbi as escrowAbi,
  MementoNameVaultAbi as vaultAbi,
} from "@memento/chain";
import { sepolia } from "@memento/chain/network";
import { ProviderError } from "@memento/protocol";
import { erc20Abi } from "viem";

import { Ethereum, ensRequest, provider } from "./client.js";
import { EnsConfig } from "./config.js";

const fail = (message: string) =>
  new ProviderError({ provider: "deployment", retryable: false, message });

export const checkDeployment = Effect.gen(function* () {
  const config = yield* EnsConfig;
  const { publicClient, account, ensforge } = yield* Ethereum;

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

  const hca = yield* ensRequest(ensforge.hca.predictHcaAddress.effect({ owner: account.address }));
  yield* ensRequest(
    ensforge.hca.verifyHca.effect({ hca, expectedOwner: account.address, allowUndeployed: true }),
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
