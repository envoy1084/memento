import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/unstable/reactivity";

import { PrivyProvider, useLogin, usePrivy, useWallets } from "@privy-io/react-auth";

import { makeSessionAtom } from "#/atoms/session";
import { privyAppId, privyConfig } from "#/config/privy";
import { AuthContext } from "#/hooks/use-auth";

export default function PrivyAuth({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider appId={privyAppId} config={privyConfig}>
      <LoginState>{children}</LoginState>
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
  const address = ready
    ? wallets.find((wallet) => actor?.wallets.includes(wallet.address.toLowerCase()))?.address
    : undefined;

  return (
    <AuthContext.Provider
      value={{
        ...value,
        actor,
        address,
        retry,
        verifying: Boolean(userId) && (AsyncResult.isInitial(session) || session.waiting || !ready),
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
