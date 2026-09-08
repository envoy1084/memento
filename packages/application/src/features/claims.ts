import { DateTime, Effect } from "effect";

import {
  ClaimRepository,
  GiftRepository,
  JobRepository,
  WorldRepository,
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
import { WorldId } from "@memento/world-id";

import { Chain } from "../services/chain.js";
import { Cryptography } from "../services/cryptography.js";
import { hashSecret, hashText, label, invalid, wallet } from "./policy.js";

export const claimIntent = (claim: Claim): ClaimIntent => ({
  giftId: claim.giftId,
  recipient: claim.recipientWallet,
  hca: claim.hca,
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
  hca: claim.hca,
  resolver: claim.resolver,
  lastError: claim.lastError,
  commitmentAt: claim.commitmentAt,
});

export const makeClaims = Effect.gen(function* () {
  const claims = yield* ClaimRepository;
  const gifts = yield* GiftRepository;
  const jobs = yield* JobRepository;
  const worlds = yield* WorldRepository;
  const tx = yield* TransactionService;
  const crypto = yield* Cryptography;
  const chain = yield* Chain;
  const world = yield* WorldId;
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
        (gift.recipient.kind === "wallet" && gift.recipient.value !== recipientWallet) ||
        (gift.recipient.kind === "email" &&
          !actor.emails.some((email) => crypto.equal(crypto.emailId(email), gift.recipient.value)))
      ) {
        return yield* new Forbidden({ message: "This gift is addressed to someone else" });
      }

      const timestamp = yield* now;
      const seconds = Math.floor(timestamp / 1000);

      if (seconds >= gift.policy.expiresAt)
        return yield* new Conflict({ code: "GIFT_EXPIRED", message: "This gift has expired" });

      const normalized = yield* label(input.label);

      if (gift.kind === "existing_name" && normalized !== gift.label)
        return yield* invalid("WRONG_NAME", "This gift is for a specific name");

      if (gift.kind === "chosen_name") {
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
          session: existing.sessionPayload,
          sessionExpiry: existing.sessionExpiry,
        };
      }

      if (gift.status !== "ready")
        return yield* new Conflict({
          code: "GIFT_NOT_READY",
          message: "Gift is not available to claim",
        });

      const quote =
        gift.kind === "chosen_name"
          ? yield* chain.quote(normalized, gift.policy.duration)
          : { price: "0", available: true };

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
        hca: account.hca,
        resolver: account.resolver,
        resolverSalt: account.resolverSalt,
        labelhash: hashText(normalized),
        state: "prepared",
        nonce,
        deadline,
        sessionExpiry: deadline,
        sessionKeyCiphertext: crypto.seal(account.sessionKey, `claim:${id}:key`),
        authorizationCiphertext: null,
        sessionPayload: account.session,
        commitmentSecretCiphertext: crypto.seal(
          account.commitmentSecret,
          `claim:${id}:commitment-secret`,
        ),
        commitment: account.commitment,
        commitmentAt: null,
        signature: null,
        eligibilityCiphertext: null,
        recipientAuthorizationCiphertext: null,
        worldVerified: false,
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
        session: account.session,
        sessionExpiry: deadline,
      };
    }),

    getClaim: Effect.fn("Application.getClaim")(function* (actor: Actor, id: string) {
      return claimView((yield* owned(actor, id)).claim);
    }),

    worldRequest: Effect.fn("Application.worldRequest")(function* (actor: Actor, id: string) {
      const { claim, gift } = yield* owned(actor, id);

      if (!gift.policy.worldRequired || claim.state !== "prepared")
        return yield* invalid(
          "WORLD_NOT_REQUIRED",
          "World verification is not pending for this claim",
        );

      const signal = `${chain.chainId}:${gift.campaignId ?? gift.id}:${claim.id}:${claim.recipientWallet}:${claim.nonce}`;
      const request = yield* world.request(signal);

      yield* worlds.request({
        claimId: id,
        nonce: request.nonce,
        signal,
        expiresAt: request.expiresAt,
        usedAt: null,
      });

      return request.configuration;
    }),

    verifyWorld: Effect.fn("Application.verifyWorld")(function* (
      actor: Actor,
      id: string,
      proof: unknown,
    ) {
      const { claim, gift } = yield* owned(actor, id);

      if (claim.worldVerified) return { ok: true };

      if (claim.state !== "prepared")
        return yield* invalid("CLAIM_NOT_PREPARED", "Claim is no longer awaiting verification");

      const request = yield* worlds.find(id);
      const timestamp = yield* now;

      if (!request || request.usedAt || request.expiresAt <= Math.floor(timestamp / 1000))
        return yield* new Forbidden({ message: "World verification request expired" });

      const nullifier = yield* world.verify(proof, request);

      yield* tx.run(
        Effect.gen(function* () {
          if (
            !(yield* worlds.verify({
              claimId: id,
              action: `${world.action}:${gift.campaignId ?? gift.id}`,
              nullifier,
              requestNonce: request.nonce,
              verifiedAt: timestamp,
            }))
          ) {
            return yield* new Conflict({
              code: "WORLD_NULLIFIER_USED",
              message: "This person already verified another invitation in this campaign",
            });
          }

          if (!(yield* claims.transition(id, "prepared", { worldVerified: true })))
            return yield* new Conflict({
              code: "CLAIM_CHANGED",
              message: "Claim changed during verification",
            });
        }),
      );

      return { ok: true };
    }),

    authorizeClaim: Effect.fn("Application.authorizeClaim")(function* (
      actor: Actor,
      id: string,
      signature: string,
      sessionAuthorization: unknown,
    ) {
      const { claim, gift } = yield* owned(actor, id);
      const timestamp = yield* now;

      if (claim.state !== "prepared") return claimView(claim);

      if (claim.deadline <= Math.floor(timestamp / 1000))
        return yield* new Conflict({
          code: "HCA_SESSION_EXPIRED",
          message: "Claim authorization expired",
        });

      if (gift.policy.worldRequired && !claim.worldVerified)
        return yield* new Forbidden({ message: "World verification is required first" });

      const authorization = yield* chain.authorize(gift, claim, signature, sessionAuthorization);

      yield* tx.run(
        Effect.gen(function* () {
          if (
            !(yield* claims.transition(id, "prepared", {
              state: "authorized",
              signature,
              authorizationCiphertext: crypto.seal(
                authorization.session,
                `claim:${id}:authorization`,
              ),
              recipientAuthorizationCiphertext: crypto.seal(
                authorization.recipientAuthorization,
                `claim:${id}:recipient-authorization`,
              ),
              eligibilityCiphertext: crypto.seal(
                authorization.eligibility,
                `claim:${id}:eligibility`,
              ),
            }))
          )
            return yield* new Conflict({
              code: "CLAIM_CHANGED",
              message: "Claim already authorized",
            });

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
