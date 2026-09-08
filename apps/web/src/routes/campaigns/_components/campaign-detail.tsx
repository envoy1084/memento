import { useState } from "react";

import { Link } from "@tanstack/react-router";

import {
  AlertDialog,
  Button,
  Card,
  Chip,
  Form,
  Meter,
  Modal,
  Separator,
  Table,
  toast,
} from "@thenamespace/uikit";

import { Field } from "#/components/common/fields";
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
import { useDemo } from "#/hooks/use-demo";

export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const [state, setState] = useDemo();
  const [recipient, setRecipient] = useState("");
  const [open, setOpen] = useState(false);
  const campaign = state.campaigns.find((entry) => entry.id === campaignId);

  if (!campaign)
    return (
      <Section className="py-16">
        <EmptyPanel
          icon="search"
          title="This campaign isn’t in this browser."
          description="Preview campaigns are saved locally, so one created elsewhere won’t open here."
          action={<ButtonLink to="/campaigns">Back to campaigns</ButtonLink>}
        />
      </Section>
    );

  const pending = campaign.invitations.filter((invitation) => !invitation.claimed).length;
  const availableSlots = campaign.quantity - campaign.claimed - pending;
  const locked = campaign.closed || campaign.paused;

  const update = (changes: Partial<typeof campaign>) =>
    setState((current) => ({
      ...current,
      campaigns: current.campaigns.map((entry) =>
        entry.id === campaignId ? { ...entry, ...changes } : entry,
      ),
    }));

  const createInvitation = () => {
    if (availableSlots <= 0 || locked) return;

    update({
      invitations: [
        ...campaign.invitations,
        {
          id: crypto.randomUUID(),
          recipient: recipient.trim() || "A new member",
          claimed: false,
        },
      ],
    });
    setRecipient("");
    setOpen(false);
    toast.success("Invitation created");
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

  const stats = [
    {
      label: "Names claimed",
      value: campaign.claimed,
      hint: `of ${campaign.quantity} invitations`,
    },
    {
      label: "Still available",
      value: campaign.quantity - campaign.claimed,
      hint: `${pending} invitation${pending === 1 ? "" : "s"} shared and waiting`,
    },
    {
      label: "Budget remaining",
      value: `$${((campaign.quantity - campaign.claimed) * campaign.budget).toLocaleString()}`,
      hint: `$${campaign.budget} covered per person`,
    },
  ];

  return (
    <Section className="py-10">
      <Back to="/campaigns" label="Campaigns" />
      <PageHeader
        eyebrow="Campaign"
        title={campaign.name}
        description={campaign.description}
        action={
          <StatusChip state={campaign.closed ? "closed" : campaign.paused ? "paused" : "active"} />
        }
      />

      <div className="my-10 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-3xl border border-rule p-6 shadow-none">
            <p className="m-0 text-xs text-ink-soft">{stat.label}</p>
            <p className="m-0 my-2.5 font-display text-[2.25rem] leading-none font-semibold tracking-[-0.04em] tabular-nums">
              {stat.value}
            </p>
            <p className="m-0 text-[11px] text-ink-faint">{stat.hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card className="rounded-3xl border border-rule p-6 shadow-none">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h3 className="m-0">Invitations</h3>
            <Modal isOpen={open} onOpenChange={setOpen}>
              <Button size="sm" isDisabled={availableSlots <= 0 || locked}>
                <Icon name="plus" size={16} />
                New invitation
              </Button>
              <Modal.Backdrop variant="blur">
                <Modal.Container size="sm">
                  <Modal.Dialog>
                    <Modal.CloseTrigger />
                    <Modal.Header>
                      <Modal.Icon className="bg-lavender-50 text-lavender-600">
                        <Icon name="mail" size={19} />
                      </Modal.Icon>
                      <Modal.Heading>Make room for someone</Modal.Heading>
                    </Modal.Header>
                    <Modal.Body>
                      <Form
                        className="space-y-5"
                        onSubmit={(event) => {
                          event.preventDefault();
                          createInvitation();
                        }}
                      >
                        <Field
                          label="Who is it for?"
                          value={recipient}
                          onChange={setRecipient}
                          required
                          maxLength={100}
                          placeholder="Jamie, or the next new member"
                          description="A label for your own list. No email is sent."
                        />
                        <Button type="submit" fullWidth>
                          Create invitation
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
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label={`Invitations for ${campaign.name}`}>
                  <Table.Header>
                    <Table.Column isRowHeader>Recipient</Table.Column>
                    <Table.Column>Status</Table.Column>
                    <Table.Column>Link</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {campaign.invitations.map((invitation) => (
                      <Table.Row key={invitation.id} id={invitation.id}>
                        <Table.Cell>
                          <span className="font-medium">{invitation.recipient}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <Chip
                            size="sm"
                            variant="soft"
                            color={invitation.claimed ? "success" : "default"}
                          >
                            {invitation.claimed ? "Claimed" : "Ready"}
                          </Chip>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center justify-end gap-2">
                            <CopyButton
                              size="sm"
                              variant="tertiary"
                              value={`${window.location.origin}/invite/${campaignId}/${invitation.id}`}
                              label="Copy"
                            />
                            <Link
                              to="/invite/$campaignId/$invitationId"
                              params={{ campaignId, invitationId: invitation.id }}
                              aria-label={`Preview the invitation for ${invitation.recipient}`}
                              className="inline-flex size-9 items-center justify-center rounded-full bg-paper-sunken text-ink-soft hover:text-ink"
                            >
                              <Icon name="external" size={15} />
                            </Link>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          ) : (
            <EmptyPanel
              icon="mail"
              title="No invitations yet."
              description="Create your first invitation, then share the link with someone in your community."
            />
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
            <span className="text-[11px] text-ink-faint tabular-nums">
              {Math.max(0, availableSlots)} invitation{availableSlots === 1 ? "" : "s"} left to
              create
            </span>
            <Button
              variant="ghost"
              size="sm"
              isDisabled={!campaign.invitations.length}
              onPress={exportInvitations}
            >
              <Icon name="download" size={15} />
              Export CSV
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border border-rule p-6 shadow-none">
            <Eyebrow className="mb-5">Progress</Eyebrow>
            <Meter value={campaign.claimed} maxValue={campaign.quantity} aria-label="Names claimed">
              <Meter.Track>
                <Meter.Fill />
              </Meter.Track>
            </Meter>
            <Separator className="my-5" />
            <DetailList>
              <DetailRow label="Registration">
                {campaign.years} year{campaign.years > 1 ? "s" : ""}
              </DetailRow>
              <DetailRow label="Name length">
                {campaign.minLength}–{campaign.maxLength} characters
              </DetailRow>
              <DetailRow label="Budget per person">${campaign.budget}</DetailRow>
              <DetailRow label="World ID">
                {campaign.worldId ? "Required" : "Not required"}
              </DetailRow>
            </DetailList>
            {!campaign.closed ? (
              <Button
                variant="secondary"
                fullWidth
                className="mt-5"
                onPress={() => update({ paused: !campaign.paused })}
              >
                <Icon name={campaign.paused ? "resume" : "pause"} size={16} />
                {campaign.paused ? "Resume campaign" : "Pause campaign"}
              </Button>
            ) : null}
          </Card>

          <Note>
            Pausing stops new claims without affecting names people already have. Everything here is
            local to this preview.
          </Note>

          {!campaign.closed ? (
            <AlertDialog>
              <Button variant="ghost" size="sm" className="text-ink-soft">
                Close campaign and return the budget
              </Button>
              <AlertDialog.Backdrop>
                <AlertDialog.Container size="sm">
                  <AlertDialog.Dialog>
                    <AlertDialog.Header>
                      <AlertDialog.Icon status="danger">
                        <Icon name="alert" size={20} />
                      </AlertDialog.Icon>
                      <AlertDialog.Heading>Close this campaign?</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <p className="m-0 text-sm text-ink-soft">
                        Unclaimed invitations stop working. Names people already claimed stay with
                        them. No funds move in this preview.
                      </p>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button slot="close" variant="secondary">
                        Keep it open
                      </Button>
                      <Button
                        slot="close"
                        variant="danger"
                        onPress={() => {
                          update({ closed: true, paused: true });
                          toast.success("Campaign closed");
                        }}
                      >
                        Close campaign
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
