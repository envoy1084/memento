import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/unstable/reactivity";

import { PrivyProvider, useLogin, usePrivy, useWallets } from "@privy-io/react-auth";
import { useConnection } from "wagmi";

import { makeSessionAtom } from "#/atoms/session";
import { WalletProviders } from "#/components/common/wallet-providers";
import { privyAppId, privyConfig } from "#/config/privy";
import { AuthContext } from "#/hooks/use-auth";

export default function PrivyAuth({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider appId={privyAppId} config={privyConfig}>
      <WalletProviders>
        <LoginState>{children}</LoginState>
      </WalletProviders>
    </PrivyProvider>
  );
}

function LoginState({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout, linkWallet } = usePrivy();
  const [error, setError] = useState<string>();
  const { login } = useLogin({
    onComplete: () => setError(undefined),
    onError: () => setError("Sign-in wasn’t completed. Please try again."),
  });

  const value = {
    configured: true,
    ready,
    authenticated,
    actor: undefined,
    address: undefined,
    verifying: false,
    error,
    login: (method?: "email" | "wallet") => {
      setError(undefined);
      if (ready && !authenticated) login({ loginMethods: method ? [method] : ["email", "wallet"] });
    },
    logout: async () => {
      try {
        await logout();
        setError(undefined);
      } catch {
        setError("Sign-out failed. Please try again.");
      }
    },
    retry: () => {},
    reconnect: () => linkWallet(),
  };

  return (
    <VerifiedSession userId={ready && authenticated ? user?.id : undefined} value={value}>
      {children}
    </VerifiedSession>
  );
}

function VerifiedSession({
  userId,
  value,
  children,
}: {
  userId: string | undefined;
  value: React.ContextType<typeof AuthContext>;
  children: ReactNode;
}) {
  const sessionAtom = useMemo(() => makeSessionAtom(userId), [userId]);
  const session = useAtomValue(sessionAtom);
  const retry = useAtomRefresh(sessionAtom);
  const { wallets, ready } = useWallets();
  const connection = useConnection();
  const walletAddresses = wallets
    .map((wallet) => wallet.address.toLowerCase())
    .toSorted()
    .join(",");

  // Embedded wallet creation or an external reconnection may finish after the first profile lookup.
  useEffect(() => {
    if (userId && ready) retry();
  }, [userId, ready, walletAddresses, retry]);

  const actor =
    userId && AsyncResult.isSuccess(session) && !session.waiting ? session.value : undefined;
  const activeAddress = connection.address;
  const address =
    ready &&
    connection.isConnected &&
    activeAddress &&
    actor?.wallets.includes(activeAddress.toLowerCase()) &&
    wallets.some((wallet) => wallet.address.toLowerCase() === activeAddress.toLowerCase())
      ? activeAddress
      : undefined;

  return (
    <AuthContext.Provider
      value={{
        ...value,
        actor,
        address,
        retry,
        verifying:
          Boolean(userId) &&
          (AsyncResult.isInitial(session) ||
            session.waiting ||
            !ready ||
            connection.isConnecting ||
            connection.isReconnecting),
        error:
          value.error ??
          (userId && AsyncResult.isFailure(session)
            ? "We couldn’t verify your Memento session. Retry, or sign out and reconnect."
            : undefined),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
