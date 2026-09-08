import { Context } from "effect";
import { HttpApiMiddleware, HttpApiSecurity } from "effect/unstable/httpapi";

import { type Actor, Unauthorized, ProviderError } from "@memento/protocol";

export class CurrentActor extends Context.Service<CurrentActor, Actor>()(
  "@memento/api/CurrentActor",
) {}

export class Authentication extends HttpApiMiddleware.Service<
  Authentication,
  { provides: CurrentActor }
>()("@memento/api/Authentication", {
  requiredForClient: true,
  security: { bearer: HttpApiSecurity.bearer },
  error: [Unauthorized, ProviderError],
}) {}
