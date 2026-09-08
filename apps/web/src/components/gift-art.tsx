import { lazy, Suspense, useState } from "react";

import { motion, useReducedMotion } from "motion/react";

import { Icon } from "#/components/icon";
const AuraShader = lazy(() => import("#/components/aura-shader"));
const palettes = {
  aura: "[--art-light:#eee5fd] [--art-mid:#d6bfe9] [--art-deep:#b393ce]",
  rose: "[--art-light:#fbe7ee] [--art-mid:#eec7d9] [--art-deep:#c492ae]",
  mint: "[--art-light:#e3f4e9] [--art-mid:#c0dfce] [--art-deep:#8bb69f]",
};
export function GiftArt({
  name = "yourname.eth",
  theme = "aura",
  compact = false,
  opened = false,
}: {
  name?: string;
  theme?: string;
  compact?: boolean;
  opened?: boolean;
}) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`relative isolate grid place-items-center ${compact ? "h-[240px]" : "h-[360px] md:h-[440px]"} ${palettes[theme as keyof typeof palettes] ?? palettes.aura}`}
      aria-hidden="true"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute inset-[12%] -z-1 bg-[radial-gradient(ellipse,var(--art-mid),transparent_68%)] opacity-50 blur-xl" />
      <div className="absolute -z-1 h-[62%] w-[90%] -rotate-22 rounded-[50%] border border-[#d4bfd937]" />
      <div className="absolute -z-1 h-[90%] w-[70%] rotate-28 rounded-[50%] border border-[#d4bfd937]" />
      {!compact && !reduced ? (
        <div className="absolute inset-0 -z-2 overflow-hidden rounded-[50%] opacity-80 mask-[radial-gradient(ellipse,#000_28%,transparent_70%)]">
          <Suspense fallback={null}>
            <AuraShader />
          </Suspense>
        </div>
      ) : null}
      <div className={compact ? "scale-[0.65]" : "scale-[0.85] lg:scale-100"}>
        <motion.div
          className="relative mt-12 h-[250px] w-[280px] perspective-[900px] drop-shadow-[0_25px_20px_#8f67b426]"
          animate={reduced ? { rotate: -7 } : { y: [0, -9, 0], rotate: hovered ? -3 : -7 }}
          transition={{
            y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
            rotate: { type: "spring", stiffness: 120, damping: 15 },
          }}
        >
          <div className="absolute inset-0 rounded-2xl bg-linear-135 from-(--art-deep) to-(--art-light) [clip-path:polygon(0_34%,50%_0,100%_34%,100%_100%,0_100%)]" />
          <motion.div
            className="absolute top-1.5 left-6 z-1 flex h-48 w-[232px] flex-col rounded-2xl border border-white bg-linear-140 from-white/80 to-(--art-light) px-5 py-4.5 shadow-[0_-4px_20px_#fff6,inset_0_0_25px_#fff5]"
            animate={{ y: opened || hovered ? -45 : -12 }}
            transition={{ type: "spring", stiffness: 85, damping: 18 }}
          >
            <span className="flex items-center justify-between text-[11px] tracking-tight text-[#9981ae]">
              memento <Icon name="sparkle" size={18} />
            </span>
            <span className="mt-6 overflow-hidden font-display text-[26px] text-ellipsis tracking-[-0.06em] whitespace-nowrap text-[#6e547f]">
              {name}
            </span>
            <span className="mt-2 text-[8px] text-[#a792b6]">a little piece of forever</span>
          </motion.div>
          <div className="absolute inset-x-0 top-[78px] bottom-0 z-2 overflow-hidden rounded-[10px_10px_15px_15px] bg-linear-150 from-(--art-light) to-(--art-mid) shadow-[inset_0_1px_0_#fffc,inset_0_-3px_1px_#9270ad1f]">
            <div className="absolute inset-0 bg-linear-25 from-(--art-mid) to-white/30 [clip-path:polygon(0_0,50%_62%,100%_0,100%_100%,0_100%)] after:absolute after:top-[51%] after:-left-[20%] after:h-full after:w-[140%] after:-rotate-32 after:border-t after:border-white/45 after:bg-white/5" />
            <span className="absolute top-[65px] left-[calc(50%-21px)] grid size-[42px] place-content-center rounded-full border-2 border-[#efdffa] bg-linear-150 from-[#edddf4] to-(--art-deep) font-serif text-[30px] text-[#856293] italic shadow-[0_2px_6px_#85519b26,inset_0_0_0_3px_#ffffff1a]">
              m
            </span>
            <span className="absolute bottom-4 w-full text-center text-[7px] tracking-[0.19em] text-[#8d6fa3]">
              FOR YOUR NEXT CHAPTER
            </span>
          </div>
        </motion.div>
      </div>
      <motion.span
        className="absolute top-[20%] left-[12%] text-[#b08ccb]"
        animate={reduced ? {} : { rotate: [0, 30, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 7, repeat: Infinity }}
      >
        <Icon name="sparkle" size={26} />
      </motion.span>
      <span className="absolute right-[12%] bottom-[18%] text-[#c7a6ca]">
        <Icon name="sparkle" size={14} />
      </span>
      {!compact ? (
        <>
          <div className="absolute top-[15%] right-[5%] flex rotate-6 items-center gap-1 rounded-full border border-white bg-white/75 px-3 py-2.5 text-[9px] text-[#93819f] shadow-sm backdrop-blur-xl">
            <span className="mr-1 size-1.5 rounded-full bg-[#a38ab8]" />A name. All yours.
          </div>
          <div className="absolute bottom-[9%] left-[3%] flex -rotate-6 items-center gap-2 rounded-full border border-white bg-white/75 px-3 py-2.5 text-[9px] text-[#93819f] shadow-sm backdrop-blur-xl">
            <Icon name="gift" size={16} />
            Made to mean something.
          </div>
        </>
      ) : null}
    </div>
  );
}
