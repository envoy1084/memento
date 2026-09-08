import { useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import { Card, SearchField, Segment, Separator } from "@thenamespace/uikit";

import { Icon } from "#/components/common/icon";
import {
  ButtonLink,
  EmptyPanel,
  PageHeader,
  Reveal,
  Section,
  StatusChip,
} from "#/components/common/page";
import { NameMark } from "#/components/display/brand";
import { GiftArt } from "#/components/display/gift-art";
import { useDemo } from "#/hooks/use-demo";

export const Route = createFileRoute("/gifts/")({ component: Gifts });

const filters = [
  { id: "all", label: "All" },
  { id: "open", label: "Unopened" },
  { id: "claimed", label: "Claimed" },
] as const;

function Gifts() {
  const [state] = useDemo();
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const gifts = state.gifts.filter((gift) => {
    const matchesFilter =
      filter === "all" || (filter === "open" ? gift.state === "ready" : gift.state === "claimed");
    const haystack = `${gift.recipient} ${gift.name}`.toLowerCase();
    return matchesFilter && haystack.includes(query.trim().toLowerCase());
  });

  return (
    <Section className="py-12">
      <PageHeader
        eyebrow="Your gifts"
        title="Everything you’ve sent."
        description="Each gift is a private invitation. Share it when you’re ready, and follow it from here."
        action={
          <ButtonLink to="/send">
            <Icon name="plus" size={17} />
            Give a name
          </ButtonLink>
        }
      />

      <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
        <Segment
          size="sm"
          selectedKey={filter}
          onSelectionChange={(key) => setFilter(String(key))}
          aria-label="Filter gifts"
        >
          {filters.map((entry) => (
            <Segment.Item id={entry.id} key={entry.id}>
              {entry.label}
            </Segment.Item>
          ))}
        </Segment>
        <SearchField
          aria-label="Search your gifts"
          value={query}
          onChange={setQuery}
          className="w-full sm:w-72"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Find a person or name" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      <Separator className="mt-6 mb-8" />

      {gifts.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {gifts.map((gift, index) => (
            <Reveal key={gift.id} className="h-full" delay={Math.min(index, 5) * 0.04}>
              <Card
                variant="transparent"
                className="group flex h-full flex-col rounded-3xl border border-rule p-0 shadow-none transition-shadow duration-200 ease-swift hover:shadow-lift"
              >
                <div className="flex items-center justify-between px-5 pt-5">
                  <span className="truncate text-xs text-ink-soft">For {gift.recipient}</span>
                  <StatusChip state={gift.state} />
                </div>
                <div className="px-2">
                  <GiftArt
                    size="sm"
                    name={gift.name || "theirname.eth"}
                    theme={gift.theme}
                    opened={gift.state === "claimed"}
                  />
                </div>
                <div className="px-5 pb-5">
                  {gift.name ? (
                    <NameMark name={gift.name} size="md" />
                  ) : (
                    <p className="m-0 font-display text-xl font-semibold tracking-[-0.03em]">
                      A name they choose
                    </p>
                  )}
                  <p className="m-0 mt-2 text-[13px] text-ink-soft">
                    {gift.kind === "owned" ? "A name you already own" : `$${gift.budget} budget`} ·{" "}
                    {gift.years} year{gift.years > 1 ? "s" : ""}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-rule pt-4">
                    <span className="text-[11px] text-ink-faint">{gift.created}</span>
                    <Link
                      to="/gifts/$giftId"
                      params={{ giftId: gift.id }}
                      search={{}}
                      className="inline-flex items-center gap-2 rounded-lg text-[13px] font-medium text-lavender-700 [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-swift group-hover:[&_svg]:translate-x-1"
                    >
                      Open
                      <Icon name="arrow" size={16} />
                    </Link>
                  </div>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      ) : (
        <EmptyPanel
          icon={query ? "search" : "gift"}
          title={query ? "Nothing matches that." : "No gifts yet."}
          description={
            query
              ? "Try a different name, or clear the search to see everything."
              : "When you give someone a name, it shows up here with its invitation link."
          }
          action={query ? undefined : <ButtonLink to="/send">Give your first name</ButtonLink>}
        />
      )}
    </Section>
  );
}
