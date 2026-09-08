import { createFileRoute } from "@tanstack/react-router";

import {
  AlertDialog,
  Button,
  Card,
  Separator,
  Timeline,
  type TimelineStatus,
  toast,
} from "@thenamespace/uikit";

import { Icon } from "#/components/common/icon";
import {
  Back,
  ButtonLink,
  CopyButton,
  DetailList,
  DetailRow,
  EmptyPanel,
  Eyebrow,
  Note,
  PageHeader,
  Section,
  StatusChip,
} from "#/components/common/page";
import { NameMark } from "#/components/display/brand";
import { GiftArt } from "#/components/display/gift-art";
import { useDemo } from "#/hooks/use-demo";

export const Route = createFileRoute("/gifts/$giftId")({
  validateSearch: (search: Record<string, unknown>): { created?: boolean } =>
    search.created === true ? { created: true } : {},
  component: GiftDetail,
});

function GiftDetail() {
  const { giftId } = Route.useParams();
  const { created } = Route.useSearch();
  const [state, setState] = useDemo();
  const gift = state.gifts.find((entry) => entry.id === giftId);

  if (!gift)
    return (
      <Section className="py-16">
        <EmptyPanel
          icon="search"
          title="This gift isn’t in this browser."
          description="Preview gifts are saved locally, so a link created elsewhere won’t open here."
          action={<ButtonLink to="/gifts">Back to your gifts</ButtonLink>}
        />
      </Section>
    );

  const url = `${window.location.origin}/claim/${gift.id}`;
  const claimed = gift.state === "claimed";
  const returnable = gift.state === "ready" || gift.state === "expired";

  const lifecycle: { title: string; body: string; status: TimelineStatus }[] = [
    { title: "Created", body: gift.created, status: "success" },
    {
      title: "Invitation ready",
      body: "The link works as soon as you share it.",
      status: claimed ? "success" : "current",
    },
    {
      title: claimed ? "Claimed" : "Waiting to be opened",
      body: claimed
        ? `${gift.recipient} made this name their own.`
        : "Nothing happens until they open it.",
      status: claimed ? "success" : "muted",
    },
  ];

  return (
    <Section className="py-10">
      <Back to="/gifts" label="Your gifts" />
      <PageHeader
        eyebrow={created ? "Ready to send" : "Gift"}
        title={created ? "Your gift is wrapped." : `A name for ${gift.recipient}.`}
        description={
          created
            ? "All it needs now is a hello. Share the private link below however you like."
            : "Everything about this gift, and the link that opens it."
        }
        action={<StatusChip state={gift.state} />}
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
        <div>
          <div className="overflow-hidden rounded-[28px] border border-rule bg-paper-raised shadow-lift">
            <GiftArt
              name={gift.name || "theirname.eth"}
              theme={gift.theme}
              size="md"
              opened={claimed}
              sender="alice.eth"
            />
            <div className="border-t border-rule px-7 py-6 text-center">
              {gift.name ? (
                <NameMark name={gift.name} size="lg" />
              ) : (
                <h2 className="m-0">A name they choose</h2>
              )}
              <p className="mx-auto mt-4 mb-0 max-w-[36ch] text-[15px] leading-relaxed text-ink-soft">
                “{gift.message}”
              </p>
              <p className="mt-4 mb-0 text-xs tracking-[0.12em] text-ink-faint uppercase">
                From alice.eth
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border border-rule p-6 shadow-none md:p-7">
            <h3 className="m-0">{claimed ? "The invitation is closed" : "Their invitation"}</h3>
            <p className="mt-2 mb-5 text-[13px] leading-6 text-ink-soft">
              {claimed
                ? `${gift.recipient} has already claimed this name. The link no longer opens.`
                : "Send this private link in a message. They can open it whenever they’re ready."}
            </p>
            <div className="rounded-2xl border border-rule bg-paper-sunken px-4 py-3.5">
              <p className="m-0 font-mono text-[12px] break-all text-ink-soft select-all">{url}</p>
            </div>
            {!claimed ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <CopyButton value={url} />
                <ButtonLink to="/claim/$giftId" params={{ giftId: gift.id }} variant="tertiary">
                  Preview what they see
                  <Icon name="external" size={16} />
                </ButtonLink>
              </div>
            ) : null}
          </Card>

          <Card className="rounded-3xl border border-rule p-6 shadow-none md:p-7">
            <Eyebrow className="mb-5">Details</Eyebrow>
            <DetailList>
              <DetailRow label="Gift type">
                {gift.kind === "choice" ? "They choose the name" : "A name you own"}
              </DetailRow>
              <DetailRow label="Your budget">
                {gift.kind === "choice" ? `$${gift.budget}` : "An existing name"}
              </DetailRow>
              {gift.kind === "choice" ? (
                <DetailRow label="Name length">
                  {gift.minLength}–{gift.maxLength} characters
                </DetailRow>
              ) : null}
              <DetailRow label="Registration">
                {gift.years} year{gift.years > 1 ? "s" : ""}
              </DetailRow>
              <DetailRow label="They pay">$0</DetailRow>
            </DetailList>
            <Separator className="my-6" />
            <Eyebrow className="mb-5">Progress</Eyebrow>
            <Timeline density="compact" size="sm">
              {lifecycle.map((entry) => (
                <Timeline.Item key={entry.title} status={entry.status}>
                  <Timeline.Marker aria-hidden="true" />
                  <Timeline.Content>
                    <p className="m-0 text-[13px] font-medium">{entry.title}</p>
                    <p className="m-0 mt-0.5 text-[12px] text-ink-soft">{entry.body}</p>
                  </Timeline.Content>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>

          <Note>
            This gift lives in this browser only. Nothing has been sent, charged or registered.
          </Note>

          {returnable ? (
            <AlertDialog>
              <Button variant="ghost" size="sm" className="text-ink-soft">
                Cancel and return this gift
              </Button>
              <AlertDialog.Backdrop>
                <AlertDialog.Container size="sm">
                  <AlertDialog.Dialog>
                    <AlertDialog.Header>
                      <AlertDialog.Icon status="danger">
                        <Icon name="alert" size={20} />
                      </AlertDialog.Icon>
                      <AlertDialog.Heading>Return this gift?</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <p className="m-0 text-sm text-ink-soft">
                        The invitation link will stop working and {gift.recipient} won’t be able to
                        claim it. In this preview no funds move.
                      </p>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button slot="close" variant="secondary">
                        Keep it
                      </Button>
                      <Button
                        slot="close"
                        variant="danger"
                        onPress={() => {
                          setState((current) => ({
                            ...current,
                            gifts: current.gifts.map((entry) =>
                              entry.id === giftId &&
                              (entry.state === "ready" || entry.state === "expired")
                                ? { ...entry, state: "refunded" }
                                : entry,
                            ),
                          }));
                          toast.success("Gift returned");
                        }}
                      >
                        Return gift
                      </Button>
                    </AlertDialog.Footer>
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
