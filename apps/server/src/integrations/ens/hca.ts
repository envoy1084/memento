import { Context, Effect, Layer, Schema } from "effect";

import { Cryptography } from "@memento/application";
import { type Gift, type Claim, Conflict, Forbidden, ProviderError } from "@memento/protocol";
import type { Session, ChainSessionConfig } from "@rhinestone/sdk";
import {
  toHex,
  concat,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  getContractAddress,
  keccak256,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount, toAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { packetToBytes } from "viem/ens";

import { factoryAbi, hcaFactoryAbi, hcaAbi, registrarAbi, resolverAbi, reverseAbi } from "./abi.js";
import { Ethereum, provider } from "./client.js";
import { EnsConfig } from "./config.js";
import { TransactionJournal, jsonValue } from "./journal.js";

const SessionPayload = Schema.Struct({
  salt: Schema.String,
  nonce: Schema.String,
  sessionKey: Schema.String,
});

const ALL_ROLES = BigInt(`0x${"1".repeat(64)}`);

export const proxyAddress = (
  factory: Address,
  proxyLogic: Address,
  deployer: Address,
  salt: bigint,
) => {
  const outerSalt = keccak256(
    encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [deployer, salt]),
  );

  return getContractAddress({
    from: factory,
    opcode: "CREATE2",
    salt: outerSalt,
    bytecode: concat([
      "0x3d604d80600a3d3981f3363d3d373d3d3d363d73",
      proxyLogic,
      "0x5af43d82803e903d91602b57fd5bf3",
      outerSalt,
    ]),
  });
};

const make = Effect.gen(function* () {
  const config = yield* EnsConfig;
  const { publicClient, sdk } = yield* Ethereum;
  const journal = yield* TransactionJournal;
  const crypto = yield* Cryptography;

  const accountFor = async (owner: Address, existing?: Address) =>
    sdk.createAccount({
      account: {
        type: "hca",
        version: "ens-standalone-1.1.0",
        factory: config.hcaFactory,
        implementation: config.hcaImplementation,
        validator: config.validator,
        verifiableFactory: config.verifiableFactory,
        proxyLogic: config.proxyLogic,
        userSalt: 0n,
      },
      owners: { type: "ecdsa", accounts: [toAccount(owner)], module: config.validator },
      experimental_sessions: { enabled: true, module: config.validator },
      ...(existing ? { initData: { address: existing } } : {}),
    });

  const verify = Effect.fn("Hca.verify")(function* (hca: Address, owner: Address) {
    const code = yield* provider("rpc", () => publicClient.getCode({ address: hca }));

    if (!code || code === "0x")
      return yield* new Conflict({
        code: "HCA_NOT_DEPLOYED",
        message: "Recipient HCA is not deployed",
      });

    const actualOwner = yield* provider("rpc", () =>
      publicClient.readContract({
        address: config.hcaFactory,
        abi: hcaFactoryAbi,
        functionName: "authorizedOwnerOf",
        args: [hca],
      }),
    );

    const implementation = yield* provider("rpc", () =>
      publicClient.readContract({
        address: config.verifiableFactory,
        abi: factoryAbi,
        functionName: "verifyContract",
        args: [hca],
      }),
    );

    const [ownerOnAccount, nonce] = yield* provider("rpc", () =>
      publicClient.readContract({
        address: hca,
        abi: hcaAbi,
        functionName: "ownerAndSessionNonce",
      }),
    );

    const accountId = yield* provider("rpc", () =>
      publicClient.readContract({ address: hca, abi: hcaAbi, functionName: "accountId" }),
    );

    if (
      actualOwner.toLowerCase() !== owner.toLowerCase() ||
      ownerOnAccount.toLowerCase() !== owner.toLowerCase() ||
      implementation.toLowerCase() !== config.hcaImplementation.toLowerCase() ||
      accountId !== "ens-standalone-hca.1.1.0"
    ) {
      return yield* new Forbidden({
        message: "HCA deployment does not match the recipient and supported implementation",
      });
    }

    return nonce;
  });

  const sessionFor = Effect.fn("Hca.session")(function* (claim: Claim) {
    if (!claim.sessionKeyCiphertext)
      return yield* new Conflict({
        code: "SESSION_UNAVAILABLE",
        message: "Session key is unavailable",
      });

    const payload = yield* Schema.decodeUnknownEffect(SessionPayload)(claim.sessionPayload).pipe(
      Effect.mapError(
        () =>
          new ProviderError({
            provider: "hca",
            retryable: false,
            message: "Invalid stored session",
          }),
      ),
    );

    const key = yield* crypto.open(claim.sessionKeyCiphertext, `claim:${claim.id}:key`);
    const signer = privateKeyToAccount(key as Hex);

    if (signer.address.toLowerCase() !== payload.sessionKey.toLowerCase())
      return yield* new Forbidden({ message: "Session signer mismatch" });

    const session: Session = {
      chain: sepolia,
      account: claim.hca as Address,
      salt: payload.salt as Hex,
      owners: { type: "ecdsa", accounts: [signer] },
    };

    return { session, payload };
  });

  return {
    accountFor,
    verify,

    prepare: Effect.fn("Hca.prepare")(function* (
      gift: Gift,
      recipient: Address,
      label: string,
      deadline: number,
    ) {
      const commitmentSecret = crypto.random();
      const sessionKey = generatePrivateKey();
      const signer = privateKeyToAccount(sessionKey);
      const account = yield* provider("rhinestone", () => accountFor(recipient));
      const hca = account.getAddress();
      const code = yield* provider("rpc", () => publicClient.getCode({ address: hca }));
      const nonce = code && code !== "0x" ? yield* verify(hca, recipient) : 0n;
      const resolverSalt = gift.id as Hex;

      const resolver = proxyAddress(
        config.verifiableFactory,
        config.proxyLogic,
        hca,
        BigInt(resolverSalt),
      );

      // Refund amounts are zero: execution gas is sponsored separately from the gift budget.
      const salt = keccak256(
        encodeAbiParameters(
          [
            { type: "uint96" },
            { type: "uint48" },
            { type: "address" },
            { type: "address" },
            { type: "uint96" },
            { type: "uint48" },
            { type: "uint96" },
          ],
          [nonce, deadline, resolver, config.token, 0n, 0, 0n],
        ),
      );

      const session: Session = {
        chain: sepolia,
        account: hca,
        salt,
        owners: { type: "ecdsa", accounts: [signer] },
      };

      const details = yield* provider("rhinestone", () =>
        account.experimental_getSessionDetails([session]),
      );

      const commitment = yield* provider("rpc", () =>
        publicClient.readContract({
          address: config.registrar,
          abi: registrarAbi,
          functionName: "makeCommitment",
          args: [
            label,
            recipient,
            commitmentSecret,
            zeroAddress,
            resolver,
            BigInt(gift.policy.duration),
            zeroHash,
          ],
        }),
      );

      return {
        hca,
        resolver,
        resolverSalt,
        sessionKey,
        commitmentSecret,
        commitment,
        typedData: null,
        session: {
          salt,
          nonce: nonce.toString(),
          sessionKey: signer.address,
          typedData: jsonValue(details.data),
        },
      };
    }),

    authorize: Effect.fn("Hca.authorize")(function* (claim: Claim, input: unknown) {
      const signature = yield* Schema.decodeUnknownEffect(
        Schema.Struct({ signature: Schema.String.check(Schema.isPattern(/^0x[0-9a-fA-F]{130}$/)) }),
      )(input).pipe(
        Effect.mapError(
          () => new Forbidden({ message: "Expected the wallet's session signature" }),
        ),
      );

      const { session } = yield* sessionFor(claim);
      const account = yield* provider("rhinestone", () =>
        accountFor(claim.recipientWallet as Address),
      );

      if (account.getAddress().toLowerCase() !== claim.hca.toLowerCase())
        return yield* new Forbidden({ message: "HCA address mismatch" });

      const details = yield* provider("rhinestone", () =>
        account.experimental_getSessionDetails([session]),
      );

      const valid = yield* provider("rpc", () =>
        publicClient.verifyTypedData({
          ...details.data,
          address: claim.recipientWallet as Address,
          signature: signature.signature as Hex,
        }),
      );

      if (!valid) return yield* new Forbidden({ message: "Invalid HCA session signature" });

      return signature.signature;
    }),

    execute: Effect.fn("Hca.execute")(function* (
      gift: Gift,
      claim: Claim,
      stage: "commit" | "register",
    ) {
      const { session, payload } = yield* sessionFor(claim);

      if (!claim.authorizationCiphertext)
        return yield* new Conflict({
          code: "SESSION_UNAVAILABLE",
          message: "Session authorization is unavailable",
        });

      const signature = yield* crypto.open(
        claim.authorizationCiphertext,
        `claim:${claim.id}:authorization`,
      );
      const code = yield* provider("rpc", () =>
        publicClient.getCode({ address: claim.hca as Address }),
      );
      const deployed = Boolean(code) && code !== "0x";

      if (
        deployed &&
        (yield* verify(claim.hca as Address, claim.recipientWallet as Address)) !==
          BigInt(payload.nonce)
      )
        return yield* new Conflict({
          code: "SESSION_REVOKED",
          message: "Recipient revoked the HCA session",
        });

      const account = yield* provider("rhinestone", () =>
        accountFor(claim.recipientWallet as Address, deployed ? (claim.hca as Address) : undefined),
      );
      const details = yield* provider("rhinestone", () =>
        account.experimental_getSessionDetails([session]),
      );

      const enableData: NonNullable<ChainSessionConfig["enableData"]> = {
        userSignature: concat([zeroAddress, signature as Hex]),
        hashesAndChainIds: details.hashesAndChainIds,
        sessionToEnableIndex: 0,
        hcaSessionNonce: BigInt(payload.nonce),
        hcaSessionConfig: {
          sessionKey: payload.sessionKey as Address,
          validUntil: claim.sessionExpiry,
          resolver: claim.resolver as Address,
          refundToken: config.token,
          maxRefundExchangeRate: 0n,
          maxRefundGasOverhead: 0,
          maxRefundAmount: 0n,
        },
      };

      const calls: { to: Address; data: Hex; value: bigint }[] = [];

      if (stage === "commit")
        calls.push({
          to: config.registrar,
          value: 0n,
          data: encodeFunctionData({
            abi: registrarAbi,
            functionName: "commit",
            args: [claim.commitment as Hex],
          }),
        });
      else {
        if (!claim.commitmentSecretCiphertext)
          return yield* new Conflict({
            code: "SECRET_UNAVAILABLE",
            message: "Commitment secret is unavailable",
          });

        const secret = yield* crypto.open(
          claim.commitmentSecretCiphertext,
          `claim:${claim.id}:commitment-secret`,
        );
        const resolverCode = yield* provider("rpc", () =>
          publicClient.getCode({ address: claim.resolver as Address }),
        );
        const name = toHex(packetToBytes(`${claim.label}.eth`));

        const records = [
          encodeFunctionData({
            abi: resolverAbi,
            functionName: "setAddress",
            args: [name, 60n, claim.recipientWallet as Hex],
          }),
          ...gift.records.map((record) =>
            encodeFunctionData({
              abi: resolverAbi,
              functionName: "setText",
              args: [name, record.key, record.value],
            }),
          ),
        ];

        if (!resolverCode || resolverCode === "0x") {
          calls.push({
            to: config.verifiableFactory,
            value: 0n,
            data: encodeFunctionData({
              abi: factoryAbi,
              functionName: "deployProxy",
              args: [
                config.resolverImplementation,
                BigInt(claim.resolverSalt),
                encodeFunctionData({
                  abi: resolverAbi,
                  functionName: "initialize",
                  args: [
                    [
                      { account: claim.hca as Address, roleBitmap: ALL_ROLES },
                      { account: claim.recipientWallet as Address, roleBitmap: ALL_ROLES },
                    ],
                    records,
                  ],
                }),
              ],
            }),
          });
        } else
          for (const data of records)
            calls.push({ to: claim.resolver as Address, data, value: 0n });

        calls.push(
          {
            to: config.token,
            value: 0n,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [config.registrar, BigInt(claim.price)],
            }),
          },
          {
            to: config.registrar,
            value: 0n,
            data: encodeFunctionData({
              abi: registrarAbi,
              functionName: "register",
              args: [
                claim.label,
                claim.recipientWallet as Address,
                secret as Hex,
                zeroAddress,
                claim.resolver as Address,
                BigInt(gift.policy.duration),
                config.token,
                zeroHash,
              ],
            }),
          },
        );

        if (gift.policy.setPrimaryName)
          calls.push({
            to: config.reverseAdapter,
            value: 0n,
            data: encodeFunctionData({
              abi: reverseAbi,
              functionName: "setNameWithHCA",
              args: [claim.recipientWallet as Address, `${claim.label}.eth`],
            }),
          });
      }

      yield* journal.intent(claim.id, `hca:${stage}`, account, async () =>
        account.signTransaction(
          await account.prepareTransaction({
            chain: sepolia,
            calls,
            signers: { type: "experimental_session", session, enableData, verifyExecutions: true },
            sponsored: { gas: true, bridging: true, swaps: true },
          }),
        ),
      );
    }),
  };
});

export class Hca extends Context.Service<Hca, Effect.Success<typeof make>>()(
  "@memento/server/Hca",
) {
  static readonly layer = Layer.effect(Hca, make);
}
