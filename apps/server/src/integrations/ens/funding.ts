import { Effect } from "effect";

import type { HcaRegistrationProgress } from "@ensforge/core/hca";
import { Conflict } from "@memento/protocol";

// Escrow permits one release. Retries must never turn a provider request into a second withdrawal.
export const registrationFunding = Effect.fn("Registration.funding")(function* (
  request: Extract<HcaRegistrationProgress, { status: "needs-funding" }>,
  token: string,
  maximum: bigint,
  escrowStatus: number,
) {
  if (
    request.token.toLowerCase() !== token.toLowerCase() ||
    request.required <= 0n ||
    request.required > maximum
  )
    return yield* new Conflict({
      code: "PRICE_EXCEEDS_BUDGET",
      message: "ENSForge requested funding outside the gift policy",
    });

  if (escrowStatus !== 2)
    return yield* new Conflict({
      code: "PRICE_CHANGED_AFTER_FUNDING",
      message: "Escrow was already released; no additional funding will be sent",
    });

  return request.required;
});
