import { expect, it } from "vitest";

import { truncateAddress } from "#/format/address";

it("preserves the prefix, suffix and case of a wallet address", () => {
  expect(truncateAddress("0xAbCd000000000000000000000000000000001234")).toBe("0xAbCd…1234");
});

it("leaves short and empty values unchanged", () => {
  expect(truncateAddress("0x1234")).toBe("0x1234");
  expect(truncateAddress("")).toBe("");
});
