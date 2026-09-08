import { useState } from "react";

import { Button, Form, Modal, Separator, toast } from "@thenamespace/uikit";

import { ShellMark } from "#/components/brand";
import { Field } from "#/components/fields";
import { Icon } from "#/components/icon";
import { Note } from "#/components/page";
import { useDemo } from "#/hooks/use-demo";

export function ConnectDialog() {
  const [state, setState] = useDemo();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const connect = () => {
    setState((current) => ({ ...current, connected: true }));
    setOpen(false);
    toast.success("You’re exploring as alice.eth");
  };

  return (
    <Modal isOpen={open} onOpenChange={setOpen}>
      <Button variant={state.connected ? "secondary" : "primary"} size="sm">
        {state.connected ? (
          <span className="size-4 rounded-full bg-linear-135 from-lavender-300 to-blush-200" />
        ) : null}
        {state.connected ? "alice.eth" : "Get started"}
        {state.connected ? null : <Icon name="arrow" size={16} />}
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
                {state.connected ? "You’re signed in" : "A good place to begin"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {state.connected ? (
                <div className="space-y-5">
                  <p className="text-sm text-ink-soft">
                    You’re exploring as Alice. Your gifts, campaigns and claimed names are saved in
                    this browser only.
                  </p>
                  <Button
                    variant="secondary"
                    fullWidth
                    onPress={() => {
                      setState((current) => ({ ...current, connected: false }));
                      setOpen(false);
                    }}
                  >
                    Sign out of the preview
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <p className="text-sm text-ink-soft">
                    An email is all you need. Already onchain? Bring the wallet you have.
                  </p>
                  <Form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      connect();
                    }}
                  >
                    <Field
                      label="Email address"
                      type="email"
                      required
                      value={email}
                      onChange={setEmail}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                    <Button type="submit" fullWidth>
                      Continue with email
                      <Icon name="arrow" size={17} />
                    </Button>
                  </Form>
                  <div className="flex items-center gap-4 text-[11px] text-ink-faint">
                    <Separator className="flex-1" />
                    or
                    <Separator className="flex-1" />
                  </div>
                  <Button variant="secondary" fullWidth onPress={connect}>
                    <Icon name="wallet" size={18} />
                    Use a wallet
                  </Button>
                  <Note>No email is sent and no wallet is connected in this preview.</Note>
                </div>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
