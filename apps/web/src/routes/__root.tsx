import { useState } from "react";

import { createRootRouteWithContext, Link, Outlet, useRouterState } from "@tanstack/react-router";

import { useAtomValue } from "@effect/atom-react";
import type { AtomRegistry } from "effect/unstable/reactivity";

import { Button, Toast } from "@thenamespace/uikit";
import { MotionConfig, AnimatePresence, motion } from "motion/react";

import { storageNoticeAtom } from "#/atoms/demo";
import { ConnectDialog } from "#/components/connect-dialog";
import { Icon } from "#/components/icon";
import { Empty } from "#/components/page";

export const Route = createRootRouteWithContext<{
  atomRegistry: AtomRegistry.AtomRegistry;
  storageMessage: string | undefined;
}>()({
  component: Root,
  notFoundComponent: () => (
    <div className="mx-auto w-[calc(100%-40px)] max-w-[1200px] md:w-[calc(100%-96px)] py-20">
      <Empty
        title="A little off the path."
        description="This page isn’t here, but your next beginning is."
        to="/"
        action="Back to Memento"
      />
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="mx-auto w-[calc(100%-40px)] max-w-[1200px] md:w-[calc(100%-96px)] py-20">
      <h1>Let’s try that again.</h1>
      <p>Something interrupted this preview.</p>
      <Button onPress={reset}>Try again</Button>
    </div>
  ),
});
function Root() {
  const [menu, setMenu] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const privateInvitation = pathname.startsWith("/claim/") || pathname.startsWith("/invite/");
  const context = Route.useRouteContext();
  const storageNotice = useAtomValue(storageNoticeAtom) ?? context.storageMessage;
  return (
    <MotionConfig reducedMotion="user">
      <a className="fixed -top-20 left-4 z-50 rounded-xl bg-surface p-3 focus:top-3" href="#main">
        Skip to content
      </a>
      <div className="min-h-screen">
        <header className="relative z-30 border-b border-separator/60 bg-background/90 backdrop-blur-xl">
          <div className="mx-auto flex h-19 w-[calc(100%-40px)] max-w-[1360px] items-center justify-between gap-3 md:h-24 md:w-[calc(100%-80px)] md:gap-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-display text-[23px] font-bold tracking-[-1.5px] text-foreground md:text-[25px]"
              aria-label="Memento home"
            >
              <span className="inline-flex h-[35px] w-[31px] items-center justify-center rounded-[10px_10px_13px_13px] border border-[#c6b4e5] bg-[#ece2f9] font-serif text-[29px] font-medium leading-none text-[#765d9e] italic shadow-[inset_0_1px_1px_#fff,0_2px_1px_#d4c4e8]">
                m
              </span>
              memento<span className="-ml-2 text-[#a68ec5]">.</span>
            </Link>
            {privateInvitation ? (
              <span className="flex items-center gap-2 text-[10px] text-muted md:text-xs">
                <Icon name="shield" size={15} />A private invitation
              </span>
            ) : (
              <>
                <nav
                  className="hidden gap-8 text-sm text-muted md:flex [&_a]:relative [&_a]:py-3 [&_a]:transition-colors [&_a:hover]:text-foreground [&_a[data-status=active]]:text-foreground [&_a[data-status=active]]:after:absolute [&_a[data-status=active]]:after:bottom-0 [&_a[data-status=active]]:after:left-1/2 [&_a[data-status=active]]:after:size-1 [&_a[data-status=active]]:after:rounded-full [&_a[data-status=active]]:after:bg-[#9f7dc5]"
                  aria-label="Main navigation"
                >
                  <Link to="/" activeOptions={{ exact: true }}>
                    Discover
                  </Link>
                  <Link to="/gifts">My gifts</Link>
                  <Link to="/campaigns">For communities</Link>
                </nav>
                <div className="flex items-center gap-1 md:gap-2.5">
                  <ConnectDialog />
                  <Button
                    variant="ghost"
                    isIconOnly
                    aria-label={menu ? "Close navigation" : "Open navigation"}
                    aria-expanded={menu}
                    onPress={() => setMenu(!menu)}
                    className="md:hidden"
                  >
                    <Icon name={menu ? "close" : "menu"} />
                  </Button>
                </div>
              </>
            )}
          </div>
          <AnimatePresence>
            {menu && !privateInvitation ? (
              <motion.nav
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden px-6 [&_a]:flex [&_a]:items-center [&_a]:justify-between [&_a]:border-t [&_a]:border-separator [&_a]:py-4"
                aria-label="Mobile navigation"
              >
                {[
                  { to: "/", label: "Discover" },
                  { to: "/gifts", label: "My gifts" },
                  { to: "/campaigns", label: "For communities" },
                  { to: "/profile", label: "My identity" },
                ].map((entry) => (
                  <Link key={entry.to} to={entry.to} onClick={() => setMenu(false)}>
                    {entry.label}
                    <Icon name="arrow" size={16} />
                  </Link>
                ))}
              </motion.nav>
            ) : null}
          </AnimatePresence>
        </header>
        <main id="main" tabIndex={-1}>
          {storageNotice ? (
            <p role="status" className="bg-surface-secondary px-6 py-2.5 text-center text-xs">
              {storageNotice}
            </p>
          ) : null}
          <Outlet />
        </main>
        <footer className="mx-auto mt-8 flex w-[calc(100%-40px)] max-w-[1360px] flex-wrap items-center gap-4 border-t border-separator py-8 text-xs text-muted md:mt-16 md:w-[calc(100%-80px)] md:gap-6 [&>div]:flex [&>div]:w-full [&>div]:flex-wrap [&>div]:items-center [&>div]:gap-5 md:[&>div]:ml-auto md:[&>div]:w-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-[23px] font-bold tracking-[-1.5px] text-foreground md:text-[25px] !text-xl"
          >
            memento<span className="-ml-2 text-[#a68ec5]">.</span>
          </Link>
          <span>A name is a beginning.</span>
          <div>
            <Link to="/help">A little guidance</Link>
            <Link to="/profile">My identity</Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-separator px-2 py-1 text-[10px] [&>span]:size-1 [&>span]:rounded-full [&>span]:bg-[#ad94c8]">
              <span />
              Interactive preview
            </span>
          </div>
        </footer>
      </div>
      <Toast.Provider placement="bottom" />
    </MotionConfig>
  );
}
