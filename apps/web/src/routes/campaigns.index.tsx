import { createFileRoute, Link } from "@tanstack/react-router";

import { Card, ProgressBar } from "@thenamespace/uikit";

import { Icon } from "#/components/icon";
import { Empty, PageTitle, Reveal, Status } from "#/components/page";
import { useDemo } from "#/hooks/use-demo";
export const Route = createFileRoute("/campaigns/")({ component: Campaigns });
function Campaigns() {
  const [state] = useDemo();
  return (
    <div className="mx-auto w-[calc(100%-40px)] max-w-[1200px] py-12 md:w-[calc(100%-96px)]">
      <PageTitle
        eyebrow="NEW NAMES. FAMILIAR FACES."
        title="A beginning for your people."
        description="Make the first step onchain feel like a welcome, not a hurdle."
        action={
          <Link to="/campaigns/new" className="button button--primary">
            <Icon name="plus" size={17} />
            Create a campaign
          </Link>
        }
      />
      <Reveal className="relative my-10 overflow-hidden rounded-[28px] border border-[#e9dfee] bg-linear-120 from-[#f0e8fa] to-[#fceff5] p-8 md:p-10">
        <div className="relative z-1 max-w-lg">
          <span className="mb-4 block text-[10px] tracking-widest text-[#9b80ac] uppercase">
            Give belonging a name
          </span>
          <h2 className="text-3xl">
            Your community.
            <br />
            Their own little <span className="font-serif text-[#9d7bb4] italic">corner.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted">
            Welcome up to 500 people with a name they choose. You set the rules and cover the
            beginning. They bring themselves.
          </p>
          <Link
            to="/campaigns/new"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium"
          >
            Start something together
            <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div
          aria-hidden="true"
          className="absolute -right-4 bottom-0 hidden -rotate-12 text-[240px] leading-none text-[#e3d0eb] md:block"
        >
          ✳
        </div>
      </Reveal>
      <div className="mb-6 flex items-center justify-between">
        <h3>Your campaigns</h3>
        <span className="text-xs text-muted">{state.campaigns.length} little communities</span>
      </div>
      {state.campaigns.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {state.campaigns.map((campaign) => (
            <Card key={campaign.id} className="rounded-3xl border border-separator p-6 shadow-none">
              <div className="mb-6 flex items-center justify-between">
                <span className="rounded-2xl bg-[#f0e8fa] p-3 text-[#9275a9]">
                  <Icon name="people" size={26} />
                </span>
                <Status
                  state={campaign.closed ? "Closed" : campaign.paused ? "Paused" : "Active"}
                />
              </div>
              <h3>{campaign.name}</h3>
              <p className="mt-3 min-h-12 text-xs text-muted">{campaign.description}</p>
              <div className="mt-6 mb-3 flex justify-between text-xs">
                <span>{campaign.claimed} names, new beginnings</span>
                <span className="text-muted">of {campaign.quantity}</span>
              </div>
              <ProgressBar
                aria-label={`${campaign.name} claims`}
                value={campaign.claimed}
                maxValue={campaign.quantity}
              >
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
              <div className="mt-6 flex items-center justify-between border-t border-separator pt-4">
                <span className="text-[11px] text-muted">${campaign.budget} per person</span>
                <Link
                  to="/campaigns/$campaignId"
                  params={{ campaignId: campaign.id }}
                  className="inline-flex items-center gap-2 text-xs text-[#786087]"
                >
                  View campaign
                  <Icon name="arrow" size={16} />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          title="Your people are waiting."
          description="Create a campaign and give your community its first names."
          to="/campaigns/new"
          action="Create a campaign"
        />
      )}
    </div>
  );
}
