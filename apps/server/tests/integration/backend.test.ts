import { expect, layer } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";
import { TestClock } from "effect/testing";
import { HttpClientRequest, HttpServer } from "effect/unstable/http";
import { HttpApiMiddleware, HttpApiTest } from "effect/unstable/httpapi";

import { Api, Authentication } from "@memento/api";
import { Application, Worker } from "@memento/application";
import {
  ClaimRepository,
  GiftRepository,
  JobRepository,
  RepositoriesLive,
} from "@memento/database";
import { TestDatabase } from "@memento/database/testing";

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
  kind: "chosen_name",
  recipient: { kind: "any", value: "" },
  policy: {
    maxPrice: "1000",
    expiresAt: 86400,
    duration: 31536000,
    minLength: 3,
    maxLength: 63,
    worldRequired: false,
    setPrimaryName: true,
  },
  message: "Happy birthday!",
  theme: "moon",
  records: [],
  label: null,
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
        payload: { signature: "0x1234", sessionAuthorization: {} },
      });
      for (let i = 0; i < 7; i++) {
        yield* (yield* Worker).tick();
        yield* TestClock.adjust("2 seconds");
      }
      const completed = yield* recipient.claims.get({ params: { id: prepared.id } });
      expect(completed.state).toBe("complete");
      expect((yield* (yield* ClaimRepository).find(prepared.id))?.sessionKeyCiphertext).toBeNull();
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
            payload: { signature: "0xabcd", sessionAuthorization: {} },
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
  it.effect("completes the exact existing-name gift", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;
      const sender = yield* client("alice");
      const plan = yield* sender.gifts.prepare({
        payload: {
          ...input,
          kind: "existing_name",
          label: "bob",
          recipient: { kind: "wallet", value: bob.wallets[0] ?? "" },
          policy: { ...input.policy, setPrimaryName: false },
        },
      });
      const link = yield* sender.gifts.confirm({
        params: { id: plan.id },
        payload: { transactionHash: digest },
      });
      const recipient = yield* client("bob");
      const payload = {
        secret: new URL(link.url).hash.slice(1),
        recipientWallet: bob.wallets[0] ?? "",
        label: "alice",
      };
      expect(
        (yield* recipient.claims.prepare({ params: { id: plan.id }, payload }).pipe(Effect.flip))
          ._tag,
      ).toBe("InvalidRequest");
      const prepared = yield* recipient.claims.prepare({
        params: { id: plan.id },
        payload: { ...payload, label: "bob" },
      });
      yield* recipient.claims.authorize({
        params: { id: prepared.id },
        payload: { signature: "0x1234", sessionAuthorization: null },
      });
      yield* (yield* Worker).tick();
      expect((yield* recipient.claims.get({ params: { id: prepared.id } })).state).toBe("complete");
    }),
  );
  it.effect("protects campaign links and consumes one World nullifier per campaign", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;
      const sender = yield* client("alice");
      const campaign = yield* sender.gifts.prepareCampaign({
        payload: {
          sponsorWallet: input.sponsorWallet,
          policy: { ...input.policy, worldRequired: true },
          message: "Welcome",
          theme: "moon",
          recipients: [
            { kind: "any", value: "" },
            { kind: "any", value: "" },
          ],
        },
      });
      yield* sender.gifts.confirmCampaign({
        params: { id: campaign.id },
        payload: { transactionHash: digest },
      });
      const recipient = yield* client("bob");
      expect(
        (yield* recipient.gifts.invitations({ params: { id: campaign.id } }).pipe(Effect.flip))
          ._tag,
      ).toBe("Forbidden");
      const invitations = yield* sender.gifts.invitations({ params: { id: campaign.id } });
      expect(invitations).toHaveLength(2);
      const claimIds: string[] = [];
      for (const invitation of invitations) {
        const prepared = yield* recipient.claims.prepare({
          params: { id: invitation.id },
          payload: {
            secret: new URL(invitation.url).hash.slice(1),
            recipientWallet: bob.wallets[0] ?? "",
            label: `bob${claimIds.length}`,
          },
        });
        claimIds.push(prepared.id);
        yield* recipient.claims.worldRequest({ params: { id: prepared.id } });
      }
      const first = claimIds[0] ?? "";
      const second = claimIds[1] ?? "";
      expect(
        (yield* recipient.claims
          .authorize({
            params: { id: first },
            payload: { signature: "0x1234", sessionAuthorization: {} },
          })
          .pipe(Effect.flip))._tag,
      ).toBe("Forbidden");
      yield* recipient.claims.worldVerify({ params: { id: first }, payload: { proof: "valid" } });
      expect(
        (yield* recipient.claims
          .worldVerify({ params: { id: second }, payload: { proof: "valid" } })
          .pipe(Effect.flip))._tag,
      ).toBe("Conflict");
      expect((yield* (yield* ClaimRepository).find(second))?.worldVerified).toBe(false);
    }),
  );
  it.effect("keeps failed claims resumable through durable jobs", () =>
    Effect.gen(function* () {
      yield* (yield* TestDatabase).reset;
      const gift = yield* create;
      const recipient = yield* client("bob");
      const prepared = yield* recipient.claims.prepare({
        params: { id: gift.id },
        payload: { secret: gift.secret, recipientWallet: bob.wallets[0] ?? "", label: "bobbbb" },
      });
      yield* recipient.claims.authorize({
        params: { id: prepared.id },
        payload: { signature: "0x1234", sessionAuthorization: {} },
      });
      yield* Ref.set((yield* TestProviders).failChain, true);
      yield* (yield* Worker).tick();
      expect((yield* recipient.claims.get({ params: { id: prepared.id } })).lastError).toBe(
        "Session was revoked",
      );
      yield* Ref.set((yield* TestProviders).failChain, false);
      yield* recipient.claims.retry({ params: { id: prepared.id } });
      yield* (yield* Worker).tick();
      expect((yield* recipient.claims.get({ params: { id: prepared.id } })).state).toBe("reserved");
      expect(yield* (yield* JobRepository).lease(0, "unexpected")).toBeUndefined();
    }),
  );
});
