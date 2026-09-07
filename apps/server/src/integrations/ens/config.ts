import { Config, Context, type Effect, Layer, Schema } from "effect";

import { Address } from "@memento/protocol";
const address = (name: string) =>
  Config.schema(Address, name).pipe(Config.map((value) => value as `0x${string}`));
const make = Config.all({
  rpcUrl: Config.redacted("RPC_URL"),
  coordinatorKey: Config.redacted("COORDINATOR_PRIVATE_KEY"),
  rhinestoneKey: Config.redacted("RHINESTONE_API_KEY"),
  registrar: address("ENS_REGISTRAR"),
  registry: address("ENS_REGISTRY"),
  token: address("PAYMENT_TOKEN"),
  sponsorship: address("MEMENTO_SPONSORSHIP"),
  vault: address("MEMENTO_NAME_VAULT"),
  hcaFactory: address("HCA_FACTORY"),
  hcaImplementation: address("HCA_IMPLEMENTATION"),
  validator: address("HCA_VALIDATOR"),
  verifiableFactory: address("VERIFIABLE_FACTORY"),
  proxyLogic: address("PROXY_LOGIC"),
  resolverImplementation: address("PERMISSIONED_RESOLVER_IMPLEMENTATION"),
  reverseAdapter: address("REVERSE_ADAPTER"),
  confirmations: Config.schema(
    Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 64 })),
    "CHAIN_CONFIRMATIONS",
  ).pipe(Config.withDefault(2)),
});
export class EnsConfig extends Context.Service<EnsConfig, Effect.Success<typeof make>>()(
  "@memento/server/EnsConfig",
) {
  static readonly layer = Layer.effect(EnsConfig, make);
}
