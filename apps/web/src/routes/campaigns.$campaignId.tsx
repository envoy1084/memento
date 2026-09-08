import { useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import { Button, Card, Form, Modal, ProgressBar, toast } from "@thenamespace/uikit";

import { Field } from "#/components/fields";
import { Icon } from "#/components/icon";
import { Back, CopyButton, Empty, PageTitle, Status, SummaryRow } from "#/components/page";
import { useDemo } from "#/hooks/use-demo";
export const Route = createFileRoute("/campaigns/$campaignId")({ component: CampaignDetail });
function CampaignDetail() {
  const { campaignId } = Route.useParams();
  const [state, setState] = useDemo();
  const [recipient, setRecipient] = useState("");
  const [open, setOpen] = useState(false);
  const campaign = state.campaigns.find((entry) => entry.id === campaignId);
  if (!campaign)
    return (
      <div className="mx-auto max-w-3xl px-5 py-20">
        <Empty
          title="This community isn’t here yet."
          description="Start with your campaign overview."
          to="/campaigns"
          action="See campaigns"
        />
      </div>
    );
  const availableSlots =
    campaign.quantity -
    campaign.claimed -
    campaign.invitations.filter((invitation) => !invitation.claimed).length;
  const update = (changes: Partial<typeof campaign>) =>
    setState((current) => ({
      ...current,
      campaigns: current.campaigns.map((entry) =>
        entry.id === campaignId ? { ...entry, ...changes } : entry,
      ),
    }));
  const createInvitation = () => {
    if (availableSlots <= 0 || campaign.closed || campaign.paused) return;
    update({
      invitations: [
        ...campaign.invitations,
        {
          id: crypto.randomUUID(),
          recipient: recipient.trim() || "Someone in your community",
          claimed: false,
        },
      ],
    });
    setRecipient("");
    setOpen(false);
    toast.success("A new invitation is ready to share");
  };
  const exportInvitations = () => {
    const csv = [
      "Recipient,Preview link,Status",
      ...campaign.invitations.map(
        (invitation) =>
          `"${invitation.recipient.replaceAll('"', '""').replace(/^[=+@-]/, "'")}","${window.location.origin}/invite/${campaignId}/${invitation.id}","${invitation.claimed ? "Claimed" : "Ready"}"`,
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "memento-invitations.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="mx-auto w-[calc(100%-40px)] max-w-[1200px] py-10 md:w-[calc(100%-96px)]">
      <Back to="/campaigns" />
      <PageTitle
        eyebrow="A LITTLE COMMUNITY, A LOT OF POSSIBILITY"
        title={campaign.name}
        description={campaign.description}
        action={
          <Status state={campaign.closed ? "Closed" : campaign.paused ? "Paused" : "Active"} />
        }
      />
      <div className="my-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Names, made personal",
            value: campaign.claimed,
            suffix: `of ${campaign.quantity} beginnings`,
          },
          {
            label: "A little possibility left",
            value: campaign.quantity - campaign.claimed,
            suffix: "names still to find their people",
          },
          {
            label: "Budget remaining",
            value: `$${((campaign.quantity - campaign.claimed) * campaign.budget).toLocaleString()}`,
            suffix: `$${campaign.budget} covered per person`,
          },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-3xl border border-separator p-6 shadow-none">
            <p className="text-xs text-muted">{stat.label}</p>
            <strong className="my-3 font-display text-4xl font-medium tracking-tight tabular-nums">
              {stat.value}
            </strong>
            <p className="text-[11px] text-muted">{stat.suffix}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-7 lg:grid-cols-[1.6fr_1fr]">
        <Card className="rounded-3xl border border-separator p-6 shadow-none">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h3>Your invitations</h3>
            <Modal isOpen={open} onOpenChange={setOpen}>
              <Button
                size="sm"
                isDisabled={availableSlots <= 0 || campaign.closed || campaign.paused}
              >
                <Icon name="plus" size={16} />
                Create invitation
              </Button>
              <Modal.Backdrop>
                <Modal.Container>
                  <Modal.Dialog className="max-w-md">
                    <Modal.CloseTrigger />
                    <Modal.Header>
                      <Modal.Heading>Make room for someone.</Modal.Heading>
                    </Modal.Header>
                    <Modal.Body>
                      <Form
                        onSubmit={(event) => {
                          event.preventDefault();
                          createInvitation();
                        }}
                      >
                        <Field
                          label="Invitation label"
                          value={recipient}
                          onChange={setRecipient}
                          required
                          maxLength={100}
                          placeholder="Jamie, or the next new member"
                          description="For your reference. No email will be sent."
                        />
                        <Button type="submit" fullWidth className="mt-5">
                          Create private invitation
                          <Icon name="arrow" size={17} />
                        </Button>
                      </Form>
                    </Modal.Body>
                  </Modal.Dialog>
                </Modal.Container>
              </Modal.Backdrop>
            </Modal>
          </div>
          {campaign.invitations.length ? (
            <div className="divide-y divide-separator">
              {campaign.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="text-sm font-medium">{invitation.recipient}</p>
                    <p className="mt-1 text-[10px] text-muted">
                      {invitation.claimed ? "A new chapter has begun" : "Ready for a little hello"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CopyButton
                      value={`${window.location.origin}/invite/${campaignId}/${invitation.id}`}
                    />
                    <Link
                      to="/invite/$campaignId/$invitationId"
                      params={{ campaignId, invitationId: invitation.id }}
                      aria-label={`Preview invitation for ${invitation.recipient}`}
                      className="inline-flex size-10 items-center justify-center rounded-full bg-surface-secondary"
                    >
                      <Icon name="external" size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-separator px-5 py-12 text-center">
              <Icon name="mail" className="mx-auto mb-4 text-muted" size={28} />
              <h3 className="text-base">A welcome is waiting to happen.</h3>
              <p className="mt-2 text-xs text-muted">
                Create your first invitation, then share it with your people.
              </p>
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-separator pt-4">
            <span className="text-[11px] text-muted">
              {availableSlots} invitations available to create
            </span>
            <Button
              variant="ghost"
              size="sm"
              isDisabled={!campaign.invitations.length}
              onPress={exportInvitations}
            >
              Export invitations
              <Icon name="external" size={14} />
            </Button>
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="rounded-3xl border border-separator p-6 shadow-none">
            <h3 className="mb-4">Your community’s beginning</h3>
            <ProgressBar
              aria-label="Campaign claims"
              value={campaign.claimed}
              maxValue={campaign.quantity}
            >
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
            <div className="mt-5">
              <SummaryRow label="Registration">{campaign.years} year</SummaryRow>
              <SummaryRow label="Name length">
                {campaign.minLength}–{campaign.maxLength} characters
              </SummaryRow>
              <SummaryRow label="World ID">
                {campaign.worldId ? "Required" : "Not required"}
              </SummaryRow>
            </div>
            {!campaign.closed ? (
              <Button
                variant="secondary"
                fullWidth
                className="mt-5"
                onPress={() => update({ paused: !campaign.paused })}
              >
                {campaign.paused ? "Resume this welcome" : "Pause campaign"}
              </Button>
            ) : null}
          </Card>
          <p className="px-3 text-[11px] leading-6 text-muted">
            All activity is local to this preview. Pausing stops new claims until you’re ready to
            welcome people again.
          </p>
          {!campaign.closed ? (
            <Modal>
              <Button variant="ghost" size="sm" className="text-muted">
                Close campaign & return budget
              </Button>
              <Modal.Backdrop>
                <Modal.Container>
                  <Modal.Dialog className="max-w-md">
                    <Modal.CloseTrigger />
                    <Modal.Header>
                      <Modal.Heading>Close this chapter?</Modal.Heading>
                    </Modal.Header>
                    <Modal.Body>
                      <p className="text-sm text-muted">
                        Unclaimed invitations will stop working. Claimed names remain with their
                        owners. No funds move in this preview.
                      </p>
                    </Modal.Body>
                    <Modal.Footer>
                      <Button variant="secondary" slot="close">
                        Keep campaign
                      </Button>
                      <Button
                        variant="danger"
                        slot="close"
                        onPress={() => update({ closed: true, paused: true })}
                      >
                        Close campaign
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
