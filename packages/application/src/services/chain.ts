import { Context, type Effect } from "effect";

import type {
  ApplicationError,
  Campaign,
  Claim,
  Gift,
  Quote,
  Call,
  ClaimIntent,
} from "@memento/protocol";

export interface PreparedAccount {
  readonly hca: string;
  readonly resolver: string;
  readonly resolverSalt: string;
  readonly session: unknown;
  readonly sessionKey: string;
  readonly commitmentSecret: string;
  readonly commitment: string;
  readonly typedData: unknown;
}
export interface ChainProgress {
  readonly state: Claim["state"];
  readonly commitmentAt?: number;
  readonly price?: string;
  readonly retryAt?: number;
}
export class Chain extends Context.Service<
  Chain,
  {
    readonly chainId: number;
    readonly quote: (label: string, duration: number) => Effect.Effect<Quote, ApplicationError>;
    readonly giftPlan: (
      gift: Gift,
    ) => Effect.Effect<readonly (typeof Call.Type)[], ApplicationError>;
    readonly campaignPlan: (
      campaign: Campaign,
    ) => Effect.Effect<readonly (typeof Call.Type)[], ApplicationError>;
    readonly confirmGift: (gift: Gift, hash: string) => Effect.Effect<void, ApplicationError>;
    readonly confirmCampaign: (
      campaign: Campaign,
      hash: string,
    ) => Effect.Effect<void, ApplicationError>;
    readonly prepare: (
      gift: Gift,
      recipient: string,
      label: string,
      nonce: string,
      deadline: number,
    ) => Effect.Effect<PreparedAccount, ApplicationError>;
    readonly typedIntent: (gift: Gift, intent: ClaimIntent) => unknown;
    readonly authorize: (
      gift: Gift,
      claim: Claim,
      signature: string,
      sessionAuthorization: unknown,
    ) => Effect.Effect<
      {
        readonly session: string;
        readonly recipientAuthorization: string;
        readonly eligibility: string;
      },
      ApplicationError
    >;
    readonly advance: (gift: Gift, claim: Claim) => Effect.Effect<ChainProgress, ApplicationError>;
    readonly refundPlan: (
      gift: Gift,
    ) => Effect.Effect<readonly (typeof Call.Type)[], ApplicationError>;
    readonly campaignRefundPlan: (
      campaign: Campaign,
    ) => Effect.Effect<readonly (typeof Call.Type)[], ApplicationError>;
  }
>()("@memento/application/Chain") {}

export class Mailer extends Context.Service<
  Mailer,
  {
    readonly send: (payload: {
      to: string;
      url: string;
      idempotencyKey: string;
    }) => Effect.Effect<void, ApplicationError>;
  }
>()("@memento/application/Mailer") {}
export class Product extends Context.Service<
  Product,
  {
    readonly webOrigin: string;
    readonly maximumBudget: bigint;
    readonly maximumLifetime: number;
  }
>()("@memento/application/Product") {}
