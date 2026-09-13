import { Layer, Schema } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";

import { Application } from "@memento/application";
import { RepositoriesLive } from "@memento/database";
import { TestDatabase } from "@memento/database/testing";
import { expect, it } from "vitest";

import { HttpPolicy } from "../../src/layers/http.js";
import { ApiRoutes } from "../../src/routes/api.js";
import { Providers, alice, bob, digest } from "../fixtures/providers.js";

const origin = "https://memento.envoy1084.xyz";

const routes = Layer.mergeAll(ApiRoutes, HttpPolicy(origin)).pipe(
  Layer.provide(HttpServer.layerServices),
  Layer.provide(
    Application.layer.pipe(
      Layer.provideMerge(
        Layer.mergeAll(Providers, RepositoriesLive.pipe(Layer.provideMerge(TestDatabase.layer))),
      ),
    ),
  ),
);

const request = (path: string, token?: string, body?: unknown) =>
  new Request(`http://localhost${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      origin,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

it("serves noncacheable errors, validates CORS and bounds request bodies and rates", async () => {
  const web = HttpRouter.toWebHandler(routes, { disableLogger: true });

  try {
    const unauthorized = await web.handler(request("/v1/gifts"));

    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("cache-control")).toBe("no-store");
    expect(unauthorized.headers.get("referrer-policy")).toBe("no-referrer");

    const ready = await web.handler(request("/health/ready"));

    expect(ready.status).toBe(200);
    expect(ready.headers.get("access-control-allow-origin")).toBe(origin);

    const foreign = await web.handler(
      new Request("http://localhost/health/live", {
        headers: { origin: "https://untrusted.example" },
      }),
    );

    expect(foreign.headers.get("access-control-allow-origin")).not.toBe(
      "https://untrusted.example",
    );

    const oversized = await web.handler(
      request(`/v1/mementos/${digest}/open`, undefined, { secret: "x".repeat(131073) }),
    );

    expect(oversized.status).toBeGreaterThanOrEqual(400);
    expect(oversized.headers.get("cache-control")).toBe("no-store");

    const responses = await Promise.all(
      Array.from({ length: 181 }, () => web.handler(request("/health/live"))),
    );

    expect(
      responses.some(
        (response) => response.status === 429 && response.headers.get("retry-after") === "60",
      ),
    ).toBe(true);
  } finally {
    await web.dispose();
  }
});

it("streams the authenticated claim status and confirms sponsor refunds", async () => {
  const web = HttpRouter.toWebHandler(routes, { disableLogger: true });

  try {
    const prepared = await web.handler(
      request("/v1/gifts/prepare", "alice", {
        sponsorWallet: alice.wallets[0],
        recipient: { kind: "email", value: "bob@example.test" },
        recipientName: "Bob",
        senderName: " Alice ",
        policy: {
          maxPrice: "1000",
          expiresAt: Math.floor(Date.now() / 1000) + 86400,
          duration: 31536000,
          minLength: 3,
          maxLength: 63,
        },
        message: "Hello",
        theme: "moon",
      }),
    );

    expect(prepared.status).toBe(200);

    const plan = Schema.decodeUnknownSync(Schema.Struct({ id: Schema.String }))(
      await prepared.json(),
    );
    const funded = await web.handler(
      request(`/v1/gifts/${plan.id}/confirm`, "alice", { transactionHash: digest }),
    );
    const link = Schema.decodeUnknownSync(Schema.Struct({ url: Schema.String }))(
      await funded.json(),
    );

    const claimed = await web.handler(
      request(`/v1/gifts/${plan.id}/claims`, "bob", {
        secret: new URL(link.url).hash.slice(1),
        recipientWallet: bob.wallets[0],
        label: "bobbbb",
      }),
    );

    expect(claimed.status).toBe(200);

    const claim = Schema.decodeUnknownSync(Schema.Struct({ id: Schema.String }))(
      await claimed.json(),
    );
    const unauthorized = await web.handler(request(`/v1/claims/${claim.id}/events`, "carol"));

    expect(unauthorized.status).toBe(403);

    const stream = await web.handler(request(`/v1/claims/${claim.id}/events`, "bob"));

    expect(stream.headers.get("content-type")).toContain("text/event-stream");

    if (!stream.body) throw new Error("Missing event stream body");

    const reader = stream.body.getReader();

    try {
      const first = await reader.read();
      const event = new TextDecoder().decode(first.value);

      expect(event).toContain("event: claim\ndata: ");
      expect(event).toContain('"state":"prepared"');
      expect(event).not.toContain("Ciphertext");
    } finally {
      await reader.cancel();
    }

    const denied = await web.handler(
      request(`/v1/gifts/${plan.id}/refund/confirm`, "carol", { transactionHash: digest }),
    );

    expect(denied.status).toBe(403);

    const refund = await web.handler(
      request(`/v1/gifts/${plan.id}/refund/confirm`, "alice", { transactionHash: digest }),
    );

    expect(refund.status).toBe(200);

    const state = Schema.decodeUnknownSync(Schema.Struct({ state: Schema.String }))(
      await (await web.handler(request(`/v1/claims/${claim.id}`, "bob"))).json(),
    );

    expect(state.state).toBe("refunded");
  } finally {
    await web.dispose();
  }
});

it("returns only the verified actor and rejects missing or invalid session tokens", async () => {
  const web = HttpRouter.toWebHandler(routes, { disableLogger: true });

  try {
    const denied = await Promise.all(
      [undefined, "invalid"].map((token) => web.handler(request("/v1/session", token))),
    );

    for (const response of denied) {
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }

    const response = await web.handler(request("/v1/session", "alice"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(alice);

    const preflight = await web.handler(
      new Request("http://localhost/v1/session", {
        method: "OPTIONS",
        headers: {
          origin,
          "access-control-request-method": "GET",
          "access-control-request-headers": "authorization,b3,traceparent",
        },
      }),
    );

    expect(preflight.headers.get("access-control-allow-origin")).toBe(origin);
    expect(preflight.status).toBe(204);
    const allowedHeaders = preflight.headers.get("access-control-allow-headers")?.split(",");
    expect(allowedHeaders).toEqual(expect.arrayContaining(["authorization", "b3", "traceparent"]));
  } finally {
    await web.dispose();
  }
});
