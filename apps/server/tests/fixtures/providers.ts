import { Context, Effect, Layer, Redacted, Ref } from "effect";

import { Chain, Cryptography, Mailer, Product } from "@memento/application";
import { Privy } from "@memento/privy";
import { type Actor, type Claim, Conflict, Forbidden, Unauthorized } from "@memento/protocol";
import { WorldId } from "@memento/world-id";
export const alice: Actor = {
  userId: "alice",
  wallets: [`0x${"11".repeat(20)}`],
  emails: ["alice@example.test"],
};
export const bob: Actor = {
  userId: "bob",
  wallets: [`0x${"22".repeat(20)}`],
  emails: ["bob@example.test"],
};
export const carol: Actor = {
  userId: "carol",
  wallets: [`0x${"33".repeat(20)}`],
  emails: ["carol@example.test"],
};
export const digest = `0x${"44".repeat(32)}`;
export const address: `0x${string}` = `0x${"55".repeat(20)}`;
export class TestProviders extends Context.Service<
  TestProviders,
  {
    readonly emails: Ref.Ref<readonly string[]>;
    readonly failChain: Ref.Ref<boolean>;
    readonly hangChain: Ref.Ref<boolean>;
  }
>()("@memento/test/TestProviders") {
  static readonly layer = Layer.effect(
    TestProviders,
    Effect.gen(function* () {
      return {
        emails: yield* Ref.make<readonly string[]>([]),
        failChain: yield* Ref.make(false),
        hangChain: yield* Ref.make(false),
      };
    }),
  );
}
const chain = Layer.effect(
  Chain,
  Effect.gen(function* () {
    const test = yield* TestProviders;
    const states: Partial<Record<Claim["state"], Claim["state"]>> = {
      authorized: "reserved",
      reserved: "committing",
      committing: "waiting",
      waiting: "registering",
      registering: "verifying",
      verifying: "complete",
    };
    return Chain.of({
      chainId: 11155111,
      quote: (label, duration) =>
        Effect.succeed({
          label,
          duration,
          available: label !== "taken",
          price: label === "expensive" ? "100000000" : "100",
        }),
      giftPlan: () => Effect.succeed([{ to: address, data: "0x", value: "0" }]),
      campaignPlan: () => Effect.succeed([{ to: address, data: "0x", value: "0" }]),
      confirmGift: (_, hash) =>
        hash === digest
          ? Effect.void
          : Effect.fail(
              new Conflict({ code: "FUNDING_MISMATCH", message: "Invalid funding transaction" }),
            ),
      confirmCampaign: (_, hash) =>
        hash === digest
          ? Effect.void
          : Effect.fail(
              new Conflict({ code: "FUNDING_MISMATCH", message: "Invalid funding transaction" }),
            ),
      prepare: () =>
        Effect.succeed({
          hca: address,
          resolver: address,
          resolverSalt: digest,
          session: { bounded: true },
          sessionKey: "test-key",
          commitmentSecret: digest,
          commitment: digest,
          typedData: {},
        }),
      typedIntent: (_, intent) => intent,
      authorize: (_, __, signature) =>
        signature === "0x1234"
          ? Effect.succeed({
              session: "verified-session",
              recipientAuthorization: "0x",
              eligibility: "0x",
            })
          : Effect.fail(new Forbidden({ message: "Invalid signature" })),
      advance: (gift, claim) =>
        Effect.gen(function* () {
          if (yield* Ref.get(test.hangChain)) yield* Effect.never;
          if (yield* Ref.get(test.failChain))
            return yield* new Conflict({ code: "SESSION_REVOKED", message: "Session was revoked" });
          return {
            state:
              gift.kind === "existing_name" ? "complete" : (states[claim.state] ?? claim.state),
          };
        }),
      confirmRefund: () => Effect.void,
      confirmCampaignRefund: () => Effect.void,
      refundPlan: () => Effect.succeed([]),
      campaignRefundPlan: () => Effect.succeed([]),
    });
  }),
);
const mailer = Layer.effect(
  Mailer,
  Effect.gen(function* () {
    const state = yield* TestProviders;
    return Mailer.of({
      send: (mail) =>
        Ref.update(state.emails, (emails) =>
          emails.includes(mail.idempotencyKey) ? emails : [...emails, mail.idempotencyKey],
        ),
    });
  }),
);
const world = Layer.succeed(
  WorldId,
  WorldId.of({
    action: "claim",
    request: (signal) =>
      Effect.succeed({
        nonce: digest,
        signal,
        expiresAt: 2000000000,
        configuration: { nonce: digest, signal },
      }),
    verify: (proof) =>
      proof === "valid"
        ? Effect.succeed("12345")
        : Effect.fail(new Forbidden({ message: "Invalid proof" })),
  }),
);
const privy = Layer.succeed(
  Privy,
  Privy.of({
    authenticate: (token) => {
      const actors = { alice, bob, carol };
      const name = Redacted.value(token);
      const actor =
        name === "alice" || name === "bob" || name === "carol" ? actors[name] : undefined;
      return actor
        ? Effect.succeed(actor)
        : Effect.fail(new Unauthorized({ message: "Invalid token" }));
    },
  }),
);
export const Providers = Layer.mergeAll(
  chain,
  mailer,
  world,
  privy,
  Cryptography.live(Redacted.make("77".repeat(32)), Redacted.make("88".repeat(32))),
  Layer.succeed(Product, {
    webOrigin: "https://memento.example",
    maximumBudget: 100000000n,
    maximumLifetime: 90 * 86400,
  }),
).pipe(Layer.provideMerge(TestProviders.layer));
