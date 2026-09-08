import { Effect } from "effect";

import {
  type Actor,
  type GiftPolicy,
  type RecipientConstraint,
  Forbidden,
  InvalidRequest,
} from "@memento/protocol";
import { encodeAbiParameters, keccak256, pad, stringToHex, concat } from "viem";
import { normalize } from "viem/ens";

import type { Cryptography } from "../services/cryptography.js";

export const invalid = (code: string, message: string) => new InvalidRequest({ code, message });
export const wallet = (actor: Actor, address: string) =>
  actor.wallets.some((candidate) => candidate.toLowerCase() === address.toLowerCase())
    ? Effect.void
    : Effect.fail(new Forbidden({ message: "Wallet is not linked to this account" }));
export const label = (input: string) =>
  Effect.try({
    try: () => {
      const name = normalize(input);
      const value = name.endsWith(".eth") ? name.slice(0, -4) : name;
      if (value.includes(".") || value.length === 0 || Buffer.byteLength(value) > 63)
        throw new Error("Invalid label");
      return value;
    },
    catch: () => invalid("INVALID_ENS_LABEL", "Enter a single valid ENS label"),
  });
export const validatePolicy = (
  policy: GiftPolicy,
  now: number,
  maximumBudget: bigint,
  maximumLifetime: number,
) => {
  if (
    policy.minLength > policy.maxLength ||
    policy.expiresAt <= now + 600 ||
    policy.expiresAt > now + maximumLifetime ||
    BigInt(policy.maxPrice) <= 0n ||
    BigInt(policy.maxPrice) > maximumBudget ||
    BigInt(policy.maxPrice) >= 2n ** 96n
  ) {
    return Effect.fail(
      invalid(
        "INVALID_POLICY",
        "Check the budget, length range and expiry (at least ten minutes away)",
      ),
    );
  }
  return Effect.void;
};
export const recipient = (value: RecipientConstraint, crypto: Cryptography["Service"]) => {
  switch (value.kind) {
    case "any":
      return Effect.succeed({ kind: "any", value: "" } as const);
    case "wallet":
      return /^0x[0-9a-fA-F]{40}$/.test(value.value) && BigInt(value.value) !== 0n
        ? Effect.succeed({ kind: "wallet", value: value.value.toLowerCase() } as const)
        : Effect.fail(invalid("INVALID_RECIPIENT", "Invalid recipient wallet"));
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.value) && value.value.length <= 254
        ? Effect.succeed({ kind: "email", value: crypto.emailId(value.value) } as const)
        : Effect.fail(invalid("INVALID_RECIPIENT", "Invalid recipient email"));
  }
};
export const recipientId = (restriction: RecipientConstraint) =>
  restriction.kind === "any"
    ? (`0x${"00".repeat(32)}` as const)
    : restriction.kind === "wallet"
      ? pad(restriction.value as `0x${string}`, { size: 32 })
      : (restriction.value as `0x${string}`);
export const recipientKind = (restriction: RecipientConstraint) =>
  ({ any: 0, wallet: 1, email: 2 })[restriction.kind];
export const hashText = (value: string) => keccak256(stringToHex(value));
// Reservation reveals this preimage onchain, while the original private URL secret stays hidden.
export const claimSecret = (linkSecret: string) =>
  keccak256(concat([stringToHex("memento:claim:v1:"), linkSecret as `0x${string}`]));
export const hashSecret = (linkSecret: string) => keccak256(claimSecret(linkSecret));
export const campaignClaimId = (id: string, index: number) =>
  keccak256(
    encodeAbiParameters([{ type: "bytes32" }, { type: "uint32" }], [id as `0x${string}`, index]),
  );
export const invitationLeaf = (
  index: number,
  secretHash: string,
  restriction: RecipientConstraint,
) =>
  keccak256(
    keccak256(
      encodeAbiParameters(
        [{ type: "uint32" }, { type: "bytes32" }, { type: "uint8" }, { type: "bytes32" }],
        [index, secretHash as `0x${string}`, recipientKind(restriction), recipientId(restriction)],
      ),
    ),
  );
const pair = (a: `0x${string}`, b: `0x${string}`) => keccak256(concat(a < b ? [a, b] : [b, a]));
export const merkle = (leaves: readonly `0x${string}`[]) => {
  let current = [...leaves];
  if (!current[0]) throw new Error("A campaign needs invitations");
  const levels = [current];
  while (current.length > 1) {
    const next: `0x${string}`[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1];
      if (left) next.push(right ? pair(left, right) : left);
    }
    current = next;
    levels.push(current);
  }
  const root = current[0];
  if (!root) throw new Error("Invalid Merkle tree");
  return {
    root,
    proof: (index: number) => {
      if (index < 0 || index >= leaves.length) throw new Error("Invalid invitation index");
      let position = index;
      const proof: `0x${string}`[] = [];
      for (const level of levels.slice(0, -1)) {
        const sibling = level[position ^ 1];
        if (sibling) proof.push(sibling);
        position = Math.floor(position / 2);
      }
      return proof;
    },
  };
};
