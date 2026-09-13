import { Button } from "@thenamespace/uikit";

import { Note } from "#/components/common/page";
import { ShellMark } from "#/components/display/brand";
import { useAuth } from "#/hooks/use-auth";

export function AccountRequired() {
  const auth = useAuth();
  return (
    <div className="rounded-lg border border-rule bg-lavender-50/50 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white"
        >
          <ShellMark size={23} />
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <p className="m-0 text-sm font-medium">
            {auth.verifying
              ? "Verifying your account…"
              : !auth.authenticated
                ? "Sign in to continue"
                : "Connect your wallet"}
          </p>
          <p className="mt-1 mb-0 text-xs leading-relaxed text-ink-soft">
            Continue securely with your account and wallet.
          </p>
        </div>
        <Button
          size="md"
          isDisabled={!auth.ready || auth.verifying}
          onPress={() => {
            if (!auth.authenticated) auth.login("email");
            else if (auth.actor) auth.reconnect();
            else auth.retry();
          }}
        >
          {!auth.authenticated ? "Sign in" : auth.actor ? "Connect wallet" : "Retry verification"}
        </Button>
      </div>
      {auth.error ? (
        <div className="mt-3">
          <Note status="warning">{auth.error}</Note>
        </div>
      ) : null}
    </div>
  );
}
