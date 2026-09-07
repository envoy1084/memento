import { Context, Effect, Layer } from "effect";

import { makeClaims } from "./features/claims.js";
import { makeGifts } from "./features/gifts.js";
import { label } from "./features/policy.js";
import { Chain } from "./services/chain.js";
const make = Effect.gen(function* () {
  const gifts = yield* makeGifts;
  const claims = yield* makeClaims;
  const chain = yield* Chain;
  return {
    ...gifts,
    ...claims,
    quote: Effect.fn("Application.quote")(function* (input: string, duration: number) {
      return yield* chain.quote(yield* label(input), duration);
    }),
  };
});
export class Application extends Context.Service<Application, Effect.Success<typeof make>>()(
  "@memento/application/Application",
) {
  static readonly layer = Layer.effect(Application, make);
}
export * from "./services/chain.js";
export * from "./services/cryptography.js";
export { claimIntent, claimView } from "./features/claims.js";
export {
  recipientId,
  recipientKind,
  hashText,
  hashSecret,
  invitationLeaf,
  campaignClaimId,
} from "./features/policy.js";
export * from "./services/worker.js";
