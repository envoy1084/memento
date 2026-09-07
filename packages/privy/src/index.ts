import { Context, Effect, Layer, Redacted, Schema } from "effect";

import { Actor, Unauthorized, ProviderError } from "@memento/protocol";
import { PrivyClient } from "@privy-io/node";

export class Privy extends Context.Service<
  Privy,
  {
    readonly authenticate: (
      token: Redacted.Redacted<string>,
    ) => Effect.Effect<Actor, Unauthorized | ProviderError>;
  }
>()("@memento/privy/Privy") {
  static live(config: { appId: string; appSecret: Redacted.Redacted<string> }) {
    return Layer.sync(Privy, () => {
      const client = new PrivyClient({
        appId: config.appId,
        appSecret: Redacted.value(config.appSecret),
        timeout: 10_000,
        maxRetries: 1,
      });
      return Privy.of({
        authenticate: Effect.fn("Privy.authenticate")(function* (token) {
          const session = yield* Effect.tryPromise({
            try: () => client.utils().auth().verifyAccessToken(Redacted.value(token)),
            catch: () => new Unauthorized({ message: "Invalid or expired access token" }),
          });
          const user = yield* Effect.tryPromise({
            // The SDK's documented user-ID lookup is named _get.
            // eslint-disable-next-line no-underscore-dangle
            try: () => client.users()._get(session.user_id),
            catch: () =>
              new ProviderError({
                provider: "privy",
                retryable: true,
                message: "Unable to retrieve verified user accounts",
              }),
          });
          return yield* Schema.decodeUnknownEffect(Actor)({
            userId: user.id,
            wallets: user.linked_accounts.flatMap((account) =>
              account.type === "wallet" && account.chain_type === "ethereum" && account.verified_at
                ? [account.address.toLowerCase()]
                : [],
            ),
            emails: user.linked_accounts.flatMap((account) =>
              account.type === "email" && account.verified_at
                ? [account.address.trim().toLowerCase()]
                : [],
            ),
          }).pipe(
            Effect.mapError(() => new Unauthorized({ message: "Invalid verified user profile" })),
          );
        }),
      });
    });
  }
}
