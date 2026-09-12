import { readFile, writeFile } from "node:fs/promises";

import { sepoliaHcaDeployment as profile } from "@ensforge/contracts/deployments";

const path = new URL("../src/deployments/sepolia.json", import.meta.url);
const saved = JSON.parse(await readFile(path, "utf8"));
const deployment = profile.deployment;
const manifest = {
  chainId: deployment.chainId,
  ensRevision: profile.generation.sourceCommit,
  contracts: {
    registrar: deployment.contracts.ethRegistrar,
    registry: deployment.contracts.ethRegistry,
    token: profile.infrastructure.paymentToken,
    sponsorship: saved.contracts.sponsorship,
    vault: saved.contracts.vault,
    hcaFactory: profile.contracts.standaloneFactory,
    hcaImplementation: profile.contracts.standaloneImplementation,
    validator: profile.contracts.ownerAndSessionValidator,
    verifiableFactory: deployment.contracts.verifiableFactory,
    resolverImplementation: deployment.implementations.permissionedResolver,
    reverseAdapter: deployment.contracts.defaultReverseRegistrarAdapter,
  },
};
const output = `${JSON.stringify(manifest, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (output !== (await readFile(path, "utf8")))
    throw new Error("Run node scripts/sync-ens-deployment.mjs in packages/chain");
} else await writeFile(path, output);
