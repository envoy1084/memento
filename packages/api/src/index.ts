import { Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint as Endpoint,
  HttpApiGroup as Group,
  OpenApi,
} from "effect/unstable/httpapi";

import {
  CreateGift,
  CreateCampaign,
  GiftPlan,
  GiftView,
  GiftLink,
  ConfirmFunding,
  OpenGift,
  PrepareClaim,
  ClaimPreparation,
  AuthorizeClaim,
  ClaimView,
  Quote,
  EmailRequest,
  WorldProof,
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
const Gifts = Group.make("gifts")
  .add(
    Endpoint.get("list", "/gifts", { success: Schema.Array(GiftView), error }),
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
    Endpoint.post("refund", "/gifts/:id/refund", { params, success: GiftPlan, error }),
    Endpoint.post("prepareCampaign", "/campaigns/prepare", {
      payload: CreateCampaign,
      success: GiftPlan,
      error,
    }),
    Endpoint.post("confirmCampaign", "/campaigns/:id/confirm", {
      params,
      payload: ConfirmFunding,
      success: Success,
      error,
    }),
    Endpoint.get("invitations", "/campaigns/:id/invitations", {
      params,
      success: Schema.Array(GiftLink),
      error,
    }),
    Endpoint.post("refundCampaign", "/campaigns/:id/refund", { params, success: GiftPlan, error }),
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
    Endpoint.get("get", "/claims/:id", { params, success: ClaimView, error }),
    Endpoint.post("authorize", "/claims/:id/authorize", {
      params,
      payload: AuthorizeClaim,
      success: ClaimView,
      error,
    }),
    Endpoint.post("retry", "/claims/:id/retry", { params, success: Success, error }),
    Endpoint.post("worldRequest", "/claims/:id/world/request", {
      params,
      success: Schema.Unknown,
      error,
    }),
    Endpoint.post("worldVerify", "/claims/:id/world/verify", {
      params,
      payload: WorldProof,
      success: Success,
      error,
    }),
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
  .add(Gifts)
  .add(Claims)
  .add(Public)
  .add(
    Group.make("system").add(
      Endpoint.get("health", "/health/live", {
        success: Schema.Struct({ status: Schema.Literal("ok") }),
      }),
    ),
  )
  .annotateMerge(OpenApi.annotations({ title: "Memento API", version: "0.1.0" })) {}
export * from "./middleware/authentication.js";
