import { Schema } from "effect";

import { Address } from "../common/index.js";

const DeployedAddress = Address.check(Schema.isPattern(/^0x(?!0{40}$)[0-9a-fA-F]{40}$/));

export const DeploymentContracts = Schema.Struct({
  registrar: DeployedAddress,
  registry: DeployedAddress,
  token: DeployedAddress,
  sponsorship: DeployedAddress,
  vault: DeployedAddress,
  hcaFactory: DeployedAddress,
  hcaImplementation: DeployedAddress,
  validator: DeployedAddress,
  verifiableFactory: DeployedAddress,
  proxyLogic: DeployedAddress,
  resolverImplementation: DeployedAddress,
  reverseAdapter: DeployedAddress,
});
export type DeploymentContracts = typeof DeploymentContracts.Type;

export const SepoliaDeployment = Schema.Struct({
  chainId: Schema.Literal(11155111),
  ensRevision: Schema.Literal("6cd019f567c8eb0ca306c78851d4d58876a8e1df"),
  contracts: DeploymentContracts,
});
