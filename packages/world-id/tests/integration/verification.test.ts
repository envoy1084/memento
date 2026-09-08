import { expect, layer } from "@effect/vitest";
import { Effect, Layer, Redacted, Ref } from "effect";

import { hashSignal } from "@worldcoin/idkit-core/hashing";

import { WorldId, WorldVerifier } from "../../src/index.js";
const config = {
  appId: "app_test",
  rpId: "rp_test",
  action: "claim",
  environment: "staging",
  signingKey: Redacted.make("01".repeat(32)),
} as const;
const expected = { nonce: "nonce", signal: "chain:campaign:claim:wallet:nonce" };
const proof = {
  protocol_version: "3.0",
  nonce: expected.nonce,
  action: config.action,
  environment: "staging",
  responses: [
    {
      identifier: "selfie",
      signal_hash: hashSignal(expected.signal),
      nullifier: "0x000f",
      proof: "opaque-proof",
      merkle_root: "opaque-root",
    },
  ],
  user_presence_completed: false,
};
const calls = Ref.make<readonly unknown[]>([]);
const testLayer = WorldId.layer(config).pipe(
  Layer.provide(
    Layer.effect(
      WorldVerifier,
      Effect.gen(function* () {
        const requests = yield* calls;
        return WorldVerifier.of({
          verify: (_rpId, original) =>
            Ref.update(requests, (values) => {
              expect(original).toEqual(proof);
              return [...values, original];
            }),
        });
      }),
    ),
  ),
);
layer(testLayer)("World ID binding", (it) => {
  it.effect("forwards the original proof and canonicalizes its nullifier", () =>
    Effect.gen(function* () {
      expect(yield* (yield* WorldId).verify(proof, expected)).toBe("15");
    }),
  );
  it.effect("rejects mismatched action, nonce, environment, credential and signal", () =>
    Effect.gen(function* () {
      const world = yield* WorldId;
      for (const invalid of [
        { ...proof, action: "other" },
        { ...proof, nonce: "other" },
        { ...proof, environment: "production" },
        { ...proof, responses: [{ ...proof.responses[0], identifier: "device" }] },
        { ...proof, responses: [{ ...proof.responses[0], signal_hash: hashSignal("other") }] },
      ]) {
        expect((yield* world.verify(invalid, expected).pipe(Effect.flip))._tag).toBe("Forbidden");
      }
    }),
  );
  it.effect("rejects session proofs and malformed nullifiers", () =>
    Effect.gen(function* () {
      const world = yield* WorldId;
      for (const invalid of [
        {
          ...proof,
          responses: [
            {
              identifier: "selfie",
              session_nullifier: ["0x01"],
              signal_hash: hashSignal(expected.signal),
            },
          ],
        },
        { ...proof, responses: [{ ...proof.responses[0], nullifier: "0x" }] },
        { ...proof, responses: [{ ...proof.responses[0], nullifier: `0x${"f".repeat(65)}` }] },
        { ...proof, responses: [...proof.responses, ...proof.responses] },
      ]) {
        expect((yield* world.verify(invalid, expected).pipe(Effect.flip))._tag).toBe("Forbidden");
      }
    }),
  );
});
