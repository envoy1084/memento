import { expect, layer } from "@effect/vitest";
import { Effect, Redacted } from "effect";

import { concat, keccak256 } from "viem";

import { merkle, invitationLeaf } from "../../src/features/policy.js";
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
    it.effect("builds valid indexed proofs for an odd campaign and the 500-invitation limit", () =>
      Effect.sync(() => {
        for (const count of [1, 3, 500]) {
          const leaves = Array.from({ length: count }, (_, index) =>
            invitationLeaf(index, `0x${"33".repeat(32)}`, { kind: "any", value: "" }),
          );
          const tree = merkle(leaves);

          for (const [index, leaf] of leaves.entries()) {
            const root = tree
              .proof(index)
              .reduce(
                (current, sibling) =>
                  keccak256(concat(current < sibling ? [current, sibling] : [sibling, current])),
                leaf,
              );

            expect(root).toBe(tree.root);
          }
        }
      }),
    );
  },
);
