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
  resolverImplementation: DeployedAddress,
  reverseAdapter: DeployedAddress,
});
export type DeploymentContracts = typeof DeploymentContracts.Type;

export const SepoliaDeployment = Schema.Struct({
  chainId: Schema.Literal(11155111),
  ensRevision: Schema.Literal("09bf3ac64a6fb1b215573c019b17e8c501bb3ca0"),
  contracts: DeploymentContracts,
});
