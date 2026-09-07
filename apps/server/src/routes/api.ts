import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { Api, Authentication, CurrentActor } from "@memento/api";
import { Application } from "@memento/application";
import { Privy } from "@memento/privy";
import { type ApplicationError, ProviderError } from "@memento/protocol";
const safe = <A, R>(effect: Effect.Effect<A, ApplicationError, R>) =>
  effect.pipe(
    Effect.mapError((error) =>
      error._tag === "DatabaseError"
        ? new ProviderError({
            provider: "database",
            retryable: true,
            message: "Database operation failed",
          })
        : error,
    ),
  );
export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const privy = yield* Privy;
    return Authentication.of({
      bearer: Effect.fn("Http.authenticate")(function* (httpEffect, { credential }) {
        const actor = yield* privy.authenticate(credential);
        return yield* Effect.provideService(httpEffect, CurrentActor, actor);
      }),
    });
  }),
);
const Gifts = HttpApiBuilder.group(
  Api,
  "gifts",
  Effect.fn(function* (handlers) {
    const app = yield* Application;
    return handlers.handleAll({
      list: () => CurrentActor.pipe(Effect.flatMap(app.listGifts), safe),
      prepare: ({ payload }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) => app.createGift(actor, payload)),
          safe,
        ),
      confirm: ({ params, payload }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) => app.confirmGift(actor, params.id, payload.transactionHash)),
          safe,
        ),
      email: ({ params, payload }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) => app.emailGift(actor, params.id, payload.to)),
          safe,
        ),
      refund: ({ params }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) => app.refundGift(actor, params.id)),
          safe,
        ),
      prepareCampaign: ({ payload }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) => app.createCampaign(actor, payload)),
          safe,
        ),
      confirmCampaign: ({ params, payload }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) => app.confirmCampaign(actor, params.id, payload.transactionHash)),
          safe,
        ),
      invitations: ({ params }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) => app.invitations(actor, params.id)),
          safe,
        ),
      refundCampaign: ({ params }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) => app.refundCampaign(actor, params.id)),
          safe,
        ),
    });
  }),
);
const Claims = HttpApiBuilder.group(
  Api,
  "claims",
  Effect.fn(function* (handlers) {
    const app = yield* Application;
    return handlers.handleAll({
      prepare: ({ params, payload }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) => app.prepareClaim(actor, params.id, payload)),
          safe,
        ),
      get: ({ params }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) => app.getClaim(actor, params.id)),
          safe,
        ),
      authorize: ({ params, payload }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) =>
            app.authorizeClaim(actor, params.id, payload.signature, payload.sessionAuthorization),
          ),
          safe,
        ),
      retry: ({ params }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) => app.retryClaim(actor, params.id)),
          safe,
        ),
      worldRequest: ({ params }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) => app.worldRequest(actor, params.id)),
          safe,
        ),
      worldVerify: ({ params, payload }) =>
        CurrentActor.pipe(
          Effect.flatMap((actor) => app.verifyWorld(actor, params.id, payload.proof)),
          safe,
        ),
    });
  }),
);
const Public = HttpApiBuilder.group(
  Api,
  "public",
  Effect.fn(function* (handlers) {
    const app = yield* Application;
    return handlers.handleAll({
      open: ({ params, payload }) => safe(app.openGift(params.id, payload.secret)),
      quote: ({ params, query }) => safe(app.quote(params.label, query.duration)),
    });
  }),
);
const Health = HttpApiBuilder.group(Api, "system", (handlers) =>
  handlers.handle("health", () => Effect.succeed({ status: "ok" as const })),
);
export const ApiHandlers = Layer.mergeAll(Gifts, Claims, Public, Health).pipe(
  Layer.provideMerge(AuthenticationLive),
);
export const ApiRoutes = HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
  Layer.provide([Gifts, Claims, Public, Health]),
  Layer.provide(AuthenticationLive),
);
