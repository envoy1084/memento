import { Config, ConfigProvider, Effect } from "effect";

import type { PrivyClientConfig } from "@privy-io/react-auth";

import { chain } from "#/config/chain";

export const privyAppId = Effect.runSync(
  Config.string("VITE_PRIVY_APP_ID")
    .pipe(Config.withDefault(""))
    .parse(ConfigProvider.fromUnknown(import.meta.env)),
).trim();

export const privyConfig = {
  loginMethods: ["email", "wallet"],
  appearance: {
    theme: "light",
    accentColor: "#9D79D6",
    logo: "/brand/memento-souvenir.svg",
    landingHeader: "A good place to begin",
    walletChainType: "ethereum-only",
  },
  defaultChain: chain,
  supportedChains: [chain],
  embeddedWallets: { showWalletUIs: false, ethereum: { createOnLogin: "users-without-wallets" } },
} satisfies PrivyClientConfig;
