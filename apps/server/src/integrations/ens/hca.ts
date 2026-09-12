import { Context, Effect, Layer, Redacted, Schema } from "effect";

import { sepoliaHcaDeployment } from "@ensforge/contracts/deployments";
import { permissionedResolverV2Abi, ethRegistrarV2Abi } from "@ensforge/contracts/v2";
import { rhinestone } from "@ensforge/hca/rhinestone";
import { Cryptography } from "@memento/application";
import {
  type Gift,
  type Claim,
  type ClaimSetup,
  type ApplicationError,
  HcaSession,
  HcaAuthorization,
  Conflict,
  Forbidden,
} from "@memento/protocol";
import { encodeFunctionData, type Address, type Hex, zeroHash } from "viem";
import { generatePrivateKey, privateKeyToAccount, toAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";

import { Ethereum, ensRequest, provider } from "./client.js";
import { EnsConfig } from "./config.js";

const ALL_ROLES = BigInt(`0x${"1".repeat(64)}`);

const make = Effect.gen(function* () {
  const config = yield* EnsConfig;
  const { publicClient, ensforge, forOwner } = yield* Ethereum;
  const crypto = yield* Cryptography;

  const context = Effect.fn("Hca.context")(function* (claim: Claim) {
    const payload = yield* Schema.decodeUnknownEffect(HcaSession)(claim.sessionPayload).pipe(
      Effect.mapError(
        () =>
          new Conflict({
            code: "LEGACY_HCA_SESSION",
            message: "This claim uses an unsupported legacy session; recover it after expiry",
          }),
      ),
    );
    if (!claim.sessionKeyCiphertext)
      return yield* new Conflict({
        code: "SESSION_UNAVAILABLE",
        message: "Session key is unavailable",
      });

    const key = yield* crypto.open(claim.sessionKeyCiphertext, `claim:${claim.id}:key`);
    const signer = privateKeyToAccount(key as Hex);
    if (
      signer.address.toLowerCase() !== payload.sessionKey.toLowerCase() ||
      payload.validUntil !== claim.sessionExpiry
    )
      return yield* new Forbidden({ message: "Stored session does not match the claim" });

    const sdk = forOwner(claim.recipientWallet as Address);
    const execution = rhinestone({
      profile: sepoliaHcaDeployment,
      chain: sepolia,
      owner: toAccount(claim.recipientWallet as Address),
      sessionSigner: signer,
      sessionSalt: payload.salt as Hex,
      sponsored: true,
      sdk: {
        auth: { mode: "apiKey", apiKey: Redacted.value(config.rhinestoneKey) },
        provider: { type: "custom", urls: { [sepolia.id]: Redacted.value(config.rpcUrl) } },
      },
    });
    return { sdk, execution, payload };
  });

  const verify = (hca: Address, owner: Address) =>
    ensRequest(ensforge.hca.verifyHca.effect({ hca, expectedOwner: owner })).pipe(
      Effect.map((account) => account.sessionNonce),
    );

  const resolverAddress = (owner: Address, salt: string) =>
    ensRequest(forOwner(owner).resolution.predictResolverAddress.effect({ salt: BigInt(salt) }));

  return {
    context,
    verify,
    resolverAddress,

    prepare: Effect.fn("Hca.prepare")(function* (
      gift: Gift,
      recipient: Address,
      _label: string,
      deadline: number,
    ) {
      const sessionKey = generatePrivateKey();
      const hca = yield* ensRequest(ensforge.hca.predictHcaAddress.effect({ owner: recipient }));
      const resolver = yield* resolverAddress(recipient, gift.id);

      return {
        hca,
        resolver,
        resolverSalt: gift.id,
        sessionKey,
        // ENSForge generates and persists the real commitment secret when registration starts.
        commitmentSecret: "",
        commitment: zeroHash,
        typedData: null,
        session: {
          version: 2,
          salt: crypto.random(),
          sessionKey: privateKeyToAccount(sessionKey).address,
          validUntil: deadline,
        },
      };
    }),

    setup: Effect.fn("Hca.setup")(function* (
      gift: Gift,
      claim: Claim,
    ): Effect.fn.Return<ClaimSetup, ApplicationError> {
      const from = claim.recipientWallet as Address;
      const base = { chainId: 11155111 as const, from, authorization: null };
      if (gift.kind === "existing_name") return { ...base, stage: "not-required", calls: [] };

      const { sdk, execution } = yield* context(claim);
      const block = yield* provider("rpc", () => publicClient.getBlock());
      if (block.timestamp >= BigInt(claim.deadline))
        return yield* new Conflict({
          code: "HCA_SESSION_EXPIRED",
          message: "Claim authorization expired",
        });

      const state = yield* ensRequest(
        sdk.hca.verifyHca.effect({
          hca: claim.hca as Address,
          expectedOwner: from,
          allowUndeployed: true,
        }),
      );
      if (state.deployed === false) {
        const calls = yield* ensRequest(
          sdk.batch.prepareCalls.effect({ calls: [sdk.hca.deployHca.call({ owner: from })] }),
        );
        return {
          ...base,
          stage: "deploy-hca",
          calls: calls.map((call) => ({
            to: call.to,
            data: call.data ?? "0x",
            value: call.value.toString(),
          })),
        };
      }

      const code = yield* provider("rpc", () =>
        publicClient.getCode({ address: claim.resolver as Address }),
      );
      if (!code || code === "0x") {
        const node = namehash(`${claim.label}.eth`);
        // Initializer setters bypass role checks. Only the HCA receives initial control.
        const setters = [
          encodeFunctionData({
            abi: permissionedResolverV2Abi,
            functionName: "setAddr",
            args: [node, from],
          }),
          ...gift.records.map((record) =>
            encodeFunctionData({
              abi: permissionedResolverV2Abi,
              functionName: "setText",
              args: [node, record.key, record.value],
            }),
          ),
        ];
        const calls = yield* ensRequest(
          sdk.batch.prepareCalls.effect({
            calls: [
              sdk.resolution.createResolver.call({
                salt: BigInt(claim.resolverSalt),
                admin: claim.hca,
                roles: ALL_ROLES,
                setters,
              }),
            ],
          }),
        );
        return {
          ...base,
          stage: "deploy-resolver",
          calls: calls.map((call) => ({
            to: call.to,
            data: call.data ?? "0x",
            value: call.value.toString(),
          })),
        };
      }

      const prepared = yield* ensRequest(
        execution.extensions.sessions.prepare.effect(sdk.config, {
          hca: claim.hca as Address,
          resolver: claim.resolver as Address,
          validUntil: claim.sessionExpiry,
        }),
      );
      const plan = yield* ensRequest(
        sdk.hca.prepareHcaCalls.effect({
          hca: claim.hca as Address,
          authorization: { kind: "owner" },
          calls: [sdk.hca.enableHcaSession.call(prepared.parameters)],
        }),
      );
      return {
        ...base,
        stage: "enable-session",
        authorization: { permissionId: prepared.parameters.permissionId },
        calls: [{ to: claim.hca, data: plan.data, value: plan.value.toString() }],
      };
    }),

    authorize: Effect.fn("Hca.authorize")(function* (claim: Claim, input: unknown) {
      const authorization = yield* Schema.decodeUnknownEffect(HcaAuthorization)(input).pipe(
        Effect.mapError(
          () =>
            new Forbidden({
              message: "A confirmed session enable transaction and permission ID are required",
            }),
        ),
      );
      const { sdk, execution, payload } = yield* context(claim);
      const expected = yield* ensRequest(
        execution.extensions.sessions.prepare.effect(sdk.config, {
          hca: claim.hca as Address,
          resolver: claim.resolver as Address,
          validUntil: claim.sessionExpiry,
        }),
      );
      if (
        authorization.permissionId.toLowerCase() !== expected.parameters.permissionId.toLowerCase()
      )
        return yield* new Forbidden({ message: "Session permission does not match this claim" });

      const receipt = yield* provider("rpc", () =>
        publicClient.getTransactionReceipt({ hash: authorization.enableTransactionHash as Hex }),
      );
      const height = yield* provider("rpc", () => publicClient.getBlockNumber());
      if (
        receipt.status !== "success" ||
        height < receipt.blockNumber + BigInt(config.confirmations - 1)
      )
        return yield* new Conflict({
          code: "SESSION_ENABLE_PENDING",
          message: "Session enable transaction is not confirmed",
        });

      const plan = yield* ensRequest(
        sdk.hca.prepareHcaCalls.effect({
          hca: claim.hca as Address,
          authorization: {
            kind: "session",
            permissionId: authorization.permissionId as Hex,
            enableTransactionHash: authorization.enableTransactionHash as Hex,
          },
          calls: [
            {
              to: config.registrar,
              data: encodeFunctionData({
                abi: ethRegistrarV2Abi,
                functionName: "commit",
                args: [zeroHash],
              }),
            },
          ],
        }),
      );
      if (
        !plan.session ||
        plan.session.sessionKey.toLowerCase() !== payload.sessionKey.toLowerCase() ||
        plan.session.resolver.toLowerCase() !== claim.resolver.toLowerCase() ||
        plan.session.validUntil !== claim.sessionExpiry ||
        plan.session.refund !== undefined
      )
        return yield* new Forbidden({ message: "Enabled session does not match this claim" });

      return JSON.stringify(authorization);
    }),
  };
});

export class Hca extends Context.Service<Hca, Effect.Success<typeof make>>()(
  "@memento/server/Hca",
) {
  static readonly layer = Layer.effect(Hca, make);
}
