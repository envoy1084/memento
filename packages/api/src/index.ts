import { Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint as Endpoint,
  HttpApiGroup as Group,
  OpenApi,
  HttpApiSchema,
} from "effect/unstable/httpapi";

import {
  Actor,
  CreateGift,
  GiftPlan,
  GiftView,
  GiftLink,
  ConfirmFunding,
  OpenGift,
  PrepareClaim,
  ClaimPreparation,
  ClaimSetup,
  RegistrationView,
  AuthorizeClaim,
  ClaimView,
  Quote,
  EmailRequest,
  Success,
  Digest,
  InvalidRequest,
  Forbidden,
  NotFound,
  Conflict,
  ProviderError,
  Unauthorized,
} from "@memento/protocol";

import { Authentication } from "./middleware/authentication.js";

const error = [InvalidRequest, Forbidden, NotFound, Conflict, ProviderError, Unauthorized];

const params = { id: Digest };

const page = {
  offset: Schema.optional(Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 1000000 }))),
};

const Gifts = Group.make("gifts")
  .add(
    Endpoint.get("list", "/gifts", { query: page, success: Schema.Array(GiftView), error }),
    Endpoint.get("get", "/gifts/:id", { params, success: GiftView, error }),
    Endpoint.get("link", "/gifts/:id/link", { params, success: GiftLink, error }),
    Endpoint.get("fundingPlan", "/gifts/:id/funding", { params, success: GiftPlan, error }),
    Endpoint.post("prepare", "/gifts/prepare", { payload: CreateGift, success: GiftPlan, error }),
    Endpoint.post("confirm", "/gifts/:id/confirm", {
      params,
      payload: ConfirmFunding,
      success: GiftLink,
      error,
    }),
    Endpoint.post("email", "/gifts/:id/email", {
      params,
      payload: EmailRequest,
      success: Success,
      error,
    }),
    Endpoint.post("confirmRefund", "/gifts/:id/refund/confirm", {
      params,
      payload: ConfirmFunding,
      success: Success,
      error,
    }),
    Endpoint.post("refund", "/gifts/:id/refund", { params, success: GiftPlan, error }),
  )
  .middleware(Authentication)
  .prefix("/v1");

const Claims = Group.make("claims")
  .add(
    Endpoint.post("prepare", "/gifts/:id/claims", {
      params,
      payload: PrepareClaim,
      success: ClaimPreparation,
      error,
    }),
    Endpoint.get("forGift", "/gifts/:id/claim", {
      params,
      success: Schema.NullOr(ClaimView),
      error,
    }),
    Endpoint.get("events", "/claims/:id/events", {
      params,
      success: Schema.String.pipe(HttpApiSchema.asText({ contentType: "text/event-stream" })),
      error,
    }),
    Endpoint.get("get", "/claims/:id", { params, success: ClaimView, error }),
    Endpoint.get("registration", "/claims/:id/registration", {
      params,
      success: RegistrationView,
      error,
    }),
    Endpoint.post("setup", "/claims/:id/setup", { params, success: ClaimSetup, error }),
    Endpoint.post("authorize", "/claims/:id/authorize", {
      params,
      payload: AuthorizeClaim,
      success: ClaimView,
      error,
    }),
    Endpoint.post("retry", "/claims/:id/retry", { params, success: Success, error }),
  )
  .middleware(Authentication)
  .prefix("/v1");

const Public = Group.make("public")
  .add(
    Endpoint.post("open", "/mementos/:id/open", {
      params,
      payload: OpenGift,
      success: GiftView,
      error,
    }),
    Endpoint.get("quote", "/ens/names/:label", {
      params: { label: Schema.String },
      query: {
        duration: Schema.Int.check(Schema.isBetween({ minimum: 86400, maximum: 315360000 })),
      },
      success: Quote,
      error,
    }),
  )
  .prefix("/v1");

export class Api extends HttpApi.make("memento")
  .add(
    Group.make("session")
      .add(Endpoint.get("current", "/v1/session", { success: Actor }))
      .middleware(Authentication),
  )
  .add(Gifts)
  .add(Claims)
  .add(Public)
  .add(
    Group.make("system").add(
      Endpoint.get("ready", "/health/ready", {
        success: Schema.Struct({ status: Schema.Literal("ok") }),
        error: ProviderError,
      }),
      Endpoint.get("health", "/health/live", {
        success: Schema.Struct({ status: Schema.Literal("ok") }),
      }),
    ),
  )
  .annotateMerge(OpenApi.annotations({ title: "Memento API", version: "0.1.0" })) {}

export * from "./middleware/authentication.js";
