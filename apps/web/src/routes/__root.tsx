import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";

import type { AtomRegistry } from "effect/unstable/reactivity";

import { Button, Separator, Toast } from "@thenamespace/uikit";
import { MotionConfig } from "motion/react";

import { ButtonLink, EmptyPanel, Section } from "#/components/common/page";
import { SiteHeader } from "#/components/common/site-header";
import { Wordmark } from "#/components/display/brand";

export const Route = createRootRouteWithContext<{
  atomRegistry: AtomRegistry.AtomRegistry;
}>()({
  component: Root,

  notFoundComponent: () => (
    <Section className="py-20">
      <EmptyPanel
        icon="search"
        title="This page has moved on."
        description="The link may be old, or the page never existed. Your gifts are where you left them."
        action={<ButtonLink to="/">Back to Memento</ButtonLink>}
      />
    </Section>
  ),

  errorComponent: ({ reset }) => (
    <Section width="reading" className="py-20">
      <h1>Something interrupted this page.</h1>
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
            </div>
          </div>
        </Section>
      </div>
      <Toast.Provider placement="bottom" />
    </MotionConfig>
  );
}
