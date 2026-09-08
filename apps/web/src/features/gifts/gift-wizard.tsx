import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import { Button, Card, Description, Form, Label, RadioButtonGroup } from "@thenamespace/uikit";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { Gift } from "#/atoms/demo";
import { Field, NumberInput, SelectField } from "#/components/common/fields";
import { Icon } from "#/components/common/icon";
import {
  Back,
  DetailList,
  DetailRow,
  Eyebrow,
  Note,
  PageHeader,
  Section,
  Steps,
} from "#/components/common/page";
import { ThemePicker, type GiftTheme } from "#/components/common/theme-picker";
import { NameMark } from "#/components/display/brand";
import { GiftArt } from "#/components/display/gift-art";
import { useDemo } from "#/hooks/use-demo";

const stepCopy = [
  {
    title: "What are you giving?",
    description: "A budget so they can choose their own name, or one you already own.",
  },
  {
    title: "Make it feel like you",
    description: "A few words and a wrapping. This is what they see when they open it.",
  },
  {
    title: "One last look",
    description: "Nothing is charged, sent or registered — this creates a local preview gift.",
  },
] as const;

export function GiftWizard({ initialKind }: { initialKind: "choice" | "owned" }) {
  const [state, setState] = useDemo();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [step, setStep] = useState(0);
  const [kind, setKind] = useState(initialKind);
  const [budget, setBudget] = useState(25);
  const [years, setYears] = useState(1);
  const [minLength, setMinLength] = useState(5);
  const [maxLength, setMaxLength] = useState(20);
  const [ownedName, setOwnedName] = useState("sophie.eth");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("For your next chapter. Make it a good one.");
  const [theme, setTheme] = useState<GiftTheme>("aura");
  const [error, setError] = useState("");

  const gifted = new Set(
    state.gifts
      .filter((gift) => gift.kind === "owned" && gift.state !== "refunded")
      .map((gift) => gift.name),
  );
  const ownedNames = ["sophie.eth", "goodthings.eth", "littlewonder.eth"].filter(
    (name) => !gifted.has(name),
  );
  const selectedName = ownedNames.includes(ownedName) ? ownedName : (ownedNames[0] ?? "");
  const previewName = kind === "owned" ? selectedName || "yourname.eth" : "theirname.eth";
  const coveredYears = Math.max(0, Math.floor(budget / 5));

  const advance = () => {
    if (step === 0 && kind === "choice") {
      if (!Number.isFinite(budget) || budget < 5 * years || budget > 1000) {
        setError(
          `A budget of at least $${5 * years} covers ${years} year${years > 1 ? "s" : ""} of a five-letter name. The maximum in this preview is $1,000.`,
        );
        return;
      }
      if (
        !Number.isInteger(minLength) ||
        !Number.isInteger(maxLength) ||
        minLength < 3 ||
        maxLength > 63 ||
        minLength > maxLength
      ) {
        setError("Name length must be a range between 3 and 63 characters.");
        return;
      }
    }
    if (step === 0 && kind === "owned" && !selectedName) {
      setError("You’ve gifted every name in your demo wallet. Try a choose-your-own gift instead.");
      return;
    }
    setError("");
    setStep(step + 1);
  };

  const create = () => {
    const id = crypto.randomUUID();
    const gift: Gift = {
      id,
      kind,
      recipient: recipient.trim() || "Someone special",
      name: kind === "owned" ? selectedName : "",
      budget: kind === "owned" ? 0 : budget,
      years,
      minLength,
      maxLength,
      message,
      theme,
      state: "ready",
      created: new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    };
    setState((current) => ({ ...current, gifts: [gift, ...current.gifts], connected: true }));
    void navigate({ to: "/gifts/$giftId", params: { giftId: id }, search: { created: true } });
  };

  const copy = stepCopy[step] ?? stepCopy[0];

  return (
    <Section width="form" className="py-10 md:py-14">
      <Back to="/" label="Back" />
      <PageHeader eyebrow="Give a name" title={copy.title} description={copy.description} />

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
        <div className="min-w-0 order-2 lg:order-1">
          <Steps labels={["The gift", "Your note", "Review"]} step={step} />
          <Form
            className="w-full"
            onSubmit={(event) => {
              event.preventDefault();
              if (step < 2) advance();
              else create();
            }}
          >
            <Card className="w-full rounded-3xl border border-rule p-6 shadow-none md:p-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  className="w-full space-y-6"
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  {...(reduced ? {} : { exit: { opacity: 0, y: -6 } })}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                >
                  {step === 0 ? (
                    <>
                      <RadioButtonGroup
                        value={kind}
                        onChange={(value) => {
                          if (value === "choice" || value === "owned") setKind(value);
                          setError("");
                        }}
                        variant="secondary"
                        className="w-full"
                      >
                        <Label>Kind of gift</Label>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                          {[
                            {
                              value: "choice",
                              icon: "sparkle" as const,
                              title: "Let them choose",
                              description: "You set a budget and simple rules.",
                            },
                            {
                              value: "owned",
                              icon: "gift" as const,
                              title: "A name you own",
                              description: "Transferred to them when they claim.",
                            },
                          ].map((option) => (
                            <RadioButtonGroup.Item key={option.value} value={option.value}>
                              <RadioButtonGroup.ItemIcon>
                                <Icon name={option.icon} size={19} />
                              </RadioButtonGroup.ItemIcon>
                              <RadioButtonGroup.ItemContent>
                                <Label>{option.title}</Label>
                                <Description>{option.description}</Description>
                              </RadioButtonGroup.ItemContent>
                              <RadioButtonGroup.Indicator />
                            </RadioButtonGroup.Item>
                          ))}
                        </div>
                      </RadioButtonGroup>

                      {kind === "choice" ? (
                        <div className="space-y-6 border-t border-rule pt-6">
                          <div className="grid gap-5 sm:grid-cols-2">
                            <NumberInput
                              label="Gift budget"
                              value={budget}
                              onChange={setBudget}
                              min={5}
                              max={1000}
                              step={5}
                              required
                              format={{
                                style: "currency",
                                currency: "USD",
                                maximumFractionDigits: 0,
                              }}
                              description={
                                coveredYears > 0
                                  ? `Roughly ${coveredYears} year${coveredYears > 1 ? "s" : ""} of a five-letter name. Illustrative prices.`
                                  : "Most names of five letters or more start around $5 a year."
                              }
                            />
                            <SelectField
                              label="Registration length"
                              value={String(years)}
                              onChange={(value) => setYears(Number(value))}
                              options={[1, 2, 3].map((n) => ({
                                value: String(n),
                                label: `${n} year${n > 1 ? "s" : ""}`,
                              }))}
                              description="How long the name is paid up for."
                            />
                          </div>
                          <fieldset className="m-0 border-0 p-0">
                            <legend className="mb-1 text-sm font-medium">Name length</legend>
                            <p className="mt-0 mb-3 text-[13px] text-ink-soft">
                              Shorter names cost more. This keeps their choice inside your budget.
                            </p>
                            <div className="grid gap-5 sm:grid-cols-2">
                              <NumberInput
                                label="Shortest"
                                value={minLength}
                                onChange={setMinLength}
                                min={3}
                                max={63}
                                required
                              />
                              <NumberInput
                                label="Longest"
                                value={maxLength}
                                onChange={setMaxLength}
                                min={3}
                                max={63}
                                required
                              />
                            </div>
                          </fieldset>
                        </div>
                      ) : (
                        <div className="space-y-5 border-t border-rule pt-6">
                          {ownedNames.length ? (
                            <>
                              <SelectField
                                label="Name to pass on"
                                value={selectedName}
                                onChange={setOwnedName}
                                options={ownedNames.map((name) => ({
                                  value: name,
                                  label: name,
                                }))}
                                description="Names held in your demo wallet."
                              />
                              <Note status="accent" title="They choose where it lands">
                                Once they claim it, this exact name transfers to a wallet they pick.
                                You won’t be able to take it back.
                              </Note>
                            </>
                          ) : (
                            <Note status="warning" title="No names left to give">
                              Every name in your demo wallet has already been gifted. Switch to a
                              choose-your-own gift, or return one from your gifts list.
                            </Note>
                          )}
                        </div>
                      )}
                    </>
                  ) : null}

                  {step === 1 ? (
                    <>
                      <Field
                        label="Who is this for?"
                        value={recipient}
                        onChange={setRecipient}
                        placeholder="Jamie"
                        required
                        maxLength={100}
                        description="A label for your own list. You’ll share the invitation yourself."
                      />
                      <div>
                        <Field
                          label="A note from you"
                          value={message}
                          onChange={setMessage}
                          multiline
                          rows={4}
                          maxLength={240}
                          placeholder="A few words go a long way."
                        />
                        <p className="mt-1.5 text-right text-[11px] text-ink-faint tabular-nums">
                          {message.length} / 240
                        </p>
                      </div>
                      <div className="border-t border-rule pt-6">
                        <ThemePicker
                          value={theme}
                          onChange={setTheme}
                          description="How the keepsake looks when they open it."
                        />
                      </div>
                    </>
                  ) : null}

                  {step === 2 ? (
                    <>
                      <DetailList>
                        <DetailRow label="For">{recipient || "Someone special"}</DetailRow>
                        <DetailRow label="Gift">
                          {kind === "choice" ? (
                            "A name they choose"
                          ) : (
                            <NameMark name={selectedName} size="sm" />
                          )}
                        </DetailRow>
                        <DetailRow label="Registration">
                          {years} year{years > 1 ? "s" : ""}
                        </DetailRow>
                        {kind === "choice" ? (
                          <DetailRow label="Name length">
                            {minLength}–{maxLength} characters
                          </DetailRow>
                        ) : null}
                        <DetailRow label="Your budget">
                          {kind === "owned" ? "A name you already own" : `$${budget}`}
                        </DetailRow>
                        <DetailRow label="They pay">$0</DetailRow>
                        <DetailRow label="Wrapping">
                          {theme === "aura" ? "Lavender" : theme === "rose" ? "Blush" : "Sage"}
                        </DetailRow>
                      </DetailList>
                      <Note title="This is a preview">
                        Creating this gift won’t charge you, send an email or transfer a name. The
                        invitation link works in this browser only.
                      </Note>
                    </>
                  ) : null}

                  {error ? (
                    <div role="alert">
                      <Note status="danger">{error}</Note>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              <div className="mt-7 flex items-center justify-between gap-4 border-t border-rule pt-6">
                <Button
                  variant="ghost"
                  className={step > 0 ? "" : "invisible"}
                  onPress={() => {
                    setStep(Math.max(0, step - 1));
                    setError("");
                  }}
                >
                  <Icon name="back" size={16} />
                  Back
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  isDisabled={step === 0 && kind === "owned" && !selectedName}
                >
                  {step === 2 ? "Create this gift" : step === 1 ? "Review" : "Add your note"}
                  <Icon name="arrow" size={18} />
                </Button>
              </div>
            </Card>
          </Form>
        </div>

        <aside className="order-1 min-w-0 lg:order-2 lg:sticky lg:top-28">
          <Eyebrow className="mb-4">What they’ll see</Eyebrow>
          <div className="overflow-hidden rounded-[28px] border border-rule bg-paper-raised shadow-lift">
            <GiftArt name={previewName} theme={theme} size="md" sender="alice.eth" />
            <div className="border-t border-rule px-6 py-5 text-center">
              <p className="m-0 text-[11px] tracking-[0.12em] text-ink-faint uppercase">
                To {recipient || "someone special"}
              </p>
              <p className="mx-auto mt-3 mb-0 max-w-[34ch] text-[15px] leading-relaxed text-ink">
                “{message || "A little gift, just for you."}”
              </p>
              <p className="mt-3 mb-0 text-xs text-ink-soft">alice.eth</p>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
            <Icon name="shield" size={15} className="mt-px text-lavender-500" />
            Their name, their wallet, their next chapter.
          </p>
        </aside>
      </div>
    </Section>
  );
}
