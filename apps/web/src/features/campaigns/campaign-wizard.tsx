import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import { Button, Card, Form, Separator } from "@thenamespace/uikit";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Field, NumberInput, SelectField, Toggle } from "#/components/fields";
import { Icon } from "#/components/icon";
import {
  Back,
  DetailList,
  DetailRow,
  Eyebrow,
  Note,
  PageHeader,
  Section,
  Steps,
} from "#/components/page";
import { useDemo } from "#/hooks/use-demo";

export function CampaignWizard() {
  const [, setState] = useDemo();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState(
    "A welcome to our corner of the internet. Your first name is on us.",
  );
  const [quantity, setQuantity] = useState(100);
  const [budget, setBudget] = useState(20);
  const [years, setYears] = useState(1);
  const [minLength, setMinLength] = useState(5);
  const [maxLength, setMaxLength] = useState(20);
  const [worldId, setWorldId] = useState(true);
  const [error, setError] = useState("");

  const total = quantity * budget;

  const submit = () => {
    if (!name.trim()) {
      setError("Give the campaign a name so members recognise it.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
      setError("Choose between 1 and 500 invitations.");
      return;
    }
    if (!Number.isFinite(budget) || budget < 5 * years || budget > 1000) {
      setError(
        `A budget of at least $${5 * years} covers ${years} year${years > 1 ? "s" : ""} per person. The maximum in this preview is $1,000.`,
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
    if (step === 0) {
      setError("");
      setStep(1);
      return;
    }
    const id = crypto.randomUUID();
    setState((current) => ({
      ...current,
      connected: true,
      campaigns: [
        {
          id,
          name: name.trim(),
          description,
          quantity,
          budget,
          years,
          minLength,
          maxLength,
          worldId,
          claimed: 0,
          paused: false,
          closed: false,
          invitations: [],
        },
        ...current.campaigns,
      ],
    }));
    void navigate({ to: "/campaigns/$campaignId", params: { campaignId: id } });
  };

  return (
    <Section width="form" className="py-10 md:py-14">
      <Back to="/campaigns" label="Campaigns" />
      <PageHeader
        eyebrow="New campaign"
        title={step ? "Ready to welcome them?" : "Bring your people in."}
        description={
          step
            ? "Check the details. Creating this makes a local preview campaign — no funds move."
            : "Set the budget and the rules once. Everyone you invite picks their own name."
        }
      />

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
        <div className="order-2 min-w-0 lg:order-1">
          <Steps labels={["Your community", "Review"]} step={step} />
          <Form
            className="w-full"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
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
                      <Field
                        label="Community name"
                        value={name}
                        onChange={setName}
                        required
                        maxLength={80}
                        placeholder="The Builders Club"
                        description="Shown to everyone who opens an invitation."
                      />
                      <Field
                        label="Your welcome note"
                        value={description}
                        onChange={setDescription}
                        multiline
                        rows={3}
                        maxLength={240}
                      />
                      <Separator />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <NumberInput
                          label="Invitations"
                          value={quantity}
                          onChange={setQuantity}
                          min={1}
                          max={500}
                          step={10}
                          required
                          description="Up to 500 per campaign."
                        />
                        <NumberInput
                          label="Budget per person"
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
                        />
                      </div>
                      <SelectField
                        label="Registration length"
                        value={String(years)}
                        onChange={(value) => setYears(Number(value))}
                        options={[1, 2, 3].map((n) => ({
                          value: String(n),
                          label: `${n} year${n > 1 ? "s" : ""}`,
                        }))}
                      />
                      <fieldset className="m-0 border-0 p-0">
                        <legend className="mb-1 text-sm font-medium">Name length</legend>
                        <p className="mt-0 mb-3 text-[13px] text-ink-soft">
                          Keeps each person’s choice inside the budget you set.
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
                      <div className="border-t border-rule pt-6">
                        <Toggle
                          label="One person, one name"
                          selected={worldId}
                          onChange={setWorldId}
                          description="Ask for World ID before claiming, so the names reach more people."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <DetailList>
                        <DetailRow label="Community">{name || "Untitled"}</DetailRow>
                        <DetailRow label="Invitations">{quantity}</DetailRow>
                        <DetailRow label="Budget per person">${budget}</DetailRow>
                        <DetailRow label="Registration">
                          {years} year{years > 1 ? "s" : ""}
                        </DetailRow>
                        <DetailRow label="Name length">
                          {minLength}–{maxLength} characters
                        </DetailRow>
                        <DetailRow label="World ID">
                          {worldId ? "Required" : "Not required"}
                        </DetailRow>
                        <DetailRow label="Total budget">${total.toLocaleString()}</DetailRow>
                      </DetailList>
                      <Note title="This is a preview">
                        No funds move and no invitations are sent. You’ll create and share
                        invitation links yourself from the campaign page.
                      </Note>
                    </>
                  )}

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
                  className={step ? "" : "invisible"}
                  onPress={() => {
                    setStep(0);
                    setError("");
                  }}
                >
                  <Icon name="back" size={16} />
                  Back
                </Button>
                <Button type="submit" size="lg">
                  {step ? "Create campaign" : "Review"}
                  <Icon name="arrow" size={18} />
                </Button>
              </div>
            </Card>
          </Form>
        </div>

        <aside className="order-1 min-w-0 lg:order-2 lg:sticky lg:top-28">
          <Eyebrow className="mb-4">What members see</Eyebrow>
          <Card
            variant="transparent"
            className="rounded-[28px] border border-lavender-100 bg-linear-140 from-lavender-50 to-blush-50 p-7 shadow-none"
          >
            <span className="mb-8 grid size-14 place-content-center rounded-2xl bg-white/80 font-display text-2xl font-semibold text-lavender-600">
              {name.trim().charAt(0).toUpperCase() || "M"}
            </span>
            <Eyebrow>You’re invited</Eyebrow>
            <h2 className="mt-3 text-display-md">{name || "Your community"}</h2>
            <p className="mt-4 mb-0 text-[14px] leading-relaxed text-ink-soft">{description}</p>
            <Separator className="my-6" />
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-semibold tracking-[-0.04em] tabular-nums">
                {quantity || 0}
              </span>
              <span className="text-[13px] text-ink-soft">names to give away</span>
            </div>
          </Card>
          <p className="mt-4 text-xs leading-relaxed text-ink-soft">
            Total budget{" "}
            <span className="font-medium text-ink tabular-nums">${total.toLocaleString()}</span>.
            You can pause or close the campaign at any time.
          </p>
        </aside>
      </div>
    </Section>
  );
}
