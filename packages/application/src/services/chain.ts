import { Context, type Effect } from "effect";

import type {
  ApplicationError,
  GiftEmail,
  ClaimSetup,
  RegistrationView,
  Claim,
  Gift,
  Quote,
  Call,
  ClaimIntent,
} from "@memento/protocol";

export interface PreparedAccount {
  readonly resolver: string;
  readonly resolverSalt: string;
  readonly commitmentSecret: string;
  readonly commitment: string;
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
    readonly registrationView: (claim: Claim) => Effect.Effect<RegistrationView, ApplicationError>;
    readonly setup: (gift: Gift, claim: Claim) => Effect.Effect<ClaimSetup, ApplicationError>;
    readonly chainId: number;
    readonly quote: (label: string, duration: number) => Effect.Effect<Quote, ApplicationError>;
    readonly giftPlan: (
      gift: Gift,
    ) => Effect.Effect<readonly (typeof Call.Type)[], ApplicationError>;
    readonly confirmGift: (gift: Gift, hash: string) => Effect.Effect<void, ApplicationError>;
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
    ) => Effect.Effect<
      {
        readonly recipientAuthorization: string;
      },
      ApplicationError
    >;
    readonly advance: (gift: Gift, claim: Claim) => Effect.Effect<ChainProgress, ApplicationError>;
    readonly confirmRefund: (gift: Gift, hash: string) => Effect.Effect<void, ApplicationError>;
    readonly refundPlan: (
      gift: Gift,
    ) => Effect.Effect<readonly (typeof Call.Type)[], ApplicationError>;
  }
>()("@memento/application/Chain") {}

export class Mailer extends Context.Service<
  Mailer,
  {
    readonly send: (payload: GiftEmail) => Effect.Effect<void, ApplicationError>;
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
