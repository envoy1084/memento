import { Config, Context, Effect, Layer, Schema } from "effect";

import { sepoliaDeployment } from "@memento/chain/deployments/sepolia";
import { chainConfirmations } from "@memento/chain/network";
import { ProviderError, SepoliaDeployment } from "@memento/protocol";

export const configuredDeployment = Effect.fn("EnsConfig.deployment")(function* (
  manifest: unknown,
) {
  const deployment = yield* Schema.decodeUnknownEffect(SepoliaDeployment)(manifest).pipe(
    Effect.mapError(
      () =>
        new ProviderError({
          provider: "deployment",
          retryable: false,
          message:
            "Configure verified Sepolia addresses in packages/chain/src/deployments/sepolia.json",
        }),
    ),
  );

  for (const [key, expected] of Object.entries(sepoliaDeployment.contracts)) {
    if (key === "sponsorship" || key === "vault" || expected === null) continue;
    const actual = deployment.contracts[key as keyof typeof deployment.contracts];
    if (actual.toLowerCase() !== expected.toLowerCase())
      return yield* new ProviderError({
        provider: "deployment",
        retryable: false,
        message:
          "ENS addresses must match the ENSForge profile in packages/chain/src/deployments/sepolia.json",
      });
  }

  // The shared schema has checked every nonzero address before applying viem's template type.
  return deployment.contracts as {
    readonly [K in keyof typeof deployment.contracts]: `0x${string}`;
  };
});

const make = Effect.gen(function* () {
  const deployment = yield* configuredDeployment(sepoliaDeployment);
  const secrets = yield* Config.all({
    rpcUrl: Config.redacted("RPC_URL"),
    coordinatorKey: Config.redacted("COORDINATOR_PRIVATE_KEY"),
    rhinestoneKey: Config.redacted("RHINESTONE_API_KEY"),
  });

  return { ...deployment, ...secrets, confirmations: chainConfirmations };
});

export class EnsConfig extends Context.Service<EnsConfig, Effect.Success<typeof make>>()(
  "@memento/server/EnsConfig",
) {
  static readonly layer = Layer.effect(EnsConfig, make);
}
