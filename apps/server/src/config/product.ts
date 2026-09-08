export const productPolicy = {
  worldAction: "memento-claim",
  maximumBudget: 100_000_000n,
  maximumLifetime: 90 * 86400,
} as const;
