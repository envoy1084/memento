import { DateTime, Effect, Schema } from "effect";

import {
  ClaimRepository,
  GiftRepository,
  TransactionService,
  AuditRepository,
  JobRepository,
} from "@memento/database";
import {
  GiftRecipientContact,
  type Actor,
  type CreateGift,
  type Gift,
  NotFound,
  Forbidden,
  Conflict,
} from "@memento/protocol";

import { Chain, Product } from "../services/chain.js";
import { Cryptography } from "../services/cryptography.js";
import { wallet, validatePolicy, recipient, invalid, hashText, hashSecret } from "./policy.js";

export const makeGifts = Effect.gen(function* () {
  const gifts = yield* GiftRepository;
  const claims = yield* ClaimRepository;
  const tx = yield* TransactionService;
  const audit = yield* AuditRepository;
  const jobs = yield* JobRepository;
  const crypto = yield* Cryptography;
  const chain = yield* Chain;
  const product = yield* Product;
  const now = DateTime.now.pipe(Effect.map(DateTime.toEpochMillis));

  const find = Effect.fn("Gifts.find")(function* (id: string) {
    const gift = yield* gifts.find(id);

    if (!gift) return yield* new NotFound({ message: "Gift not found" });

    return gift;
  });

  const sponsor = Effect.fn("Gifts.sponsor")(function* (id: string, actor: Actor) {
    const gift = yield* find(id);

    yield* wallet(actor, gift.sponsorWallet);

    return gift;
  });

  const recipientContact = Effect.fn("Gifts.recipientContact")(function* (gift: Gift) {
    if (!gift.recipientContactCiphertext) return null;

    return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(GiftRecipientContact))(
      yield* crypto.open(gift.recipientContactCiphertext, `gift:${gift.id}:recipient`),
    ).pipe(
      Effect.mapError(() =>
        invalid("INVALID_RECIPIENT_CONTACT", "Stored recipient details are invalid"),
      ),
    );
  });

  const view = Effect.fn("Gifts.view")(function* (gift: Gift) {
    const contact = yield* recipientContact(gift);
    return {
      id: gift.id,
      recipientName: contact?.name ?? null,
      senderName: contact?.senderName ?? null,
      emailStatus: yield* jobs.emailState(gift.id),
      sponsorWallet: gift.sponsorWallet,
      policy: gift.policy,
      status: gift.status,
      theme: gift.theme,
      label: (yield* claims.forGift(gift.id))?.label ?? null,
      message: yield* crypto.open(gift.messageCiphertext, `gift:${gift.id}:message`),
    };
  });

  const link = Effect.fn("Gifts.link")(function* (gift: Gift) {
    if (!gift.secretCiphertext)
      return yield* new Conflict({
        code: "LINK_UNAVAILABLE",
        message: "This gift link is no longer available",
      });

    const secret = yield* crypto.open(gift.secretCiphertext, `gift:${gift.id}:secret`);

    return { id: gift.id, url: `${product.webOrigin}/g/${gift.id}#${secret}` };
  });

  const event = (id: string, action: string, actor: Actor, createdAt: number) =>
    audit.record({ id: crypto.random(), subjectId: id, action, actorId: actor.userId, createdAt });

  const queueEmail = Effect.fn("Gifts.queueEmail")(function* (
    gift: Gift,
    actor: Actor,
    destination: string,
    emailHash: string,
    retry = false,
  ) {
    const id = gift.id;
    const { url } = yield* link(gift);
    const timestamp = yield* now;
    const dedupeKey = `email:${id}:${emailHash}`;

    yield* jobs.enqueue({
      id: crypto.random(),
      kind: "email",
      subjectId: id,
      dedupeKey,
      state: "pending",
      runAt: timestamp,
      attempts: 0,
      leaseToken: null,
      leaseUntil: null,
      lastError: null,
      payloadCiphertext: crypto.seal(
        JSON.stringify({
          to: destination.trim().toLowerCase(),
          url,
          idempotencyKey: dedupeKey,
          senderName: (yield* recipientContact(gift))?.senderName,
        }),
        `email:${id}`,
      ),
    });
    if (retry) yield* jobs.retry(id, timestamp, dedupeKey);
    yield* event(id, "email.requested", actor, timestamp);
  });

  return {
    listGifts: Effect.fn("Application.listGifts")(function* (actor: Actor, offset = 0) {
      return yield* Effect.forEach(yield* gifts.list(actor.wallets, offset), view);
    }),

    getGift: Effect.fn("Application.getGift")(function* (actor: Actor, id: string) {
      return yield* view(yield* sponsor(id, actor));
    }),

    giftFundingPlan: Effect.fn("Application.giftFundingPlan")(function* (actor: Actor, id: string) {
      const gift = yield* sponsor(id, actor);
      if (gift.status !== "draft")
        return yield* new Conflict({
          code: "GIFT_NOT_DRAFT",
          message: "Gift is not awaiting funding",
        });
      return { id, chainId: chain.chainId, calls: yield* chain.giftPlan(gift) };
    }),

    getGiftLink: Effect.fn("Application.getGiftLink")(function* (actor: Actor, id: string) {
      const gift = yield* sponsor(id, actor);

      if (gift.status === "draft")
        return yield* new Conflict({
          code: "GIFT_NOT_FUNDED",
          message: "Fund the gift before retrieving its link",
        });

      return yield* link(gift);
    }),

    createGift: Effect.fn("Application.createGift")(function* (actor: Actor, input: CreateGift) {
      yield* wallet(actor, input.sponsorWallet);

      if (input.recipient.kind !== "email")
        return yield* invalid(
          "EMAIL_RECIPIENT_REQUIRED",
          "Individual gifts require an email recipient",
        );

      if (!input.senderName.trim())
        return yield* invalid("SENDER_NAME_REQUIRED", "Enter your name");

      if (!input.recipientName.trim())
        return yield* invalid("RECIPIENT_NAME_REQUIRED", "Enter the recipient’s name");

      const createdAt = yield* now;

      yield* validatePolicy(
        input.policy,
        Math.floor(createdAt / 1000),
        product.maximumBudget,
        product.maximumLifetime,
      );

      const restriction = yield* recipient(input.recipient, crypto);

      const id = crypto.random();
      const secret = crypto.random();

      const gift: Gift = {
        id,
        sponsorWallet: input.sponsorWallet.toLowerCase(),
        recipient: restriction,
        policy: input.policy,
        claimHash: hashSecret(secret),
        secretCiphertext: crypto.seal(secret, `gift:${id}:secret`),
        messageCiphertext: crypto.seal(input.message, `gift:${id}:message`),
        recipientContactCiphertext: crypto.seal(
          JSON.stringify({
            name: input.recipientName.trim(),
            senderName: input.senderName.trim(),
            email: input.recipient.value.trim().toLowerCase(),
          }),
          `gift:${id}:recipient`,
        ),
        theme: input.theme,
        metadataHash: hashText(JSON.stringify({ message: input.message, theme: input.theme })),
        status: "draft",
        fundingHash: null,
        createdAt,
      };

      const calls = yield* chain.giftPlan(gift);

      yield* tx.run(
        Effect.gen(function* () {
          yield* gifts.create(gift);
          yield* event(id, "gift.prepared", actor, createdAt);
        }),
      );

      return { id, chainId: chain.chainId, calls };
    }),

    confirmGift: Effect.fn("Application.confirmGift")(function* (
      actor: Actor,
      id: string,
      hash: string,
    ) {
      const gift = yield* sponsor(id, actor);

      if (gift.status === "ready" && gift.fundingHash === hash) return yield* link(gift);

      if (gift.status !== "draft")
        return yield* new Conflict({
          code: "GIFT_NOT_DRAFT",
          message: "Gift is no longer awaiting funding",
        });

      yield* chain.confirmGift(gift, hash);

      const timestamp = yield* now;

      yield* tx.run(
        Effect.gen(function* () {
          if (!(yield* gifts.transition(id, "draft", "ready", hash)))
            return yield* new Conflict({
              code: "GIFT_CHANGED",
              message: "Gift changed during confirmation",
            });

          yield* event(id, "gift.funded", actor, timestamp);
          const contact = yield* recipientContact(gift);
          if (contact && gift.recipient.kind === "email")
            yield* queueEmail(gift, actor, contact.email, gift.recipient.value);
        }),
      );

      return yield* link(gift);
    }),

    openGift: Effect.fn("Application.openGift")(function* (id: string, secret: string) {
      const gift = yield* find(id);

      if (!crypto.equal(hashSecret(secret), gift.claimHash))
        return yield* new Forbidden({ message: "Invalid claim secret" });

      if (gift.status === "draft")
        return yield* new Conflict({
          code: "GIFT_NOT_FUNDED",
          message: "This gift has not been funded",
        });

      return yield* view(gift);
    }),

    emailGift: Effect.fn("Application.emailGift")(function* (
      actor: Actor,
      id: string,
      to?: string,
    ) {
      const gift = yield* sponsor(id, actor);

      if (gift.status !== "ready")
        return yield* new Conflict({
          code: "GIFT_NOT_READY",
          message: "Only unclaimed funded gifts can be emailed",
        });

      const contact = yield* recipientContact(gift);
      const destination = to ?? contact?.email;

      if (!destination)
        return yield* invalid("EMAIL_REQUIRED", "This gift has no saved delivery email");

      const email = yield* recipient({ kind: "email", value: destination }, crypto);

      if (gift.recipient.kind === "email" && !crypto.equal(gift.recipient.value, email.value))
        return yield* new Forbidden({ message: "Email does not match the gift recipient" });

      yield* tx.run(queueEmail(gift, actor, destination, email.value, true));

      return { ok: true };
    }),

    confirmRefund: Effect.fn("Application.confirmRefund")(function* (
      actor: Actor,
      id: string,
      hash: string,
    ) {
      const gift = yield* sponsor(id, actor);

      yield* chain.confirmRefund(gift, hash);
      yield* tx.run(
        Effect.gen(function* () {
          if (!(yield* gifts.transition(id, gift.status, "refunded")))
            return yield* new Conflict({
              code: "GIFT_CHANGED",
              message: "Gift changed during refund confirmation; retry",
            });

          const claim = yield* claims.forGift(id);

          if (claim && claim.state !== "complete")
            if (
              !(yield* claims.transition(claim.id, claim.state, {
                state: "refunded",
                commitmentSecretCiphertext: null,
                recipientAuthorizationCiphertext: null,
              }))
            )
              return yield* new Conflict({
                code: "CLAIM_CHANGED",
                message: "Claim changed during refund confirmation; retry",
              });
        }),
      );

      return { ok: true };
    }),

    refundGift: Effect.fn("Application.refundGift")(function* (actor: Actor, id: string) {
      const gift = yield* sponsor(id, actor);

      return { id, chainId: chain.chainId, calls: yield* chain.refundPlan(gift) };
    }),
  };
});
