import { describe, expect, it } from "vitest";

import { claimCampaign, claimGift, decodeDemo, initialDemo, nameAvailability } from "./demo";

describe("local preview journeys", () => {
  it("checks name policy, availability, budget, and duration", () => {
    expect(nameAvailability(" BOBBY.eth ").name).toBe("bobby");
    expect(nameAvailability("bobby").available).toBe(true);
    expect(nameAvailability("alice").available).toBe(false);
    expect(nameAvailability("bad--name").available).toBe(false);
    expect(nameAvailability("john", 3, 20, 20).available).toBe(false);
    expect(nameAvailability("bobby", 5, 20, 5, 2).available).toBe(false);
    expect(nameAvailability("bobby", 5, 20, 10, 2).available).toBe(true);
  });
  it("claims a gift once and creates the recipient identity", () => {
    const next = claimGift(initialDemo, "a-little-beginning", "bobby");

    expect(next.profiles[0]?.name).toBe("bobby.eth");
    expect(next.gifts[0]?.state).toBe("claimed");
    expect(() => claimGift(next, "a-little-beginning", "bobby")).toThrow();
    expect(initialDemo.gifts[0]?.state).toBe("ready");
  });
  it("keeps owned names exact and rejects expired gifts", () => {
    expect(claimGift(initialDemo, "just-for-you", "somethingelse").profiles[0]?.name).toBe(
      "sophie.eth",
    );
    expect(() => claimGift(initialDemo, "expired-invitation", "bobby")).toThrow();
  });
  it("consumes campaign invitations once and updates totals", () => {
    const next = claimCampaign(initialDemo, "builders-club", "welcome", "bobby");

    expect(next.campaigns[0]?.claimed).toBe(33);
    expect(() => claimCampaign(next, "builders-club", "welcome", "another")).toThrow();
    expect(() => claimCampaign(initialDemo, "builders-club", "missing", "bobby")).toThrow();
  });
  it("blocks paused and exhausted campaigns", () => {
    for (const overrides of [{ paused: true }, { closed: true }, { claimed: 100 }]) {
      const next = {
        ...initialDemo,
        campaigns: initialDemo.campaigns.map((campaign) => ({ ...campaign, ...overrides })),
      };

      expect(() => claimCampaign(next, "builders-club", "welcome", "bobby")).toThrow();
    }
  });
  it("prevents two gifts from creating the same preview identity", () => {
    const next = claimGift(initialDemo, "a-little-beginning", "bobby");

    expect(() => claimCampaign(next, "builders-club", "welcome", "bobby")).toThrow(
      "already has a home",
    );
  });
  it("restores only the versioned preview schema", () => {
    expect(decodeDemo(JSON.stringify(initialDemo))).toEqual(initialDemo);
    expect(decodeDemo(JSON.stringify({ ...initialDemo, connected: true }))).toEqual(initialDemo);
    expect(() => decodeDemo('{"version":0}')).toThrow();
    expect(() => decodeDemo("broken")).toThrow();
    expect(() =>
      decodeDemo(
        JSON.stringify({
          ...initialDemo,
          campaigns: [{ ...initialDemo.campaigns[0], quantity: 501 }],
        }),
      ),
    ).toThrow();
  });
});
