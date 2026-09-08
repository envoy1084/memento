import { cn } from "@thenamespace/uikit";

const shellSources = {
  ink: "/brand/memento-souvenir.svg",
  white: "/brand/memento-souvenir-white.svg",
  lavender: "/brand/memento-souvenir-lavender.svg",
} as const;

/**
 * The official Souvenir shell. Rendered from the supplied SVG assets; never
 * redrawn. Decorative by default because it always sits beside the wordmark.
 */
export function ShellMark({
  tone = "ink",
  size = 26,
  className = "",
  label,
}: {
  tone?: keyof typeof shellSources;
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <img
      src={shellSources[tone]}
      width={size}
      height={size}
      alt={label ?? ""}
      aria-hidden={label ? undefined : "true"}
      draggable={false}
      className={cn("shrink-0 select-none", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function Wordmark({
  size = "md",
  tone = "ink",
  className = "",
}: {
  size?: "sm" | "md";
  tone?: "ink" | "white";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-display font-bold tracking-[-0.055em]",
        size === "sm" ? "text-lg" : "text-[1.45rem]",
        tone === "white" ? "text-white" : "text-ink",
        className,
      )}
    >
      <ShellMark tone={tone === "white" ? "white" : "ink"} size={size === "sm" ? 22 : 27} />
      memento
      <span className={cn("-ml-2", tone === "white" ? "text-lavender-300" : "text-lavender-400")}>
        .
      </span>
    </span>
  );
}

const nameSizes = {
  sm: "text-[15px] tracking-[-0.028em]",
  md: "text-2xl tracking-[-0.036em]",
  lg: "text-display-md",
  xl: "text-display-lg",
} as const;

/**
 * A claimed name is the product, so it always gets the same typographic
 * treatment: display weight on the stem, a lighter lavender suffix.
 */
export function NameMark({
  name,
  size = "md",
  tone = "ink",
  className = "",
}: {
  name: string;
  size?: keyof typeof nameSizes;
  tone?: "ink" | "lavender";
  className?: string;
}) {
  const separator = name.lastIndexOf(".");
  const stem = separator > 0 ? name.slice(0, separator) : name;
  const suffix = separator > 0 ? name.slice(separator) : "";
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-baseline font-display font-semibold",
        nameSizes[size],
        tone === "lavender" ? "text-lavender-700" : "text-ink",
        className,
      )}
    >
      <span className="truncate">{stem}</span>
      {suffix ? <span className="font-medium text-lavender-400 tabular-nums">{suffix}</span> : null}
    </span>
  );
}
