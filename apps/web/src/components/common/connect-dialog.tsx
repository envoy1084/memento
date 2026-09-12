import { lazy, Suspense, useState } from "react";

import { Button, Modal, Separator } from "@thenamespace/uikit";

import { Icon } from "#/components/common/icon";
import { CopyButton, Note } from "#/components/common/page";
import { WalletAvatar } from "#/components/common/wallet-avatar";
import { ShellMark } from "#/components/display/brand";
import { truncateAddress } from "#/format/address";
import { useAuth } from "#/hooks/use-auth";

const WalletIdentity = lazy(() => import("#/components/common/wallet-identity"));

export function ConnectDialog() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const label = auth.address
    ? truncateAddress(auth.address)
    : auth.authenticated
      ? "Your account"
      : "Get started";

  const login = (method: "email" | "wallet") => {
    setOpen(false);
    auth.login(method);
  };

  return (
    <Modal isOpen={open} onOpenChange={setOpen}>
      <Button variant={auth.authenticated ? "secondary" : "primary"} size="sm">
        {auth.address ? (
          <Suspense
            fallback={
              <>
                <WalletAvatar />
                {label}
              </>
            }
          >
            <WalletIdentity key={auth.address} address={auth.address} />
          </Suspense>
        ) : (
          <>
            {auth.authenticated ? <WalletAvatar /> : null}
            {label}
          </>
        )}
        {auth.authenticated ? null : <Icon name="arrow" size={16} />}
      </Button>
      <Modal.Backdrop variant="blur">
        <Modal.Container size="sm">
          <Modal.Dialog className="rounded-[26px] p-7">
            <Modal.CloseTrigger />
            <Modal.Header className="items-center text-center">
              <Modal.Icon className="mx-auto bg-lavender-50">
                <ShellMark tone="lavender" size={22} />
              </Modal.Icon>
              <Modal.Heading>
                {auth.authenticated ? "Your Memento account" : "Welcome to Memento"}
              </Modal.Heading>
              {!auth.authenticated ? (
                <p className="text-sm text-ink-soft">
                  Your next chapter starts with a name. Sign in to give or claim one.
                </p>
              ) : null}
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-5">
                {auth.error ? (
                  <div role="alert">
                    <Note status="warning">{auth.error}</Note>
                  </div>
                ) : null}
                {auth.authenticated ? (
                  <>
                    {auth.verifying ? (
                      <p role="status" className="text-sm text-ink-soft">
                        Verifying your account…
                      </p>
                    ) : null}
                    {auth.actor ? (
                      <>
                        <p className="break-all text-center text-sm text-ink-soft">
                          {auth.actor.emails[0] ?? "Signed in with your wallet"}
                        </p>
                        {auth.address ? (
                          <CopyButton value={auth.address} label={label} fullWidth />
                        ) : null}
                      </>
                    ) : null}
                    {auth.actor && !auth.address ? (
                      <Button
                        fullWidth
                        onPress={() => {
                          setOpen(false);
                          auth.reconnect();
                        }}
                      >
                        Reconnect wallet
                      </Button>
                    ) : null}
                    {auth.error ? (
                      <Button variant="secondary" fullWidth onPress={auth.retry}>
                        Retry verification
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      fullWidth
                      onPress={() => {
                        void auth.logout();
                      }}
                    >
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      fullWidth
                      isDisabled={!auth.configured || !auth.ready}
                      onPress={() => login("email")}
                    >
                      Continue with email <Icon name="arrow" size={17} />
                    </Button>
                    <div className="flex items-center gap-4 text-[11px] text-ink-faint">
                      <Separator className="flex-1" />
                      or
                      <Separator className="flex-1" />
                    </div>
                    <Button
                      variant="secondary"
                      fullWidth
                      isDisabled={!auth.configured || !auth.ready}
                      onPress={() => login("wallet")}
                    >
                      <Icon name="wallet" size={18} />
                      Use a wallet
                    </Button>
                  </>
                )}
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
