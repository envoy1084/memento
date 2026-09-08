import { Button } from "@thenamespace/uikit";

import { ConnectDialog } from "#/components/common/connect-dialog";
import { Note } from "#/components/common/page";
import { useAuth } from "#/hooks/use-auth";

export function ClaimWallet({
  onContinue,
  onBack,
}: {
  onContinue: () => void;
  onBack: () => void;
}) {
  const auth = useAuth();

  return (
    <div className="space-y-5">
      <ConnectDialog />
      {auth.address ? <p className="break-all font-mono text-sm">{auth.address}</p> : null}
      <Note>
        This connects your real account. The remaining claim steps are still a preview and won’t
        register a name.
      </Note>
      {auth.verifying ? <p role="status">Verifying your account…</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          isDisabled={!auth.actor || !auth.address || auth.verifying}
          onPress={onContinue}
        >
          Continue
        </Button>
        <Button variant="ghost" onPress={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
