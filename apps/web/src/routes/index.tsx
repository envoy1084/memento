import { createFileRoute, Link } from "@tanstack/react-router";

import { Card, Chip } from "@thenamespace/uikit";

import { GiftArt } from "#/components/gift-art";
import { Icon } from "#/components/icon";
import { Reveal } from "#/components/page";
export const Route = createFileRoute("/")({ component: Home });
function Home() {
  return (
    <>
      <section className="grid min-h-[615px] items-center gap-6 py-10 text-center md:grid-cols-[1.04fr_1fr] md:gap-10 md:py-16 md:text-left mx-auto w-[calc(100%-40px)] max-w-[1200px] md:w-[calc(100%-96px)]">
        <Reveal className="relative z-1 [&>h1]:text-[clamp(40px,9.8vw,62px)] [&>h1]:leading-[1.12] [&>h1]:tracking-[-0.065em] md:[&>h1]:text-[clamp(44px,4.45vw,69px)] [&>p]:mt-6 [&>p]:text-sm [&>p]:leading-[1.85] [&>p]:text-muted md:[&>p]:text-[15px]">
          <Chip
            variant="soft"
            className="mb-6 bg-[#f2eaf5] px-3 py-2 text-[11px] font-medium text-[#81688d]"
          >
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[#a38ab8]" />
            Little gifts. New beginnings.
          </Chip>
          <h1>
            Some gifts
            <br />
            become{" "}
            <span className="font-serif font-normal tracking-[-0.05em] text-[#9d7bb4] italic">
              part of you.
            </span>
          </h1>
          <p>
            Give someone a name they can call their own.
            <br className="hidden sm:block" />
            Their first onchain identity. A little piece of forever.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 md:justify-start">
            <Link to="/send" className="button button--primary button--lg">
              Give a name
              <Icon name="arrow" />
            </Link>
            <Link
              to="/claim/$giftId"
              params={{ giftId: "a-little-beginning" }}
              className="inline-flex items-center gap-1.5 text-xs text-[#7e6b8d]"
            >
              Open a little surprise
              <Icon name="external" size={17} />
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-3 text-left text-[10px] leading-relaxed text-muted md:justify-start [&_strong]:font-normal [&_strong]:text-[#9c90a5]">
            <span className="flex pl-1 [&_i]:-ml-1 [&_i]:grid [&_i]:size-7 [&_i]:place-content-center [&_i]:rounded-full [&_i]:border-2 [&_i]:border-white [&_i]:bg-[#e7d9f1] [&_i]:text-[9px] [&_i]:text-[#7a5d8d] [&_i]:not-italic [&_i:nth-child(2)]:bg-[#f1d8dc] [&_i:nth-child(3)]:bg-[#d8e9df]">
              <i>J</i>
              <i>A</i>
              <i>S</i>
            </span>
            <span>
              For your people.
              <br />
              <strong>No crypto experience needed.</strong>
            </span>
          </div>
        </Reveal>
        <Reveal className="mx-auto w-full max-w-[540px] min-w-0" delay={0.12}>
          <GiftArt />
          <div className="mt-1 hidden justify-between px-6 text-[8px] text-[#9c8caa] lg:flex [&>span:first-child]:tracking-widest">
            <span>01 / A GIFT THAT GOES WITH YOU</span>
            <span>Made personal. Kept forever.</span>
          </div>
        </Reveal>
      </section>
      <div className="grid grid-cols-2 items-center justify-between gap-6 border-y border-separator py-6 md:flex [&>span]:text-[11px] [&>span]:leading-relaxed [&>span]:text-muted [&_strong]:font-medium [&_strong]:text-foreground [&>div]:flex [&>div]:items-center [&>div]:gap-2 [&>div]:text-[11px] [&>div]:text-[#877693] md:[&>div]:text-xs mx-auto w-[calc(100%-40px)] max-w-[1200px] md:w-[calc(100%-96px)]">
        <span>
          A familiar name.
          <br />
          <strong>A whole new world.</strong>
        </span>
        <div>
          <Icon name="globe" />
          Powered by ENS
        </div>
        <div>
          <Icon name="shield" />
          Theirs to own
        </div>
        <div>
          <Icon name="gift" />
          You cover the beginning
        </div>
      </div>
      <section className="mx-auto w-[calc(100%-40px)] max-w-[1200px] md:w-[calc(100%-96px)] pt-14 pb-9 md:pt-22 md:pb-16">
        <Reveal className="mb-10 text-center [&_p]:mt-4 [&_p]:text-[13px] [&_p]:text-muted">
          <div className="mb-5 text-[10px] font-semibold tracking-[0.17em] text-[#8c749f] uppercase">
            THOUGHTFUL BY DESIGN
          </div>
          <h2>
            There’s more than one way
            <br />
            to say{" "}
            <span className="font-serif font-normal tracking-[-0.05em] text-[#9d7bb4] italic">
              “this is for you.”
            </span>
          </h2>
          <p>A new chapter, an inside joke, or a welcome to the club.</p>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          <Reveal>
            <Card className="relative min-h-[365px] rounded-3xl border border-[#e9e0ee] p-7 shadow-none transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_16px_32px_#77628b12] [&_p]:mt-3 [&_p]:mb-5 [&_p]:text-xs [&_p]:leading-7 [&_p]:text-muted bg-[#f7f2fc]">
              <span className="text-[10px] tracking-wide text-[#b3a1bd]">01</span>
              <div className="flex h-[165px] flex-col items-center justify-center pb-2 [&>span]:rounded-lg [&>span]:border [&>span]:border-[#e8dcee] [&>span]:bg-white/60 [&>span]:px-5 [&>span]:py-2 [&>span]:text-base [&>span]:tracking-tight [&>span]:text-[#a58cbb] [&>span:first-child]:-rotate-6 [&>span:first-child]:-translate-x-4 [&>span:nth-child(2)]:z-1 [&>span:nth-child(2)]:rotate-3 [&>span:nth-child(2)]:bg-white [&>span:nth-child(2)]:text-xl [&>span:nth-child(2)]:text-[#6c4d88] [&>span:last-child]:-rotate-3 [&>span:last-child]:translate-x-2 [&>span:last-child]:text-sm">
                <span>dreamer.eth</span>
                <span>heyjamie.eth</span>
                <span>somethingyou.eth</span>
              </div>
              <div>
                <h3>Let them choose.</h3>
                <p>You give the possibility. They find the name that feels like them.</p>
                <Link
                  to="/send"
                  className="inline-flex items-center gap-2.5 text-xs font-medium text-[#786087] [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5"
                >
                  Gift a fresh beginning
                  <Icon name="arrow" size={18} />
                </Link>
              </div>
            </Card>
          </Reveal>
          <Reveal delay={0.08}>
            <Card className="relative min-h-[365px] rounded-3xl border border-[#e9e0ee] p-7 shadow-none transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_16px_32px_#77628b12] [&_p]:mt-3 [&_p]:mb-5 [&_p]:text-xs [&_p]:leading-7 [&_p]:text-muted border-[#efdee6] bg-[#fdf2f5]">
              <span className="text-[10px] tracking-wide text-[#b3a1bd]">02</span>
              <div className="flex h-[165px] flex-col items-center justify-center text-[#b789a0] [&>span]:my-2 [&>span]:font-display [&>span]:text-[28px] [&>span]:tracking-[-0.055em] [&>span]:text-[#9b697e] [&>small]:text-[9px] [&>small]:text-[#b293a0]">
                <Icon name="gift" size={28} />
                <span>sophie.eth</span>
                <small>Had your name on it.</small>
              </div>
              <div>
                <h3>You found their name.</h3>
                <p>Already own the perfect one? Wrap it up and pass it on.</p>
                <Link
                  to="/send"
                  search={{ kind: "owned" }}
                  className="inline-flex items-center gap-2.5 text-xs font-medium text-[#786087] [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5"
                >
                  Gift a name you own
                  <Icon name="arrow" size={18} />
                </Link>
              </div>
            </Card>
          </Reveal>
          <Reveal delay={0.16}>
            <Card className="relative min-h-[365px] rounded-3xl border border-[#e9e0ee] p-7 shadow-none transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_16px_32px_#77628b12] [&_p]:mt-3 [&_p]:mb-5 [&_p]:text-xs [&_p]:leading-7 [&_p]:text-muted border-[#dfeae3] bg-[#f0f6f2]">
              <span className="text-[10px] tracking-wide text-[#b3a1bd]">03</span>
              <div className="flex h-[165px] items-center justify-center [&>span]:-ml-3 [&>span]:grid [&>span]:h-[67px] [&>span]:w-[58px] [&>span]:-rotate-6 [&>span]:place-content-center [&>span]:rounded-3xl [&>span]:border-4 [&>span]:border-[#f0f6f2] [&>span]:bg-[#d3e2d8] [&>span]:font-serif [&>span]:text-[28px] [&>span]:text-[#6e8f7b] [&>span]:italic [&>span:nth-child(even)]:-translate-y-3 [&>span:nth-child(even)]:rotate-6 [&>span:nth-child(even)]:bg-[#e0eadc]">
                <span>m</span>
                <span>a</span>
                <span>j</span>
                <span>+</span>
              </div>
              <div>
                <h3>Bring your people in.</h3>
                <p>One community. Hundreds of beginnings. A name for everyone.</p>
                <Link
                  to="/campaigns/new"
                  className="inline-flex items-center gap-2.5 text-xs font-medium text-[#786087] [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5"
                >
                  Start a community gift
                  <Icon name="arrow" size={18} />
                </Link>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>
      <section className="mx-auto w-[calc(100%-40px)] max-w-[1200px] md:w-[calc(100%-96px)] grid gap-8 py-12 md:grid-cols-2 md:gap-20 md:py-20">
        <Reveal>
          <div className="mb-5 text-[10px] font-semibold tracking-[0.17em] text-[#8c749f] uppercase">
            A LITTLE THOUGHT GOES A LONG WAY
          </div>
          <h2>
            From you.
            <br />
            To their{" "}
            <span className="font-serif font-normal tracking-[-0.05em] text-[#9d7bb4] italic">
              next chapter.
            </span>
          </h2>
        </Reveal>
        <div className="space-y-0">
          {[
            {
              n: "01",
              title: "Make it personal",
              text: "Pick a gift, add a note, and cover the cost. We’ll make it feel like a present.",
            },
            {
              n: "02",
              title: "Send a little possibility",
              text: "Share their private invitation however you like. They open it when they’re ready.",
            },
            {
              n: "03",
              title: "A name that’s truly theirs",
              text: "They choose their name and make it their own. No tokens, gas fees, or experience needed.",
            },
          ].map((step, index) => (
            <Reveal
              key={step.n}
              delay={index * 0.07}
              className="flex gap-6 border-b border-separator py-6 first:pt-0 [&>span]:pt-1 [&>span]:text-[11px] [&>span]:text-[#a791b7] [&_h3]:text-[17px] [&_p]:mt-2 [&_p]:text-xs [&_p]:text-muted"
            >
              <span>{step.n}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      <Reveal className="relative isolate overflow-hidden bg-[radial-gradient(ellipse_at_50%_90%,#ecd9f080,transparent_65%)] bg-[#f5eef7] px-6 py-14 text-center md:py-18 [&_.button]:mt-7">
        <div className="mb-5 text-[10px] font-semibold tracking-[0.17em] text-[#8c749f] uppercase">
          SMALL GESTURE. ENDLESS POSSIBILITIES.
        </div>
        <h2>
          Someone’s next chapter
          <br />
          could start{" "}
          <span className="font-serif font-normal tracking-[-0.05em] text-[#9d7bb4] italic">
            with you.
          </span>
        </h2>
        <Link to="/send" className="button button--primary button--lg">
          Make their day
          <Icon name="arrow" />
        </Link>
        <span className="absolute right-[8%] -bottom-[70px] -z-1 rotate-20 text-[280px] text-[#e9d8ee]">
          ✳
        </span>
      </Reveal>
    </>
  );
}
