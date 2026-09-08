import { Config, ConfigProvider, Effect } from "effect";

import { frontendSepolia } from "@memento/chain/network";
import { createPublicClient, http } from "viem";

const apiOrigin = Config.string("VITE_API_URL").pipe(
  Config.withDefault(
    import.meta.env.DEV ? "http://localhost:3001" : "https://api.memento.envoy1084.xyz",
  ),
);

export const apiUrl = Effect.runSync(apiOrigin.parse(ConfigProvider.fromUnknown(import.meta.env)));

export const chain = frontendSepolia(apiUrl);

// Reuse this client and chain in wallet providers and real-data atoms; never fall back to a public RPC.
export const publicClient = createPublicClient({
  chain,
  transport: http(chain.rpcUrls.default.http[0], { retryCount: 1, timeout: 20000 }),
});
