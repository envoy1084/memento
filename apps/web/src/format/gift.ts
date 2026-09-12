import { formatUnits } from "viem";

import type { GiftTheme } from "#/components/common/theme-picker";

export const giftTheme = (theme: string): GiftTheme =>
  theme === "rose" || theme === "mint" ? theme : "aura";
export const giftAmount = (amount: string) => `${formatUnits(BigInt(amount), 6)} USDC`;
