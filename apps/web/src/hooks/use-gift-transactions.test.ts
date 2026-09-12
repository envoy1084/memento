import { TransactionError } from "@ensforge/core";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useGiftTransactions } from "#/hooks/use-gift-transactions";

const wallet = vi.hoisted(() => ({
  send: vi.fn(),
  sponsoredSend: vi.fn(),
  wallets: [{ address: `0x${"1".repeat(40)}`, walletClientType: "privy" }],
  status: vi.fn(),
  capabilities: vi.fn(),
  receipt: vi.fn(),
  switchChain: vi.fn(),
}));
vi.mock("@privy-io/react-auth", () => ({
  useSendTransaction: () => ({ sendTransaction: wallet.sponsoredSend }),
  useWallets: () => ({ wallets: wallet.wallets }),
}));
vi.mock("@ensforge/react", () => ({ useSendCalls: () => ({ mutateAsync: wallet.send }) }));
vi.mock("wagmi", () => ({ useSwitchChain: () => ({ switchChainAsync: wallet.switchChain }) }));
vi.mock("wagmi/actions", () => ({
  getConnection: () => ({ isConnected: true, address: `0x${"1".repeat(40)}`, chainId: 11155111 }),
}));
vi.mock("#/config/wagmi", () => ({ wagmiConfig: {} }));
vi.mock("#/config/ensforge", () => ({
  ensforge: {
    batch: { getWalletCapabilities: wallet.capabilities, getCallsStatus: wallet.status },
  },
}));
vi.mock("#/config/chain", () => ({
  apiUrl: "http://localhost:3001",
  chain: { id: 11155111 },
  publicClient: { waitForTransactionReceipt: wallet.receipt },
}));

const account = `0x${"1".repeat(40)}`;
const hash = `0x${"2".repeat(64)}`;
const calls = ["0x01", "0x02"].map((data) => ({ to: account, data, value: "0" }));
const invalid = (cause: unknown) =>
  new TransactionError({ code: "INVALID_BATCH_STATUS", message: "Missing chain ID", cause });

beforeEach(() => {
  vi.clearAllMocks();
  wallet.wallets = [{ address: account, walletClientType: "privy" }];
  wallet.sponsoredSend.mockResolvedValue({ hash });
  const entries = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  });
  wallet.capabilities.mockResolvedValue({ nativeCalls: true, atomicity: "supported" });
  wallet.send.mockResolvedValue({ mode: "batch", id: "batch-1" });
  wallet.status.mockResolvedValue({
    chainId: 11155111,
    status: "success",
    atomic: true,
    receipts: [{ transactionHash: hash }],
  });
  wallet.receipt.mockResolvedValue({ status: "success", transactionHash: hash });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("waits through Ambire's pending status and confirms its single receipt without resubmitting", async () => {
  vi.useFakeTimers();
  wallet.status
    .mockRejectedValueOnce(invalid({ status: "pending", atomic: false, receipts: [] }))
    .mockRejectedValueOnce(
      new TransactionError({
        code: "BATCH_STATUS_FAILED",
        message: "Not indexed yet",
        cause: null,
      }),
    )
    .mockRejectedValueOnce(
      invalid({
        status: "success",
        atomic: true,
        receipts: [{ chainId: "0xaa36a7", transactionHash: hash }],
      }),
    );
  const result = useGiftTransactions()("fund:ambire", account, 11155111, calls);
  await vi.advanceTimersByTimeAsync(4000);
  expect(await result).toEqual([hash]);
  expect(wallet.send).toHaveBeenCalledTimes(1);
  expect(wallet.status).toHaveBeenCalledTimes(3);
  expect(wallet.receipt).toHaveBeenCalledWith(expect.objectContaining({ hash, confirmations: 2 }));
});

it("submits both funding calls in one required atomic batch and confirms its transaction", async () => {
  const send = useGiftTransactions();
  expect(await send("fund:gift", account, 11155111, calls)).toEqual([hash]);
  expect(wallet.send).toHaveBeenCalledTimes(1);
  expect(wallet.send).toHaveBeenCalledWith(
    expect.objectContaining({ calls: expect.any(Array), mode: "batch", atomicity: "required" }),
  );
  expect(wallet.send.mock.calls[0]?.[0].calls).toHaveLength(2);
  expect(wallet.receipt).toHaveBeenCalledWith(expect.objectContaining({ hash, confirmations: 2 }));
});

it("resumes the submitted batch after a status failure without spending again", async () => {
  wallet.status.mockRejectedValueOnce(new Error("RPC unavailable"));
  const send = useGiftTransactions();
  await expect(send("fund:gift", account, 11155111, calls)).rejects.toThrow("RPC unavailable");
  expect(await send("fund:gift", account, 11155111, calls)).toEqual([hash]);
  expect(wallet.send).toHaveBeenCalledTimes(1);
});

it("does not fall back to separate transactions on unsupported wallets", async () => {
  wallet.capabilities.mockResolvedValue({ nativeCalls: false, atomicity: "unsupported" });
  await expect(useGiftTransactions()("fund:gift", account, 11155111, calls)).rejects.toThrow(
    "does not support atomic batches",
  );
  expect(wallet.send).not.toHaveBeenCalled();
});

it("sponsors a registration step with the explicit embedded wallet", async () => {
  expect(
    await useGiftTransactions()("claim:one:commit", account, 11155111, calls.slice(0, 1)),
  ).toEqual([hash]);
  expect(wallet.sponsoredSend).toHaveBeenCalledWith(
    { to: account, data: "0x01", value: "0x0", chainId: 11155111 },
    expect.objectContaining({ address: account, sponsor: true }),
  );
  expect(wallet.send).not.toHaveBeenCalled();
});

it("never falls back to receiver-paid transactions when sponsorship fails", async () => {
  wallet.sponsoredSend.mockRejectedValueOnce(new Error("Sponsorship unavailable"));
  const send = useGiftTransactions();
  await expect(send("claim:two", account, 11155111, calls.slice(0, 1))).rejects.toThrow(
    "Sponsorship unavailable",
  );
  await expect(send("claim:two", account, 11155111, calls.slice(0, 1))).rejects.toThrow(
    "Last error: Sponsorship unavailable",
  );
  expect(wallet.sponsoredSend).toHaveBeenCalledTimes(1);
  expect(wallet.send).not.toHaveBeenCalled();
});

it("rejects external wallets before requesting a registration step", async () => {
  wallet.wallets = [{ address: account, walletClientType: "metamask" }];
  await expect(
    useGiftTransactions()("claim:three", account, 11155111, calls.slice(0, 1)),
  ).rejects.toThrow("Memento wallet");
  expect(wallet.sponsoredSend).not.toHaveBeenCalled();
  expect(wallet.send).not.toHaveBeenCalled();
});

it("checks an already-submitted sponsored transaction without sending it again", async () => {
  wallet.receipt.mockRejectedValueOnce(new Error("RPC unavailable"));
  const send = useGiftTransactions();
  await expect(send("claim:four", account, 11155111, calls.slice(0, 1))).rejects.toThrow(
    "RPC unavailable",
  );
  expect(await send("claim:four", account, 11155111, calls.slice(0, 1))).toEqual([hash]);
  expect(wallet.sponsoredSend).toHaveBeenCalledTimes(1);
});

it("passes JSON-safe quantities to Privy without losing precision", async () => {
  wallet.sponsoredSend.mockImplementation(async (request) => {
    expect(() => JSON.stringify(request)).not.toThrow();
    expect(request.value).toBe("0x20000000000001");
    return { hash };
  });
  await useGiftTransactions()("claim:json", account, 11155111, [
    { to: account, data: "0x01", value: "9007199254740993" },
  ]);
});

it("refuses to split a receiver step into multiple transactions", async () => {
  await expect(useGiftTransactions()("claim:invalid", account, 11155111, calls)).rejects.toThrow(
    "one atomic transaction",
  );
  expect(wallet.sponsoredSend).not.toHaveBeenCalled();
});

it("allows a new sponsored request after a wrapped wallet rejection", async () => {
  wallet.sponsoredSend.mockRejectedValueOnce(
    new Error("Wallet rejected the request", { cause: { code: 4001 } }),
  );
  const send = useGiftTransactions();
  await expect(send("claim:rejected", account, 11155111, calls.slice(0, 1))).rejects.toThrow(
    "Wallet rejected",
  );
  expect(await send("claim:rejected", account, 11155111, calls.slice(0, 1))).toEqual([hash]);
  expect(wallet.sponsoredSend).toHaveBeenCalledTimes(2);
});

it("does not resubmit after a timeout or an unrecognized wallet failure", async () => {
  wallet.sponsoredSend.mockRejectedValueOnce(new Error("Request timed out"));
  const send = useGiftTransactions();
  await expect(send("claim:timeout", account, 11155111, calls.slice(0, 1))).rejects.toThrow(
    "Request timed out",
  );
  await expect(send("claim:timeout", account, 11155111, calls.slice(0, 1))).rejects.toThrow(
    "Last error: Request timed out",
  );
  expect(wallet.sponsoredSend).toHaveBeenCalledTimes(1);
});

it("allows a fresh claim request after Privy rejects its broadcast with an execution revert", async () => {
  wallet.sponsoredSend.mockRejectedValueOnce(
    Object.assign(
      new Error("Execution reverted for an unknown reason. Details: execution reverted"),
      {
        name: "PrivyApiError",
        status: 400,
        code: "transaction_broadcast_failure",
      },
    ),
  );
  const send = useGiftTransactions();
  await expect(send("claim:revert", account, 11155111, calls.slice(0, 1))).rejects.toThrow(
    "Execution reverted",
  );
  expect(await send("claim:revert", account, 11155111, calls.slice(0, 1))).toEqual([hash]);
  expect(wallet.sponsoredSend).toHaveBeenCalledTimes(2);
  expect(wallet.send).not.toHaveBeenCalled();
});

it("does not infer a safe retry from an unclassified error message in a new submission", async () => {
  wallet.sponsoredSend.mockRejectedValueOnce(
    new Error("Execution reverted for an unknown reason. Details: execution reverted"),
  );
  const send = useGiftTransactions();
  await expect(send("claim:unknown", account, 11155111, calls.slice(0, 1))).rejects.toThrow(
    "Execution reverted",
  );
  await expect(send("claim:unknown", account, 11155111, calls.slice(0, 1))).rejects.toThrow(
    "No new request has been sent",
  );
  expect(wallet.sponsoredSend).toHaveBeenCalledTimes(1);
});
