import type { ReactNode } from "react";

import { Link, useNavigate } from "@tanstack/react-router";

import { Button, Card, Chip, Stepper, toast } from "@thenamespace/uikit";
import { motion, useReducedMotion } from "motion/react";

import { Icon } from "#/components/icon";

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <div className="mb-5 text-[10px] font-semibold tracking-[0.17em] text-[#8c749f] uppercase">
          {eyebrow}
        </div>
        <h1>{title}</h1>
        {description ? (
          <p className="mt-4 max-w-[540px] text-[15px] text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </Reveal>
  );
}
export function Back({ to = "/" }: { to?: string }) {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="mb-6 -ml-3"
      onPress={() => {
        void navigate({ to });
      }}
    >
      <Icon name="back" size={16} />
      Back
    </Button>
  );
}
export function Status({ state }: { state: string }) {
  const color =
    state === "claimed" || state === "Active"
      ? "success"
      : state === "expired" || state === "Paused"
        ? "warning"
        : "default";
  return (
    <Chip size="sm" variant="soft" color={color}>
      {state === "ready" ? "Ready to open" : state.charAt(0).toUpperCase() + state.slice(1)}
    </Chip>
  );
}
export function Steps({ labels, step }: { labels: string[]; step: number }) {
  return (
    <Stepper currentStep={step} size="sm" className="mb-7">
      {labels.map((label) => (
        <Stepper.Step key={label}>
          <Stepper.Indicator />
          <Stepper.Content>
            <Stepper.Title>{label}</Stepper.Title>
          </Stepper.Content>
          <Stepper.Separator />
        </Stepper.Step>
      ))}
    </Stepper>
  );
}
export function Empty({
  title,
  description,
  to = "/send",
  action = "Create a gift",
}: {
  title: string;
  description: string;
  to?: string;
  action?: string;
}) {
  return (
    <Card className="flex min-h-[320px] flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-separator bg-transparent p-8 text-center shadow-none [&>p]:max-w-md [&>p]:text-sm [&>p]:text-muted">
      <span className="inline-flex rounded-2xl bg-accent-soft p-5 text-accent-soft-foreground">
        <Icon name="gift" size={30} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="button button--primary" to={to}>
        {action}
        <Icon name="arrow" />
      </Link>
    </Card>
  );
}
export function CopyButton({ value, label = "Copy link" }: { value: string; label?: string }) {
  return (
    <Button
      variant="secondary"
      onPress={() => {
        void navigator.clipboard.writeText(value).then(
          () => toast.success("Copied to clipboard"),
          () => toast.danger("Couldn’t copy. Select and copy the link below."),
        );
      }}
    >
      <Icon name="copy" size={17} />
      {label}
    </Button>
  );
}
export function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator/60 py-3 text-xs last:border-0 [&>span]:text-muted [&>strong]:max-w-full [&>strong]:break-words [&>strong]:font-medium">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}
