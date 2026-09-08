import { Effect, Layer } from "effect";
import { FetchHttpClient, HttpClientRequest } from "effect/unstable/http";
import { HttpApiMiddleware } from "effect/unstable/httpapi";
import { AtomHttpApi } from "effect/unstable/reactivity";

import { Api, Authentication } from "@memento/api";
import { Unauthorized } from "@memento/protocol";

import { apiUrl } from "#/config/chain";

export const authenticatedHttpClient = (getToken: () => Promise<string | null>) =>
  Layer.mergeAll(
    FetchHttpClient.layer,
    Layer.succeed(FetchHttpClient.RequestInit, { credentials: "omit", redirect: "error" }),
    HttpApiMiddleware.layerClient(
      Authentication,
      Effect.fn("Api.authenticate")(function* ({ request, next }) {
        const token = yield* Effect.tryPromise({
          try: getToken,
          catch: () => new Unauthorized({ message: "Please sign in again" }),
        });

        if (!token) return yield* new Unauthorized({ message: "Please sign in" });

        return yield* next(HttpClientRequest.bearerToken(request, token));
      }),
    ),
  );

export class ApiClient extends AtomHttpApi.Service<ApiClient>()("@memento/web/ApiClient", {
  api: Api,
  baseUrl: apiUrl,
  httpClient: authenticatedHttpClient(async () => {
    const { getAccessToken } = await import("@privy-io/react-auth");

    return getAccessToken();
  }),
}) {}
