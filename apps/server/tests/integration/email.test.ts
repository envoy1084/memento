import { ConfigProvider, Effect } from "effect";

import { Mailer } from "@memento/application";
import { afterEach, expect, it, vi } from "vitest";

import { MailerConfigured } from "../../src/integrations/email.js";

afterEach(() => vi.restoreAllMocks());

const invitation = {
  to: "bob@example.test",
  senderName: "Alice",
  recipientName: "Bob",
  message: "Your next chapter awaits.",
  expiresAt: 1791849600,
  url: "https://memento.example/g/example#private",
  idempotencyKey: "gift-example",
};
const deliver = (environment: Record<string, string>) =>
  Effect.runPromise(
    Effect.gen(function* () {
      yield* (yield* Mailer).send(invitation);
    }).pipe(
      Effect.provide(MailerConfigured),
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnvRecord(environment))),
    ),
  );

it("prints development email contents without requiring Resend credentials", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await deliver({ NODE_ENV: "development" });
  expect(log).toHaveBeenCalledWith(
    expect.objectContaining({
      to: invitation.to,
      text: expect.stringContaining("Your next chapter awaits."),
    }),
  );
});

it("requires production credentials rather than falling back to console delivery", async () => {
  await expect(deliver({ NODE_ENV: "production" })).rejects.toThrow();
});
