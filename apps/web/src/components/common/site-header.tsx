import { useState } from "react";

import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

import { Navbar } from "@thenamespace/uikit";

import { ConnectDialog } from "#/components/common/connect-dialog";
import { Icon } from "#/components/common/icon";
import { Wordmark } from "#/components/display/brand";

const links = [
  { to: "/", label: "Discover", exact: true },
  { to: "/gifts", label: "Your gifts", exact: false },
  { to: "/campaigns", label: "Communities", exact: false },
  { to: "/help", label: "How it works", exact: false },
] as const;

export function SiteHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isInvitation = pathname.startsWith("/claim/") || pathname.startsWith("/invite/");
  const current = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  if (isInvitation)
    return (
      <header className="border-b border-rule bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-[calc(100%-2.5rem)] max-w-[1180px] items-center justify-between gap-4 md:w-[calc(100%-5rem)]">
          <Link to="/" aria-label="Memento home">
            <Wordmark size="sm" />
          </Link>
          <span className="flex items-center gap-2 text-xs text-ink-soft">
            <Icon name="shield" size={15} />
            A private invitation
          </span>
        </div>
      </header>
    );

  return (
    <Navbar
      position="sticky"
      maxWidth="full"
      height="4.5rem"
      isMenuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      navigate={(href) => void navigate({ to: href })}
      className="border-b border-rule bg-paper/85 backdrop-blur-xl"
    >
      <Navbar.Header className="mx-auto w-[calc(100%-2.5rem)] max-w-[1180px] px-0 md:w-[calc(100%-5rem)]">
        <Navbar.Brand>
          <Link to="/" aria-label="Memento home" className="rounded-lg">
            <Wordmark size="sm" className="md:text-[1.4rem]" />
          </Link>
        </Navbar.Brand>
        <Navbar.Spacer />
        <Navbar.Content className="hidden md:flex">
          {links.map((link) => (
            <Navbar.Item href={link.to} isCurrent={current(link.to, link.exact)} key={link.to}>
              {link.label}
            </Navbar.Item>
          ))}
        </Navbar.Content>
        <Navbar.Spacer />
        <Navbar.Content className="gap-2">
          <ConnectDialog />
          <Navbar.MenuToggle className="md:hidden" srLabel="Toggle navigation menu" />
        </Navbar.Content>
      </Navbar.Header>
      <Navbar.Menu className="px-6 pb-6">
        {[...links, { to: "/profile", label: "Your identity", exact: false } as const].map(
          (link) => (
            <Navbar.MenuItem
              href={link.to}
              isCurrent={current(link.to, link.exact)}
              key={link.to}
              className="flex items-center justify-between border-b border-rule py-4 text-base"
            >
              {link.label}
              <Icon name="arrow" size={16} />
            </Navbar.MenuItem>
          ),
        )}
        <Navbar.MenuItem
          href="/send"
          className="mt-5 justify-center rounded-full bg-accent px-5 py-3.5 text-center text-accent-foreground"
        >
          Give a name
        </Navbar.MenuItem>
      </Navbar.Menu>
    </Navbar>
  );
}
