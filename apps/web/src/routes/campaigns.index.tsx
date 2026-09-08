import { createFileRoute, Link } from "@tanstack/react-router";

import { Card, Meter, Separator } from "@thenamespace/uikit";

import { Icon } from "#/components/icon";
import {
  ButtonLink,
  EmptyPanel,
  Eyebrow,
  PageHeader,
  Reveal,
  RuleHeading,
  Section,
  StatusChip,
} from "#/components/page";
import { useDemo } from "#/hooks/use-demo";

export const Route = createFileRoute("/campaigns/")({ component: Campaigns });

function Campaigns() {
  const [state] = useDemo();

  return (
    <Section className="py-12">
      <PageHeader
        eyebrow="Communities"
        title="A first name for everyone you welcome."
        description="One campaign, up to 500 invitations. You cover the cost; each person chooses their own name."
        action={
          <ButtonLink to="/campaigns/new">
            <Icon name="plus" size={17} />
            New campaign
          </ButtonLink>
        }
      />

      <Reveal className="my-10 overflow-hidden rounded-[28px] border border-lavender-100 bg-linear-120 from-lavender-50 to-blush-50">
        <div className="grid gap-8 p-8 md:grid-cols-[1.15fr_0.85fr] md:items-center md:p-10">
          <div>
            <Eyebrow className="mb-4">Give belonging a name</Eyebrow>
            <h2 className="max-w-[18ch] text-display-lg">
              Make the first step onchain feel like a welcome.
            </h2>
            <p className="mt-4 max-w-[48ch] text-[15px] text-ink-soft">
              Set the budget and the rules once. Share private invitations with your members, and
              watch the names arrive.
            </p>
            <Link
              to="/campaigns/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-lavender-700"
            >
              Start something together
              <Icon name="arrow" size={17} />
            </Link>
          </div>
          <ul className="m-0 grid list-none gap-4 p-0 text-[13px]">
            {[
              { icon: "people" as const, label: "Up to 500 invitations per campaign" },
              { icon: "shield" as const, label: "Optional one-person-one-name check" },
              { icon: "pause" as const, label: "Pause or close whenever you need to" },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-ink-soft">
                <span className="grid size-9 shrink-0 place-content-center rounded-xl bg-white/70 text-lavender-600">
                  <Icon name={item.icon} size={17} />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      <div className="mb-6 flex items-center justify-between gap-4">
        <RuleHeading>Your campaigns</RuleHeading>
        <span className="shrink-0 text-xs text-ink-faint tabular-nums">
          {state.campaigns.length}
        </span>
      </div>

      {state.campaigns.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {state.campaigns.map((campaign, index) => (
            <Reveal key={campaign.id} className="h-full" delay={Math.min(index, 5) * 0.04}>
              <Card
                variant="transparent"
                className="group flex h-full flex-col rounded-3xl border border-rule p-6 shadow-none transition-shadow duration-200 ease-swift hover:shadow-lift"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="grid size-11 place-content-center rounded-2xl bg-lavender-50 text-lavender-600">
                    <Icon name="people" size={22} />
                  </span>
                  <StatusChip
                    state={campaign.closed ? "closed" : campaign.paused ? "paused" : "active"}
                  />
                </div>
                <h3 className="m-0">{campaign.name}</h3>
                <p className="m-0 mt-2 line-clamp-2 min-h-10 text-[13px] leading-6 text-ink-soft">
                  {campaign.description}
                </p>
                <div className="mt-6">
                  <Meter
                    size="sm"
                    value={campaign.claimed}
                    maxValue={campaign.quantity}
                    aria-label={`${campaign.name} names claimed`}
                  >
                    <div className="mb-2 flex items-baseline justify-between text-[13px]">
                      <span className="font-medium tabular-nums">{campaign.claimed} claimed</span>
                      <span className="text-ink-faint tabular-nums">of {campaign.quantity}</span>
                    </div>
                    <Meter.Track>
                      <Meter.Fill />
                    </Meter.Track>
                  </Meter>
                </div>
                <div className="mt-auto pt-6">
                  <Separator className="mb-4" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-ink-faint">${campaign.budget} per person</span>
                  <Link
                    to="/campaigns/$campaignId"
                    params={{ campaignId: campaign.id }}
                    className="inline-flex items-center gap-2 rounded-lg text-[13px] font-medium text-lavender-700 [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-swift group-hover:[&_svg]:translate-x-1"
                  >
                    Manage
                    <Icon name="arrow" size={16} />
                  </Link>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      ) : (
        <EmptyPanel
          icon="people"
          title="No campaigns yet."
          description="Create one to welcome your community with a name each person picks for themselves."
          action={<ButtonLink to="/campaigns/new">Create a campaign</ButtonLink>}
        />
      )}
    </Section>
  );
}
