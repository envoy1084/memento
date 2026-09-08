import { sepolia } from "viem/chains";

export { sepolia };

export const chainConfirmations = 2;
export const rpcProxyPath = "/rpc/sepolia";

export function frontendSepolia(apiUrl: string) {
  const base = new URL(apiUrl);

  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) {
    throw new Error("The API URL must be an HTTP(S) origin without credentials");
  }

  if (base.pathname !== "/" || base.search || base.hash) {
    throw new Error("The API URL must be an origin without a path, query, or fragment");
  }

  return {
    ...sepolia,
    rpcUrls: { default: { http: [new URL(rpcProxyPath, base).href] } },
  };
}
