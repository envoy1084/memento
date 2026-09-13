import { Config, Effect, Layer, Schema } from "effect";

import { Mailer } from "@memento/application";
import { EmailService } from "@memento/emails";

export const MailerConfigured = Layer.effect(
  Mailer,
  Effect.gen(function* () {
    const emails = yield* EmailService;
    return Mailer.of({ send: emails.send });
  }),
).pipe(
  Layer.provide(
    Layer.unwrap(
      Effect.gen(function* () {
        const environment = yield* Config.schema(
          Schema.Literals(["development", "test", "production"]),
          "NODE_ENV",
        ).pipe(Config.withDefault("development"));
        return environment === "production" ? EmailService.layer : EmailService.devLayer;
      }),
    ),
  ),
);
