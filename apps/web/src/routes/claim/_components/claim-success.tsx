import { useState } from "react";

import { usePrimaryName } from "@ensforge/react";
import { Button, Spinner } from "@thenamespace/uikit";

import { Note } from "#/components/common/page";
import { ensforge } from "#/config/ensforge";
import { JourneyError, journeyError } from "#/hooks/use-api-task";
import { useAuth } from "#/hooks/use-auth";
import { useGiftTransactions } from "#/hooks/use-gift-transactions";

import { ClaimCelebration } from "./claim-celebration";

export function ClaimSuccess({ name }: { name: string }) {
  const { address } = useAuth();
  const primary = usePrimaryName({ address: address ?? "", enabled: Boolean(address) });
  const send = useGiftTransactions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const isPrimary = primary.data?.name === name;

  const setPrimary = async () => {
    if (!address || busy || isPrimary) return;
    setBusy(true);
    setError(undefined);
    try {
      const calls = await ensforge.batch.prepareCalls({
        calls: [ensforge.reverse.setPrimaryName.call({ name })],
        account: address as `0x${string}`,
      });
      if (calls.length !== 1 || !calls[0]) {
        throw new JourneyError({
          message: "Could not prepare your primary name. Please try again.",
        });
      }
      await send(
        `claim:primary:${name}`,
        address,
        calls[0].chainId,
        calls.map((call) => ({
          to: call.to,
          data: call.data ?? "0x",
          value: call.value.toString(),
        })),
      );
      await primary.refresh();
    } catch (cause) {
      setError(journeyError(cause).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ClaimCelebration />
      <Button
        isDisabled={!address || busy || isPrimary || primary.isInitial || primary.isWaiting}
        onPress={() => {
          if (primary.isFailure) {
            void primary.refresh().catch((cause: unknown) => setError(journeyError(cause).message));
          } else {
            void setPrimary();
          }
        }}
      >
        {busy || primary.isInitial || primary.isWaiting ? (
          <Spinner size="sm" color="current" />
        ) : null}
        {busy
          ? "Setting primary name…"
          : isPrimary
            ? "Primary name"
            : primary.isFailure
              ? "Retry name check"
              : "Set as primary name"}
      </Button>
      {error ? <Note status="warning">{error}</Note> : null}
    </>
  );
}
