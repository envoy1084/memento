import { ConfigProvider, Effect } from "effect";

import { afterEach, expect, it, vi } from "vitest";

import { renderGiftEmail } from "../src/render.js";
import { EmailService, TestEmails } from "../src/service.js";

const resend = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = resend;
  },
}));
afterEach(() => vi.restoreAllMocks());
const gift = {
  to: "jamie@example.test",
  url: "https://example.com/g/sample#private",
  senderName: "Alex",
  recipientName: "Jamie",
  message: "For your next chapter.\nMake it a good one.",
  expiresAt: 1791849600,
  idempotencyKey: "gift-sample",
};

it("renders the same personal invitation as HTML and plain text", async () => {
  const email = await Effect.runPromise(renderGiftEmail(gift));
  expect(email.subject).toContain("Alex");
  for (const content of [email.html, email.text]) {
    expect(content).toMatch(/Jamie/i);
    expect(content).toContain("Alex");
    expect(content).toContain("For your next chapter.");
    expect(content).toContain("Oct 13, 2026");
    expect(content).toContain(gift.url);
    expect(content).toContain("Open your gift");
  }
  expect(email.html).toContain("#f3eef9");
  expect(email.html).toContain("DM Sans");
});

it("escapes user-written names and notes instead of interpreting HTML", async () => {
  const email = await Effect.runPromise(
    renderGiftEmail({
      ...gift,
      senderName: "<script>bad()</script>",
      message: '<img src=x onerror="bad()">',
    }),
  );
  expect(email.html).not.toContain("<script>");
  expect(email.html).not.toContain("<img src=x");
  expect(email.html).toContain("&lt;img");
});

it("renders old queued messages without optional presentation fields", async () => {
  const email = await Effect.runPromise(
    renderGiftEmail({ to: gift.to, url: gift.url, idempotencyKey: gift.idempotencyKey }),
  );
  expect(email.text).toContain("Someone special");
  expect(email.text).not.toContain("undefined");
  expect(email.text).not.toContain("Claim by");
});

const deliver = () =>
  Effect.gen(function* () {
    yield* (yield* EmailService).send(gift);
  });
const production = ConfigProvider.layer(
  ConfigProvider.fromEnvRecord({ RESEND_API_KEY: "test-key", EMAIL_FROM: "gifts@example.test" }),
);

it("keeps production idempotency and submits a React template with plain text", async () => {
  resend.send.mockResolvedValue({ error: null });
  await Effect.runPromise(
    deliver().pipe(Effect.provide(EmailService.layer), Effect.provide(production)),
  );
  expect(resend.send).toHaveBeenCalledWith(
    expect.objectContaining({
      react: expect.any(Object),
      text: expect.stringMatching(/Jamie/i),
      to: gift.to,
    }),
    { idempotencyKey: gift.idempotencyKey },
  );
});

it.each([
  ["rate_limit_exceeded", true],
  ["validation_error", false],
])("classifies %s without exposing provider details", async (name, retryable) => {
  resend.send.mockResolvedValue({ error: { name, message: gift.url } });
  const error = await Effect.runPromise(
    deliver().pipe(Effect.provide(EmailService.layer), Effect.provide(production), Effect.flip),
  );
  expect(error).toMatchObject({ provider: "email", retryable });
  expect(error.message).not.toContain(gift.url);
});

it("provides a package-owned test layer that captures mail without sending it", async () => {
  resend.send.mockClear();
  const sent = await Effect.runPromise(
    Effect.gen(function* () {
      yield* (yield* EmailService).send(gift);
      return yield* (yield* TestEmails).sent;
    }).pipe(Effect.provide(EmailService.testLayer)),
  );
  expect(sent).toEqual([gift]);
  expect(resend.send).not.toHaveBeenCalled();
});
