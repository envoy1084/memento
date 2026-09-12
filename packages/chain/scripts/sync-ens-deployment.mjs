import { readFile, writeFile } from "node:fs/promises";

import { sepoliaV2Deployment as deployment } from "@ensforge/contracts/deployments";

const path = new URL("../src/deployments/sepolia.json", import.meta.url);
const saved = JSON.parse(await readFile(path, "utf8"));
const manifest = {
  chainId: deployment.chainId,
  ensRevision: deployment.provenance.commit,
  contracts: {
    registrar: deployment.contracts.ethRegistrar,
    registry: deployment.contracts.ethRegistry,
    token: saved.contracts.token,
    sponsorship: saved.contracts.sponsorship,
    verifiableFactory: deployment.contracts.verifiableFactory,
    resolverImplementation: deployment.implementations.permissionedResolver,
  },
};
const output = `${JSON.stringify(manifest, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (output !== (await readFile(path, "utf8")))
    throw new Error("Run node scripts/sync-ens-deployment.mjs in packages/chain");
} else await writeFile(path, output);
