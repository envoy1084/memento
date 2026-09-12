import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { RegistryContext } from "@effect/atom-react";

import { EnsforgeProvider } from "@ensforge/react";
import { usePrivy } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";

import { ensforge } from "#/config/ensforge";
import { wagmiConfig } from "#/config/wagmi";

const selectActiveWallet: NonNullable<
  ComponentProps<typeof WagmiProvider>["setActiveWalletForWagmi"]
> = ({ wallets, user }) => {
  if (!user) return undefined;

  const linkedWallets = wallets.filter((wallet) =>
    user.linkedAccounts.some(
      (account) =>
        account.type === "wallet" && account.address.toLowerCase() === wallet.address.toLowerCase(),
    ),
  );
  const current = wagmiConfig.state.current;
  const activeAddress = current
    ? wagmiConfig.state.connections.get(current)?.accounts[0]
    : undefined;

  return (
    linkedWallets.find((wallet) => wallet.address.toLowerCase() === activeAddress?.toLowerCase()) ??
    linkedWallets[0]
  );
};

export function WalletProviders({ children }: { children: ReactNode }) {
  const registry = useContext(RegistryContext);
  const { user, authenticated } = usePrivy();
  const userId = authenticated ? user?.id : undefined;
  const previousUserId = useRef(userId);
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (previousUserId.current !== userId) {
      queryClient.clear();
      previousUserId.current = userId;
    }
  }, [userId, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig} setActiveWalletForWagmi={selectActiveWallet}>
        <EnsforgeProvider sdk={ensforge} registry={registry}>
          {children}
        </EnsforgeProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
