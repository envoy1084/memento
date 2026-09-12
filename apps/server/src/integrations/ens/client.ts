import { Context, Effect, Layer, Redacted } from "effect";

import { Ensforge } from "@ensforge/sdk";
import { ProviderError } from "@memento/protocol";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount, toAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { EnsConfig } from "./config.js";

export const provider = <A>(name: string, request: (signal: AbortSignal) => Promise<A>) =>
  Effect.tryPromise({
    try: request,

    catch: () =>
      new ProviderError({ provider: name, retryable: true, message: `${name} request failed` }),
  });

const make = Effect.gen(function* () {
  const config = yield* EnsConfig;
  const account = privateKeyToAccount(Redacted.value(config.coordinatorKey) as `0x${string}`);
  const rpcUrl = Redacted.value(config.rpcUrl);
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl, { timeout: 15000, retryCount: 1 }),
  });

  const forOwner = (owner: `0x${string}`) =>
    new Ensforge({
      network: "sepolia",
      publicClient,
      walletClient: createWalletClient({
        chain: sepolia,
        account: toAccount(owner),
        transport: http(rpcUrl),
      }),
    });
  const ensforge = new Ensforge({ network: "sepolia", publicClient });

  return { publicClient, account, ensforge, forOwner };
});

export class Ethereum extends Context.Service<Ethereum, Effect.Success<typeof make>>()(
  "@memento/server/Ethereum",
) {
  static readonly layer = Layer.effect(Ethereum, make);
}

// Preserve actionable SDK failures without exposing provider payloads or signed material.
export const ensRequest = <A, E>(request: Effect.Effect<A, E>) =>
  request.pipe(
    Effect.mapError(
      () =>
        new ProviderError({
          provider: "ensforge",
          retryable: true,
          message: "ENSForge request failed",
        }),
    ),
  );
