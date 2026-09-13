import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { beforeEach, expect, it, vi } from "vitest";

import { ClaimSuccess } from "./claim-success";

const mocks = vi.hoisted(() => ({
  primary: {
    data: { name: null as string | null },
    isInitial: false,
    isWaiting: false,
    isFailure: false,
    refresh: vi.fn(),
  },
  prepare: vi.fn(),
  intent: vi.fn(),
  send: vi.fn(),
  button: undefined as undefined | { isDisabled: boolean; onPress: () => void },
}));
const address = `0x${"1".repeat(40)}`;
vi.mock("@ensforge/react", () => ({ usePrimaryName: () => mocks.primary }));
vi.mock("@thenamespace/uikit", () => ({
  Button: (props: { children: ReactNode; isDisabled: boolean; onPress: () => void }) => {
    mocks.button = props;
    return <button disabled={props.isDisabled}>{props.children}</button>;
  },
  Spinner: () => <span>Loading</span>,
}));
vi.mock("#/hooks/use-auth", () => ({ useAuth: () => ({ address: `0x${"1".repeat(40)}` }) }));
vi.mock("#/hooks/use-gift-transactions", () => ({ useGiftTransactions: () => mocks.send }));
vi.mock("#/config/ensforge", () => ({
  ensforge: {
    batch: { prepareCalls: mocks.prepare },
    reverse: { setPrimaryName: { call: mocks.intent } },
  },
}));
vi.mock("#/components/common/page", () => ({
  Note: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));
vi.mock("./claim-celebration", () => ({ ClaimCelebration: () => null }));
vi.mock("#/hooks/use-api-task", () => ({
  JourneyError: class extends Error {},
  journeyError: (error: Error) => error,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.button = undefined;
  mocks.primary.data.name = null;
  mocks.primary.isInitial = false;
  mocks.intent.mockReturnValue("primary-intent");
  mocks.prepare.mockResolvedValue([{ chainId: 11155111, to: address, data: "0x1234", value: 0n }]);
  mocks.send.mockResolvedValue([]);
  mocks.primary.refresh.mockResolvedValue(undefined);
});

it("hides the primary-name button when this name is already primary", () => {
  mocks.primary.data.name = "jamie.eth";
  expect(renderToStaticMarkup(<ClaimSuccess name="jamie.eth" />)).not.toContain("<button");
  expect(mocks.button).toBeUndefined();
  expect(mocks.send).not.toHaveBeenCalled();
});

it("prepares with ENSForge and uses the sponsored claim path before refreshing identity", async () => {
  mocks.primary.data.name = "old.eth";
  renderToStaticMarkup(<ClaimSuccess name="jamie.eth" />);
  expect(mocks.button?.isDisabled).toBe(false);
  mocks.button?.onPress();
  await vi.waitFor(() => expect(mocks.primary.refresh).toHaveBeenCalled());
  expect(mocks.intent).toHaveBeenCalledWith({ name: "jamie.eth" });
  expect(mocks.prepare).toHaveBeenCalledWith({ calls: ["primary-intent"], account: address });
  expect(mocks.send).toHaveBeenCalledWith("claim:primary:jamie.eth", address, 11155111, [
    { to: address, data: "0x1234", value: "0" },
  ]);
  expect(mocks.send.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.primary.refresh.mock.invocationCallOrder[0] ?? 0,
  );
});

it("does not submit when the primary-name plan is empty", async () => {
  mocks.prepare.mockResolvedValue([]);
  renderToStaticMarkup(<ClaimSuccess name="jamie.eth" />);
  mocks.button?.onPress();
  await vi.waitFor(() => expect(mocks.prepare).toHaveBeenCalled());
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.primary.refresh).not.toHaveBeenCalled();
});

it("waits for the primary-name lookup before allowing an update", () => {
  mocks.primary.isInitial = true;
  renderToStaticMarkup(<ClaimSuccess name="jamie.eth" />);
  expect(mocks.button?.isDisabled).toBe(true);
});

it("does not report the name as updated after a rejected wallet request", async () => {
  mocks.send.mockRejectedValue(new Error("Request rejected"));
  renderToStaticMarkup(<ClaimSuccess name="jamie.eth" />);
  mocks.button?.onPress();
  await vi.waitFor(() => expect(mocks.send).toHaveBeenCalled());
  expect(mocks.primary.refresh).not.toHaveBeenCalled();
  expect(mocks.primary.data.name).toBeNull();
});
