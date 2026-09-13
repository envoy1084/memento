import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import { Effect, Schema } from "effect";

import { Digest, CreateGift, GiftRecipientContact } from "@memento/protocol";
import { Button, Card, Form, NumberValue } from "@thenamespace/uikit";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatUnits, parseUnits } from "viem";

import { AccountRequired } from "#/components/common/account-required";
import { Field, NumberInput, SelectField } from "#/components/common/fields";
import { Icon } from "#/components/common/icon";
import { DetailList, DetailRow, Eyebrow, Note, Section } from "#/components/common/page";
import { ThemePicker, type GiftTheme } from "#/components/common/theme-picker";
import { GiftArt } from "#/components/display/gift-art";
import { useApiTask } from "#/hooks/use-api-task";
import { useAuth } from "#/hooks/use-auth";
import { useGiftTransactions } from "#/hooks/use-gift-transactions";

const stepCopy = [
  {
    title: "Their next chapter starts with you.",
    description: "Cover the registration and let them choose a name they love.",
  },
  {
    title: "Make it feel like you",
    description: "A few words and a wrapping. This is what they see when they open it.",
  },
  {
    title: "One last look",
    description: "Review the gift, then approve its funding in your wallet on Sepolia.",
  },
] as const;

export function GiftWizard() {
  const auth = useAuth();
  if (!auth.configured)
    return (
      <Section className="py-14">
        <AccountRequired />
      </Section>
    );
  return <GiftForm />;
}

function GiftForm() {
  const auth = useAuth();
  const task = useApiTask();
  const sendCalls = useGiftTransactions();
  const [preparedId, setPreparedId] = useState<string>();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [step, setStep] = useState(0);

  const [maxUsdc, setMaxUsdc] = useState(25);
  const [years, setYears] = useState(1);
  const [minLength, setMinLength] = useState(5);
  const [maxLength, setMaxLength] = useState(20);
  const [senderName, setSenderName] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("For your next chapter. Make it a good one.");
  const [theme, setTheme] = useState<GiftTheme>("aura");
  const [error, setError] = useState("");

  const validBudget = Number.isInteger(maxUsdc) && maxUsdc >= 1 && maxUsdc <= 100;
  const amount = validBudget ? parseUnits(String(maxUsdc), 6).toString() : undefined;
  const previewName = "theirname.eth";

  const advance = () => {
    if (step === 0) {
      if (!validBudget) {
        setError("Enter a maximum amount between 1 and 100 USDC, in whole dollars.");
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

    if (step === 1 && !Schema.is(CreateGift.fields.senderName)(senderName.trim())) {
      setError("Enter your name (up to 100 characters).");
      return;
    }

    if (
      step === 1 &&
      !Schema.is(GiftRecipientContact)({ name: recipient.trim(), email: recipientEmail.trim() })
    ) {
      setError("Enter the recipient’s name and a valid email address.");

      return;
    }

    setError("");
    setStep(step + 1);
  };

  const create = () => {
    if (!auth.address || !auth.actor || !amount) return;
    const account = auth.address;
    void task.run(async (api) => {
      const input = Schema.decodeUnknownSync(CreateGift)({
        sponsorWallet: account,
        recipient: { kind: "email", value: recipientEmail.trim().toLowerCase() },
        recipientName: recipient.trim(),
        senderName: senderName.trim(),
        message,
        theme,
        policy: {
          maxPrice: amount,
          duration: years * 31536000,
          expiresAt: Math.floor(Date.now() / 1000) + 30 * 86400,
          minLength,
          maxLength,
        },
      });
      const plan = await Effect.runPromise(
        preparedId
          ? api.gifts.fundingPlan({ params: { id: preparedId } })
          : api.gifts.prepare({ payload: input }),
      );
      setPreparedId(plan.id);
      const hashes = await sendCalls(`fund:${plan.id}`, account, plan.chainId, plan.calls);
      await Effect.runPromise(
        api.gifts.confirm({
          params: { id: plan.id },
          payload: { transactionHash: Schema.decodeUnknownSync(Digest)(hashes.at(-1)) },
        }),
      );
      await navigate({
        to: "/gifts/$giftId",
        params: { giftId: plan.id },
        search: { created: true },
      });
    });
  };

  const copy = stepCopy[step] ?? stepCopy[0];

  return (
    <Section className="py-10 md:py-14">
      <header className="max-w-3xl pt-2 text-left md:pt-4">
        <Eyebrow className="mb-4">Gift a name</Eyebrow>
        <h1 className="text-display-lg">{copy.title}</h1>
        <p className="mt-4 max-w-[52ch] text-[15px] text-ink-soft">{copy.description}</p>
      </header>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0 order-2 lg:order-1">
          <Form
            className="w-full"
            onSubmit={(event) => {
              event.preventDefault();

              if (step < 2) advance();
              else create();
            }}
          >
            <Card className="w-full rounded-[28px] border border-rule p-6 shadow-none md:p-8">
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
                      <div className="space-y-6">
                        <div className="flex w-full flex-col gap-5">
                          <NumberInput
                            label="Maximum amount (USDC)"
                            value={maxUsdc}
                            onChange={setMaxUsdc}
                            min={1}
                            max={100}
                            step={1}
                            required
                            description="Your spending limit."
                          />
                          <SelectField
                            label="Registration length"
                            value={String(years)}
                            onChange={(value) => setYears(Number(value))}
                            options={[1, 2, 3].map((n) => ({
                              value: String(n),
                              label: `${n} year${n > 1 ? "s" : ""}`,
                            }))}
                            description="How long they’ll own it."
                          />
                        </div>
                        <fieldset className="m-0 border-0 p-0">
                          <legend className="mb-3 text-sm font-medium">Name length</legend>
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
                    </>
                  ) : null}

                  {step === 1 ? (
                    <>
                      <Field
                        label="Your name"
                        value={senderName}
                        onChange={setSenderName}
                        placeholder="Alex"
                        required
                        maxLength={100}
                        autoComplete="name"
                        description="Shown in their gift email."
                      />
                      <Field
                        label="Recipient’s name"
                        value={recipient}
                        onChange={setRecipient}
                        placeholder="Jamie"
                        required
                        maxLength={100}
                        autoComplete="off"
                      />
                      <Field
                        label="Recipient’s email"
                        type="email"
                        value={recipientEmail}
                        onChange={setRecipientEmail}
                        placeholder="jamie@example.com"
                        required
                        maxLength={254}
                        description="Only someone signed in with this verified email can claim the gift."
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
                      <div>
                        <ThemePicker value={theme} onChange={setTheme} />
                      </div>
                    </>
                  ) : null}

                  {step === 2 ? (
                    <>
                      <DetailList>
                        <DetailRow label="From">{senderName.trim()}</DetailRow>
                        <DetailRow label="For">{recipient}</DetailRow>
                        <DetailRow label="Email">{recipientEmail.trim().toLowerCase()}</DetailRow>
                        <DetailRow label="Gift">A name they choose</DetailRow>
                        <DetailRow label="Registration">
                          {years} year{years > 1 ? "s" : ""}
                        </DetailRow>
                        {
                          <DetailRow label="Name length">
                            {minLength}–{maxLength} characters
                          </DetailRow>
                        }
                        <DetailRow label="Registration funding">
                          {amount ? (
                            <>
                              <NumberValue
                                value={Number(formatUnits(BigInt(amount), 6))}
                                maximumFractionDigits={2}
                              />{" "}
                              USDC
                            </>
                          ) : (
                            "Enter a maximum amount"
                          )}
                        </DetailRow>
                        <DetailRow label="Claim within">30 days</DetailRow>
                        <DetailRow label="Network">Sepolia</DetailRow>
                        <DetailRow label="Wrapping">
                          {theme === "aura" ? "Lavender" : theme === "rose" ? "Blush" : "Sage"}
                        </DetailRow>
                      </DetailList>
                    </>
                  ) : null}

                  {step === 2 && !auth.address ? <AccountRequired /> : null}
                  {task.error ? (
                    <div role="alert">
                      <Note status="danger">{task.error}</Note>
                    </div>
                  ) : null}
                  {error ? (
                    <div role="alert">
                      <Note status="danger">{error}</Note>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              <div className="mt-7 flex items-center justify-between gap-4">
                <Button
                  variant="ghost"
                  size="md"
                  className={step > 0 ? "" : "invisible"}
                  isDisabled={task.busy || Boolean(preparedId)}
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
                  size="md"
                  isDisabled={task.busy || (step === 2 && (!auth.address || !amount))}
                >
                  {task.busy
                    ? "Confirm in your wallet…"
                    : step === 2
                      ? "Create this gift"
                      : step === 1
                        ? "Review"
                        : "Add your note"}
                  <Icon name="arrow" size={18} />
                </Button>
              </div>
            </Card>
          </Form>
        </div>

        <aside className="order-1 min-w-0 lg:order-2 lg:sticky lg:top-28">
          <div className="overflow-hidden rounded-[28px] border border-rule bg-paper-raised shadow-lift">
            <GiftArt
              name={previewName}
              theme={theme}
              size="md"
              sender={senderName.trim() || "From you"}
            />
            <div className="border-t border-rule px-6 py-5 text-center">
              <p className="m-0 text-[11px] tracking-[0.12em] text-ink-faint uppercase">
                To {recipient || "someone special"}
              </p>
              <p className="mx-auto mt-3 mb-0 max-w-[34ch] text-[15px] leading-relaxed text-ink">
                “{message || "A little gift, just for you."}”
              </p>
              <p className="mt-3 mb-0 text-xs text-ink-soft">{senderName.trim() || "From you"}</p>
            </div>
          </div>
        </aside>
      </div>
    </Section>
  );
}
