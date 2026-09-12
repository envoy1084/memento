import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";

import { chain } from "#/config/chain";

export const wagmiConfig = createConfig({
  chains: [chain],
  transports: {
    [chain.id]: http(chain.rpcUrls.default.http[0], { retryCount: 1, timeout: 20000 }),
  },
  storage: null,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
