import { Effect } from "effect";

import {
  type Actor,
  type GiftPolicy,
  type RecipientConstraint,
  Forbidden,
  InvalidRequest,
} from "@memento/protocol";
import { keccak256, stringToHex, concat } from "viem";
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
    BigInt(policy.maxPrice) < 1n ||
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

export const recipient = (value: RecipientConstraint, crypto: Cryptography["Service"]) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.value) && value.value.length <= 254
    ? Effect.succeed({ kind: "email", value: crypto.emailId(value.value) } as const)
    : Effect.fail(invalid("INVALID_RECIPIENT", "Invalid recipient email"));

export const recipientId = (restriction: RecipientConstraint) => restriction.value as `0x${string}`;

export const hashText = (value: string) => keccak256(stringToHex(value));

// Reservation reveals this preimage onchain, while the original private URL secret stays hidden.
export const claimSecret = (linkSecret: string) =>
  keccak256(concat([stringToHex("memento:claim:v1:"), linkSecret as `0x${string}`]));

export const hashSecret = (linkSecret: string) => keccak256(claimSecret(linkSecret));
