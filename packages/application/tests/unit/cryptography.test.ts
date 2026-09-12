import { expect, layer } from "@effect/vitest";
import { Effect, Redacted } from "effect";

import { Cryptography } from "../../src/services/cryptography.js";

layer(Cryptography.live(Redacted.make("11".repeat(32)), Redacted.make("22".repeat(32))))(
  "encrypted claim material",
  (it) => {
    it.effect("authenticates ciphertext, its record context and email normalization", () =>
      Effect.gen(function* () {
        const crypto = yield* Cryptography;
        const first = crypto.seal("private", "claim:one");
        const second = crypto.seal("private", "claim:one");

        expect(first).not.toBe(second);
        expect(yield* crypto.open(first, "claim:one")).toBe("private");
        expect((yield* crypto.open(first, "claim:two").pipe(Effect.flip))._tag).toBe(
          "ProviderError",
        );
        expect((yield* crypto.open(first.slice(0, -4), "claim:one").pipe(Effect.flip))._tag).toBe(
          "ProviderError",
        );
        expect(crypto.emailId(" Bob@Example.test ")).toBe(crypto.emailId("bob@example.test"));
        expect(crypto.emailId("bob@example.test")).not.toBe(crypto.emailId("alice@example.test"));
      }),
    );
  },
);
