import { ConfigProvider, Effect } from "effect";

import { Mailer } from "@memento/application";
import { afterEach, expect, it, vi } from "vitest";

import { MailerConfigured } from "../../src/integrations/email.js";

const resend = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = resend;
  },
}));
afterEach(() => vi.restoreAllMocks());

const invitation = {
  to: "bob@example.test",
  senderName: "Alice",
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
  resend.send.mockClear();
  await deliver({ NODE_ENV: "development" });
  expect(log).toHaveBeenCalledWith(
    expect.objectContaining({
      to: invitation.to,
      text: expect.stringContaining("Alice sent you an ENS gift."),
    }),
  );
  expect(resend.send).not.toHaveBeenCalled();
});

it("uses the production email provider with idempotency and does not print the invitation", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  resend.send.mockResolvedValue({ error: null });
  await deliver({
    NODE_ENV: "production",
    RESEND_API_KEY: "test-key",
    EMAIL_FROM: "gifts@example.test",
  });
  expect(resend.send).toHaveBeenCalledWith(
    expect.objectContaining({
      to: invitation.to,
      text: expect.stringContaining("Alice sent you an ENS gift."),
    }),
    {
      idempotencyKey: invitation.idempotencyKey,
    },
  );
  expect(log).not.toHaveBeenCalled();
});

it("requires production credentials rather than falling back to console delivery", async () => {
  await expect(deliver({ NODE_ENV: "production" })).rejects.toThrow();
});
