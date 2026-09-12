import type { ComponentPropsWithRef, ReactNode } from "react";

import { createLink } from "@tanstack/react-router";

import { Alert, Button, cn, EmptyState, toast } from "@thenamespace/uikit";
import { motion, useReducedMotion } from "motion/react";

import { Icon, type IconName } from "#/components/common/icon";

const widths = {
  page: "max-w-[1180px]",
  reading: "max-w-[780px]",
  form: "max-w-[1080px]",
} as const;

/** The one horizontal rhythm the whole product uses. */
export function Section({
  children,
  width = "page",
  className = "",
  as: As = "section",
}: {
  children: ReactNode;
  width?: keyof typeof widths;
  className?: string;
  as?: "section" | "div" | "header" | "footer";
}) {
  return (
    <As
      className={cn(
        "mx-auto w-[calc(100%-2.5rem)] md:w-[calc(100%-5rem)]",
        widths[width],
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "block text-[11px] font-medium tracking-[0.16em] text-lavender-600 uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A section label sitting inside a hairline — structure you can read. */
export function RuleHeading({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("rule-label", className)}>{children}</p>;
}

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

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.34, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Link styled as a charcoal pill, reusing UIKit's own button styles and states. */
const ButtonAnchor = ({
  ref,
  className = "",
  variant = "primary",
  size = "md",
  ...anchor
}: ComponentPropsWithRef<"a"> & {
  variant?: "primary" | "secondary" | "tertiary" | "ghost";
  size?: "sm" | "md" | "lg";
}) => (
  <a
    {...anchor}
    ref={ref}
    className={cn("button px-5", `button--${variant}`, `button--${size}`, className)}
  />
);

export const ButtonLink = createLink(ButtonAnchor);

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="min-w-0">
        <Eyebrow className="mb-4">{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        {description ? (
          <p className="mt-3 max-w-[52ch] text-[15px] text-ink-soft">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-3">{action}</div> : null}
    </Reveal>
  );
}

export function EmptyPanel({
  title,
  description,
  icon = "gift",
  action,
}: {
  title: string;
  description: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <EmptyState className="rounded-3xl border border-dashed border-rule bg-paper-sunken/40 py-14">
      <EmptyState.Header>
        <EmptyState.Media variant="icon">
          <Icon name={icon} size={26} />
        </EmptyState.Media>
        <EmptyState.Title>{title}</EmptyState.Title>
        <EmptyState.Description className="mx-auto max-w-[44ch]">
          {description}
        </EmptyState.Description>
      </EmptyState.Header>
      {action ? <EmptyState.Content className="flex-row gap-3">{action}</EmptyState.Content> : null}
    </EmptyState>
  );
}

export function CopyButton({
  value,
  label = "Copy link",
  variant = "secondary",
  size = "md",
  fullWidth = false,
}: {
  value: string;
  label?: string;
  variant?: "primary" | "secondary" | "tertiary" | "ghost";
  size?: "sm" | "md";
  fullWidth?: boolean;
}) {
  return (
    <Button
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      onPress={() => {
        void navigator.clipboard.writeText(value).then(
          () => toast.success("Copied to clipboard"),
          () => toast.danger("Couldn’t copy. Select the link and copy it by hand."),
        );
      }}
    >
      <Icon name="copy" size={16} />
      {label}
    </Button>
  );
}

export function DetailList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn("divide-y divide-rule", className)}>{children}</dl>;
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-[13px]">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="m-0 max-w-full min-w-0 font-medium break-words">{children}</dd>
    </div>
  );
}

export function Note({
  children,
  status = "default",
  title,
}: {
  children: ReactNode;
  status?: "default" | "accent" | "success" | "warning" | "danger";
  title?: string;
}) {
  return (
    <Alert status={status}>
      <Alert.Indicator />
      <Alert.Content>
        {title ? <Alert.Title>{title}</Alert.Title> : null}
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
