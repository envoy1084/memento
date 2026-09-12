import { Effect } from "effect";

import { sepoliaDeployment } from "@memento/chain/deployments/sepolia";
import { expect, it } from "vitest";

import { configuredDeployment } from "../../src/integrations/ens/config.js";

const address = `0x${"12".repeat(20)}`;
const configured = {
  ...sepoliaDeployment,
  contracts: { ...sepoliaDeployment.contracts, sponsorship: address },
};

it("decodes public deployment settings and rejects missing, zero, wrong-chain and wrong-revision values", async () => {
  expect(await Effect.runPromise(configuredDeployment(configured))).toEqual(configured.contracts);

  await Promise.all(
    [
      { ...configured, contracts: { ...configured.contracts, registry: null } },
      { ...configured, contracts: { ...configured.contracts, registry: `0x${"00".repeat(20)}` } },
      { ...configured, chainId: 1 },
      { ...configured, ensRevision: "unverified" },
      { ...configured, contracts: { ...configured.contracts, registrar: address } },
    ].map(async (manifest) => {
      const result = await Effect.runPromise(configuredDeployment(manifest).pipe(Effect.flip));

      expect(result.provider).toBe("deployment");
      expect(result.retryable).toBe(false);
      expect(result.message).toContain("packages/chain/src/deployments/sepolia.json");
    }),
  );
});
