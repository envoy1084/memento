import { createMemoryWorkflowStorage } from "@ensforge/core/storage";
import { createEnsforge } from "@ensforge/sdk/wagmi";

import { wagmiConfig } from "#/config/wagmi";

export const ensforge = createEnsforge({
  network: "sepolia",
  wagmiConfig,
  storage: createMemoryWorkflowStorage(),
});
