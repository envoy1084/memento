import { expect, it } from "vitest";

import { formatDate, formatTimeLeft, formatRegistrationDuration } from "./date";

it("displays calendar dates with a named month", () => {
  const date = new Date(2026, 8, 12, 12);
  expect(formatDate(date.getTime() / 1000)).toBe("Sep 12, 2026");
});

it("handles remaining time and expiry boundaries", () => {
  const now = 1000000;
  expect(formatTimeLeft((now + 30 * 86400000) / 1000, now)).toBe("30 days left");
  expect(formatTimeLeft((now + 86400000) / 1000, now)).toBe("1 day left");
  expect(formatTimeLeft((now + 1000) / 1000, now)).toBe("Less than a day left");
  expect(formatTimeLeft(now / 1000, now)).toBe("Expired");
});

it("uses singular and plural registration durations", () => {
  expect(formatRegistrationDuration(31536000)).toBe("1 year");
  expect(formatRegistrationDuration(94608000)).toBe("3 years");
});
