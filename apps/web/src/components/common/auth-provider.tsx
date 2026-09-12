import { lazy, Suspense, type ReactNode } from "react";

import { privyAppId } from "#/config/privy";

const PrivyAuth = lazy(() => import("#/components/common/privy-auth"));

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!privyAppId) return children;

  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-sm text-ink-soft">
          Loading Memento…
        </p>
      }
    >
      <PrivyAuth>{children}</PrivyAuth>
    </Suspense>
  );
}
