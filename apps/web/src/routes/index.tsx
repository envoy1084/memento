import type { ReactNode } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import { Avatar, Card, Chip, Separator, Timeline } from "@thenamespace/uikit";

import { Icon, type IconName } from "#/components/common/icon";
import { ButtonLink, Eyebrow, Reveal, RuleHeading, Section } from "#/components/common/page";
import { NameMark } from "#/components/display/brand";
import { GiftArt } from "#/components/display/gift-art";

export const Route = createFileRoute("/")({ component: Home });

/** The page's one typographic flourish, used once per screen. */
function Emphasis({ children }: { children: ReactNode }) {
  return (
    <span className="text-lavender-700 underline decoration-lavender-200 decoration-[0.09em] underline-offset-[0.14em]">
      {children}
    </span>
  );
}

function GiveOption({
  visual,
  title,
  description,
  footer,
  tint,
}: {
  visual: ReactNode;
  title: string;
  description: string;
  footer: ReactNode;
  tint: string;
}) {
  return (
    <Card
      variant="transparent"
      className="group flex h-full flex-col rounded-3xl border border-rule p-0 shadow-none transition-shadow duration-200 ease-swift hover:shadow-lift"
    >
      <div className={`flex h-[168px] items-center justify-center rounded-t-3xl px-6 ${tint}`}>
        {visual}
      </div>
      <Card.Header className="px-6 pt-6">
        <Card.Title className="text-display-sm">{title}</Card.Title>
        <Card.Description className="mt-2 text-[13px] leading-6 text-ink-soft">
          {description}
        </Card.Description>
      </Card.Header>
      <Card.Footer className="mt-auto px-6 pt-4 pb-6">{footer}</Card.Footer>
    </Card>
  );
}

const optionLink =
  "inline-flex items-center gap-2 rounded-lg text-[13px] font-medium text-lavender-700 [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-swift group-hover:[&_svg]:translate-x-1";

const steps = [
  {
    title: "Choose what to give",
    body: "A budget so they can pick their own name, or a name you already own and want to pass on.",
  },
  {
    title: "Wrap it and send the link",
    body: "Add a note, pick the wrapping, and share the private invitation however you normally talk to them.",
  },
  {
    title: "They make it theirs",
    body: "They open it, choose a name, and it lands in a wallet they control. No tokens, no gas, no jargon.",
  },
];

const promises: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "shield",
    title: "It belongs to them",
    body: "The name goes to a wallet they choose. You can’t take it back, and neither can we.",
  },
  {
    icon: "wallet",
    title: "No wallet required first",
    body: "They can start with an email address and get a wallet along the way.",
  },
  {
    icon: "gift",
    title: "You cover the beginning",
    body: "Registration is on you. They pay nothing to claim it.",
  },
];

function Home() {
  return (
    <>
      <Section className="grid items-center gap-10 pt-12 pb-14 md:grid-cols-[1.02fr_1fr] md:gap-14 md:pt-16 md:pb-20">
        <Reveal className="order-2 min-w-0 md:order-1">
          <Chip variant="soft" size="sm" className="mb-6 gap-2 bg-lavender-50 text-lavender-700">
            <span className="size-1.5 rounded-full bg-lavender-400" />
            Little gifts. New beginnings.
          </Chip>
          <h1 className="text-display-xl">
            Give someone a name that’s <Emphasis>theirs to keep</Emphasis>.
          </h1>
          <p className="mt-6 max-w-[46ch] text-[15px] leading-[1.8] text-ink-soft">
            An .eth name is how a person is known online — a single, human name instead of a long
            wallet address. Cover the cost, add a note, and let them choose the one that fits.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <ButtonLink to="/send" size="lg">
              Give a name
              <Icon name="arrow" size={18} />
            </ButtonLink>
            <Link
              to="/claim/$giftId"
              params={{ giftId: "a-little-beginning" }}
              className="inline-flex items-center gap-2 rounded-lg text-[13px] font-medium text-ink-soft hover:text-ink"
            >
              See what they receive
              <Icon name="external" size={16} />
            </Link>
          </div>
          <div className="mt-9 flex items-center gap-4">
            <div className="flex -space-x-2.5">
              {["J", "A", "S"].map((initial, index) => (
                <Avatar
                  key={initial}
                  size="sm"
                  variant="soft"
                  className="ring-2 ring-paper"
                  color={index === 1 ? "danger" : index === 2 ? "success" : "accent"}
                >
                  <Avatar.Fallback>{initial}</Avatar.Fallback>
                </Avatar>
              ))}
            </div>
            <p className="m-0 text-xs leading-relaxed text-ink-soft">
              Made for the people in your life.
              <br />
              <span className="text-ink-faint">No crypto experience needed on either side.</span>
            </p>
          </div>
        </Reveal>
        <Reveal className="order-1 min-w-0 md:order-2" delay={0.08}>
          <GiftArt name="yourname.eth" size="lg" notes />
        </Reveal>
      </Section>

      <Section>
        <Separator />
        <div className="grid grid-cols-2 gap-y-6 py-7 text-[13px] md:flex md:items-center md:justify-between">
          <p className="col-span-2 m-0 max-w-[24ch] text-ink-soft md:max-w-none">
            A familiar name. <span className="font-medium text-ink">A whole new world.</span>
          </p>
          {[
            { icon: "globe" as const, label: "Built on ENS" },
            { icon: "shield" as const, label: "Owned by the recipient" },
            { icon: "gift" as const, label: "You cover the registration" },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-2.5 text-ink-soft">
              <Icon name={item.icon} size={17} className="text-lavender-500" />
              {item.label}
            </span>
          ))}
        </div>
        <Separator />
      </Section>

      <Section className="pt-16 pb-6 md:pt-24">
        <Reveal className="max-w-[46ch]">
          <RuleHeading className="mb-6">Three ways to give</RuleHeading>
          <h2 className="text-display-lg">There’s more than one way to say this is for you.</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Reveal className="h-full">
            <GiveOption
              tint="bg-lavender-50"
              visual={
                <div className="flex flex-col items-center gap-1.5">
                  {[
                    { name: "dreamer.eth", cls: "-rotate-3 -translate-x-5 text-sm opacity-70" },
                    { name: "heyjamie.eth", cls: "rotate-2 z-1 text-base shadow-lift" },
                    { name: "somethingyou.eth", cls: "-rotate-1 translate-x-4 text-sm opacity-70" },
                  ].map((chip) => (
                    <span
                      key={chip.name}
                      className={`rounded-xl border border-lavender-100 bg-white px-4 py-1.5 ${chip.cls}`}
                    >
                      <NameMark name={chip.name} size="sm" />
                    </span>
                  ))}
                </div>
              }
              title="Let them choose"
              description="You set the budget and a few simple rules. They find the name that sounds like them."
              footer={
                <Link to="/send" className={optionLink}>
                  Gift a fresh beginning
                  <Icon name="arrow" size={17} />
                </Link>
              }
            />
          </Reveal>
          <Reveal className="h-full" delay={0.06}>
            <GiveOption
              tint="bg-blush-50"
              visual={
                <div className="flex flex-col items-center gap-4 text-center">
                  <span className="grid size-14 place-content-center rounded-2xl border border-blush-100 bg-white text-blush-500 shadow-lift">
                    <Icon name="gift" size={26} />
                  </span>
                  <NameMark name="sophie.eth" size="md" />
                  <span className="text-[10px] tracking-[0.14em] text-blush-500 uppercase">
                    Had her name on it
                  </span>
                </div>
              }
              title="Pass on a name you own"
              description="Already hold the perfect one? Wrap it up and transfer it when they claim."
              footer={
                <Link to="/send" search={{ kind: "owned" }} className={optionLink}>
                  Gift a name you own
                  <Icon name="arrow" size={17} />
                </Link>
              }
            />
          </Reveal>
          <Reveal className="h-full" delay={0.12}>
            <GiveOption
              tint="bg-sage-50"
              visual={
                <div className="flex -space-x-3">
                  {["m", "a", "j", "+"].map((letter, index) => (
                    <span
                      key={letter}
                      className={`grid size-14 place-content-center rounded-2xl border-4 border-sage-50 font-display text-xl font-semibold text-sage-600 ${
                        index % 2 === 0
                          ? "-rotate-6 bg-sage-200"
                          : "translate-y-3 rotate-6 bg-sage-100"
                      }`}
                    >
                      {letter}
                    </span>
                  ))}
                </div>
              }
              title="Welcome a whole community"
              description="Up to 500 invitations from one campaign, each one claimed by a different person."
              footer={
                <Link to="/campaigns/new" className={optionLink}>
                  Start a community gift
                  <Icon name="arrow" size={17} />
                </Link>
              }
            />
          </Reveal>
        </div>
      </Section>

      <Section className="grid gap-12 pt-20 md:grid-cols-[1fr_1fr] md:gap-16 md:pt-28">
        <Reveal>
          <RuleHeading className="mb-6">How it works</RuleHeading>
          <h2 className="max-w-[16ch] text-display-lg">From you, to their next chapter.</h2>
          <Timeline className="mt-9" density="comfortable" size="sm">
            {steps.map((step, index) => (
              <Timeline.Item key={step.title}>
                <Timeline.Marker aria-hidden="true">{index + 1}</Timeline.Marker>
                <Timeline.Content>
                  <h3 className="m-0 text-[17px]">{step.title}</h3>
                  <p className="m-0 mt-2 max-w-[42ch] text-[13px] leading-6 text-ink-soft">
                    {step.body}
                  </p>
                </Timeline.Content>
              </Timeline.Item>
            ))}
          </Timeline>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="rounded-[28px] border border-rule bg-paper-raised p-7 shadow-lift md:p-8">
            <Eyebrow className="mb-6">What the recipient gets</Eyebrow>
            <ul className="m-0 flex list-none flex-col gap-6 p-0">
              {promises.map((promise) => (
                <li key={promise.title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-content-center rounded-xl bg-lavender-50 text-lavender-600">
                    <Icon name={promise.icon} size={19} />
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-medium">{promise.title}</p>
                    <p className="m-0 mt-1 text-[13px] leading-6 text-ink-soft">{promise.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Separator className="my-7" />
            <Link
              to="/help"
              className="inline-flex items-center gap-2 rounded-lg text-[13px] font-medium text-lavender-700"
            >
              Questions people ask first
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </Reveal>
      </Section>

      <Section className="pt-20 md:pt-28">
        <Reveal className="overflow-hidden rounded-[32px] border border-lavender-100 bg-linear-135 from-lavender-50 via-paper to-blush-50">
          <div className="grid items-center gap-8 p-8 md:grid-cols-[1.1fr_0.9fr] md:gap-6 md:p-12">
            <div>
              <RuleHeading className="mb-6">One small gesture</RuleHeading>
              <h2 className="max-w-[18ch] text-display-lg">
                Someone’s next chapter could start with you.
              </h2>
              <p className="mt-4 max-w-[44ch] text-[15px] text-ink-soft">
                It takes about a minute. They’ll have it for as long as they want it.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <ButtonLink to="/send" size="lg">
                  Give a name
                  <Icon name="arrow" size={18} />
                </ButtonLink>
                <ButtonLink to="/campaigns/new" variant="secondary" size="lg">
                  Welcome a community
                </ButtonLink>
              </div>
            </div>
            <div className="-mb-10 hidden md:block">
              <GiftArt name="theirname.eth" theme="rose" size="md" />
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
