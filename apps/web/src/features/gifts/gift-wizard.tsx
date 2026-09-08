import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import { Button, Card, Form, Label, RadioButtonGroup } from "@thenamespace/uikit";
import { AnimatePresence, motion } from "motion/react";

import type { Gift } from "#/atoms/demo";
import { Field, SelectField } from "#/components/fields";
import { GiftArt } from "#/components/gift-art";
import { Icon } from "#/components/icon";
import { Back, PageTitle, Steps, SummaryRow } from "#/components/page";
import { useDemo } from "#/hooks/use-demo";

import { ThemePicker, type GiftTheme } from "./theme-picker";

export function GiftWizard({ initialKind }: { initialKind: "choice" | "owned" }) {
  const [state, setState] = useDemo();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState(initialKind);
  const [budget, setBudget] = useState("25");
  const [years, setYears] = useState("1");
  const [minLength, setMinLength] = useState("5");
  const [maxLength, setMaxLength] = useState("20");
  const [ownedName, setOwnedName] = useState("sophie.eth");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("For your next chapter. Make it a good one. ♡");
  const [theme, setTheme] = useState<GiftTheme>("aura");
  const [error, setError] = useState("");
  const unavailable = new Set(
    state.gifts
      .filter((gift) => gift.kind === "owned" && gift.state !== "refunded")
      .map((gift) => gift.name),
  );
  const ownedNames = ["sophie.eth", "goodthings.eth", "littlewonder.eth"].filter(
    (name) => !unavailable.has(name),
  );
  const selectedName = ownedNames.includes(ownedName) ? ownedName : (ownedNames[0] ?? "");
  const next = () => {
    if (
      step === 0 &&
      kind === "choice" &&
      (!Number.isFinite(Number(budget)) ||
        Number(budget) < 5 * Number(years) ||
        Number(budget) > 1000 ||
        Number(minLength) < 3 ||
        Number(maxLength) > 63 ||
        Number(minLength) > Number(maxLength) ||
        !Number.isInteger(Number(minLength)) ||
        !Number.isInteger(Number(maxLength)))
    ) {
      setError(
        "Choose a budget of $5 per year–$1,000 and a valid length range of 3–63 characters.",
      );
      return;
    }
    if (step === 0 && kind === "owned" && !selectedName) {
      setError("You’ve gifted all your demo names. Try a choose-your-own gift.");
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
      budget: kind === "owned" ? 0 : Number(budget),
      years: Number(years),
      minLength: Number(minLength),
      maxLength: Number(maxLength),
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
  return (
    <div className="mx-auto w-[calc(100%-40px)] max-w-[1200px] md:w-[calc(100%-96px)] py-10">
      <Back />
      <PageTitle
        eyebrow="A LITTLE SOMETHING, FROM YOU"
        title={
          step === 2
            ? "Ready to make their day?"
            : step === 1
              ? "Give it a little heart."
              : "Every beginning is a gift."
        }
        description={
          step === 2
            ? "One last look before their next chapter begins."
            : step === 1
              ? "The name is just the beginning. Your words make it theirs."
              : "A name they choose. Or the one you knew was theirs."
        }
      />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
        <div>
          <Steps labels={["The gift", "Your touch", "Review"]} step={step} />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="rounded-3xl border border-separator p-6 shadow-none md:p-8 [&_form]:w-full [&_form]:space-y-5">
                <Form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (step < 2) next();
                    else create();
                  }}
                >
                  {step === 0 ? (
                    <>
                      <RadioButtonGroup
                        value={kind}
                        onChange={(value) => {
                          if (value === "choice" || value === "owned") setKind(value);
                        }}
                        aria-label="Gift type"
                        className="space-y-3"
                      >
                        {[
                          {
                            value: "choice",
                            title: "Let them choose",
                            description: "A little possibility, with your budget.",
                            icon: "sparkle",
                          },
                          {
                            value: "owned",
                            title: "A name you own",
                            description: "The perfect name, passed on with love.",
                            icon: "gift",
                          },
                        ].map((option) => (
                          <RadioButtonGroup.Item key={option.value} value={option.value}>
                            <span className="inline-flex rounded-xl bg-accent-soft p-3 text-accent-soft-foreground">
                              <Icon name={option.icon === "gift" ? "gift" : "sparkle"} />
                            </span>
                            <RadioButtonGroup.ItemContent>
                              <Label>{option.title}</Label>
                              <p className="text-[11px] leading-relaxed text-muted">
                                {option.description}
                              </p>
                            </RadioButtonGroup.ItemContent>
                            <RadioButtonGroup.Indicator />
                          </RadioButtonGroup.Item>
                        ))}
                      </RadioButtonGroup>
                      {kind === "choice" ? (
                        <>
                          <div className="pt-3 text-sm font-medium text-foreground">
                            Room to find their name
                          </div>
                          <Field
                            label="Gift budget (USD)"
                            type="number"
                            min={5}
                            max={1000}
                            required
                            value={budget}
                            onChange={setBudget}
                            description="Most names with 5+ characters start at about $5/year. Demo prices only."
                          />
                          <div className="grid gap-4 sm:grid-cols-2">
                            <SelectField
                              label="Registration length"
                              value={years}
                              onChange={setYears}
                              options={[1, 2, 3].map((n) => ({
                                value: String(n),
                                label: `${n} year${n > 1 ? "s" : ""}`,
                              }))}
                            />
                            <SelectField
                              label="Claim within"
                              value="30"
                              onChange={() => {}}
                              options={[{ value: "30", label: "30 days" }]}
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                              label="Minimum characters"
                              type="number"
                              min={3}
                              max={63}
                              required
                              value={minLength}
                              onChange={setMinLength}
                            />
                            <Field
                              label="Maximum characters"
                              type="number"
                              min={3}
                              max={63}
                              required
                              value={maxLength}
                              onChange={setMaxLength}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="pt-3 text-sm font-medium text-foreground">
                            Names in your demo wallet
                          </div>
                          <SelectField
                            label="Choose their name"
                            value={selectedName}
                            onChange={setOwnedName}
                            options={ownedNames.map((name) => ({ value: name, label: name }))}
                          />
                          <div className="flex items-start gap-3 rounded-2xl bg-surface-secondary p-4 text-xs leading-relaxed text-muted">
                            <Icon name="shield" />
                            Once claimed, this name belongs to them. They’ll choose the wallet that
                            receives it.
                          </div>
                        </>
                      )}
                    </>
                  ) : null}
                  {step === 1 ? (
                    <>
                      <Field
                        label="Who’s this for?"
                        value={recipient}
                        onChange={setRecipient}
                        placeholder="Their name or email"
                        required
                        maxLength={100}
                        description="Just for your gift label. You’ll share the invitation yourself."
                      />
                      <Field
                        label="A note from you"
                        value={message}
                        onChange={setMessage}
                        multiline
                        maxLength={240}
                        placeholder="A few words can mean a lot."
                      />
                      <span className="-mt-4 block text-right text-[10px] text-muted">
                        {message.length}/240
                      </span>
                      <div className="pt-3 text-sm font-medium text-foreground">
                        Choose your wrapping
                      </div>
                      <ThemePicker value={theme} onChange={setTheme} />
                    </>
                  ) : null}
                  {step === 2 ? (
                    <>
                      <h3>It’s the thought that stays.</h3>
                      <p className="text-[11px] leading-relaxed text-muted mt-2">
                        Your gift will be ready as a private invitation.
                      </p>
                      <div className="my-5">
                        <SummaryRow label="For">{recipient}</SummaryRow>
                        <SummaryRow label="Gift">
                          {kind === "choice" ? "A name they choose" : selectedName}
                        </SummaryRow>
                        <SummaryRow label="Registration">
                          {years} year{Number(years) > 1 ? "s" : ""}
                        </SummaryRow>
                        {kind === "choice" ? (
                          <SummaryRow label="Name length">
                            {minLength}–{maxLength} characters
                          </SummaryRow>
                        ) : null}
                        <SummaryRow label="Their cost">$0 · you’ve got this</SummaryRow>
                        <SummaryRow label="Your gift budget">
                          {kind === "owned" ? "An existing name" : `$${budget}.00`}
                        </SummaryRow>
                      </div>
                      <div className="flex items-start gap-3 rounded-2xl bg-surface-secondary p-4 text-xs leading-relaxed text-muted">
                        <Icon name="shield" />
                        <span>
                          This is a preview. Creating a gift won’t charge you, send an email, or
                          transfer a name.
                        </span>
                      </div>
                    </>
                  ) : null}
                  {error ? (
                    <p className="text-sm text-danger" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between gap-4 border-t border-separator pt-6">
                    {step > 0 ? (
                      <Button
                        variant="ghost"
                        onPress={() => {
                          setStep(step - 1);
                          setError("");
                        }}
                      >
                        <Icon name="back" size={16} />
                        Back
                      </Button>
                    ) : null}
                    <Button type="submit" className="ml-auto">
                      {step === 2
                        ? "Create preview gift"
                        : step === 1
                          ? "Review your gift"
                          : "Make it personal"}
                      <Icon name="arrow" size={18} />
                    </Button>
                  </div>
                </Form>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
        <aside className="text-center [&_.gift-art]:-mt-4">
          <div className="mb-5 text-[10px] font-semibold tracking-[0.17em] text-[#8c749f] uppercase">
            A LITTLE PREVIEW
          </div>
          <GiftArt name={kind === "owned" ? selectedName : "theirname.eth"} theme={theme} />
          <div className="mx-auto max-w-sm text-center [&>span]:text-[11px] [&>span]:text-muted [&>p]:my-4 [&>p]:font-serif [&>p]:text-xl [&>p]:text-[#8f759f] [&>p]:italic">
            <span>To {recipient || "someone special"},</span>
            <p>“{message || "A little gift, just for you."}”</p>
            <span>with love, alice.eth</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted mt-6">
            <Icon name="shield" size={14} /> Their name. Their wallet. Their next chapter.
          </p>
        </aside>
      </div>
    </div>
  );
}
