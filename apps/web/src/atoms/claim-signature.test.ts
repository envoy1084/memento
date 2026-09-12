import { hashTypedData } from "viem";
import { expect, it, vi } from "vitest";

vi.mock("@memento/chain/deployments/sepolia", () => ({
  sepoliaDeployment: { chainId: 11155111, contracts: { sponsorship: `0x${"3".repeat(40)}` } },
}));

import { claimSignature } from "#/atoms/claim-signature";

it("serializes the claim for Privy without changing its EIP-712 digest", () => {
  const digest = `0x${"1".repeat(64)}`;
  const address = `0x${"2".repeat(40)}`;
  const payload = claimSignature(
    { id: digest },
    {
      giftId: digest,
      recipient: address,
      resolver: address,
      labelhash: digest,
      nonce: digest,
      deadline: 1800000000,
    },
  );
  expect(() => JSON.stringify(payload)).not.toThrow();
  expect(payload.message.deadline).toBe("1800000000");
  expect(hashTypedData(payload)).toBe(
    hashTypedData({
      ...payload,
      message: { ...payload.message, deadline: 1800000000n },
    }),
  );
});
