import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";

import { useAtomValue } from "@effect/atom-react";
import type { AtomRegistry } from "effect/unstable/reactivity";

import { Button, Chip, Separator, Toast } from "@thenamespace/uikit";
import { MotionConfig } from "motion/react";

import { storageNoticeAtom } from "#/atoms/demo";
import { Icon } from "#/components/common/icon";
import { ButtonLink, EmptyPanel, Note, Section } from "#/components/common/page";
import { SiteHeader } from "#/components/common/site-header";
import { Wordmark } from "#/components/display/brand";

export const Route = createRootRouteWithContext<{
  atomRegistry: AtomRegistry.AtomRegistry;
  storageMessage: string | undefined;
}>()({
  component: Root,
  notFoundComponent: () => (
    <Section className="py-20">
      <EmptyPanel
        icon="search"
        title="This page has moved on."
        description="The link may be old, or the page never existed. Your gifts and campaigns are where you left them."
        action={<ButtonLink to="/">Back to Memento</ButtonLink>}
      />
    </Section>
  ),
  errorComponent: ({ reset }) => (
    <Section width="reading" className="py-20">
      <h1>Something interrupted this preview.</h1>
      <p className="mt-3 text-ink-soft">
        Nothing was lost. Reload this view to pick up where you were.
      </p>
      <Button className="mt-6" onPress={reset}>
        Try again
      </Button>
    </Section>
  ),
});

function Root() {
  const context = Route.useRouteContext();
  const storageNotice = useAtomValue(storageNoticeAtom) ?? context.storageMessage;
  return (
    <MotionConfig reducedMotion="user">
      <a
        className="fixed top-3 left-4 z-100 -translate-y-24 rounded-xl bg-accent px-4 py-2.5 text-sm text-accent-foreground transition-transform duration-150 ease-swift focus:translate-y-0"
        href="#main"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {storageNotice ? (
            <Section className="pt-5">
              <Note status="warning" title="Saving is unavailable">
                {storageNotice}
              </Note>
            </Section>
          ) : null}
          <Outlet />
        </main>
        <Section as="footer" className="mt-20 pb-12">
          <Separator className="mb-8" />
          <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
            <Link to="/" aria-label="Memento home">
              <Wordmark size="sm" />
            </Link>
            <p className="m-0 text-[13px] text-ink-soft">A name is a beginning.</p>
            <div className="ml-auto flex flex-wrap items-center gap-6 text-[13px] text-ink-soft">
              <Link to="/help" className="hover:text-ink">
                How it works
              </Link>
              <Link to="/profile" className="hover:text-ink">
                Your identity
              </Link>
              <Chip size="sm" variant="soft" className="gap-2">
                <span className="size-1.5 rounded-full bg-lavender-400" />
                Interactive preview
              </Chip>
            </div>
          </div>
          <p className="mt-6 max-w-[62ch] text-xs leading-relaxed text-ink-faint">
            Everything here runs in your browser. No names are registered, no payments are taken and
            no messages are sent.{" "}
            <Link to="/help" className="underline underline-offset-2">
              What that means
              <Icon name="arrow" size={12} className="ml-1 inline align-[-1px]" />
            </Link>
          </p>
        </Section>
      </div>
      <Toast.Provider placement="bottom" />
    </MotionConfig>
  );
}
