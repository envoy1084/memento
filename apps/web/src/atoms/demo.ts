import { Schema } from "effect";
import { Atom } from "effect/unstable/reactivity";

import { PreviewState, type PreviewState as DemoState } from "@memento/protocol";

export type {
  PreviewGift as Gift,
  PreviewCampaign as Campaign,
  PreviewProfile as Profile,
  PreviewState as DemoState,
} from "@memento/protocol";

export const initialDemo: DemoState = {
  version: 1,
  connected: false,
  gifts: [
    {
      id: "a-little-beginning",
      kind: "choice",
      recipient: "Bob",
      name: "",
      budget: 25,
      years: 1,
      minLength: 5,
      maxLength: 20,
      message: "For your next chapter. Make it a good one. ♡",
      theme: "aura",
      state: "ready",
      created: "Sep 8, 2026",
    },
    {
      id: "just-for-you",
      kind: "owned",
      recipient: "Sophie",
      name: "sophie.eth",
      budget: 0,
      years: 1,
      minLength: 3,
      maxLength: 30,
      message: "Saw this and thought of you. A little corner of the internet, all yours.",
      theme: "rose",
      state: "ready",
      created: "Sep 7, 2026",
    },
    {
      id: "a-new-chapter",
      kind: "choice",
      recipient: "Jamie",
      name: "heyjamie.eth",
      budget: 20,
      years: 1,
      minLength: 5,
      maxLength: 20,
      message: "Keep creating.",
      theme: "mint",
      state: "claimed",
      created: "Sep 5, 2026",
    },
    {
      id: "expired-invitation",
      kind: "choice",
      recipient: "Alex",
      name: "",
      budget: 20,
      years: 1,
      minLength: 5,
      maxLength: 20,
      message: "Welcome onchain!",
      theme: "aura",
      state: "expired",
      created: "Aug 1, 2026",
    },
  ],
  campaigns: [
    {
      id: "builders-club",
      name: "The Builders Club",
      description: "A home for curious minds. Your first name is on us.",
      quantity: 100,
      budget: 20,
      years: 1,
      minLength: 5,
      maxLength: 20,
      worldId: true,
      claimed: 32,
      paused: false,
      closed: false,
      invitations: [{ id: "welcome", recipient: "Community invitation", claimed: false }],
    },
  ],
  profiles: [],
};

export const demoAtom = Atom.make<DemoState>(initialDemo).pipe(Atom.keepAlive);
export const storageNoticeAtom = Atom.make<string | undefined>(undefined).pipe(Atom.keepAlive);
export const giftsAtom = Atom.make((get) => get(demoAtom).gifts);
export const campaignsAtom = Atom.make((get) => get(demoAtom).campaigns);
export const connectedAtom = Atom.make((get) => get(demoAtom).connected);

export function decodeDemo(value: string): DemoState {
  return Schema.decodeUnknownSync(Schema.fromJsonString(PreviewState))(value);
}

export function nameAvailability(
  raw: string,
  minLength = 5,
  maxLength = 20,
  budget = 25,
  years = 1,
) {
  const name = raw
    .trim()
    .toLowerCase()
    .replace(/\.eth$/, "");
  const price = (name.length < 4 ? 640 : name.length < 5 ? 160 : 5) * years;

  if (!name)
    return { name, price, available: false, reason: "Type a name to find your beginning." };

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))
    return {
      name,
      price,
      available: false,
      reason: "Use letters a–z, numbers, or a hyphen between words.",
    };

  if (name.length < minLength || name.length > maxLength)
    return {
      name,
      price,
      available: false,
      reason: `Choose a name with ${minLength}–${maxLength} characters.`,
    };

  if (["vitalik", "ethereum", "memento", "alice", "taken"].includes(name))
    return { name, price, available: false, reason: "This name already has a home. Try another?" };

  if (price > budget)
    return {
      name,
      price,
      available: false,
      reason: "This name is above your gift’s budget. Try a longer name.",
    };

  return { name, price, available: true, reason: "Available · completely covered by your gift" };
}

export function claimGift(state: DemoState, id: string, name: string): DemoState {
  const gift = state.gifts.find((entry) => entry.id === id);

  if (!gift || gift.state !== "ready") throw new Error("This gift is no longer available.");

  const chosen =
    gift.kind === "owned"
      ? gift.name
      : `${nameAvailability(name, gift.minLength, gift.maxLength, gift.budget, gift.years).name}.eth`;

  if (
    gift.kind === "choice" &&
    !nameAvailability(name, gift.minLength, gift.maxLength, gift.budget, gift.years).available
  )
    throw new Error("Choose an available name within the gift rules.");

  if (state.profiles.some((profile) => profile.name === chosen))
    throw new Error("This name already has a home. Choose another name.");

  return {
    ...state,
    gifts: state.gifts.map((entry) =>
      entry.id === id ? { ...entry, name: chosen, state: "claimed" } : entry,
    ),
    profiles: [
      ...state.profiles,
      {
        name: chosen,
        bio: "A new beginning.",
        website: "",
        theme: gift.theme,
        primary: state.profiles.length === 0,
      },
    ],
  };
}

export function claimCampaign(
  state: DemoState,
  id: string,
  invitationId: string,
  name: string,
): DemoState {
  const campaign = state.campaigns.find((entry) => entry.id === id);
  const invitation = campaign?.invitations.find((entry) => entry.id === invitationId);

  if (
    !campaign ||
    !invitation ||
    invitation.claimed ||
    campaign.closed ||
    campaign.paused ||
    campaign.claimed >= campaign.quantity
  )
    throw new Error("This invitation is no longer available.");

  const quote = nameAvailability(
    name,
    campaign.minLength,
    campaign.maxLength,
    campaign.budget,
    campaign.years,
  );

  if (!quote.available) throw new Error(quote.reason);

  if (state.profiles.some((profile) => profile.name === `${quote.name}.eth`))
    throw new Error("This name already has a home. Choose another name.");

  return {
    ...state,
    campaigns: state.campaigns.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            claimed: entry.claimed + 1,
            invitations: entry.invitations.map((invite) =>
              invite.id === invitationId ? { ...invite, claimed: true } : invite,
            ),
          }
        : entry,
    ),
    profiles: [
      ...state.profiles,
      {
        name: `${quote.name}.eth`,
        bio: "A new beginning.",
        website: "",
        theme: "aura",
        primary: state.profiles.length === 0,
      },
    ],
  };
}
