import { useState } from "react";

import { Link } from "@tanstack/react-router";

import { Button, Card, Chip, Form, Label, RadioButtonGroup } from "@thenamespace/uikit";
import { AnimatePresence, motion } from "motion/react";

import { claimCampaign, claimGift, nameAvailability } from "#/atoms/demo";
import { Field } from "#/components/fields";
import { GiftArt } from "#/components/gift-art";
import { Icon } from "#/components/icon";
import { CopyButton, Empty, SummaryRow } from "#/components/page";
import { useDemo } from "#/hooks/use-demo";

import { ClaimProgress } from "./claim-progress";

type Stage = "sealed" | "choose" | "wallet" | "verify" | "review" | "claiming" | "complete";
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
  const gift = state.gifts.find((entry) => entry.id === giftId);
  const campaign = state.campaigns.find((entry) => entry.id === campaignId);
  const invitation = campaign?.invitations.find((entry) => entry.id === invitationId);
  const [stage, setStage] = useState<Stage>("sealed");
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("email");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const isOwned = gift?.kind === "owned";
  const budget = gift?.budget ?? campaign?.budget ?? 20;
  const years = gift?.years ?? campaign?.years ?? 1;
  const quote = nameAvailability(
    name,
    gift?.minLength ?? campaign?.minLength,
    gift?.maxLength ?? campaign?.maxLength,
    budget,
    years,
  );
  const fullName = isOwned ? gift.name : `${quote.name || "yourname"}.eth`;
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
        cause instanceof Error
          ? cause.message
          : "Your claim could not be completed. Please try again.",
      );
      setStage("review");
    }
  };
  if (unavailable && stage !== "complete" && stage !== "claiming")
    return (
      <div className="mx-auto w-[calc(100%-40px)] max-w-[1200px] md:w-[calc(100%-96px)] py-20">
        <Empty
          title={
            gift?.state === "claimed" || invitation?.claimed
              ? "This gift has found its home."
              : "This invitation is resting."
          }
          description={
            gift?.state === "claimed" || invitation?.claimed
              ? "This name has already been claimed. Every good beginning is one of a kind."
              : "It may have expired, been returned, or the community may be taking a pause. Ask the sender for a fresh invitation."
          }
          to="/"
          action="Explore Memento"
        />
      </div>
    );
  const sender = campaign?.name ?? "alice.eth";
  return (
    <div className="mx-auto w-[calc(100%-40px)] max-w-[1200px] md:w-[calc(100%-96px)] py-10 md:py-16">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-20">
        <div className="order-2 lg:order-1">
          <div className="overflow-hidden rounded-[32px] border border-white bg-gradient-to-br from-[#f5eefa] via-[#fcf5fa] to-[#eee7fa] p-5 shadow-[0_20px_80px_#ad8bb710]">
            <GiftArt
              name={stage === "sealed" ? (isOwned ? fullName : "a little possibility") : fullName}
              theme={gift?.theme ?? "aura"}
              opened={stage !== "sealed"}
            />
            <div className="pb-8 text-center">
              <p className="font-serif text-xl italic text-[#8f759f]">
                “{gift?.message ?? campaign?.description}”
              </p>
              <span className="mt-4 inline-block text-xs text-muted">A Memento from {sender}</span>
            </div>
          </div>
          <div className="mt-5 flex justify-center gap-5 text-[10px] text-muted">
            <span className="flex items-center gap-1.5">
              <Icon name="shield" size={13} />
              Yours to own
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="gift" size={13} />
              Nothing to pay
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="globe" size={13} />A name for everywhere
            </span>
          </div>
        </div>
        <div className="order-1 min-w-0 lg:order-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {stage === "sealed" ? (
                <>
                  <Chip variant="soft" color="accent" className="mb-6">
                    {campaign ? "YOU’RE ONE OF US" : "SOMEONE THOUGHT OF YOU"}
                  </Chip>
                  <h1>
                    {isOwned ? (
                      <>
                        Some things just
                        <br />
                        have your name on them.
                      </>
                    ) : (
                      <>
                        Your next chapter
                        <br />
                        has a{" "}
                        <span className="font-serif font-normal tracking-[-0.05em] text-[#9d7bb4] italic">
                          name.
                        </span>
                      </>
                    )}
                  </h1>
                  <p className="my-6 max-w-md text-sm leading-7 text-muted">
                    {isOwned
                      ? `${sender} set aside ${fullName}, just for you. A little corner of the internet that’s yours to keep.`
                      : `${sender} has given you a new beginning. Choose an .eth name that feels like you—we’ll take care of the rest.`}
                  </p>
                  <Button size="lg" onPress={() => setStage(isOwned ? "wallet" : "choose")}>
                    Unwrap your gift
                    <Icon name="gift" size={18} />
                  </Button>
                  <p className="mt-5 text-xs text-muted">No crypto. No experience. Just you.</p>
                </>
              ) : null}
              {stage === "choose" ? (
                <>
                  <div className="mb-5 text-[10px] font-semibold tracking-[0.17em] text-[#8c749f] uppercase">
                    01 / FIND YOUR NAME
                  </div>
                  <h1>
                    What feels{" "}
                    <span className="font-serif font-normal tracking-[-0.05em] text-[#9d7bb4] italic">
                      like you?
                    </span>
                  </h1>
                  <p className="my-5 text-sm text-muted">
                    Your name, a nickname, a little alter ego.
                    <br />
                    Make it something you’ll love to introduce yourself with.
                  </p>
                  <Form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (quote.available) setStage("wallet");
                    }}
                  >
                    <Field
                      label="Your name"
                      value={name}
                      onChange={setName}
                      placeholder="somethingyou.eth"
                      maxLength={67}
                      required
                    />
                    <p
                      role="status"
                      className={`mt-3 text-xs ${quote.available ? "text-success" : "text-muted"}`}
                    >
                      {quote.available ? "✓ " : ""}
                      {quote.reason}
                    </p>
                    <div className="my-6 flex flex-wrap gap-2">
                      {["heyfriend", "littlewonder", "hellobobby"].map((suggestion) => (
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
                    <Card className="mb-6 rounded-2xl bg-surface-secondary p-4 shadow-none">
                      <SummaryRow label="Covered by your gift">Up to ${budget}</SummaryRow>
                      <SummaryRow label="Registration">
                        {years} year{years > 1 ? "s" : ""}
                      </SummaryRow>
                      <p className="mt-2 text-[10px] text-muted">
                        {gift?.minLength ?? campaign?.minLength}–
                        {gift?.maxLength ?? campaign?.maxLength} characters · Illustrative
                        availability and prices
                      </p>
                    </Card>
                    <Button type="submit" isDisabled={!quote.available} fullWidth>
                      That’s my name
                      <Icon name="arrow" size={17} />
                    </Button>
                  </Form>
                </>
              ) : null}
              {stage === "wallet" ? (
                <>
                  <div className="mb-5 text-[10px] font-semibold tracking-[0.17em] text-[#8c749f] uppercase">
                    02 / A HOME FOR YOUR NAME
                  </div>
                  <h1>
                    Yours,{" "}
                    <span className="font-serif font-normal tracking-[-0.05em] text-[#9d7bb4] italic">
                      wherever you go.
                    </span>
                  </h1>
                  <p className="my-5 text-sm text-muted">
                    A wallet is a home for your name. Start with your email, or bring one you
                    already have.
                  </p>
                  <Form
                    onSubmit={(event) => {
                      event.preventDefault();
                      setStage(campaign?.worldId ? "verify" : "review");
                    }}
                  >
                    <RadioButtonGroup
                      value={wallet}
                      onChange={setWallet}
                      aria-label="Choose a wallet"
                      className="mb-5"
                    >
                      <RadioButtonGroup.Item value="email">
                        <Icon name="mail" />
                        <RadioButtonGroup.ItemContent>
                          <Label>Start with an email</Label>
                          <p className="text-[11px] leading-relaxed text-muted">
                            A simple place to begin. No wallet needed.
                          </p>
                        </RadioButtonGroup.ItemContent>
                        <RadioButtonGroup.Indicator />
                      </RadioButtonGroup.Item>
                      <RadioButtonGroup.Item value="wallet">
                        <Icon name="wallet" />
                        <RadioButtonGroup.ItemContent>
                          <Label>I have a wallet</Label>
                          <p className="text-[11px] leading-relaxed text-muted">
                            Keep your name with the things you own.
                          </p>
                        </RadioButtonGroup.ItemContent>
                        <RadioButtonGroup.Indicator />
                      </RadioButtonGroup.Item>
                    </RadioButtonGroup>
                    {wallet === "email" ? (
                      <Field
                        label="Your email"
                        type="email"
                        required
                        value={email}
                        onChange={setEmail}
                        placeholder="you@example.com"
                      />
                    ) : (
                      <div className="rounded-xl bg-surface-secondary p-4 text-xs text-muted">
                        Demo wallet · 0x71C…4F2A
                        <br />
                        No wallet connection will be requested.
                      </div>
                    )}
                    <Button type="submit" fullWidth className="mt-6">
                      Continue
                      <Icon name="arrow" size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onPress={() => setStage(isOwned ? "sealed" : "choose")}
                    >
                      Back
                    </Button>
                  </Form>
                  <p className="mt-3 text-[11px] text-muted">
                    This preview won’t send an email or create a wallet.
                  </p>
                </>
              ) : null}
              {stage === "verify" ? (
                <>
                  <span className="mb-6 inline-flex rounded-2xl bg-accent-soft p-4 text-accent-soft-foreground">
                    <Icon name="shield" size={30} />
                  </span>
                  <div className="mb-5 text-[10px] font-semibold tracking-[0.17em] text-[#8c749f] uppercase">
                    A FAIR START FOR EVERYONE
                  </div>
                  <h1>
                    One human.
                    <br />
                    One{" "}
                    <span className="font-serif font-normal tracking-[-0.05em] text-[#9d7bb4] italic">
                      new beginning.
                    </span>
                  </h1>
                  <p className="my-5 text-sm text-muted">
                    {sender} asks for World ID so more people get their first name. A small check to
                    keep this gift one per person.
                  </p>
                  <div className="my-6 rounded-2xl bg-surface-secondary p-5 text-sm">
                    <Icon name={verified ? "check" : "shield"} />
                    <p className="mt-3">
                      {verified
                        ? "You’re all set. Your beginning is waiting."
                        : "Your identity stays private. The community only needs to know you’re eligible."}
                    </p>
                  </div>
                  <Button
                    fullWidth
                    onPress={() => {
                      if (verified) setStage("review");
                      else setVerified(true);
                    }}
                  >
                    {verified ? "Continue to your name" : "Preview World ID verification"}
                    <Icon name={verified ? "arrow" : "shield"} size={17} />
                  </Button>
                  <p className="mt-4 text-[11px] text-muted">
                    Simulated verification. No personal proof is collected.
                  </p>
                </>
              ) : null}
              {stage === "review" ? (
                <>
                  <div className="mb-5 text-[10px] font-semibold tracking-[0.17em] text-[#8c749f] uppercase">
                    A NAME. ALL YOURS.
                  </div>
                  <h1>
                    Hello,{" "}
                    <span className="font-serif font-normal tracking-[-0.05em] text-[#9d7bb4] italic">
                      {fullName}
                    </span>
                  </h1>
                  <p className="my-5 text-sm text-muted">
                    Looks good on you. One last look before you make it yours.
                  </p>
                  <Card className="my-6 rounded-3xl border border-separator p-6 shadow-none">
                    <SummaryRow label="Your name">{fullName}</SummaryRow>
                    <SummaryRow label="Home">
                      {wallet === "email" ? email : "0x71C…4F2A"}
                    </SummaryRow>
                    <SummaryRow label="A gift from">{sender}</SummaryRow>
                    <SummaryRow label="You pay">
                      <span className="text-success">$0 · completely covered</span>
                    </SummaryRow>
                    {campaign?.worldId ? (
                      <SummaryRow label="Eligibility">
                        {verified ? "Verified in preview" : "Not verified"}
                      </SummaryRow>
                    ) : null}
                  </Card>
                  {error ? (
                    <p role="alert" className="mb-4 text-sm text-danger">
                      {error}
                    </p>
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
                    <Icon name="sparkle" />
                  </Button>
                  <Button
                    fullWidth
                    variant="ghost"
                    className="mt-2"
                    onPress={() => setStage("wallet")}
                  >
                    Change wallet
                  </Button>
                  <p className="mt-3 text-center text-[11px] text-muted">
                    Preview only. Your name won’t be registered onchain.
                  </p>
                </>
              ) : null}
              {stage === "claiming" ? (
                <ClaimProgress name={fullName} onComplete={complete} />
              ) : null}
              {stage === "complete" ? (
                <>
                  <motion.div
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="mb-6 inline-flex rounded-full bg-success/10 p-4 text-success"
                  >
                    <Icon name="check" size={32} />
                  </motion.div>
                  <div className="mb-5 text-[10px] font-semibold tracking-[0.17em] text-[#8c749f] uppercase">
                    THIS IS YOUR BEGINNING
                  </div>
                  <h1>
                    The world can
                    <br />
                    call you{" "}
                    <span className="font-serif font-normal tracking-[-0.05em] text-[#9d7bb4] italic">
                      {fullName}.
                    </span>
                  </h1>
                  <p className="my-6 text-sm leading-7 text-muted">
                    Your name. Your next chapter.
                    <br />A little gift you can take anywhere.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link to="/profile" className="button button--primary">
                      Make it feel like you
                      <Icon name="arrow" size={18} />
                    </Link>
                    <CopyButton value={fullName} label="Copy name" />
                  </div>
                  <Card className="mt-8 rounded-2xl bg-surface-secondary p-5 shadow-none">
                    <h3 className="text-base">A name is just the beginning.</h3>
                    <p className="mt-2 text-xs text-muted">
                      Add a bio and a little color to your new identity. Your preview has been saved
                      in this browser.
                    </p>
                  </Card>
                  <Link
                    to="/send"
                    className="inline-flex items-center gap-2.5 text-xs font-medium text-[#786087] [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5 mt-6"
                  >
                    Pass on a little possibility
                    <Icon name="gift" size={16} />
                  </Link>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
