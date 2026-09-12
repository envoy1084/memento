import { Redacted, Effect } from "effect";

import { sepoliaDeployment } from "@memento/chain/deployments/sepolia";
import { type Claim, type Gift } from "@memento/protocol";
import { generatePrivateKey } from "viem/accounts";

import { EnsConfig, configuredDeployment } from "../../src/integrations/ens/config.js";
import { address, alice, bob, digest } from "./providers.js";

export const ensConfig = EnsConfig.of({
  ...Effect.runSync(
    configuredDeployment({
      ...sepoliaDeployment,
      contracts: { ...sepoliaDeployment.contracts, sponsorship: address },
    }),
  ),
  rpcUrl: Redacted.make("http://unused.test"),
  coordinatorKey: Redacted.make(generatePrivateKey()),
  confirmations: 2,
});

export const ensGift: Gift = {
  id: digest,
  sponsorWallet: alice.wallets[0] ?? address,
  recipient: { kind: "email", value: digest },
  policy: {
    maxPrice: "1000",
    duration: 31536000,
    expiresAt: 86400,
    minLength: 3,
    maxLength: 63,
  },
  claimHash: digest,
  secretCiphertext: null,
  messageCiphertext: "",
  theme: "moon",
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
  resolver: address,
  resolverSalt: digest,
  labelhash: digest,
  state: "authorized",
  nonce: digest,
  deadline: 86400,
  commitmentSecretCiphertext: null,
  commitment: digest,
  commitmentAt: null,
  signature: null,
  recipientAuthorizationCiphertext: null,
  price: "100",
  lastError: null,
  createdAt: 0,
};
