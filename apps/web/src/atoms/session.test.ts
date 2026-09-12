import { Effect } from "effect";
import { HttpApiClient } from "effect/unstable/httpapi";
import { AtomRegistry } from "effect/unstable/reactivity";

import { Api } from "@memento/api";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { authenticatedHttpClient } from "#/atoms/api";
import { makeSessionAtom } from "#/atoms/session";

const token = vi.hoisted(() => ({ current: "first-token" as string | null }));
vi.mock("@privy-io/react-auth", () => ({ getAccessToken: async () => token.current }));

const actor = {
  userId: "did:privy:alice",
  wallets: ["0x1111111111111111111111111111111111111111"],
  emails: ["alice@example.com"],
};

const transport = vi.fn<typeof fetch>();
beforeEach(() => vi.stubGlobal("fetch", transport));

afterEach(() => {
  vi.unstubAllGlobals();
  transport.mockReset();
  token.current = "first-token";
});

it("gets the current token for each authenticated request and keeps credentials out of URLs", async () => {
  transport.mockImplementation(async () => Response.json(actor));

  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const api = yield* HttpApiClient.make(Api, { baseUrl: "https://api.memento.example" });
      const first = yield* api.session.current();
      token.current = "refreshed-token";
      const second = yield* api.session.current();

      return [first, second];
    }).pipe(Effect.provide(authenticatedHttpClient(async () => token.current))),
  );

  expect(result).toEqual([actor, actor]);
  expect(transport.mock.calls.map(([url]) => String(url))).toEqual([
    "https://api.memento.example/v1/session",
    "https://api.memento.example/v1/session",
  ]);
  expect(
    transport.mock.calls.map(([, init]) => new Headers(init?.headers).get("authorization")),
  ).toEqual(["Bearer first-token", "Bearer refreshed-token"]);
  const headers = new Headers(transport.mock.calls[0]?.[1]?.headers);
  expect(headers.get("b3")).toBeTruthy();
  expect(headers.get("traceparent")).toBeTruthy();
  expect(transport.mock.calls[0]?.[1]).toMatchObject({ credentials: "omit", redirect: "error" });
});

it("does not send a protected request without a token", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const api = yield* HttpApiClient.make(Api, { baseUrl: "https://api.memento.example" });

      return yield* api.session.current();
    }).pipe(Effect.provide(authenticatedHttpClient(async () => null)), Effect.result),
  );

  expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "Unauthorized" } });
  expect(transport).not.toHaveBeenCalled();
});

it("isolates session atoms by account and never treats a signed-out user as authenticated", async () => {
  transport.mockImplementation(async () => Response.json(actor));
  const registry = AtomRegistry.make();

  try {
    const signedIn = await Effect.runPromise(
      AtomRegistry.getResult(registry, makeSessionAtom(actor.userId)),
    );
    expect(signedIn).toEqual(actor);

    const otherAccount = await Effect.runPromise(
      AtomRegistry.getResult(registry, makeSessionAtom("did:privy:bob")).pipe(Effect.result),
    );
    expect(otherAccount).toMatchObject({ _tag: "Failure", failure: { _tag: "Unauthorized" } });

    const calls = transport.mock.calls.length;
    const signedOut = await Effect.runPromise(
      AtomRegistry.getResult(registry, makeSessionAtom(undefined)),
    );
    expect(signedOut).toBeUndefined();
    expect(transport).toHaveBeenCalledTimes(calls);
  } finally {
    registry.dispose();
  }
});

it("propagates expired tokens and rejects malformed session responses", async () => {
  transport
    .mockResolvedValueOnce(
      Response.json({ _tag: "Unauthorized", message: "Expired token" }, { status: 401 }),
    )
    .mockResolvedValueOnce(Response.json({ ...actor, wallets: ["invalid-wallet"] }));

  const registry = AtomRegistry.make();

  try {
    const expired = await Effect.runPromise(
      AtomRegistry.getResult(registry, makeSessionAtom(actor.userId)).pipe(Effect.result),
    );
    expect(expired).toMatchObject({ _tag: "Failure", failure: { _tag: "Unauthorized" } });

    const malformed = await Effect.runPromise(
      AtomRegistry.getResult(registry, makeSessionAtom(actor.userId)).pipe(Effect.result),
    );
    expect(malformed._tag).toBe("Failure");
  } finally {
    registry.dispose();
  }
});
