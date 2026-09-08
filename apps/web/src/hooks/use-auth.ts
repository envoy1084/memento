import { createContext, useContext } from "react";

import type { Actor } from "@memento/protocol";

export const AuthContext = createContext<{
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  actor: Actor | undefined;
  address: string | undefined;
  verifying: boolean;
  error: string | undefined;
  login: (method?: "email" | "wallet") => void;
  logout: () => Promise<void>;
  retry: () => void;
  reconnect: () => void;
}>({
  configured: false,
  ready: false,
  authenticated: false,
  actor: undefined,
  address: undefined,
  verifying: false,
  error: undefined,
  login: () => {},
  logout: async () => {},
  retry: () => {},
  reconnect: () => {},
});

export const useAuth = () => useContext(AuthContext);
