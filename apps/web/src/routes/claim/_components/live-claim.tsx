/* eslint-disable no-await-in-loop -- Each setup stage depends on confirmation of the previous stage. */
import { useState } from "react";

import { useLocation } from "@tanstack/react-router";

import { Effect, Schema } from "effect";

import { useRegistrationPrice } from "@ensforge/react";
import { sepoliaDeployment } from "@memento/chain/deployments/sepolia";
import { Digest, type GiftView } from "@memento/protocol";
import { toViemAccount, useWallets } from "@privy-io/react-auth";
import { Button, Card, NumberValue, Spinner } from "@thenamespace/uikit";
import { formatUnits } from "viem";

import { claimSignature } from "#/atoms/claim-signature";
import { GiftQuery, InvitationQuery, invitationAtom, recipientClaimAtom } from "#/atoms/gifts";
import { AccountRequired } from "#/components/common/account-required";
import { Field } from "#/components/common/fields";
import { CopyButton, Note, Section } from "#/components/common/page";
import { GiftArt } from "#/components/display/gift-art";
import { formatDate } from "#/format/date";
import { giftTheme } from "#/format/gift";
import { JourneyError, useApiTask, useRemote } from "#/hooks/use-api-task";
import { useAuth } from "#/hooks/use-auth";
import { useGiftTransactions } from "#/hooks/use-gift-transactions";

import { ClaimProgress, type ClaimPhase } from "./live-claim-progress";

export function LiveClaim({ giftId }: { giftId: string }) {
  const hash = useLocation({ select: (location) => location.hash });
  const secret = hash.replace(/^#/, "");
  if (!Schema.is(Digest)(giftId) || !Schema.is(Digest)(secret))
    return (
      <Section className="py-16">
        <Note status="warning">
          This invitation is incomplete. Open the full private link from the sender.
        </Note>
      </Section>
    );
  return <OpenInvitation key={`${giftId}:${secret}`} giftId={giftId} secret={secret} />;
}

function OpenInvitation({ giftId, secret }: { giftId: string; secret: string }) {
  const auth = useAuth();
  const opened = useRemote(invitationAtom(new InvitationQuery({ id: giftId, secret })));
  const gift = opened.data;

  if ((auth.configured && !auth.ready) || auth.verifying || opened.loading)
    return (
      <Section className="flex min-h-[65svh] items-center justify-center">
        <div role="status" className="text-lavender-600">
          <Spinner aria-hidden="true" />
          <span className="sr-only">Opening your gift…</span>
        </div>
      </Section>
    );

  return (
    <Section className="py-14">
      {opened.failed || !gift ? (
        <Note status="warning">
          This invitation could not be opened. Check the full link or try again.{" "}
          <Button onPress={opened.refresh}>Retry</Button>
        </Note>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-rule bg-paper-raised shadow-lift">
            <GiftArt
              name={gift.label ? `${gift.label}.eth` : "yourname.eth"}
              theme={giftTheme(gift.theme)}
              size="md"
            />
            <div className="border-t border-rule p-7 text-center">
              <p>For {gift.recipientName ?? "you"}</p>
              <p className="mt-3 text-lg leading-relaxed">“{gift.message}”</p>
              {gift.senderName ? (
                <p className="mt-4 mb-0 text-sm text-ink-soft">From {gift.senderName}</p>
              ) : null}
            </div>
          </div>
          <Card className="rounded-2xl border border-rule p-7 shadow-none">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <p className="m-0 text-xs font-semibold tracking-[0.18em] text-lavender-700 uppercase">
                A gift, just for you
              </p>
              <p className="m-0 ml-auto text-right text-xs text-ink-soft">
                Claim by {formatDate(gift.policy.expiresAt)}
              </p>
            </div>
            <h1 className="text-display-md">A name of your own.</h1>
            {!auth.address ? (
              <AccountRequired />
            ) : (
              <RecipientClaim
                key={`${auth.actor?.userId}:${auth.address}:${giftId}`}
                gift={gift}
                secret={secret}
              />
            )}
          </Card>
        </div>
      )}
    </Section>
  );
}

function RecipientClaim({ gift, secret }: { gift: typeof GiftView.Type; secret: string }) {
  const auth = useAuth();
  const saved = useRemote(
    recipientClaimAtom(new GiftQuery({ id: gift.id, userId: auth.actor?.userId ?? "" })),
  );
  const [enteredName, setEnteredName] = useState("");
  const [phase, setPhase] = useState<ClaimPhase>("confirming");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [readyAt, setReadyAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const task = useApiTask();
  const send = useGiftTransactions();
  const { wallets } = useWallets();
  const label =
    saved.data?.label ??
    gift.label ??
    enteredName
      .trim()
      .toLowerCase()
      .replace(/\.eth$/, "");
  const valid =
    Boolean(label) &&
    !label.includes(".") &&
    Array.from(label).length >= gift.policy.minLength &&
    Array.from(label).length <= gift.policy.maxLength;
  const price = useRegistrationPrice({
    name: `${label}.eth`,
    duration: BigInt(gift.policy.duration),
    paymentToken: sepoliaDeployment.contracts.token as `0x${string}`,
    enabled: valid && !saved.data,
  });
  const available =
    Boolean(saved.data) ||
    (price.data?.status === "available" && price.data.total <= BigInt(gift.policy.maxPrice));
  const expired = gift.policy.expiresAt <= Date.now() / 1000;
  const claim = saved.data;
  const start = () =>
    task.run(async (api) => {
      const address = auth.address;
      if (!address) throw new JourneyError({ message: "Connect your wallet to claim this gift." });
      if (
        !wallets.some(
          (wallet) =>
            wallet.walletClientType === "privy" &&
            wallet.address.toLowerCase() === address.toLowerCase(),
        )
      )
        throw new JourneyError({
          message: "Choose your Memento wallet to claim without gas fees.",
        });
      const preparation = await Effect.runPromise(
        api.claims.prepare({
          params: { id: gift.id },
          payload: { secret, recipientWallet: address, label },
        }),
      );
      saved.refresh();
      const current = await Effect.runPromise(api.claims.get({ params: { id: preparation.id } }));
      if (current.state === "complete") return;
      setStartedAt((previous) => previous ?? Date.now());
      if (current.state === "prepared") {
        const setup = await Effect.runPromise(api.claims.setup({ params: { id: preparation.id } }));
        if (setup.stage === "commit-name") {
          setPhase("committing");
          await send(`claim:${preparation.id}:commit`, setup.from, setup.chainId, setup.calls);
        }
        setPhase("confirming");
        const wallet = wallets.find(
          (candidate) =>
            candidate.walletClientType === "privy" &&
            candidate.address.toLowerCase() === address.toLowerCase(),
        );
        if (!wallet) throw new JourneyError({ message: "Reconnect your Memento wallet." });
        const signer = await toViemAccount({ wallet, signatureOptions: { type: "erc1271" } });
        const signature = await signer.signTypedData(claimSignature(gift, preparation.intent));
        await Effect.runPromise(
          api.claims.authorize({
            params: { id: preparation.id },
            payload: { signature },
          }),
        );
      }
      {
        const deadline = Date.now() + 10 * 60 * 1000;
        let submitted = false;
        while (Date.now() < deadline) {
          const latest = await Effect.runPromise(
            api.claims.get({ params: { id: preparation.id } }),
          );
          if (latest.state === "complete") {
            setFinishedAt(Date.now());
            setPhase("complete");
            break;
          }
          const setup = await Effect.runPromise(
            api.claims.setup({ params: { id: preparation.id } }),
          );
          if (setup.stage === "not-required") {
            setFinishedAt(Date.now());
            setPhase("complete");
            break;
          }
          if (setup.stage === "waiting") {
            setPhase("waiting");
            setReadyAt(setup.readyAt ?? null);
          } else if (setup.stage === "register-name" && !submitted) {
            setPhase("registering");
            await send(`claim:${preparation.id}:register`, setup.from, setup.chainId, setup.calls);
            submitted = true;
          } else if (setup.stage === "commit-name") {
            throw new JourneyError({
              message: "Your name request hasn’t been confirmed yet. Try again in a moment.",
            });
          }
          saved.refresh();
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      saved.refresh();
    });

  if (saved.loading) return <p role="status">Checking your claim…</p>;
  if (saved.failed)
    return (
      <Note status="warning">
        Could not check your claim. <Button onPress={saved.refresh}>Retry</Button>
      </Note>
    );
  if (claim?.state === "complete" || phase === "complete")
    return (
      <div className="space-y-6">
        <ClaimProgress
          name={claim?.label ?? label}
          phase="complete"
          startedAt={startedAt}
          readyAt={readyAt}
          finishedAt={finishedAt}
        />
        <CopyButton value={`${claim?.label ?? label}.eth`} label="Copy name" />
      </div>
    );
  if (task.busy || (claim && claim.state !== "prepared"))
    return (
      <div className="space-y-6">
        <ClaimProgress
          name={label}
          phase={task.busy ? phase : claim?.state === "waiting" ? "waiting" : "registering"}
          startedAt={startedAt}
          readyAt={readyAt}
          finishedAt={finishedAt}
        />
        {task.error || claim?.lastError ? (
          <Note status="warning">
            We couldn’t finish this step. Your name won’t be registered twice. Continue to check
            where you left off.
          </Note>
        ) : null}
        {!task.busy ? (
          <Button
            onPress={() => {
              void start();
            }}
          >
            Continue claiming
          </Button>
        ) : null}
      </div>
    );
  if (expired || ["complete", "refunded", "cancelled"].includes(gift.status))
    return <Note status="warning">This gift is no longer available to claim.</Note>;

  return (
    <div className="space-y-5">
      {!claim ? (
        <>
          <p className="text-sm leading-relaxed text-ink-soft">
            Choose something that feels like you. Your gift covers registration, and we cover the
            fees.
          </p>
          {
            <Field
              label="Choose your name"
              value={enteredName}
              onChange={setEnteredName}
              placeholder="yourname.eth"
            />
          }
          {valid ? (
            <p role="status" className="text-sm">
              {price.isFailure ? (
                "Name lookup failed. Try again."
              ) : price.isWaiting || price.isInitial ? (
                "Checking the name…"
              ) : available ? (
                <>
                  <span>Available and covered by your gift · </span>
                  <ClaimAmount
                    amount={price.data?.status === "available" ? price.data.total.toString() : "0"}
                  />
                </>
              ) : (
                "Unavailable or above this gift’s funded amount."
              )}
            </p>
          ) : null}
          {price.isFailure ? (
            <Button
              variant="secondary"
              onPress={() => {
                void price.refresh().catch(() => {});
              }}
            >
              Retry lookup
            </Button>
          ) : null}
        </>
      ) : (
        <p className="text-lg font-medium">{label}.eth</p>
      )}
      {task.error ? (
        <div role="alert">
          <Note status="danger">{task.error}</Note>
        </div>
      ) : null}
      <Button
        size="md"
        isDisabled={
          task.busy ||
          !available ||
          !valid ||
          (!claim && (price.isWaiting || price.isInitial || price.isFailure))
        }
        onPress={() => {
          void start();
        }}
      >
        {claim ? "Continue claiming" : "Claim my name"}
      </Button>
    </div>
  );
}

function ClaimAmount({ amount }: { amount: string }) {
  return (
    <>
      <NumberValue value={Number(formatUnits(BigInt(amount), 6))} maximumFractionDigits={2} /> USDC
    </>
  );
}
