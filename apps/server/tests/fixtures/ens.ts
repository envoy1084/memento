import { Redacted, Effect } from "effect";

import { sepoliaHcaDeployment } from "@ensforge/contracts/deployments";
import { sepoliaDeployment } from "@memento/chain/deployments/sepolia";
import { type Claim, type Gift } from "@memento/protocol";
import { generatePrivateKey } from "viem/accounts";

import { EnsConfig, configuredDeployment } from "../../src/integrations/ens/config.js";
import { address, alice, bob, digest } from "./providers.js";

export const ensConfig = EnsConfig.of({
  ...Effect.runSync(
    configuredDeployment({
      ...sepoliaDeployment,
      contracts: { ...sepoliaDeployment.contracts, sponsorship: address, vault: address },
    }),
  ),
  rpcUrl: Redacted.make("http://unused.test"),
  coordinatorKey: Redacted.make(generatePrivateKey()),
  rhinestoneKey: Redacted.make("test"),
  confirmations: 2,
});

export const ensGift: Gift = {
  id: digest,
  campaignId: null,
  invitationIndex: null,
  kind: "chosen_name",
  sponsorWallet: alice.wallets[0] ?? address,
  recipient: { kind: "any", value: "" },
  policy: {
    maxPrice: "1000",
    duration: 31536000,
    expiresAt: 86400,
    minLength: 3,
    maxLength: 63,
    worldRequired: false,
    setPrimaryName: true,
  },
  claimHash: digest,
  secretCiphertext: null,
  messageCiphertext: "",
  records: [{ key: "url", value: "https://example.test" }],
  theme: "moon",
  label: null,
  proof: [],
  metadataHash: digest,
  status: "reserved",
  fundingHash: digest,
  createdAt: 0,
};

export const ensClaim: Claim = {
  id: digest,
  giftId: digest,
  userId: "bob",
  recipientWallet: bob.wallets[0] ?? address,
  label: "bobbbb",
  hca: address,
  resolver: address,
  resolverSalt: digest,
  labelhash: digest,
  state: "reserved",
  nonce: digest,
  deadline: 86400,
  sessionExpiry: 86400,
  sessionKeyCiphertext: null,
  authorizationCiphertext: null,
  sessionPayload: null,
  commitmentSecretCiphertext: null,
  commitment: digest,
  commitmentAt: null,
  signature: null,
  eligibilityCiphertext: null,
  recipientAuthorizationCiphertext: null,
  worldVerified: false,
  price: "100",
  lastError: null,
  createdAt: 0,
};

export const verifiedHca = {
  kind: "ens-hca",
  address,
  owner: ensClaim.recipientWallet as `0x${string}`,
  chainId: 11155111,
  profileId: sepoliaHcaDeployment.generation.id,
  initialImplementation: ensConfig.hcaImplementation,
  currentImplementation: ensConfig.hcaImplementation,
  salt: 0n,
  sessionNonce: 0n,
  verifiedAtBlock: 1n,
} as const;
