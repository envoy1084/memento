import { Effect, Schema } from "effect";

import { Actor, Unauthorized } from "@memento/protocol";
import type { User } from "@privy-io/node";

export const verifiedActor = (subject: string, user: Pick<User, "id" | "linked_accounts">) => {
  if (subject !== user.id)
    return Effect.fail(new Unauthorized({ message: "Token and user profile do not match" }));
  return Schema.decodeUnknownEffect(Actor)({
    userId: user.id,
    wallets: user.linked_accounts.flatMap((account) =>
      account.type === "wallet" && account.chain_type === "ethereum" && account.verified_at > 0
        ? [account.address.toLowerCase()]
        : [],
    ),
    emails: user.linked_accounts.flatMap((account) =>
      account.type === "email" && account.verified_at > 0
        ? [account.address.trim().toLowerCase()]
        : [],
    ),
  }).pipe(Effect.mapError(() => new Unauthorized({ message: "Invalid verified user profile" })));
};
