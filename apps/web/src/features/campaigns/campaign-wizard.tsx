import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import { Button, Card, Form } from "@thenamespace/uikit";

import { Field, SelectField, Toggle } from "#/components/fields";
import { Icon } from "#/components/icon";
import { Back, PageTitle, Steps, SummaryRow } from "#/components/page";
import { useDemo } from "#/hooks/use-demo";
export function CampaignWizard() {
  const [, setState] = useDemo();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState(
    "A little welcome to our corner of the internet. Your first name is on us.",
  );
  const [quantity, setQuantity] = useState("100");
  const [budget, setBudget] = useState("20");
  const [years, setYears] = useState("1");
  const [minLength, setMinLength] = useState("5");
  const [maxLength, setMaxLength] = useState("20");
  const [worldId, setWorldId] = useState(true);
  const [error, setError] = useState("");
  const total = Number(quantity) * Number(budget);
  const submit = () => {
    if (
      !name.trim() ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 1 ||
      Number(quantity) > 500 ||
      !Number.isFinite(Number(budget)) ||
      Number(budget) < 5 * Number(years) ||
      Number(budget) > 1000 ||
      !Number.isInteger(Number(minLength)) ||
      !Number.isInteger(Number(maxLength)) ||
      Number(minLength) < 3 ||
      Number(maxLength) > 63 ||
      Number(minLength) > Number(maxLength)
    ) {
      setError(
        "Add a name, 1–500 invitations, a budget covering at least $5 per year, and a length range of 3–63 characters.",
      );
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
          quantity: Number(quantity),
          budget: Number(budget),
          years: Number(years),
          minLength: Number(minLength),
          maxLength: Number(maxLength),
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
    <div className="mx-auto w-[calc(100%-40px)] max-w-[1100px] py-10 md:w-[calc(100%-96px)]">
      <Back to="/campaigns" />
      <PageTitle
        eyebrow="A WELCOME THEY CAN KEEP"
        title={step ? "Every name starts with you." : "Let’s bring your people in."}
        description="A shared beginning, with a little space for everyone to be themselves."
      />
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Steps labels={["Your community", "Review & create"]} step={step} />
          <Card className="rounded-3xl border border-separator p-6 shadow-none md:p-8">
            <Form
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
              className="w-full space-y-5"
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
                  />
                  <Field
                    label="Your welcome note"
                    value={description}
                    onChange={setDescription}
                    multiline
                    maxLength={240}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Number of invitations"
                      type="number"
                      min={1}
                      max={500}
                      required
                      value={quantity}
                      onChange={setQuantity}
                    />
                    <Field
                      label="Budget per person (USD)"
                      type="number"
                      min={5}
                      max={1000}
                      required
                      value={budget}
                      onChange={setBudget}
                    />
                  </div>
                  <SelectField
                    label="Registration length"
                    value={years}
                    onChange={setYears}
                    options={[1, 2, 3].map((n) => ({
                      value: String(n),
                      label: `${n} year${n > 1 ? "s" : ""}`,
                    }))}
                  />
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
                  <div className="border-t border-separator pt-5">
                    <Toggle
                      label="One person, one gift"
                      selected={worldId}
                      onChange={setWorldId}
                      description="Ask for World ID before claiming. A fair beginning for your community."
                    />
                  </div>
                </>
              ) : (
                <>
                  <h3>A little welcome, ready to go.</h3>
                  <SummaryRow label="Community">{name}</SummaryRow>
                  <SummaryRow label="Invitations">{quantity}</SummaryRow>
                  <SummaryRow label="Per person">${budget}</SummaryRow>
                  <SummaryRow label="Name length">
                    {minLength}–{maxLength} characters
                  </SummaryRow>
                  <SummaryRow label="Registration">{years} year</SummaryRow>
                  <SummaryRow label="World ID">{worldId ? "Required" : "Not required"}</SummaryRow>
                  <SummaryRow label="Total budget">${total.toLocaleString()}</SummaryRow>
                  <div className="flex gap-3 rounded-xl bg-surface-secondary p-4 text-xs text-muted">
                    <Icon name="shield" />
                    <p>
                      This creates a local campaign preview. No funds will move and no invitations
                      will be sent.
                    </p>
                  </div>
                </>
              )}
              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
              <div className="flex justify-between border-t border-separator pt-5">
                {step ? (
                  <Button variant="ghost" onPress={() => setStep(0)}>
                    Back
                  </Button>
                ) : null}
                <Button type="submit" className="ml-auto">
                  {step ? "Create preview campaign" : "Review your welcome"}
                  <Icon name="arrow" size={17} />
                </Button>
              </div>
            </Form>
          </Card>
        </div>
        <aside className="space-y-6 lg:pt-16">
          <Card className="rounded-3xl border border-[#e9dfee] bg-[#f4edf9] p-8 shadow-none">
            <span className="mb-10 inline-flex size-16 items-center justify-center rounded-3xl bg-white/70 font-serif text-3xl text-[#a180b7] italic">
              {name.trim().charAt(0) || "m"}
            </span>
            <span className="text-[10px] tracking-widest text-[#9a82ab] uppercase">
              YOUR COMMUNITY’S NEXT CHAPTER
            </span>
            <h2 className="mt-4 text-3xl">{name || "Something good starts here."}</h2>
            <p className="my-6 text-sm text-muted">{description}</p>
            <div className="flex items-baseline gap-2 border-t border-[#e3d5ed] pt-5">
              <span className="font-display text-4xl tracking-tight">{quantity || "0"}</span>
              <span className="text-xs text-muted">new beginnings</span>
            </div>
          </Card>
          <div className="px-5">
            <SummaryRow label="Your total gift budget">
              ${Number.isFinite(total) ? total.toLocaleString() : "0"}
            </SummaryRow>
            <p className="mt-4 text-xs text-muted">
              You can create private invitations, track claims, and pause your campaign from its
              overview.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
