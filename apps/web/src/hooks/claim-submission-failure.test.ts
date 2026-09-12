import { expect, it } from "vitest";

import { isRejectedClaimSubmission, readClaimSubmission } from "#/hooks/claim-submission-failure";

const message = "Execution reverted for an unknown reason. Details: execution reverted";
const rejected = Object.assign(new Error(message), {
  name: "PrivyApiError",
  status: 400,
  code: "transaction_broadcast_failure",
});

it("recognizes Privy's rejected execution, including wrapped errors", () => {
  expect(isRejectedClaimSubmission(rejected)).toBe(true);
  expect(isRejectedClaimSubmission(new Error("Wallet failed", { cause: rejected }))).toBe(true);
});

it("does not treat unknown broadcast outcomes as safe to resubmit", () => {
  for (const error of [
    new Error(message),
    { ...rejected, status: 500, message },
    { ...rejected, message: "Request timed out" },
    { ...rejected, code: "unknown_error", message },
    new TypeError("Failed to fetch"),
    { name: "PrivyApiError", status: 400, code: "transaction_broadcast_failure" },
  ])
    expect(isRejectedClaimSubmission(error)).toBe(false);
});

function journal(value: string, error?: string) {
  const entries = new Map([
    ["claim", value],
    ["other-claim", "pending"],
  ]);
  if (error) entries.set("claim:error", error);
  return {
    entries,
    getItem: (key: string) => entries.get(key) ?? null,
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
}

it("unblocks the legacy rejected claim without clearing other submissions", () => {
  const storage = journal("pending", message);
  expect(readClaimSubmission(storage, "claim")).toBeNull();
  expect(storage.entries.has("claim:error")).toBe(false);
  expect(storage.entries.get("other-claim")).toBe("pending");
  expect(readClaimSubmission(storage, "claim")).toBeNull();
});

it("preserves submitted hashes and genuinely uncertain pending requests", () => {
  for (const [value, error] of [
    [`0x${"1".repeat(64)}`, message],
    ["pending", "Failed to fetch"],
    ["pending", undefined],
  ] as const) {
    const storage = journal(value, error);
    expect(readClaimSubmission(storage, "claim")).toBe(value);
    expect(storage.entries.get("claim")).toBe(value);
  }
});
