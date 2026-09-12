import { sepoliaDeployment } from "@memento/chain/deployments/sepolia";
import type { ClaimIntent, GiftView } from "@memento/protocol";

export function claimSignature(gift: Pick<typeof GiftView.Type, "id">, intent: ClaimIntent) {
  if (gift.id !== intent.giftId) throw new Error("Claim does not belong to this gift.");
  const contract: string | null = sepoliaDeployment.contracts.sponsorship;
  if (!contract) throw new Error("Gift registration is not configured yet.");
  return {
    domain: {
      name: "MementoSponsorship",
      version: "1",
      chainId: sepoliaDeployment.chainId,
      verifyingContract: contract as `0x${string}`,
    },
    primaryType: "ClaimIntent" as const,
    types: {
      ClaimIntent: [
        { name: "giftId", type: "bytes32" },
        { name: "recipient", type: "address" },
        { name: "resolver", type: "address" },
        { name: "labelhash", type: "bytes32" },
        { name: "nonce", type: "bytes32" },
        { name: "deadline", type: "uint64" },
      ],
    },
    message: {
      ...intent,
      giftId: intent.giftId as `0x${string}`,
      recipient: intent.recipient as `0x${string}`,
      resolver: intent.resolver as `0x${string}`,
      labelhash: intent.labelhash as `0x${string}`,
      nonce: intent.nonce as `0x${string}`,
      // Privy transports typed data as JSON; a decimal string preserves the uint64 exactly.
      deadline: String(intent.deadline),
    },
  };
}
