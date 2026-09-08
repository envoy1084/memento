import { lazy, Suspense, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import type { PreviewGift } from "@memento/protocol";
import { cn, useMediaQuery } from "@thenamespace/uikit";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

import { NameMark, ShellMark } from "#/components/display/brand";

const AuraShader = lazy(() => import("#/components/display/aura-shader"));

export type Wrapping = PreviewGift["theme"];

/** Wrapping papers. Tints resolve to brand ramp tokens, never raw hex. */
const wraps: Record<Wrapping, string> = {
  aura: "[--wrap-pale:var(--color-lavender-50)] [--wrap-mid:var(--color-lavender-200)] [--wrap-deep:var(--color-lavender-400)] [--wrap-ink:var(--color-lavender-700)]",
  rose: "[--wrap-pale:var(--color-blush-50)] [--wrap-mid:var(--color-blush-200)] [--wrap-deep:var(--color-blush-400)] [--wrap-ink:var(--color-blush-600)]",
  mint: "[--wrap-pale:var(--color-sage-50)] [--wrap-mid:var(--color-sage-200)] [--wrap-deep:var(--color-sage-400)] [--wrap-ink:var(--color-sage-600)]",
};

const stages = {
  sm: { frame: "h-[196px]", scale: 0.58, shader: false },
  md: { frame: "h-[316px]", scale: 0.82, shader: true },
  lg: { frame: "h-[348px] md:h-[404px]", scale: 0.95, shader: true },
} as const;

const spring = { stiffness: 150, damping: 20, mass: 0.6 };

/**
 * The keepsake: an identity card resting in its wrapping. It is the one place
 * in the product allowed to feel like an object, so it carries the pointer
 * parallax, the lift on hover and the single unwrap moment. Everything else
 * stays flat and calm.
 */
export function GiftArt({
  name = "yourname.eth",
  theme = "aura",
  size = "lg",
  opened = false,
  sender,
  notes = false,
}: {
  name?: string;
  theme?: string;
  size?: keyof typeof stages;
  opened?: boolean;
  sender?: string;
  notes?: boolean;
}) {
  const reduced = useReducedMotion();
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)", { defaultValue: false });
  const interactive = Boolean(finePointer) && !reduced;
  const stage = stages[size];
  const wrap = wraps[(theme as Wrapping) in wraps ? (theme as Wrapping) : "aura"];

  const frame = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const tiltY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-9, 9]), spring);
  const tiltX = useSpring(useTransform(pointerY, [-0.5, 0.5], [6, -6]), spring);
  const glareX = useTransform(pointerX, [-0.5, 0.5], ["18%", "82%"]);
  const glare = useMotionTemplate`radial-gradient(120% 90% at ${glareX} -10%, #ffffff90, transparent 62%)`;

  const track = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive) return;

    const box = frame.current?.getBoundingClientRect();

    if (!box) return;

    pointerX.set((event.clientX - box.left) / box.width - 0.5);
    pointerY.set((event.clientY - box.top) / box.height - 0.5);
  };

  const release = () => {
    setHovered(false);
    pointerX.set(0);
    pointerY.set(0);
  };

  const raised = opened || hovered;
  const cardLift = opened ? -72 : hovered ? -44 : -28;

  return (
    <div
      ref={frame}
      aria-hidden="true"
      onPointerMove={track}
      onPointerEnter={() => interactive && setHovered(true)}
      onPointerLeave={release}
      className={cn("relative isolate grid place-items-center overflow-hidden", stage.frame, wrap)}
    >
      {/* Ambient wash. Paper's shader is lazy and only ever runs on the large
          stages, with motion off entirely when the visitor asked for less. */}
      <div className="absolute inset-[6%] -z-2 rounded-[50%] bg-[radial-gradient(ellipse,var(--wrap-mid),transparent_66%)] opacity-45 blur-2xl" />
      {stage.shader && !reduced ? (
        <div className="absolute inset-0 -z-3 overflow-hidden opacity-70 mask-[radial-gradient(ellipse_at_center,#000_24%,transparent_68%)]">
          <Suspense fallback={null}>
            <AuraShader />
          </Suspense>
        </div>
      ) : null}
      <div className="absolute -z-1 h-[58%] w-[88%] -rotate-[18deg] rounded-[50%] border border-white/50" />
      <div className="absolute -z-1 h-[86%] w-[66%] rotate-[26deg] rounded-[50%] border border-white/40" />

      <motion.div
        className="relative"
        style={
          interactive
            ? { rotateX: tiltX, rotateY: tiltY, transformPerspective: 1100, scale: stage.scale }
            : { scale: stage.scale }
        }
      >
        <motion.div
          className="relative h-[252px] w-[292px] transform-3d"
          {...(reduced ? {} : { animate: { y: raised ? -6 : 0 } })}
          transition={{ type: "spring", duration: 0.5, bounce: 0.18 }}
        >
          {/* Card back plate — the wrapping seen behind the card. */}
          <div className="absolute inset-x-2 top-6 bottom-0 rounded-[22px] bg-linear-135 from-(--wrap-deep) to-(--wrap-pale) opacity-70" />

          {/* The identity card. The name always sits in the band that stays
              clear of the sleeve; opening it reveals who the gift came from. */}
          <motion.div
            className="absolute top-4 left-6 z-1 flex h-[200px] w-[240px] flex-col overflow-hidden rounded-[20px] border border-white bg-paper-raised px-5 py-4 shadow-keepsake"
            {...(reduced
              ? { style: { y: opened ? -72 : -28 } }
              : {
                  animate: { y: cardLift },
                  transition: {
                    type: "spring" as const,
                    duration: opened ? 0.62 : 0.42,
                    bounce: opened ? 0.2 : 0.1,
                  },
                })}
          >
            {!reduced ? (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: glare }}
                animate={{ opacity: hovered ? 0.85 : 0.35 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              />
            ) : null}
            <span className="relative flex items-center justify-between text-[10px] tracking-[0.14em] text-ink-faint uppercase">
              Memento
              <ShellMark tone="lavender" size={16} />
            </span>
            <span className="relative mt-2.5 block">
              <NameMark name={name} size="md" className="w-full" />
            </span>
            <span className="relative mt-3 block h-px bg-rule" />
            <span className="relative mt-2.5 flex items-baseline justify-between text-[9px] text-ink-faint">
              <span className="truncate">{sender ? `From ${sender}` : "A name of your own"}</span>
              <span className="shrink-0 tracking-[0.14em] uppercase">Forever</span>
            </span>
          </motion.div>

          {/* Wrapping sleeve — the pocket the card slides out of. */}
          <div className="absolute inset-x-0 top-[84px] bottom-0 z-2 overflow-hidden rounded-[12px_12px_20px_20px] bg-linear-150 from-(--wrap-pale) to-(--wrap-mid) shadow-[inset_0_1px_0_#ffffffd9,inset_0_-3px_2px_#00000010]">
            <div className="absolute inset-0 bg-linear-20 from-(--wrap-mid) to-white/25 [clip-path:polygon(0_0,50%_58%,100%_0,100%_100%,0_100%)]" />
            <div className="absolute top-[54%] -left-[15%] h-full w-[130%] -rotate-[30deg] border-t border-white/50" />
            <motion.span
              className="absolute top-[58px] left-[calc(50%-24px)] grid size-12 place-content-center rounded-full border border-white/80 bg-linear-160 from-white/85 to-(--wrap-mid) shadow-[0_2px_8px_#00000014]"
              {...(reduced ? {} : { animate: { scale: raised ? 1.06 : 1 } })}
              transition={{ type: "spring", duration: 0.4, bounce: 0.25 }}
            >
              <ShellMark tone="lavender" size={26} className="opacity-90" />
            </motion.span>
            <span className="absolute bottom-4 w-full text-center text-[8px] tracking-[0.22em] text-(--wrap-ink) uppercase">
              For your next chapter
            </span>
          </div>
        </motion.div>
      </motion.div>

      {notes ? (
        <div className="pointer-events-none absolute inset-0 mx-auto w-full max-w-[470px]">
          <span className="absolute top-[13%] -right-1 hidden rotate-3 items-center gap-2 rounded-full border border-white bg-white/85 px-3.5 py-2 text-[11px] text-ink-soft shadow-lift backdrop-blur-sm sm:flex">
            <span className="size-1.5 rounded-full bg-lavender-400" />A name. All theirs.
          </span>
          <span className="absolute bottom-[11%] -left-1 hidden -rotate-2 items-center gap-2 rounded-full border border-white bg-white/85 px-3.5 py-2 text-[11px] text-ink-soft shadow-lift backdrop-blur-sm sm:flex">
            <span className="size-1.5 rounded-full bg-blush-300" />
            Nothing to pay. Ever.
          </span>
        </div>
      ) : null}
    </div>
  );
}
