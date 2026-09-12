import { Data, Effect } from "effect";
import { Atom } from "effect/unstable/reactivity";

import { ApiClient } from "#/atoms/api";

export class GiftQuery extends Data.Class<{ userId: string; id: string; offset?: number }> {}
export class InvitationQuery extends Data.Class<{ id: string; secret: string }> {}

export const giftAtom = Atom.family((key: GiftQuery) =>
  ApiClient.runtime
    .atom(
      Effect.gen(function* () {
        if (!key.userId) return undefined;
        return yield* (yield* ApiClient).gifts.get({ params: { id: key.id } });
      }).pipe(Effect.timeout("20 seconds")),
    )
    .pipe(Atom.withRefresh("5 seconds")),
);

export const giftsAtom = Atom.family((key: GiftQuery) =>
  ApiClient.runtime.atom(
    Effect.gen(function* () {
      if (!key.userId) return [];
      return yield* (yield* ApiClient).gifts.list({ query: { offset: key.offset ?? 0 } });
    }).pipe(Effect.timeout("20 seconds")),
  ),
);

export const invitationAtom = Atom.family((key: InvitationQuery) =>
  ApiClient.runtime.atom(
    Effect.gen(function* () {
      return yield* (yield* ApiClient).public.open({
        params: { id: key.id },
        payload: { secret: key.secret },
      });
    }).pipe(Effect.timeout("20 seconds")),
  ),
);

export const recipientClaimAtom = Atom.family((key: GiftQuery) =>
  ApiClient.runtime
    .atom(
      Effect.gen(function* () {
        if (!key.userId) return null;
        return yield* (yield* ApiClient).claims.forGift({ params: { id: key.id } });
      }).pipe(Effect.timeout("20 seconds")),
    )
    .pipe(Atom.withRefresh("5 seconds")),
);
