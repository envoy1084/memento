import { DateTime, Effect } from "effect";

import {
  ClaimRepository,
  GiftRepository,
  CampaignRepository,
  TransactionService,
  AuditRepository,
  JobRepository,
} from "@memento/database";
import {
  type Actor,
  type CreateGift,
  type CreateCampaign,
  type Gift,
  type Campaign,
  NotFound,
  Forbidden,
  Conflict,
} from "@memento/protocol";

import { Chain, Product } from "../services/chain.js";
import { Cryptography } from "../services/cryptography.js";
import {
  wallet,
  validatePolicy,
  recipient,
  label,
  invalid,
  hashText,
  hashSecret,
  campaignClaimId,
  invitationLeaf,
  merkle,
} from "./policy.js";

const campaignView = (campaign: Campaign) => ({
  id: campaign.id,
  sponsorWallet: campaign.sponsorWallet,
  policy: campaign.policy,
  count: campaign.count,
  status: campaign.status,
  fundingHash: campaign.fundingHash,
  createdAt: campaign.createdAt,
});

export const makeGifts = Effect.gen(function* () {
  const gifts = yield* GiftRepository;
  const claims = yield* ClaimRepository;
  const campaigns = yield* CampaignRepository;
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
  const findCampaign = Effect.fn("Gifts.campaign")(function* (id: string, actor: Actor) {
    const campaign = yield* campaigns.find(id);
    if (!campaign) return yield* new NotFound({ message: "Campaign not found" });
    yield* wallet(actor, campaign.sponsorWallet);
    return campaign;
  });
  const view = Effect.fn("Gifts.view")(function* (gift: Gift) {
    return {
      id: gift.id,
      kind: gift.kind,
      campaignId: gift.campaignId,
      sponsorWallet: gift.sponsorWallet,
      policy: gift.policy,
      status: gift.status,
      theme: gift.theme,
      label: gift.label,
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
  return {
    listGifts: Effect.fn("Application.listGifts")(function* (actor: Actor, offset = 0) {
      return yield* Effect.forEach(yield* gifts.list(actor.wallets, offset), view);
    }),
    getGift: Effect.fn("Application.getGift")(function* (actor: Actor, id: string) {
      return yield* view(yield* sponsor(id, actor));
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
    listCampaigns: (actor: Actor, offset = 0) =>
      campaigns.list(actor.wallets, offset).pipe(Effect.map((rows) => rows.map(campaignView))),
    getCampaign: Effect.fn("Application.getCampaign")(function* (actor: Actor, id: string) {
      const campaign = campaignView(yield* findCampaign(id, actor));
      return { campaign, invitations: yield* Effect.forEach(yield* gifts.campaign(id), view) };
    }),
    createGift: Effect.fn("Application.createGift")(function* (actor: Actor, input: CreateGift) {
      yield* wallet(actor, input.sponsorWallet);
      const createdAt = yield* now;
      yield* validatePolicy(
        input.policy,
        Math.floor(createdAt / 1000),
        product.maximumBudget,
        product.maximumLifetime,
      );
      if (new Set(input.records.map((record) => record.key)).size !== input.records.length)
        return yield* invalid("DUPLICATE_RECORD", "Starter record keys must be unique");
      const restriction = yield* recipient(input.recipient, crypto);
      if (input.kind === "existing_name" && (restriction.kind === "any" || !input.label))
        return yield* invalid(
          "INVALID_RECIPIENT",
          "Existing names require a label and a wallet or email recipient",
        );
      const normalized = input.label ? yield* label(input.label) : null;
      if (input.kind === "chosen_name" && normalized)
        return yield* invalid(
          "INVALID_LABEL",
          "Chosen-name gifts let the recipient select the name",
        );
      const id = crypto.random();
      const secret = crypto.random();
      const gift: Gift = {
        id,
        campaignId: null,
        invitationIndex: null,
        kind: input.kind,
        sponsorWallet: input.sponsorWallet.toLowerCase(),
        recipient: restriction,
        policy: input.policy,
        claimHash: hashSecret(secret),
        secretCiphertext: crypto.seal(secret, `gift:${id}:secret`),
        messageCiphertext: crypto.seal(input.message, `gift:${id}:message`),
        records: input.records,
        theme: input.theme,
        label: normalized,
        proof: [],
        metadataHash: hashText(
          JSON.stringify({ message: input.message, records: input.records, theme: input.theme }),
        ),
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
    createCampaign: Effect.fn("Application.createCampaign")(function* (
      actor: Actor,
      input: CreateCampaign,
    ) {
      yield* wallet(actor, input.sponsorWallet);
      const createdAt = yield* now;
      yield* validatePolicy(
        input.policy,
        Math.floor(createdAt / 1000),
        product.maximumBudget,
        product.maximumLifetime,
      );
      const id = crypto.random();
      const invitations = yield* Effect.forEach(input.recipients, (restriction, index) =>
        Effect.gen(function* () {
          const giftId = campaignClaimId(id, index);
          const secret = crypto.random();
          return {
            id: giftId,
            campaignId: id,
            invitationIndex: index,
            kind: "chosen_name",
            sponsorWallet: input.sponsorWallet.toLowerCase(),
            recipient: yield* recipient(restriction, crypto),
            policy: input.policy,
            claimHash: hashSecret(secret),
            secretCiphertext: crypto.seal(secret, `gift:${giftId}:secret`),
            messageCiphertext: crypto.seal(input.message, `gift:${giftId}:message`),
            records: [],
            theme: input.theme,
            label: null,
            proof: [],
            metadataHash: hashText(input.message),
            status: "draft",
            fundingHash: null,
            createdAt,
          } satisfies Gift;
        }),
      );
      const tree = merkle(
        invitations.map((gift, index) => invitationLeaf(index, gift.claimHash, gift.recipient)),
      );
      const campaign: Campaign = {
        id,
        sponsorWallet: input.sponsorWallet.toLowerCase(),
        root: tree.root,
        count: invitations.length,
        policy: input.policy,
        status: "draft",
        fundingHash: null,
        createdAt,
      };
      const calls = yield* chain.campaignPlan(campaign);
      yield* tx.run(
        Effect.gen(function* () {
          yield* campaigns.create(campaign);
          yield* Effect.forEach(invitations, (gift, index) =>
            gifts.create({ ...gift, proof: tree.proof(index) }),
          );
          yield* event(id, "campaign.prepared", actor, createdAt);
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
      if (gift.campaignId)
        return yield* invalid("CAMPAIGN_GIFT", "Confirm funding on the campaign");
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
        }),
      );
      return yield* link(gift);
    }),
    confirmCampaign: Effect.fn("Application.confirmCampaign")(function* (
      actor: Actor,
      id: string,
      hash: string,
    ) {
      const campaign = yield* findCampaign(id, actor);
      if (campaign.status === "ready" && campaign.fundingHash === hash) return { ok: true };
      if (campaign.status !== "draft")
        return yield* new Conflict({
          code: "CAMPAIGN_CHANGED",
          message: "Campaign is no longer awaiting funding",
        });
      yield* chain.confirmCampaign(campaign, hash);
      const timestamp = yield* now;
      yield* tx.run(
        Effect.gen(function* () {
          if (!(yield* campaigns.transition(id, "draft", "ready", hash)))
            return yield* new Conflict({
              code: "CAMPAIGN_CHANGED",
              message: "Campaign changed during confirmation",
            });
          yield* Effect.forEach(yield* gifts.campaign(id), (gift) =>
            gifts.transition(gift.id, "draft", "ready", hash),
          );
          yield* event(id, "campaign.funded", actor, timestamp);
        }),
      );
      return { ok: true };
    }),
    invitations: Effect.fn("Application.invitations")(function* (actor: Actor, id: string) {
      const campaign = yield* findCampaign(id, actor);
      if (campaign.status !== "ready")
        return yield* new Conflict({
          code: "CAMPAIGN_NOT_READY",
          message: "Fund the campaign before exporting invitations",
        });
      return yield* Effect.forEach(yield* gifts.campaign(id), link);
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
    emailGift: Effect.fn("Application.emailGift")(function* (actor: Actor, id: string, to: string) {
      const gift = yield* sponsor(id, actor);
      if (gift.status !== "ready")
        return yield* new Conflict({
          code: "GIFT_NOT_READY",
          message: "Only unclaimed funded gifts can be emailed",
        });
      const email = yield* recipient({ kind: "email", value: to }, crypto);
      if (gift.recipient.kind === "email" && !crypto.equal(gift.recipient.value, email.value))
        return yield* new Forbidden({ message: "Email does not match the gift recipient" });
      const { url } = yield* link(gift);
      const timestamp = yield* now;
      const dedupeKey = `email:${id}:${email.value}`;
      yield* tx.run(
        Effect.gen(function* () {
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
              JSON.stringify({ to: to.trim().toLowerCase(), url, idempotencyKey: dedupeKey }),
              `email:${id}`,
            ),
          });
          yield* jobs.retry(id, timestamp, dedupeKey);
          yield* event(id, "email.requested", actor, timestamp);
        }),
      );
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
                sessionKeyCiphertext: null,
                authorizationCiphertext: null,
                commitmentSecretCiphertext: null,
                eligibilityCiphertext: null,
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
    confirmCampaignRefund: Effect.fn("Application.confirmCampaignRefund")(function* (
      actor: Actor,
      id: string,
      hash: string,
    ) {
      const campaign = yield* findCampaign(id, actor);
      yield* chain.confirmCampaignRefund(campaign, hash);
      yield* tx.run(
        Effect.gen(function* () {
          yield* campaigns.transition(id, campaign.status, "refunded");
          for (const gift of yield* gifts.campaign(id)) {
            if (gift.status === "ready" || gift.status === "draft")
              yield* gifts.transition(gift.id, gift.status, "refunded");
          }
        }),
      );
      return { ok: true };
    }),
    refundGift: Effect.fn("Application.refundGift")(function* (actor: Actor, id: string) {
      const gift = yield* sponsor(id, actor);
      return { id, chainId: chain.chainId, calls: yield* chain.refundPlan(gift) };
    }),
    refundCampaign: Effect.fn("Application.refundCampaign")(function* (actor: Actor, id: string) {
      const campaign = yield* findCampaign(id, actor);
      return { id, chainId: chain.chainId, calls: yield* chain.campaignRefundPlan(campaign) };
    }),
  };
});
