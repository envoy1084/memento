import { Effect } from "effect";

import { factoryAbi, profileAbi, registryAbi, resolverAbi } from "@memento/chain/abi/ens";
import { type Gift, type Claim, Conflict } from "@memento/protocol";
import { decodeFunctionResult, encodeFunctionData, toHex, type Address } from "viem";
import { namehash, packetToBytes } from "viem/ens";

import { Ethereum, provider } from "./client.js";
import { EnsConfig } from "./config.js";

export const makeOwnershipVerification = Effect.gen(function* () {
  const config = yield* EnsConfig;
  const { publicClient } = yield* Ethereum;

  return Effect.fn("Chain.verifyOwnership")(function* (_gift: Gift, claim: Claim) {
    const owner = yield* provider("rpc", () =>
      publicClient.readContract({
        address: config.registry,
        abi: registryAbi,
        functionName: "getOwner",
        args: [BigInt(claim.labelhash)],
      }),
    );

    const resolver = yield* provider("rpc", () =>
      publicClient.readContract({
        address: config.registry,
        abi: registryAbi,
        functionName: "getResolver",
        args: [claim.label],
      }),
    );

    if (
      owner.toLowerCase() !== claim.recipientWallet ||
      resolver.toLowerCase() !== claim.resolver.toLowerCase()
    )
      return yield* new Conflict({
        code: "OWNERSHIP_NOT_CONFIRMED",
        message: "Recipient ownership and resolver are not confirmed",
      });

    const implementation = yield* provider("rpc", () =>
      publicClient.readContract({
        address: config.verifiableFactory,
        abi: factoryAbi,
        functionName: "verifyContract",
        args: [resolver],
      }),
    );

    const roles = yield* provider("rpc", () =>
      publicClient.readContract({
        address: resolver,
        abi: resolverAbi,
        functionName: "roles",
        args: [0n, claim.recipientWallet as Address],
      }),
    );

    // ENSv2's resolver reads profiles through ENSIP-10 resolve(), not direct v1 addr/text calls.
    const name = `${claim.label}.eth`;
    const node = namehash(name);
    const dnsName = toHex(packetToBytes(name));

    const address = yield* provider("rpc", async () =>
      decodeFunctionResult({
        abi: profileAbi,
        functionName: "addr",
        data: await publicClient.readContract({
          address: resolver,
          abi: resolverAbi,
          functionName: "resolve",
          args: [
            dnsName,
            encodeFunctionData({ abi: profileAbi, functionName: "addr", args: [node] }),
          ],
        }),
      }),
    );

    if (
      implementation.toLowerCase() !== config.resolverImplementation.toLowerCase() ||
      address.toLowerCase() !== claim.recipientWallet ||
      roles !== BigInt(`0x${"1".repeat(64)}`)
    )
      return yield* new Conflict({
        code: "RESOLVER_HANDOFF_FAILED",
        message: "Recipient resolver control is not confirmed",
      });
  });
});
