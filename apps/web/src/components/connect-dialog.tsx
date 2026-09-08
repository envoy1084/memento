import { useState } from "react";

import { Button, Form, Modal, toast } from "@thenamespace/uikit";

import { Field } from "#/components/fields";
import { Icon } from "#/components/icon";
import { useDemo } from "#/hooks/use-demo";
export function ConnectDialog() {
  const [state, setState] = useDemo();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const connect = () => {
    setState((current) => ({ ...current, connected: true }));
    setOpen(false);
    toast.success("Welcome to your Memento preview");
  };
  return (
    <Modal isOpen={open} onOpenChange={setOpen}>
      <Button variant={state.connected ? "secondary" : "primary"} size="sm">
        <span
          className={
            state.connected ? "size-4 rounded-full bg-linear-135 from-[#d0b3ee] to-[#f4d9e2]" : ""
          }
        />
        {state.connected ? "alice.eth" : "Get started"}
        {state.connected ? null : <Icon name="arrow" size={16} />}
      </Button>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="max-w-[420px] rounded-[28px] p-7">
            <Modal.CloseTrigger />
            <Modal.Header>
              <span className="inline-flex h-[35px] w-[31px] items-center justify-center rounded-[10px_10px_13px_13px] border border-[#c6b4e5] bg-[#ece2f9] font-serif text-[29px] font-medium leading-none text-[#765d9e] italic shadow-[inset_0_1px_1px_#fff,0_2px_1px_#d4c4e8] mb-4">
                m
              </span>
              <Modal.Heading>
                {state.connected ? "Your little corner" : "A good place to begin."}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {state.connected ? (
                <>
                  <p>You’re exploring as Alice in this local preview.</p>
                  <Button
                    variant="secondary"
                    fullWidth
                    onPress={() => {
                      setState((current) => ({ ...current, connected: false }));
                      setOpen(false);
                    }}
                  >
                    Disconnect preview
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted mb-6">
                    An email is all you need. Already onchain? Bring your wallet.
                  </p>
                  <Form
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
                    />
                    <Button type="submit" fullWidth className="mt-3">
                      Continue with email
                      <Icon name="arrow" />
                    </Button>
                  </Form>
                  <div className="my-5 flex items-center gap-4 text-[11px] text-muted before:h-px before:flex-1 before:bg-separator after:h-px after:flex-1 after:bg-separator">
                    or
                  </div>
                  <Button variant="secondary" fullWidth onPress={connect}>
                    <Icon name="wallet" />
                    Use a wallet
                  </Button>
                  <p className="text-[11px] leading-relaxed text-muted mt-5">
                    Interactive preview. No email is sent and no wallet is connected.
                  </p>
                </>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
