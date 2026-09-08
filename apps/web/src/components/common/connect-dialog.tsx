import { useState } from "react";

import { Button, Modal, Separator } from "@thenamespace/uikit";

import { Icon } from "#/components/common/icon";
import { CopyButton, Note } from "#/components/common/page";
import { ShellMark } from "#/components/display/brand";
import { useAuth } from "#/hooks/use-auth";

export function ConnectDialog() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const label = auth.address
    ? `${auth.address.slice(0, 6)}…${auth.address.slice(-4)}`
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
        {auth.authenticated ? (
          <span className="size-4 rounded-full bg-linear-135 from-lavender-300 to-blush-200" />
        ) : null}
        {label}
        {auth.authenticated ? null : <Icon name="arrow" size={16} />}
      </Button>
      <Modal.Backdrop variant="blur">
        <Modal.Container size="sm">
          <Modal.Dialog className="rounded-[26px] p-7">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-lavender-50">
                <ShellMark tone="lavender" size={22} />
              </Modal.Icon>
              <Modal.Heading>
                {auth.authenticated ? "Your Memento account" : "A good place to begin"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-5">
                {!auth.configured ? (
                  <Note status="warning">
                    Sign-in is not available yet. Please check back soon.
                  </Note>
                ) : null}
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
                        <p className="break-all text-sm text-ink-soft">
                          {auth.actor.emails[0] ?? "Signed in with your wallet"}
                        </p>
                        {auth.address ? (
                          <CopyButton value={auth.address} label={label} />
                        ) : (
                          <Note>
                            Your account is signed in. Your wallet is not connected yet; reconnect
                            your wallet to continue.
                          </Note>
                        )}
                        <Note>
                          Your connection is real. Gifts and registrations are still previews.
                        </Note>
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
                    <p className="text-sm text-ink-soft">
                      An email is all you need. Already onchain? Bring the wallet you have.
                    </p>
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
                    <Note>
                      Privy securely verifies your email or wallet. Signing in won’t send a
                      transaction.
                    </Note>
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
