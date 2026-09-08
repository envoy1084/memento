import { Effect } from "effect";

import {
  defaultReverseAbi,
  factoryAbi,
  profileAbi,
  registryAbi,
  resolverAbi,
  reverseAbi,
} from "@memento/chain/abi/ens";
import { type Gift, type Claim, Conflict } from "@memento/protocol";
import { decodeFunctionResult, encodeFunctionData, toHex, type Address } from "viem";
import { namehash, packetToBytes } from "viem/ens";

import { Ethereum, provider } from "./client.js";
import { EnsConfig } from "./config.js";
import { Hca } from "./hca.js";

export const makeOwnershipVerification = Effect.gen(function* () {
  const config = yield* EnsConfig;
  const { publicClient } = yield* Ethereum;
  const hca = yield* Hca;

  return Effect.fn("Chain.verifyOwnership")(function* (gift: Gift, claim: Claim) {
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

    for (const record of gift.records) {
      const value = yield* provider("rpc", async () =>
        decodeFunctionResult({
          abi: profileAbi,
          functionName: "text",
          data: await publicClient.readContract({
            address: resolver,
            abi: resolverAbi,
            functionName: "resolve",
            args: [
              dnsName,
              encodeFunctionData({
                abi: profileAbi,
                functionName: "text",
                args: [node, record.key],
              }),
            ],
          }),
        }),
      );

      if (value !== record.value)
        return yield* new Conflict({
          code: "RECORDS_NOT_CONFIRMED",
          message: "Starter records are not confirmed",
        });
    }

    if (gift.kind === "chosen_name") {
      yield* hca.verify(claim.hca as Address, claim.recipientWallet as Address);

      if (gift.policy.setPrimaryName) {
        const registrar = yield* provider("rpc", () =>
          publicClient.readContract({
            address: config.reverseAdapter,
            abi: reverseAbi,
            functionName: "DEFAULT_REVERSE_REGISTRAR",
          }),
        );

        const primary = yield* provider("rpc", () =>
          publicClient.readContract({
            address: registrar,
            abi: defaultReverseAbi,
            functionName: "nameForAddr",
            args: [claim.recipientWallet as Address],
          }),
        );

        if (primary !== name)
          return yield* new Conflict({
            code: "PRIMARY_NAME_NOT_CONFIRMED",
            message: "Primary name is not confirmed",
          });
      }
    }
  });
});
