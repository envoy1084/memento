import { DateTime, Effect } from "effect";

import {
  ClaimRepository,
  GiftRepository,
  JobRepository,
  TransactionService,
} from "@memento/database";
import {
  type Actor,
  type PrepareClaim,
  type Claim,
  type ClaimIntent,
  NotFound,
  Forbidden,
  Conflict,
} from "@memento/protocol";

import { Chain } from "../services/chain.js";
import { Cryptography } from "../services/cryptography.js";
import { hashSecret, hashText, label, invalid, wallet } from "./policy.js";

export const claimIntent = (claim: Claim): ClaimIntent => ({
  giftId: claim.giftId,
  recipient: claim.recipientWallet,
  resolver: claim.resolver,
  labelhash: claim.labelhash,
  nonce: claim.nonce,
  deadline: claim.deadline,
});

export const claimView = (claim: Claim) => ({
  id: claim.id,
  giftId: claim.giftId,
  recipientWallet: claim.recipientWallet,
  label: claim.label,
  state: claim.state,
  resolver: claim.resolver,
  lastError: claim.lastError,
  commitmentAt: claim.commitmentAt,
});

export const makeClaims = Effect.gen(function* () {
  const claims = yield* ClaimRepository;
  const gifts = yield* GiftRepository;
  const jobs = yield* JobRepository;
  const tx = yield* TransactionService;
  const crypto = yield* Cryptography;
  const chain = yield* Chain;
  const now = DateTime.now.pipe(Effect.map(DateTime.toEpochMillis));

  const owned = Effect.fn("Claims.owned")(function* (actor: Actor, id: string) {
    const claim = yield* claims.find(id);

    if (!claim) return yield* new NotFound({ message: "Claim not found" });

    if (claim.userId !== actor.userId)
      return yield* new Forbidden({ message: "Claim belongs to another account" });

    yield* wallet(actor, claim.recipientWallet);

    const gift = yield* gifts.find(claim.giftId);

    if (!gift) return yield* new NotFound({ message: "Gift not found" });

    return { claim, gift };
  });

  return {
    claimForGift: Effect.fn("Application.claimForGift")(function* (actor: Actor, giftId: string) {
      const claim = yield* claims.forGift(giftId);
      if (!claim || claim.userId !== actor.userId) return null;
      yield* owned(actor, claim.id);
      return claimView(claim);
    }),
    prepareClaim: Effect.fn("Application.prepareClaim")(function* (
      actor: Actor,
      giftId: string,
      input: PrepareClaim,
    ) {
      yield* wallet(actor, input.recipientWallet);

      const gift = yield* gifts.find(giftId);

      if (!gift) return yield* new NotFound({ message: "Gift not found" });

      if (!crypto.equal(hashSecret(input.secret), gift.claimHash))
        return yield* new Forbidden({ message: "Invalid claim secret" });

      const recipientWallet = input.recipientWallet.toLowerCase();

      if (
        gift.recipient.kind === "email" &&
        !actor.emails.some((email) => crypto.equal(crypto.emailId(email), gift.recipient.value))
      ) {
        return yield* new Forbidden({ message: "This gift is addressed to someone else" });
      }

      const timestamp = yield* now;
      const seconds = Math.floor(timestamp / 1000);

      if (seconds >= gift.policy.expiresAt)
        return yield* new Conflict({ code: "GIFT_EXPIRED", message: "This gift has expired" });

      const normalized = yield* label(input.label);

      {
        const length = Array.from(normalized).length;

        if (length < gift.policy.minLength || length > gift.policy.maxLength)
          return yield* invalid("LABEL_LENGTH", "Name length is outside the gift policy");
      }

      const existing = yield* claims.forGift(giftId);

      if (existing) {
        if (existing.userId !== actor.userId || existing.recipientWallet !== recipientWallet)
          return yield* new Conflict({
            code: "GIFT_ALREADY_RESERVED",
            message: "Another recipient has started this claim",
          });

        if (existing.label !== normalized)
          return yield* new Conflict({
            code: "CLAIM_NAME_FIXED",
            message: "The prepared claim is already bound to a name",
          });

        if (existing.deadline <= seconds)
          return yield* new Conflict({
            code: "CLAIM_EXPIRED",
            message: "Claim authorization expired; recover unspent funds after gift expiry",
          });

        const intent = claimIntent(existing);

        return {
          id: existing.id,
          intent,
          typedData: chain.typedIntent(gift, intent),
        };
      }

      if (gift.status !== "ready")
        return yield* new Conflict({
          code: "GIFT_NOT_READY",
          message: "Gift is not available to claim",
        });

      const quote = yield* chain.quote(normalized, gift.policy.duration);

      if (!quote.available)
        return yield* new Conflict({
          code: "NAME_UNAVAILABLE",
          message: "This name is unavailable",
        });

      if (BigInt(quote.price) > BigInt(gift.policy.maxPrice))
        return yield* invalid("PRICE_EXCEEDS_BUDGET", "Name price exceeds the gift budget");

      const id = crypto.random();
      const nonce = crypto.random();
      const deadline = Math.min(gift.policy.expiresAt, seconds + 86400);
      const account = yield* chain.prepare(gift, recipientWallet, normalized, nonce, deadline);

      const claim: Claim = {
        id,
        giftId,
        userId: actor.userId,
        recipientWallet,
        label: normalized,
        resolver: account.resolver,
        resolverSalt: account.resolverSalt,
        labelhash: hashText(normalized),
        state: "prepared",
        nonce,
        deadline,
        commitmentSecretCiphertext: crypto.seal(
          account.commitmentSecret,
          `claim:${id}:commitment-secret`,
        ),
        commitment: account.commitment,
        commitmentAt: null,
        signature: null,
        recipientAuthorizationCiphertext: null,
        price: quote.price,
        lastError: null,
        createdAt: timestamp,
      };

      yield* tx.run(
        Effect.gen(function* () {
          if (!(yield* gifts.transition(giftId, "ready", "reserved")))
            return yield* new Conflict({
              code: "GIFT_ALREADY_RESERVED",
              message: "Gift was reserved by another request",
            });

          yield* claims.create(claim);
        }),
      );

      const intent = claimIntent(claim);

      return {
        id,
        intent,
        typedData: chain.typedIntent(gift, intent),
      };
    }),

    getClaim: Effect.fn("Application.getClaim")(function* (actor: Actor, id: string) {
      return claimView((yield* owned(actor, id)).claim);
    }),

    registrationView: Effect.fn("Application.registrationView")(function* (
      actor: Actor,
      id: string,
    ) {
      const { claim } = yield* owned(actor, id);
      return yield* chain.registrationView(claim);
    }),

    setupClaim: Effect.fn("Application.setupClaim")(function* (actor: Actor, id: string) {
      const { claim, gift } = yield* owned(actor, id);
      if (["complete", "refunded"].includes(claim.state))
        return yield* invalid("CLAIM_NOT_RETRYABLE", "Claim setup is no longer available");
      return yield* chain.setup(gift, claim);
    }),

    authorizeClaim: Effect.fn("Application.authorizeClaim")(function* (
      actor: Actor,
      id: string,
      signature: string,
    ) {
      const { claim, gift } = yield* owned(actor, id);
      const timestamp = yield* now;

      if (claim.state !== "prepared" && claim.state !== "authorized") return claimView(claim);

      if (claim.deadline <= Math.floor(timestamp / 1000))
        return yield* new Conflict({
          code: "CLAIM_EXPIRED",
          message: "Claim authorization expired",
        });

      const authorization = yield* chain.authorize(gift, claim, signature);

      yield* tx.run(
        Effect.gen(function* () {
          if (
            !(yield* claims.transition(id, claim.state, {
              state: "authorized",
              lastError: null,
              signature,
              recipientAuthorizationCiphertext: crypto.seal(
                authorization.recipientAuthorization,
                `claim:${id}:recipient-authorization`,
              ),
            }))
          )
            return yield* new Conflict({
              code: "CLAIM_CHANGED",
              message: "Claim already authorized",
            });

          if (claim.state === "authorized") {
            yield* jobs.retry(id, timestamp);
            return;
          }

          yield* jobs.enqueue({
            id: crypto.random(),
            kind: "claim",
            subjectId: id,
            dedupeKey: `claim:${id}`,
            state: "pending",
            runAt: timestamp,
            attempts: 0,
            leaseToken: null,
            leaseUntil: null,
            lastError: null,
            payloadCiphertext: null,
          });
        }),
      );

      return claimView({ ...claim, state: "authorized" });
    }),

    retryClaim: Effect.fn("Application.retryClaim")(function* (actor: Actor, id: string) {
      const { claim } = yield* owned(actor, id);

      if (["complete", "prepared", "refunded"].includes(claim.state))
        return yield* invalid("CLAIM_NOT_RETRYABLE", "Claim cannot be retried in this state");

      yield* jobs.retry(id, yield* now);

      return { ok: true };
    }),
  };
});
