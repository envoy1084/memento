import { Config, Console, Effect, Layer, Redacted, Schema } from "effect";

import { Mailer } from "@memento/application";
import { ProviderError } from "@memento/protocol";
import { Resend } from "resend";

export const MailerLive = (apiKey: Redacted.Redacted<string>, from: string) =>
  Layer.sync(Mailer, () => {
    const resend = new Resend(Redacted.value(apiKey));

    return Mailer.of({
      send: Effect.fn("Mailer.send")(function* ({ to, url, idempotencyKey, senderName }) {
        const result = yield* Effect.tryPromise({
          try: () =>
            resend.emails.send(
              {
                from,
                to,
                subject: "You received a Memento ENS gift",
                text: `${senderName ?? "Someone"} sent you an ENS gift. Open your private claim link:\n\n${url}\n\nKeep this link private. Never share wallet passwords or seed phrases.`,
              },
              { idempotencyKey },
            ),

          catch: () =>
            new ProviderError({
              provider: "email",
              retryable: true,
              message: "Email delivery unavailable",
            }),
        });

        if (result.error)
          return yield* new ProviderError({
            provider: "email",
            retryable: [
              "rate_limit_exceeded",
              "internal_server_error",
              "application_error",
            ].includes(result.error.name),
            message: "Email provider rejected delivery",
          });
      }),
    });
  });

// Development emails stay in the local console rather than the telemetry log pipeline.
export const MailerConsole = Layer.succeed(
  Mailer,
  Mailer.of({
    send: Effect.fn("Mailer.console")(function* ({ to, url, senderName }) {
      yield* Console.log({
        to,
        subject: "You received a Memento ENS gift",
        text: `${senderName ?? "Someone"} sent you an ENS gift. Open your private claim link:\n\n${url}`,
      });
    }),
  }),
);

export const MailerConfigured = Layer.unwrap(
  Effect.gen(function* () {
    const environment = yield* Config.schema(
      Schema.Literals(["development", "test", "production"]),
      "NODE_ENV",
    ).pipe(Config.withDefault("development"));
    if (environment !== "production") return MailerConsole;
    const apiKey = yield* Config.redacted("RESEND_API_KEY");
    const from = yield* Config.string("EMAIL_FROM");
    return MailerLive(apiKey, from);
  }),
);
