import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { beforeEach, expect, it, vi } from "vitest";

import WalletIdentity from "#/components/common/wallet-identity";

const lookup = vi.hoisted(() => ({
  primary: vi.fn(),
  avatar: vi.fn(),
}));

vi.mock("@ensforge/react", () => ({
  usePrimaryName: lookup.primary,
  useAvatar: lookup.avatar,
}));

const address = "0xAbCd000000000000000000000000000000001234";
const render = () => renderToStaticMarkup(createElement(WalletIdentity, { address }));

beforeEach(() => {
  lookup.primary.mockReset().mockReturnValue({ data: undefined });
  lookup.avatar.mockReset().mockReturnValue({ data: undefined });
});

it("shows an address and Memento mark while ENS is unresolved, missing or unavailable", () => {
  for (const result of [
    { data: undefined },
    { data: null },
    { data: undefined, isFailure: true },
  ]) {
    lookup.primary.mockReturnValue(result);

    const markup = render();
    expect(markup).toContain("0xAbCd…1234");
    expect(markup).toContain('src="/brand/memento-souvenir-lavender.svg"');
    expect(lookup.avatar).toHaveBeenLastCalledWith({ name: "", enabled: false });
  }
});

it("shows a primary name and resolved avatar, preserving the full address as a tooltip", () => {
  lookup.primary.mockReturnValue({ data: { name: "jamie.eth", match: true } });
  lookup.avatar.mockReturnValue({
    data: { status: "resolved", uri: "https://example.com/avatar.png" },
  });

  const markup = render();
  expect(markup).toContain("jamie.eth");
  expect(markup).toContain('src="https://example.com/avatar.png"');
  expect(markup).toContain(`title="${address}"`);
});

it("keeps the primary name with a fallback icon when its avatar cannot resolve", () => {
  lookup.primary.mockReturnValue({ data: { name: "jamie.eth", match: true } });
  lookup.avatar.mockReturnValue({ data: { status: "unsupported-chain", chainId: 1 } });

  const markup = render();
  expect(markup).toContain("jamie.eth");
  expect(markup).toContain('src="/brand/memento-souvenir-lavender.svg"');
});
