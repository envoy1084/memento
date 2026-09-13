import { useEffect, useState } from "react";

export type ClaimPhase = "confirming" | "committing" | "waiting" | "registering" | "complete";

const phases = {
  confirming: {
    title: "One last confirmation",
    description: "Confirm that this is the name you want. Your gift covers the cost.",
  },
  committing: {
    title: "Getting things started",
    description: "We’re sending your name request. There’s nothing to pay.",
  },
  waiting: {
    title: "A little wait for your new name",
    description:
      "Every new .eth name has a short waiting period. We’ll finish automatically when it’s over.",
  },
  registering: {
    title: "Making it yours",
    description: "We’re finishing your registration and adding the name to your Memento wallet.",
  },
  complete: {
    title: "Your next chapter starts here.",
    description: "Your name is registered and belongs to you.",
  },
} as const;

export function ClaimProgress({
  name,
  phase,
  readyAt,
}: {
  name: string;
  phase: ClaimPhase;
  readyAt: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (phase !== "waiting") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [phase]);
  const index =
    phase === "complete" ? 3 : phase === "registering" ? 2 : phase === "waiting" ? 1 : 0;
  const remaining = readyAt ? Math.max(0, Math.ceil(readyAt - now / 1000)) : null;
  return (
    <div className="space-y-7">
      <div className="rounded-2xl border border-rule bg-paper-sunken px-5 py-6">
        <p className="m-0 text-xs font-semibold tracking-[0.16em] text-lavender-700 uppercase">
          {phase === "complete" ? "Yours to keep" : "Your new name"}
        </p>
        <p className="mt-2 mb-0 break-all text-3xl font-semibold tracking-tight">
          {name}
          <span className="text-lavender-700">.eth</span>
        </p>
      </div>
      <div role="status" aria-live="polite">
        <h2 className="text-xl font-semibold">{phases[phase].title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{phases[phase].description}</p>
      </div>
      <ol className="m-0 grid list-none gap-4 p-0" aria-label="Claim progress">
        {["Request your name", "Wait a moment", "It’s yours"].map((title, step) => (
          <li
            key={title}
            className="flex items-center gap-3 text-sm"
            aria-current={step === index ? "step" : undefined}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${step < index ? "border-lavender-600 bg-lavender-600 text-white" : step === index ? "border-lavender-600 bg-paper-sunken text-lavender-700" : "border-rule text-ink-soft"}`}
              aria-hidden="true"
            >
              {step < index ? "✓" : step + 1}
            </span>
            <span className={step > index ? "text-ink-soft" : "font-medium"}>{title}</span>
            {step === 1 && phase === "waiting" && remaining !== null ? (
              <span className="ml-auto text-xs text-ink-soft tabular-nums">
                {remaining > 0 ? `About ${remaining}s` : "Finishing the wait…"}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
