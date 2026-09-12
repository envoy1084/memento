import { frontendSepolia } from "@memento/chain/network";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("keeps Sepolia metadata while replacing its RPC URL with the application's proxy", () => {
  const chain = frontendSepolia("https://api.memento.example/");

  expect(chain.id).toBe(11155111);
  expect(chain.rpcUrls.default.http).toEqual(["https://api.memento.example/rpc/sepolia"]);
  expect(chain.nativeCurrency.symbol).toBe("ETH");

  for (const origin of [
    "https://secret@example.com",
    "https://example.com/rpc",
    "https://example.com?key=secret",
    "file:///tmp/rpc",
  ]) {
    expect(() => frontendSepolia(origin)).toThrow();
  }
});

it("sends frontend RPC requests only through the configured API origin", async () => {
  vi.stubEnv("VITE_API_URL", "https://api.memento.example");
  const upstream = vi.fn<typeof fetch>(async (_url, options) => {
    const request = JSON.parse(String(options?.body));

    return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: "0xaa36a7" }), {
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", upstream);

  const { publicClient } = await import("#/config/chain");

  expect(await publicClient.getChainId()).toBe(11155111);
  expect(String(upstream.mock.calls[0]?.[0])).toBe("https://api.memento.example/rpc/sepolia");
});

it("routes ENSForge's wagmi public client through the same proxy without a connected wallet", async () => {
  vi.stubEnv("VITE_API_URL", "https://api.memento.example");
  const upstream = vi.fn<typeof fetch>(async (_url, options) => {
    const request = JSON.parse(String(options?.body));

    return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: "0xaa36a7" }), {
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", upstream);

  const { wagmiConfig } = await import("#/config/wagmi");
  const { createWagmiConfig } = await import("@ensforge/core/wagmi");
  const config = createWagmiConfig({ network: "sepolia", wagmiConfig });

  expect(wagmiConfig.state.status).toBe("disconnected");
  expect(await config.publicClient.getChainId()).toBe(11155111);
  expect(String(upstream.mock.calls[0]?.[0])).toBe("https://api.memento.example/rpc/sepolia");
});
