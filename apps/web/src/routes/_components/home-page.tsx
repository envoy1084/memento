import type { ReactNode } from "react";

import { Icon } from "#/components/common/icon";
import { ButtonLink, Reveal, Section } from "#/components/common/page";
import { GiftArt } from "#/components/display/gift-art";

/** The page's one typographic flourish, used once per screen. */
function Emphasis({ children }: { children: ReactNode }) {
  return (
    <span className="text-lavender-700 underline decoration-lavender-200 decoration-[0.09em] underline-offset-[0.14em]">
      {children}
    </span>
  );
}

export function Home() {
  return (
    <Section className="grid items-center gap-10 pt-20 pb-14 md:grid-cols-[1.02fr_1fr] md:gap-14 md:py-[10%]">
      <Reveal className="order-2 min-w-0 md:order-1">
        <h1 className="text-display-xl">
          Give someone a name that’s <Emphasis>theirs to keep</Emphasis>.
        </h1>
        <p className="mt-6 max-w-[46ch] text-[15px] leading-[1.8] text-ink-soft">
          An .eth name is how a person is known online — a single, human name instead of a long
          wallet address. Cover the cost, add a note, and let them choose the one that fits.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <ButtonLink to="/send" size="md">
            Gift a name
            <Icon name="arrow" size={18} />
          </ButtonLink>
        </div>
      </Reveal>
      <Reveal className="order-1 min-w-0 md:order-2" delay={0.08}>
        <GiftArt name="yourname.eth" size="lg" notes />
      </Reveal>
    </Section>
  );
}
