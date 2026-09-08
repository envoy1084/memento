import { useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import { Button, Card, Input, TextField } from "@thenamespace/uikit";

import { GiftArt } from "#/components/gift-art";
import { Icon } from "#/components/icon";
import { Empty, PageTitle, Reveal, Status } from "#/components/page";
import { useDemo } from "#/hooks/use-demo";
export const Route = createFileRoute("/gifts/")({ component: Gifts });
function Gifts() {
  const [state] = useDemo();
  const [filter, setFilter] = useState("All gifts");
  const [query, setQuery] = useState("");
  const gifts = state.gifts.filter(
    (gift) =>
      (filter === "All gifts" ||
        (filter === "Unopened" ? gift.state === "ready" : gift.state === "claimed")) &&
      `${gift.recipient} ${gift.name}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="mx-auto w-[calc(100%-40px)] max-w-[1200px] md:w-[calc(100%-96px)] py-12">
      <PageTitle
        eyebrow="THE LITTLE THINGS YOU GIVE"
        title="Good things, sent with love."
        description="Every name has a story. These are the ones you’ve started."
        action={
          <Link to="/send" className="button button--primary">
            <Icon name="plus" size={17} />
            Create a gift
          </Link>
        }
      />
      <div className="my-9 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 rounded-full bg-surface-secondary p-1" aria-label="Filter gifts">
          {["All gifts", "Unopened", "Claimed"].map((label) => (
            <Button
              key={label}
              size="sm"
              variant={filter === label ? "primary" : "ghost"}
              aria-pressed={filter === label}
              onPress={() => setFilter(label)}
            >
              {label}
            </Button>
          ))}
        </div>
        <TextField
          aria-label="Search gifts"
          value={query}
          onChange={setQuery}
          className="w-full sm:w-60"
        >
          <Input placeholder="Find a person or name…" />
        </TextField>
      </div>
      {gifts.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {gifts.map((gift, index) => (
            <Reveal key={gift.id} delay={index * 0.04}>
              <Card className="group h-full rounded-3xl border border-separator p-5 shadow-none transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">For {gift.recipient}</span>
                  <Status state={gift.state} />
                </div>
                <GiftArt
                  compact
                  name={gift.name || "theirname.eth"}
                  theme={gift.theme}
                  opened={gift.state === "claimed"}
                />
                <h3 className="mt-2 text-lg">{gift.name || "A name of their own"}</h3>
                <p className="mt-2 text-xs text-muted">
                  {gift.kind === "owned"
                    ? "A name you chose just for them"
                    : `$${gift.budget} to find their beginning`}{" "}
                  · {gift.years} year
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-separator pt-4">
                  <span className="text-[10px] text-muted">{gift.created}</span>
                  <Link
                    to="/gifts/$giftId"
                    params={{ giftId: gift.id }}
                    search={{}}
                    className="inline-flex items-center gap-2.5 text-xs font-medium text-[#786087] [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5"
                  >
                    View gift
                    <Icon name="arrow" size={16} />
                  </Link>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      ) : (
        <Empty
          title="A little room for possibility."
          description={
            query
              ? "No gifts match your search. Try another name."
              : "Your next thoughtful gesture starts here."
          }
        />
      )}
    </div>
  );
}
