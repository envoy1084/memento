import { expect, it } from "@effect/vitest";
import { Effect } from "effect";

import type { User } from "@privy-io/node";

import { verifiedActor } from "../../src/profile.js";

const profile: Pick<User, "id" | "linked_accounts"> = {
  id: "did:privy:bob",
  linked_accounts: [
    {
      type: "email",
      address: " Bob@Example.test ",
      verified_at: 1,
      first_verified_at: 1,
      latest_verified_at: 1,
    },
    {
      type: "email",
      address: "unverified@example.test",
      verified_at: 0,
      first_verified_at: null,
      latest_verified_at: null,
    },
    {
      type: "wallet",
      chain_type: "ethereum",
      address: `0x${"AB".repeat(20)}`,
      verified_at: 1,
      first_verified_at: 1,
      latest_verified_at: 1,
      wallet_client: "unknown",
    },
    {
      type: "wallet",
      chain_type: "ethereum",
      address: `0x${"CD".repeat(20)}`,
      verified_at: 0,
      first_verified_at: null,
      latest_verified_at: null,
      wallet_client: "unknown",
    },
  ],
};

it.effect("uses only verified linked accounts and binds them to the token subject", () =>
  Effect.gen(function* () {
    const actor = yield* verifiedActor(profile.id, profile);

    expect(actor.emails).toEqual(["bob@example.test"]);
    expect(actor.wallets).toEqual([`0x${"ab".repeat(20)}`]);
    expect((yield* verifiedActor("did:privy:alice", profile).pipe(Effect.flip))._tag).toBe(
      "Unauthorized",
    );
  }),
);

it.effect("rejects malformed verified wallet profiles", () =>
  Effect.gen(function* () {
    const account = profile.linked_accounts[2];

    if (!account || account.type !== "wallet") return yield* Effect.die("Missing wallet fixture");

    expect(
      (yield* verifiedActor(profile.id, {
        ...profile,
        linked_accounts: [{ ...account, address: "invalid" }],
      }).pipe(Effect.flip))._tag,
    ).toBe("Unauthorized");
  }),
);
