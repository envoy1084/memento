import { useState } from "react";

import { Link } from "@tanstack/react-router";

import { Button, Card, NumberValue, SearchField, Segment, Separator } from "@thenamespace/uikit";
import { formatUnits } from "viem";

import { GiftQuery, giftsAtom } from "#/atoms/gifts";
import { AccountRequired } from "#/components/common/account-required";
import { Icon } from "#/components/common/icon";
import { ButtonLink, EmptyPanel, PageHeader, Reveal, Section } from "#/components/common/page";
import { NameMark } from "#/components/display/brand";
import { GiftArt } from "#/components/display/gift-art";
import { formatDate, formatTimeLeft } from "#/format/date";
import { giftTheme } from "#/format/gift";
import { useRemote } from "#/hooks/use-api-task";
import { useAuth } from "#/hooks/use-auth";

const filters = [
  { id: "all", label: "All" },
  { id: "open", label: "Unopened" },
  { id: "complete", label: "Claimed" },
] as const;

export function Gifts() {
  const auth = useAuth();
  const [offset, setOffset] = useState(0);
  const remote = useRemote(
    giftsAtom(new GiftQuery({ id: "list", userId: auth.actor?.userId ?? "", offset })),
  );
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const gifts = (remote.data ?? []).filter((gift) => {
    if (gift.status === "draft") return false;

    const matchesFilter =
      filter === "all" ||
      (filter === "open" ? gift.status === "ready" : gift.status === "complete");
    const haystack = `${gift.recipientName} ${gift.label}`.toLowerCase();

    return matchesFilter && haystack.includes(query.trim().toLowerCase());
  });

  return (
    <Section className="py-12">
      <PageHeader eyebrow="Your gifts" title="Everything you’ve sent." />

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

      {!auth.actor ? (
        <AccountRequired />
      ) : remote.loading ? (
        <p role="status">Loading your gifts…</p>
      ) : remote.failed ? (
        <Button onPress={remote.refresh}>Retry loading gifts</Button>
      ) : gifts.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {gifts.map((gift, index) => (
            <Reveal key={gift.id} className="h-full" delay={Math.min(index, 5) * 0.04}>
              <Card
                className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-paper-raised p-0 shadow-sm transition-shadow duration-200 ease-swift hover:shadow-lift ${gift.theme === "rose" ? "border-blush-200" : gift.theme === "mint" ? "border-sage-200" : "border-lavender-200"}`}
              >
                <div className="flex items-center justify-between gap-3 px-5 pt-5">
                  <span className="text-xs font-medium text-ink-soft">A name of their own</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${gift.status === "complete" ? "bg-sage-50 text-sage-700" : "bg-lavender-50 text-lavender-700"}`}
                  >
                    {gift.status === "ready"
                      ? gift.policy.expiresAt * 1000 <= Date.now()
                        ? "Expired"
                        : "Ready to claim"
                      : gift.status === "complete"
                        ? "Claimed"
                        : gift.status === "refunded"
                          ? "Refunded"
                          : gift.status === "cancelled"
                            ? "Cancelled"
                            : gift.status === "action_required"
                              ? "Needs attention"
                              : "Claim in progress"}
                  </span>
                </div>
                <div className="px-2">
                  <GiftArt
                    size="sm"
                    name={gift.label ? `${gift.label}.eth` : "theirname.eth"}
                    theme={giftTheme(gift.theme)}
                    opened={gift.status === "complete"}
                  />
                </div>
                <div className="px-5 pb-5">
                  {gift.label ? (
                    <NameMark name={`${gift.label}.eth`} size="md" />
                  ) : (
                    <p className="m-0 font-display text-xl font-semibold tracking-[-0.03em]">
                      A gift for {gift.recipientName ?? "someone special"}
                    </p>
                  )}
                  <p className="m-0 mt-2 text-[13px] text-ink-soft">
                    {
                      <>
                        <NumberValue
                          value={Number(formatUnits(BigInt(gift.policy.maxPrice), 6))}
                          maximumFractionDigits={2}
                        />{" "}
                        USDC
                      </>
                    }{" "}
                    · {gift.policy.duration / 31536000} year
                    {gift.policy.duration / 31536000 > 1 ? "s" : ""}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-rule pt-4">
                    <span className="text-[11px] text-ink-faint">
                      <span title={formatDate(gift.policy.expiresAt)}>
                        {gift.status === "ready"
                          ? formatTimeLeft(gift.policy.expiresAt)
                          : formatDate(gift.policy.expiresAt)}
                      </span>
                    </span>
                    <Link
                      to="/gifts/$giftId"
                      params={{ giftId: gift.id }}
                      search={{}}
                      className="inline-flex items-center gap-2 rounded-lg text-[13px] font-medium text-lavender-700 [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-swift group-hover:[&_svg]:translate-x-1"
                    >
                      View gift
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
              : "When you give someone a name, follow their gift’s progress here."
          }
          action={query ? undefined : <ButtonLink to="/send">Give your first name</ButtonLink>}
        />
      )}
      {auth.actor && (offset > 0 || (remote.data?.length ?? 0) === 100) ? (
        <div className="mt-6 flex gap-3">
          <Button
            size="md"
            variant="secondary"
            isDisabled={!offset}
            onPress={() => setOffset(Math.max(0, offset - 100))}
          >
            Previous
          </Button>
          <Button
            size="md"
            variant="secondary"
            isDisabled={(remote.data?.length ?? 0) < 100}
            onPress={() => setOffset(offset + 100)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </Section>
  );
}
