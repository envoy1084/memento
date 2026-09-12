import { Effect } from "effect";

import { expect, it } from "vitest";

import { registrationFunding } from "../../src/integrations/ens/funding.js";
import { address } from "../fixtures/providers.js";

const request = { status: "needs-funding", token: address, required: 100n, balance: 20n } as const;

it("releases the requested registration price once within the reserved budget", async () => {
  expect(await Effect.runPromise(registrationFunding(request, address, 100n, 2))).toBe(100n);
  const error = await Effect.runPromise(
    registrationFunding(request, address, 100n, 3).pipe(Effect.flip),
  );
  expect(error.code).toBe("PRICE_CHANGED_AFTER_FUNDING");
});

it("rejects native gas requests, other tokens, zero prices and budget increases", async () => {
  await Promise.all(
    [
      { ...request, token: "native" as const },
      { ...request, token: `0x${"11".repeat(20)}` as const },
      { ...request, required: 0n },
      { ...request, required: 101n },
    ].map(async (invalid) => {
      const error = await Effect.runPromise(
        registrationFunding(invalid, address, 100n, 2).pipe(Effect.flip),
      );
      expect(error.code).toBe("PRICE_EXCEEDS_BUDGET");
    }),
  );
});
