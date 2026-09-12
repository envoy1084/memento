import { Schema } from "effect";

import { Address } from "../common/index.js";

const DeployedAddress = Address.check(Schema.isPattern(/^0x(?!0{40}$)[0-9a-fA-F]{40}$/));

export const DeploymentContracts = Schema.Struct({
  registrar: DeployedAddress,
  registry: DeployedAddress,
  token: DeployedAddress,
  sponsorship: DeployedAddress,
  verifiableFactory: DeployedAddress,
  resolverImplementation: DeployedAddress,
});
export type DeploymentContracts = typeof DeploymentContracts.Type;

export const SepoliaDeployment = Schema.Struct({
  chainId: Schema.Literal(11155111),
  ensRevision: Schema.Literal("d0c902eeb388c7fbde3f95d9eaf6076eeedff1d7"),
  contracts: DeploymentContracts,
});
