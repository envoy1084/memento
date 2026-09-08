import { useEffect, useRef, useState } from "react";

import { Link } from "@tanstack/react-router";

import {
  Button,
  Card,
  Chip,
  Description,
  Form,
  Label,
  RadioButtonGroup,
  Separator,
} from "@thenamespace/uikit";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { claimCampaign, claimGift, nameAvailability } from "#/atoms/demo";
import { Field } from "#/components/common/fields";
import { Icon } from "#/components/common/icon";
import {
  ButtonLink,
  CopyButton,
  DetailList,
  DetailRow,
  EmptyPanel,
  Eyebrow,
  Note,
  Section,
} from "#/components/common/page";
import { NameMark } from "#/components/display/brand";
import { GiftArt } from "#/components/display/gift-art";
import { useDemo } from "#/hooks/use-demo";
import { ClaimProgress } from "#/routes/claim/_components/claim-progress";

type Stage = "sealed" | "choose" | "wallet" | "verify" | "review" | "claiming" | "complete";

const suggestions = ["heyfriend", "littlewonder", "hellobobby"];

export function ClaimJourney({
  giftId,
  campaignId,
  invitationId,
}: {
  giftId?: string;
  campaignId?: string;
  invitationId?: string;
}) {
  const [state, setState] = useDemo();
  const reduced = useReducedMotion();
  const gift = state.gifts.find((entry) => entry.id === giftId);
  const campaign = state.campaigns.find((entry) => entry.id === campaignId);
  const invitation = campaign?.invitations.find((entry) => entry.id === invitationId);

  const [stage, setStage] = useState<Stage>("sealed");
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("email");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // A multi-stage flow replaces the whole panel, so move focus with it.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    panel.current?.focus();
  }, [stage]);

  const isOwned = gift?.kind === "owned";
  const budget = gift?.budget ?? campaign?.budget ?? 20;
  const years = gift?.years ?? campaign?.years ?? 1;
  const minLength = gift?.minLength ?? campaign?.minLength;
  const maxLength = gift?.maxLength ?? campaign?.maxLength;
  const quote = nameAvailability(name, minLength, maxLength, budget, years);
  const fullName = isOwned ? gift.name : `${quote.name || "yourname"}.eth`;
  const sender = campaign?.name ?? "alice.eth";

  const unavailable = campaignId
    ? !campaign ||
      !invitation ||
      invitation.claimed ||
      campaign.closed ||
      campaign.paused ||
      campaign.claimed >= campaign.quantity
    : !gift || gift.state !== "ready";

  const complete = () => {
    try {
      const next =
        campaignId && invitationId
          ? claimCampaign(state, campaignId, invitationId, name)
          : claimGift(state, giftId ?? "", name);
      setState(next);
      setStage("complete");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "This claim couldn’t be completed. Try again.",
      );
      setStage("review");
    }
  };

  if (unavailable && stage !== "complete" && stage !== "claiming") {
    const alreadyClaimed = gift?.state === "claimed" || invitation?.claimed;
    return (
      <Section className="py-20">
        <EmptyPanel
          icon={alreadyClaimed ? "check" : "clock"}
          title={
            alreadyClaimed ? "This one has already been claimed." : "This invitation isn’t open."
          }
          description={
            alreadyClaimed
              ? "Every name can only be claimed once, and this one has found its person."
              : "It may have expired, been returned, or the community may have paused. Ask whoever sent it for a fresh link."
          }
          action={<ButtonLink to="/">See what Memento is</ButtonLink>}
        />
      </Section>
    );
  }

  return (
    <Section className="py-10 md:py-16">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="order-2 min-w-0 lg:order-1">
          <div className="overflow-hidden rounded-[32px] border border-rule bg-linear-160 from-lavender-50 via-paper-raised to-blush-50 shadow-lift">
            <GiftArt
              name={stage === "sealed" && !isOwned ? "a name of your own" : fullName}
              theme={gift?.theme ?? "aura"}
              size="lg"
              opened={stage !== "sealed"}
              sender={sender}
            />
            <div className="border-t border-white/70 px-7 py-7 text-center">
              <p className="mx-auto m-0 max-w-[36ch] text-[17px] leading-relaxed text-ink">
                “{gift?.message ?? campaign?.description}”
              </p>
              <p className="mt-4 mb-0 text-xs tracking-[0.12em] text-ink-soft uppercase">
                From {sender}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-ink-soft">
            {[
              { icon: "shield" as const, label: "Yours to own" },
              { icon: "gift" as const, label: "Nothing to pay" },
              { icon: "globe" as const, label: "Works everywhere" },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <Icon name={item.icon} size={14} className="text-lavender-500" />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="order-1 min-w-0 lg:order-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={stage}
              ref={panel}
              tabIndex={-1}
              className="outline-none"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              {...(reduced ? {} : { exit: { opacity: 0, y: -6 } })}
              transition={{
                duration: stage === "complete" ? 0.42 : 0.2,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              {stage === "sealed" ? (
                <>
                  <Chip variant="soft" color="accent" size="sm" className="mb-6">
                    {campaign ? "You’re invited" : "Someone thought of you"}
                  </Chip>
                  <h1 className="text-display-lg">
                    {isOwned ? "This one has your name on it." : "A name of your own is waiting."}
                  </h1>
                  <p className="my-6 max-w-[46ch] text-[15px] leading-[1.8] text-ink-soft">
                    {isOwned ? (
                      <>
                        {sender} set aside <NameMark name={fullName} size="sm" /> for you. It’s an
                        .eth name — a single, human name you can use online instead of a wallet
                        address.
                      </>
                    ) : (
                      <>
                        {sender} is giving you your first .eth name — one human name you can use
                        online instead of a long wallet address. Choose the one that sounds like
                        you; the cost is already covered.
                      </>
                    )}
                  </p>
                  <Button size="lg" onPress={() => setStage(isOwned ? "wallet" : "choose")}>
                    Open your gift
                    <Icon name="gift" size={18} />
                  </Button>
                  <p className="mt-5 text-[13px] text-ink-soft">
                    No crypto, no wallet and no payment needed to start.
                  </p>
                </>
              ) : null}

              {stage === "choose" ? (
                <>
                  <Eyebrow className="mb-4">Step 1 of 3 · Choose your name</Eyebrow>
                  <h1 className="text-display-md">What should people call you?</h1>
                  <p className="mt-3 mb-6 max-w-[44ch] text-[15px] text-ink-soft">
                    Your name, a nickname, or something new. You’ll introduce yourself with it.
                  </p>
                  <Form
                    className="space-y-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (quote.available) setStage("wallet");
                    }}
                  >
                    <Field
                      label="Your name"
                      value={name}
                      onChange={setName}
                      placeholder="somethingyou"
                      maxLength={63}
                      required
                      description="We’ll add .eth to the end."
                    />
                    <p
                      role="status"
                      className={`m-0 flex items-center gap-2 text-[13px] ${quote.available ? "text-success" : "text-ink-soft"}`}
                    >
                      {quote.available ? <Icon name="check" size={15} /> : null}
                      {quote.reason}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <Button
                          key={suggestion}
                          size="sm"
                          variant="secondary"
                          onPress={() => setName(suggestion)}
                        >
                          {suggestion}.eth
                        </Button>
                      ))}
                    </div>
                    <Card variant="secondary" className="rounded-2xl p-5 shadow-none">
                      <DetailList>
                        <DetailRow label="Covered by this gift">Up to ${budget}</DetailRow>
                        <DetailRow label="Paid up for">
                          {years} year{years > 1 ? "s" : ""}
                        </DetailRow>
                        <DetailRow label="Name length">
                          {minLength}–{maxLength} characters
                        </DetailRow>
                      </DetailList>
                      <p className="mt-3 mb-0 text-[11px] text-ink-faint">
                        Availability and prices are illustrative in this preview.
                      </p>
                    </Card>
                    <Button type="submit" isDisabled={!quote.available} fullWidth size="lg">
                      That’s the one
                      <Icon name="arrow" size={18} />
                    </Button>
                  </Form>
                </>
              ) : null}

              {stage === "wallet" ? (
                <>
                  <Eyebrow className="mb-4">Step 2 of 3 · Where it lives</Eyebrow>
                  <h1 className="text-display-md">Where should your name live?</h1>
                  <p className="mt-3 mb-6 max-w-[44ch] text-[15px] text-ink-soft">
                    A wallet is just the account that holds it. Start with an email, or use a wallet
                    you already have.
                  </p>
                  <Form
                    className="space-y-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setStage(campaign?.worldId ? "verify" : "review");
                    }}
                  >
                    <RadioButtonGroup
                      value={wallet}
                      onChange={setWallet}
                      variant="secondary"
                      aria-label="Where your name lives"
                      className="w-full"
                    >
                      <div className="grid w-full gap-3">
                        <RadioButtonGroup.Item value="email">
                          <RadioButtonGroup.ItemIcon>
                            <Icon name="mail" size={19} />
                          </RadioButtonGroup.ItemIcon>
                          <RadioButtonGroup.ItemContent>
                            <Label>Start with an email</Label>
                            <Description>
                              We’ll make a wallet for you. Nothing to install.
                            </Description>
                          </RadioButtonGroup.ItemContent>
                          <RadioButtonGroup.Indicator />
                        </RadioButtonGroup.Item>
                        <RadioButtonGroup.Item value="wallet">
                          <RadioButtonGroup.ItemIcon>
                            <Icon name="wallet" size={19} />
                          </RadioButtonGroup.ItemIcon>
                          <RadioButtonGroup.ItemContent>
                            <Label>I already have a wallet</Label>
                            <Description>Keep your name with everything else you own.</Description>
                          </RadioButtonGroup.ItemContent>
                          <RadioButtonGroup.Indicator />
                        </RadioButtonGroup.Item>
                      </div>
                    </RadioButtonGroup>
                    {wallet === "email" ? (
                      <Field
                        label="Your email"
                        type="email"
                        required
                        value={email}
                        onChange={setEmail}
                        placeholder="you@example.com"
                        autoComplete="email"
                        description="Used to sign back in. No email is sent in this preview."
                      />
                    ) : (
                      <Card variant="secondary" className="rounded-2xl p-4 shadow-none">
                        <p className="m-0 font-mono text-[13px]">0x71C…4F2A</p>
                        <p className="m-0 mt-1 text-xs text-ink-soft">
                          Demo wallet. No connection will be requested.
                        </p>
                      </Card>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="submit" size="lg" className="flex-1">
                        Continue
                        <Icon name="arrow" size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        onPress={() => setStage(isOwned ? "sealed" : "choose")}
                      >
                        Back
                      </Button>
                    </div>
                  </Form>
                </>
              ) : null}

              {stage === "verify" ? (
                <>
                  <Eyebrow className="mb-4">One person, one name</Eyebrow>
                  <h1 className="text-display-md">A fair start for everyone.</h1>
                  <p className="mt-3 mb-6 max-w-[46ch] text-[15px] text-ink-soft">
                    {sender} asks each person to verify once, so the names go to as many different
                    people as possible. Your identity isn’t shared with the community.
                  </p>
                  <Card
                    variant={verified ? "secondary" : "default"}
                    className="mb-6 flex-row items-start gap-4 rounded-2xl p-5 shadow-none"
                  >
                    <span
                      className={`grid size-10 shrink-0 place-content-center rounded-xl ${verified ? "bg-success/10 text-success" : "bg-lavender-50 text-lavender-600"}`}
                    >
                      <Icon name={verified ? "check" : "shield"} size={19} />
                    </span>
                    <p className="m-0 text-sm text-ink-soft">
                      {verified
                        ? "You’re verified. Your name is ready to claim."
                        : "World ID confirms you’re a unique person without revealing who you are."}
                    </p>
                  </Card>
                  <Button
                    fullWidth
                    size="lg"
                    onPress={() => (verified ? setStage("review") : setVerified(true))}
                  >
                    {verified ? "Continue" : "Verify with World ID"}
                    <Icon name={verified ? "arrow" : "shield"} size={18} />
                  </Button>
                  <p className="mt-4 text-[13px] text-ink-soft">
                    Simulated. No proof is generated or collected.
                  </p>
                </>
              ) : null}

              {stage === "review" ? (
                <>
                  <Eyebrow className="mb-4">Step 3 of 3 · Confirm</Eyebrow>
                  <h1 className="text-display-md">
                    Hello, <NameMark name={fullName} size="lg" tone="lavender" />
                  </h1>
                  <p className="mt-3 mb-6 max-w-[44ch] text-[15px] text-ink-soft">
                    One last look before it becomes yours.
                  </p>
                  <Card className="mb-6 rounded-3xl border border-rule p-6 shadow-none">
                    <DetailList>
                      <DetailRow label="Your name">
                        <NameMark name={fullName} size="sm" />
                      </DetailRow>
                      <DetailRow label="Lives in">
                        {wallet === "email" ? email || "a new wallet" : "0x71C…4F2A"}
                      </DetailRow>
                      <DetailRow label="Gift from">{sender}</DetailRow>
                      <DetailRow label="You pay">
                        <span className="text-success">$0 — fully covered</span>
                      </DetailRow>
                      {campaign?.worldId ? (
                        <DetailRow label="Eligibility">
                          {verified ? "Verified" : "Not verified"}
                        </DetailRow>
                      ) : null}
                    </DetailList>
                  </Card>
                  {error ? (
                    <div role="alert" className="mb-4">
                      <Note status="danger">{error}</Note>
                    </div>
                  ) : null}
                  <Button
                    fullWidth
                    size="lg"
                    isDisabled={Boolean(campaign?.worldId && !verified)}
                    onPress={() => {
                      setError("");
                      setStage("claiming");
                    }}
                  >
                    Make it mine
                    <Icon name="sparkle" size={18} />
                  </Button>
                  <Button
                    fullWidth
                    variant="ghost"
                    className="mt-2"
                    onPress={() => setStage("wallet")}
                  >
                    Change where it lives
                  </Button>
                  <p className="mt-4 text-center text-[13px] text-ink-soft">
                    Preview only. Nothing is registered onchain.
                  </p>
                </>
              ) : null}

              {stage === "claiming" ? (
                <ClaimProgress name={fullName} onComplete={complete} />
              ) : null}

              {stage === "complete" ? (
                <>
                  <motion.span
                    className="mb-6 inline-flex rounded-2xl bg-success/10 p-3.5 text-success"
                    initial={reduced ? false : { scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.55, bounce: 0.28, delay: 0.05 }}
                  >
                    <Icon name="check" size={28} />
                  </motion.span>
                  <Eyebrow className="mb-4">It’s yours</Eyebrow>
                  <h1 className="text-display-lg">
                    The world can call you <NameMark name={fullName} size="xl" tone="lavender" />
                  </h1>
                  <p className="my-6 max-w-[44ch] text-[15px] leading-[1.8] text-ink-soft">
                    This name belongs to you now. Use it anywhere that speaks ENS, and take it with
                    you wherever you go next.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <ButtonLink to="/profile">
                      Make it feel like you
                      <Icon name="arrow" size={18} />
                    </ButtonLink>
                    <CopyButton value={fullName} label="Copy name" />
                  </div>
                  <Separator className="my-8" />
                  <Note title="Saved in this browser">
                    Your claimed name lives in this browser’s preview. Clearing site data resets it.
                  </Note>
                  <Link
                    to="/send"
                    className="mt-6 inline-flex items-center gap-2 rounded-lg text-[13px] font-medium text-lavender-700"
                  >
                    Pass one on to someone else
                    <Icon name="gift" size={16} />
                  </Link>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
}
