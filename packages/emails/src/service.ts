import { Config, Console, Context, Effect, Layer, Redacted, Ref } from "effect";

import { type GiftEmail, ProviderError } from "@memento/protocol";
import { Resend } from "resend";

import { renderGiftEmail } from "./render.js";

export class TestEmails extends Context.Service<
  TestEmails,
  {
    readonly sent: Effect.Effect<ReadonlyArray<GiftEmail>>;
    readonly capture: (input: GiftEmail) => Effect.Effect<void>;
  }
>()("@memento/emails/TestEmails") {
  static readonly layer = Layer.effect(
    TestEmails,
    Effect.gen(function* () {
      const messages = yield* Ref.make<ReadonlyArray<GiftEmail>>([]);
      return TestEmails.of({
        sent: Ref.get(messages),
        capture: (input) => Ref.update(messages, (sent) => [...sent, input]),
      });
    }),
  );
}

export class EmailService extends Context.Service<
  EmailService,
  {
    readonly send: (input: GiftEmail) => Effect.Effect<void, ProviderError>;
  }
>()("@memento/emails/EmailService") {
  static readonly layer = Layer.effect(
    EmailService,
    Effect.gen(function* () {
      const apiKey = yield* Config.redacted("RESEND_API_KEY");
      const from = yield* Config.string("EMAIL_FROM");
      const resend = new Resend(Redacted.value(apiKey));

      return EmailService.of({
        send: Effect.fn("Emails.send")(function* (input) {
          const { react, text, subject } = yield* renderGiftEmail(input);
          const result = yield* Effect.tryPromise({
            try: () =>
              resend.emails.send(
                { from, to: input.to, subject, react, text },
                { idempotencyKey: input.idempotencyKey },
              ),
            catch: () =>
              new ProviderError({
                provider: "email",
                retryable: true,
                message: "Email delivery unavailable",
              }),
          }).pipe(
            Effect.timeoutOrElse({
              duration: "10 seconds",
              orElse: () =>
                Effect.fail(
                  new ProviderError({
                    provider: "email",
                    retryable: true,
                    message: "Email delivery timed out",
                  }),
                ),
            }),
          );
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
    }),
  );

  // Private invitation contents stay in the local console, outside telemetry.
  static readonly devLayer = Layer.succeed(
    EmailService,
    EmailService.of({
      send: Effect.fn("Emails.development.send")(function* (input) {
        const { subject, html, text } = yield* renderGiftEmail(input);
        yield* Console.log({ to: input.to, subject, html, text });
      }),
    }),
  );
  static readonly testLayer = Layer.effect(
    EmailService,
    Effect.gen(function* () {
      const emails = yield* TestEmails;
      return EmailService.of({
        send: Effect.fn("Emails.test.send")(function* (input) {
          yield* emails.capture(input);
        }),
      });
    }),
  ).pipe(Layer.provideMerge(TestEmails.layer));
}
