import { createFileRoute, Link } from "@tanstack/react-router";

import { Button, Card, Modal, toast } from "@thenamespace/uikit";

import { GiftArt } from "#/components/gift-art";
import { Icon } from "#/components/icon";
import { Back, CopyButton, Empty, PageTitle, Status, SummaryRow } from "#/components/page";
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
      <div className="mx-auto w-[calc(100%-40px)] max-w-[1200px] md:w-[calc(100%-96px)] py-14">
        <Empty
          title="This gift isn’t here."
          description="It may belong to another preview session."
          to="/gifts"
          action="See your gifts"
        />
      </div>
    );
  const url = `${window.location.origin}/claim/${gift.id}`;
  return (
    <div className="mx-auto w-[calc(100%-40px)] max-w-[1200px] md:w-[calc(100%-96px)] py-10">
      <Back to="/gifts" />
      <PageTitle
        eyebrow={created ? "A LITTLE JOY, READY TO GO" : "THE STORY OF YOUR GIFT"}
        title={
          created ? "Good things are on their way." : `A little something for ${gift.recipient}.`
        }
        description={
          created
            ? "Your gift is wrapped. All it needs now is a hello."
            : "Follow their beginning, from your first thought to their new name."
        }
      />
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-[28px] border border-separator bg-surface p-7 shadow-none">
          <Status state={gift.state} />
          <GiftArt
            name={gift.name || "theirname.eth"}
            theme={gift.theme}
            opened={gift.state === "claimed"}
          />
          <div className="text-center">
            <h2 className="text-2xl">{gift.name || "A name of their own"}</h2>
            <p className="mx-auto my-5 max-w-sm font-serif text-lg italic text-muted">
              “{gift.message}”
            </p>
            <span className="text-xs text-muted">From alice.eth, with love.</span>
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="rounded-3xl border border-separator p-7 shadow-none">
            <h3>
              {gift.state === "claimed"
                ? "A new chapter has begun."
                : "Their invitation, from you."}
            </h3>
            <p className="mt-3 text-sm text-muted">
              {gift.state === "claimed"
                ? `${gift.recipient} has made this name their own.`
                : "Send this private link in a message. They can open it at their own pace."}
            </p>
            <div className="my-5 overflow-hidden rounded-xl border border-separator bg-background p-4">
              <p className="select-all break-all text-xs text-muted">{url}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <CopyButton value={url} />
              <Link
                to="/claim/$giftId"
                params={{ giftId: gift.id }}
                className="button button--secondary"
              >
                Preview invitation
                <Icon name="external" size={16} />
              </Link>
            </div>
            <p className="mt-5 text-[11px] text-muted">
              Preview links work in this browser’s saved demo. Nothing has been sent or registered.
            </p>
          </Card>
          <Card className="rounded-3xl border border-separator p-7 shadow-none">
            <h3 className="mb-4">The thoughtful details</h3>
            <SummaryRow label="Gift type">
              {gift.kind === "choice" ? "They choose" : "An exact name"}
            </SummaryRow>
            <SummaryRow label="Gift budget">
              {gift.kind === "choice" ? `$${gift.budget}` : "Existing name"}
            </SummaryRow>
            <SummaryRow label="Registration">{gift.years} year</SummaryRow>
            <SummaryRow label="For the recipient">$0</SummaryRow>
            <SummaryRow label="Status">
              <Status state={gift.state} />
            </SummaryRow>
          </Card>
          {gift.state === "expired" || gift.state === "ready" ? (
            <Modal>
              <Button variant="ghost" className="text-muted">
                Cancel and return gift
              </Button>
              <Modal.Backdrop>
                <Modal.Container>
                  <Modal.Dialog className="max-w-md">
                    <Modal.CloseTrigger />
                    <Modal.Header>
                      <Modal.Heading>Return this gift?</Modal.Heading>
                    </Modal.Header>
                    <Modal.Body>
                      <p className="text-sm text-muted">
                        Its invitation will stop working. In this preview, the gift will be marked
                        as returned. No funds move.
                      </p>
                    </Modal.Body>
                    <Modal.Footer>
                      <Button slot="close" variant="secondary">
                        Keep gift
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
                          toast.success("Gift returned in your preview");
                        }}
                      >
                        Return gift
                      </Button>
                    </Modal.Footer>
                  </Modal.Dialog>
                </Modal.Container>
              </Modal.Backdrop>
            </Modal>
          ) : null}
        </div>
      </div>
    </div>
  );
}
