import { expect, layer } from "@effect/vitest";
import { DateTime, Effect, Fiber, Layer, Ref, Schema } from "effect";
import { TestClock } from "effect/testing";
import { HttpClientRequest, HttpServer } from "effect/unstable/http";
import { HttpApiMiddleware, HttpApiTest } from "effect/unstable/httpapi";

import { Api, Authentication } from "@memento/api";
import { Cryptography, Application, Worker, claimSecret } from "@memento/application";
import {
  ClaimRepository,
  GiftRepository,
  JobRepository,
  RepositoriesLive,
} from "@memento/database";
import { TestDatabase } from "@memento/database/testing";
import { CreateGift } from "@memento/protocol";

import { ApiHandlers } from "../../src/routes/api.js";
import { Providers, TestProviders, alice, bob, carol, digest } from "../fixtures/providers.js";

const dependencies = Layer.mergeAll(
  Providers,
  RepositoriesLive.pipe(Layer.provideMerge(TestDatabase.layer)),
);

const app = Layer.mergeAll(Application.layer, Worker.layer).pipe(Layer.provideMerge(dependencies));

const testLayer = Layer.mergeAll(ApiHandlers, HttpServer.layerServices).pipe(
  Layer.provideMerge(app),
);

const client = (token: string) =>
  HttpApiTest.groups(Api, ["gifts", "claims", "public", "system"]).pipe(
    Effect.provide(
      HttpApiMiddleware.layerClient(Authentication, ({ next, request }) =>
        next(HttpClientRequest.bearerToken(request, token)),
      ),
    ),
  );

const input = {
  sponsorWallet: alice.wallets[0] ?? "",
  recipient: { kind: "email", value: "bob@example.test" },
  recipientName: "Bob",
  policy: {
    maxPrice: "1000",
    expiresAt: 86400,
    duration: 31536000,
    minLength: 3,
    maxLength: 63,
  },
  message: "Happy birthday!",
  theme: "moon",
} as const;

const create = Effect.gen(function* () {
  const sender = yield* client("alice");
  const plan = yield* sender.gifts.prepare({ payload: input });
  const link = yield* sender.gifts.confirm({
    params: { id: plan.id },
    payload: { transactionHash: digest },
  });

  return { id: plan.id, secret: new URL(link.url).hash.slice(1), sender };
});

layer(testLayer)("backend HTTP workflows with migrated PGlite", (it) => {
  it.effect("requires email recipients and valid contact details at the API boundary", () =>
    Effect.sync(() => {
      const decode = Schema.decodeUnknownSync(CreateGift);
      for (const recipient of [
        { kind: "any", value: "" },
        { kind: "wallet", value: bob.wallets[0] },
        { kind: "email", value: "invalid" },
      ]) {
        expect(() => decode({ ...input, recipient })).toThrow();
      }
      expect(() => decode({ ...input, recipientName: "" })).toThrow();
    }),
  );

  it.effect(
    "stores encrypted contact details and automatically emails the saved recipient after funding",
    () =>
      Effect.gen(function* () {
        yield* (yield* TestDatabase).reset;
        yield* Ref.set((yield* TestProviders).emails, []);
        const gift = yield* create;
        const stored = yield* (yield* GiftRepository).find(gift.id);
        const crypto = yield* Cryptography;

        expect(stored?.recipientContactCiphertext).toBeTruthy();
        expect(stored?.recipientContactCiphertext).not.toContain("bob@example.test");
        expect(
          JSON.parse(
            yield* crypto.open(
              stored?.recipientContactCiphertext ?? "",
              `gift:${gift.id}:recipient`,
            ),
          ),
        ).toEqual({ name: "Bob", email: "bob@example.test" });
        const publicView = yield* gift.sender.public.open({
          params: { id: gift.id },
          payload: { secret: gift.secret },
        });
        expect(JSON.stringify(publicView)).not.toContain("bob@example.test");
        expect((yield* gift.sender.gifts.get({ params: { id: gift.id } })).emailStatus).toBe(
          "pending",
        );
        expect(yield* Ref.get((yield* TestProviders).emails)).toHaveLength(0);

        expect(
          (yield* gift.sender.gifts
            .email({ params: { id: gift.id }, payload: { to: "carol@example.test" } })
            .pipe(Effect.flip))._tag,
        ).toBe("Forbidden");
        yield* gift.sender.gifts.confirm({
          params: { id: gift.id },
          payload: { transactionHash: digest },
        });
        yield* (yield* Worker).tick();
        expect(yield* Ref.get((yield* TestProviders).emails)).toHaveLength(1);
        expect((yield* gift.sender.gifts.get({ params: { id: gift.id } })).emailStatus).toBe(
          "complete",
        );
        yield* (yield* Worker).tick();
        expect(yield* Ref.get((yield* TestProviders).emails)).toHaveLength(1);
      }),
  );

  it.effect("persists a session-free claim and restricts setup to the linked recipient", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;
      const gift = yield* create;
      const recipient = yield* client("bob");
      const stranger = yield* client("carol");
      const prepared = yield* recipient.claims.prepare({
        params: { id: gift.id },
        payload: { secret: gift.secret, recipientWallet: bob.wallets[0] ?? "", label: "bob" },
      });
      const params = { id: prepared.id };

      const repeated = yield* recipient.claims.prepare({
        params: { id: gift.id },
        payload: { secret: gift.secret, recipientWallet: bob.wallets[0] ?? "", label: "bob" },
      });
      expect(repeated.id).toBe(prepared.id);

      expect((yield* recipient.claims.setup({ params })).stage).toBe("commit-name");
      expect((yield* recipient.claims.registration({ params })).status).toBe("not-started");
      expect((yield* stranger.claims.setup({ params }).pipe(Effect.flip))._tag).toBe("Forbidden");
      expect((yield* stranger.claims.registration({ params }).pipe(Effect.flip))._tag).toBe(
        "Forbidden",
      );
    }),
  );

  it.effect("funds, opens, authorizes and completes a chosen-name gift", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;

      const gift = yield* create;
      const recipient = yield* client("bob");
      const opened = yield* recipient.public.open({
        params: { id: gift.id },
        payload: { secret: gift.secret },
      });

      expect(opened.message).toBe("Happy birthday!");
      expect("secretCiphertext" in opened).toBe(false);
      expect(
        (yield* recipient.public
          .open({ params: { id: gift.id }, payload: { secret: claimSecret(gift.secret) } })
          .pipe(Effect.flip))._tag,
      ).toBe("Forbidden");

      const prepared = yield* recipient.claims.prepare({
        params: { id: gift.id },
        payload: {
          secret: gift.secret,
          recipientWallet: bob.wallets[0] ?? "",
          label: "bobbbb.eth",
        },
      });

      yield* recipient.claims.authorize({
        params: { id: prepared.id },
        payload: { signature: "0x1234" },
      });

      // A sponsored wallet may need an ERC-1271 signature replacing its earlier EOA signature.
      yield* recipient.claims.authorize({
        params: { id: prepared.id },
        payload: { signature: "0x5678" },
      });
      expect((yield* (yield* ClaimRepository).find(prepared.id))?.signature).toBe("0x5678");

      for (let i = 0; i < 7; i++) {
        yield* (yield* Worker).tick();
        yield* TestClock.adjust("2 seconds");
      }

      const completed = yield* recipient.claims.get({ params: { id: prepared.id } });

      expect(completed.state).toBe("complete");
      yield* recipient.claims.authorize({
        params: { id: prepared.id },
        payload: { signature: "0xabcd" },
      });
      expect((yield* (yield* ClaimRepository).find(prepared.id))?.state).toBe("complete");

      expect((yield* (yield* GiftRepository).find(gift.id))?.status).toBe("complete");
    }),
  );
  it.effect("rejects unauthenticated senders and unlinked sponsor wallets", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;

      const anonymous = yield* client("invalid");

      expect((yield* anonymous.gifts.prepare({ payload: input }).pipe(Effect.flip))._tag).toBe(
        "Unauthorized",
      );

      const recipient = yield* client("bob");

      expect((yield* recipient.gifts.prepare({ payload: input }).pipe(Effect.flip))._tag).toBe(
        "Forbidden",
      );
    }),
  );
  it.effect("does not activate a gift on an unrelated funding transaction", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;

      const sender = yield* client("alice");
      const plan = yield* sender.gifts.prepare({ payload: input });

      expect(
        (yield* sender.gifts
          .confirm({
            params: { id: plan.id },
            payload: { transactionHash: `0x${"66".repeat(32)}` },
          })
          .pipe(Effect.flip))._tag,
      ).toBe("Conflict");
      expect((yield* (yield* GiftRepository).find(plan.id))?.status).toBe("draft");
    }),
  );
  it.effect("rejects leaked secrets for email-restricted gifts", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;

      const sender = yield* client("alice");
      const plan = yield* sender.gifts.prepare({
        payload: { ...input, recipient: { kind: "email", value: "bob@example.test" } },
      });
      const link = yield* sender.gifts.confirm({
        params: { id: plan.id },
        payload: { transactionHash: digest },
      });
      const receiver = yield* client("carol");

      expect(
        (yield* receiver.claims
          .prepare({
            params: { id: plan.id },
            payload: {
              secret: new URL(link.url).hash.slice(1),
              recipientWallet: carol.wallets[0] ?? "",
              label: "carol",
            },
          })
          .pipe(Effect.flip))._tag,
      ).toBe("Forbidden");

      const stored = yield* (yield* GiftRepository).find(plan.id);

      expect(stored?.recipient.value).not.toContain("bob@");
      const application = yield* Application;
      const claimInput = {
        secret: new URL(link.url).hash.slice(1),
        recipientWallet: bob.wallets[0] ?? "",
        label: "bobby",
      };
      expect(
        (yield* application
          .prepareClaim({ ...bob, emails: [] }, plan.id, claimInput)
          .pipe(Effect.flip))._tag,
      ).toBe("Forbidden");
      const claim = yield* application.prepareClaim(
        { ...bob, emails: ["BOB@example.test"] },
        plan.id,
        claimInput,
      );
      expect(claim.id).toBeTruthy();
    }),
  );
  it.effect("rejects wrong claim secrets and excessive name prices", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;

      const gift = yield* create;
      const recipient = yield* client("bob");

      expect(
        (yield* recipient.public
          .open({ params: { id: gift.id }, payload: { secret: digest } })
          .pipe(Effect.flip))._tag,
      ).toBe("Forbidden");
      expect(
        (yield* recipient.claims
          .prepare({
            params: { id: gift.id },
            payload: {
              secret: gift.secret,
              recipientWallet: bob.wallets[0] ?? "",
              label: "expensive",
            },
          })
          .pipe(Effect.flip))._tag,
      ).toBe("InvalidRequest");
    }),
  );
  it.effect("keeps a claim private and rejects an invalid recipient signature", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;

      const gift = yield* create;
      const recipient = yield* client("bob");
      const prepared = yield* recipient.claims.prepare({
        params: { id: gift.id },
        payload: { secret: gift.secret, recipientWallet: bob.wallets[0] ?? "", label: "bobbbb" },
      });
      const stranger = yield* client("carol");

      expect(
        (yield* stranger.claims.get({ params: { id: prepared.id } }).pipe(Effect.flip))._tag,
      ).toBe("Forbidden");
      expect(
        (yield* recipient.claims
          .authorize({
            params: { id: prepared.id },
            payload: { signature: "0xabcd" },
          })
          .pipe(Effect.flip))._tag,
      ).toBe("Forbidden");
      expect((yield* (yield* ClaimRepository).find(prepared.id))?.state).toBe("prepared");
    }),
  );
  it.effect("deduplicates explicit email delivery jobs", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;

      const gift = yield* create;

      yield* Ref.set((yield* TestProviders).emails, []);

      for (let i = 0; i < 2; i++)
        yield* gift.sender.gifts.email({
          params: { id: gift.id },
          payload: { to: "bob@example.test" },
        });

      yield* (yield* Worker).tick();
      yield* (yield* Worker).tick();
      expect(yield* Ref.get((yield* TestProviders).emails)).toHaveLength(1);
    }),
  );
  it.effect("retries a failed email job without creating duplicate deliveries", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;
      yield* Ref.set((yield* TestProviders).emails, []);

      const gift = yield* create;
      const payload = { params: { id: gift.id }, payload: { to: "bob@example.test" } };

      yield* gift.sender.gifts.email(payload);

      const jobs = yield* JobRepository;
      const leased = yield* jobs.lease(
        yield* DateTime.now.pipe(Effect.map(DateTime.toEpochMillis)),
        "test-worker",
      );

      if (!leased) return yield* Effect.die("Missing email job");

      yield* jobs.finish(leased.id, "test-worker", "failed", 0, "Mail temporarily unavailable");
      yield* gift.sender.gifts.email(payload);
      yield* (yield* Worker).tick();
      expect(yield* Ref.get((yield* TestProviders).emails)).toHaveLength(1);
    }),
  );
  it.effect(
    "times out a stalled provider before the lease expires and resumes its durable job",
    () =>
      Effect.gen(function* () {
        yield* (yield* TestDatabase).reset;

        const gift = yield* create;
        yield* (yield* Worker).tick(); // Deliver the automatically queued email before exercising claim work.
        const recipient = yield* client("bob");
        const prepared = yield* recipient.claims.prepare({
          params: { id: gift.id },
          payload: { secret: gift.secret, recipientWallet: bob.wallets[0] ?? "", label: "bobbbb" },
        });

        yield* recipient.claims.authorize({
          params: { id: prepared.id },
          payload: { signature: "0x1234" },
        });

        const test = yield* TestProviders;

        yield* Ref.set(test.hangChain, true);

        const worker = yield* Worker;
        const running = yield* worker.tick().pipe(Effect.forkChild);

        yield* TestClock.adjust("91 seconds");
        yield* Fiber.join(running);
        expect((yield* recipient.claims.get({ params: { id: prepared.id } })).lastError).toContain(
          "timed out",
        );
        yield* Ref.set(test.hangChain, false);
        yield* TestClock.adjust("5 seconds");
        yield* worker.tick();
        expect((yield* recipient.claims.get({ params: { id: prepared.id } })).state).toBe(
          "committing",
        );
      }),
  );
  it.effect("keeps failed claims resumable through durable jobs", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;

      const gift = yield* create;
      yield* (yield* Worker).tick(); // Deliver the automatically queued email before exercising claim work.
      const recipient = yield* client("bob");
      const prepared = yield* recipient.claims.prepare({
        params: { id: gift.id },
        payload: { secret: gift.secret, recipientWallet: bob.wallets[0] ?? "", label: "bobbbb" },
      });

      yield* recipient.claims.authorize({
        params: { id: prepared.id },
        payload: { signature: "0x1234" },
      });
      yield* Ref.set((yield* TestProviders).failChain, true);
      yield* (yield* Worker).tick();
      expect((yield* recipient.claims.get({ params: { id: prepared.id } })).lastError).toBe(
        "Session was revoked",
      );
      yield* Ref.set((yield* TestProviders).failChain, false);
      yield* recipient.claims.retry({ params: { id: prepared.id } });
      yield* (yield* Worker).tick();
      expect((yield* recipient.claims.get({ params: { id: prepared.id } })).state).toBe(
        "committing",
      );
      expect(yield* (yield* JobRepository).lease(0, "unexpected")).toBeUndefined();
    }),
  );
});
