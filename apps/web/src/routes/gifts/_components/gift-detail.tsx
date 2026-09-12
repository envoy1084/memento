import { Effect, Schema } from "effect";

import { Digest, type GiftView } from "@memento/protocol";
import { Button, Card, NumberValue } from "@thenamespace/uikit";
import { formatUnits } from "viem";

import { GiftQuery, giftAtom } from "#/atoms/gifts";
import { AccountRequired } from "#/components/common/account-required";
import { DetailList, DetailRow, Note, PageHeader, Section } from "#/components/common/page";
import { GiftArt } from "#/components/display/gift-art";
import { formatDate, formatTimeLeft, formatRegistrationDuration } from "#/format/date";
import { giftTheme } from "#/format/gift";
import { useApiTask, useRemote } from "#/hooks/use-api-task";
import { useAuth } from "#/hooks/use-auth";
import { useGiftTransactions } from "#/hooks/use-gift-transactions";

export function GiftDetail({ giftId, created }: { giftId: string; created: boolean }) {
  const auth = useAuth();
  const query = useRemote(
    giftAtom(new GiftQuery({ id: giftId, userId: auth.actor?.userId ?? "" })),
  );
  return (
    <Section className="py-12">
      {!auth.address ? (
        <AccountRequired />
      ) : query.loading ? (
        <p role="status">Loading your gift…</p>
      ) : query.failed || !query.data ? (
        <Note status="warning">
          This gift could not be loaded.{" "}
          <Button size="md" onPress={query.refresh}>
            Retry
          </Button>
        </Note>
      ) : (
        <GiftDetails
          key={`${auth.actor?.userId}:${giftId}`}
          gift={query.data}
          created={created}
          refresh={query.refresh}
        />
      )}
    </Section>
  );
}

function GiftDetails({
  gift,
  created,
  refresh,
}: {
  gift: typeof GiftView.Type;
  created: boolean;
  refresh: () => void;
}) {
  const task = useApiTask();
  const send = useGiftTransactions();
  const expired = gift.policy.expiresAt <= Date.now() / 1000;
  const refund = () =>
    task.run(async (api) => {
      const params = { id: gift.id };
      const plan = await Effect.runPromise(api.gifts.refund({ params }));
      const hashes = await send(`refund:${gift.id}`, gift.sponsorWallet, plan.chainId, plan.calls);
      const payload = { transactionHash: Schema.decodeUnknownSync(Digest)(hashes.at(-1)) };
      await Effect.runPromise(api.gifts.confirmRefund({ params, payload }));
      refresh();
    });

  return (
    <>
      <PageHeader
        eyebrow="Your gift"
        title={
          created && gift.status === "ready"
            ? gift.emailStatus === "complete"
              ? "Your gift is on its way."
              : `A name for ${gift.recipientName ?? "someone special"}.`
            : `A name for ${gift.recipientName ?? "someone special"}.`
        }
      />
      <div className="mt-9 grid items-start gap-10 lg:grid-cols-2">
        <Card className="rounded-[28px] border border-rule p-7 shadow-none">
          <DetailList>
            <DetailRow label="Status">
              {gift.status === "ready"
                ? "Ready to open"
                : gift.status === "draft"
                  ? "Not completed"
                  : gift.status.replaceAll("_", " ")}
            </DetailRow>
            <DetailRow label="Registration funding">
              <NumberValue
                value={Number(formatUnits(BigInt(gift.policy.maxPrice), 6))}
                maximumFractionDigits={2}
              />{" "}
              USDC
            </DetailRow>
            <DetailRow label="Registration">
              {formatRegistrationDuration(gift.policy.duration)}
            </DetailRow>
            <DetailRow label="Name length">
              {gift.policy.minLength}–{gift.policy.maxLength} characters
            </DetailRow>
            <DetailRow label="Claim by">
              {formatDate(gift.policy.expiresAt)}
              {gift.status === "ready" ? (
                <span className="ml-2 text-xs font-normal text-ink-soft">
                  ({formatTimeLeft(gift.policy.expiresAt)})
                </span>
              ) : null}
            </DetailRow>
          </DetailList>
          {task.error ? (
            <div role="alert">
              <Note status="danger">{task.error}</Note>
            </div>
          ) : null}
          {task.busy ? <p role="status">Waiting for wallet approval or confirmation…</p> : null}
          {gift.status === "ready" && !expired && gift.emailStatus ? (
            <p role="status" className="mt-5 text-sm text-ink-soft">
              {gift.emailStatus === "complete"
                ? "An email with the claim link has been sent to your recipient."
                : gift.emailStatus === "failed"
                  ? "Your gift is safe, but the email couldn’t be sent. Please contact us for help."
                  : gift.emailStatus === "pending" || gift.emailStatus === "running"
                    ? "Sending your gift… We’ll email the invitation to your recipient."
                    : "We’re emailing the claim link to your recipient."}
            </p>
          ) : null}
          {expired && !["complete", "refunded", "draft"].includes(gift.status) ? (
            <Button
              size="md"
              variant="secondary"
              isDisabled={task.busy}
              onPress={() => {
                void refund();
              }}
            >
              Recover eligible funds
            </Button>
          ) : null}
        </Card>
        <div className="overflow-hidden rounded-[28px] border border-rule bg-paper-raised shadow-lift">
          <GiftArt
            name={gift.label ? `${gift.label}.eth` : "theirname.eth"}
            theme={giftTheme(gift.theme)}
            size="md"
          />
          <p className="border-t border-rule px-7 py-6 text-center">{gift.message}</p>
        </div>
      </div>
    </>
  );
}
