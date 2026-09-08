import { Effect, Layer, Redacted } from "effect";
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/unstable/http";

import { ProviderError, type RpcRequest } from "@memento/protocol";
import { expect, it, vi } from "vitest";

import { SepoliaRpc } from "../../src/integrations/ens/rpc.js";
import { HttpPolicy } from "../../src/layers/http.js";
import { RpcRoutes } from "../../src/routes/rpc/index.js";

const origin = "http://localhost:3000";
const payload = (id: string | number = 1, method = "eth_chainId") => ({
  jsonrpc: "2.0",
  id,
  method,
  params: [],
});
const request = (body: unknown) =>
  new Request("http://localhost/rpc/sepolia", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });

it("preserves RPC IDs and batch results while rejecting unsupported methods before forwarding", async () => {
  const execute = vi.fn((input: RpcRequest) =>
    Effect.succeed({ jsonrpc: "2.0" as const, id: input.id, result: "0xaa36a7" }),
  );
  const web = HttpRouter.toWebHandler(
    Layer.mergeAll(RpcRoutes, HttpPolicy(origin)).pipe(
      Layer.provide(Layer.succeed(SepoliaRpc, { execute })),
      Layer.provide(HttpServer.layerServices),
    ),
  );

  try {
    const result = await web.handler(
      request([payload("a"), payload(2, "debug_traceTransaction"), payload(3)]),
    );

    expect(result.headers.get("access-control-allow-origin")).toBe(origin);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(await result.json()).toEqual([
      { jsonrpc: "2.0", id: "a", result: "0xaa36a7" },
      { jsonrpc: "2.0", id: 2, error: { code: -32601, message: "RPC method is not available" } },
      { jsonrpc: "2.0", id: 3, result: "0xaa36a7" },
    ]);
    expect(execute).toHaveBeenCalledTimes(2);

    await Promise.all(
      [[], Array.from({ length: 21 }, () => payload()), { method: "eth_chainId" }].map(
        async (body) => {
          const response = await web.handler(request(body));

          expect(await response.json()).toMatchObject({ error: { code: -32600 } });
        },
      ),
    );

    await Promise.all(
      [
        { ...payload(4, "eth_call"), params: [{}, "latest", {}] },
        { ...payload(5, "eth_feeHistory"), params: ["0xffff", "latest", []] },
        payload(6, "eth_sendTransaction"),
      ].map(async (body) => {
        const response = await web.handler(request(body));

        expect(await response.json()).toHaveProperty("error");
      }),
    );

    expect(execute).toHaveBeenCalledTimes(2);

    const malformed = await web.handler(
      new Request("http://localhost/rpc/sepolia", {
        method: "POST",
        body: "{",
        headers: { "content-type": "application/json" },
      }),
    );

    expect(await malformed.json()).toMatchObject({ error: { code: -32700 } });

    const oversized = await web.handler(request({ ...payload(), params: ["x".repeat(131073)] }));

    expect(await oversized.json()).toHaveProperty("error");
    expect(execute).toHaveBeenCalledTimes(2);
  } finally {
    await web.dispose();
  }
});

it("forwards only RPC payloads to the configured upstream and sanitizes provider failures", async () => {
  const upstream = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: 3,
          message: "reverted via https://eth-sepolia.g.alchemy.com/v2/private-key",
          data: "0xdeadbeef",
        },
      }),
    ),
  );
  const web = HttpRouter.toWebHandler(
    Layer.mergeAll(RpcRoutes, HttpPolicy(origin)).pipe(
      Layer.provide(
        SepoliaRpc.live(Redacted.make("https://eth-sepolia.g.alchemy.com/v2/test-only-key")),
      ),
      Layer.provide(Layer.succeed(FetchHttpClient.Fetch, upstream)),
      Layer.provide(HttpServer.layerServices),
    ),
  );

  try {
    const browserRequest = request(payload());
    browserRequest.headers.set("authorization", "Bearer test-user-token");

    const response = await web.handler(browserRequest);

    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      id: 1,
      error: { code: 3, message: "Execution reverted", data: "0xdeadbeef" },
    });
    expect(String(upstream.mock.calls[0]?.[0])).toBe(
      "https://eth-sepolia.g.alchemy.com/v2/test-only-key",
    );
    expect(upstream.mock.calls[0]?.[1]?.headers).not.toHaveProperty("authorization");
    expect(upstream.mock.calls[0]?.[1]?.redirect).toBe("error");

    upstream.mockResolvedValueOnce(new Response("private provider details", { status: 429 }));

    const unavailable = await web.handler(request(payload(2)));

    expect(await unavailable.json()).toEqual({
      jsonrpc: "2.0",
      id: 2,
      error: { code: -32002, message: "Sepolia RPC is unavailable" },
    });

    upstream.mockResolvedValueOnce(
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 999, result: "0x1" })),
    );

    expect(await (await web.handler(request(payload(3)))).json()).toMatchObject({
      error: { code: -32002 },
    });

    upstream.mockResolvedValueOnce(
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 4, result: "x".repeat(2 * 1024 * 1024) })),
    );

    expect(await (await web.handler(request(payload(4)))).json()).toMatchObject({
      error: { code: -32002 },
    });
  } finally {
    await web.dispose();
  }
});

it("does not expose service error details", async () => {
  const web = HttpRouter.toWebHandler(
    RpcRoutes.pipe(
      Layer.provide(
        Layer.succeed(SepoliaRpc, {
          execute: () =>
            Effect.fail(
              new ProviderError({
                provider: "rpc",
                retryable: true,
                message: "secret upstream URL",
              }),
            ),
        }),
      ),
      Layer.provide(HttpServer.layerServices),
    ),
  );

  try {
    const response = await web.handler(request(payload()));

    expect(await response.text()).not.toContain("secret upstream URL");
  } finally {
    await web.dispose();
  }
});
