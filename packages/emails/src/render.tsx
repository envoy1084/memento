import { Effect } from "effect";

import { type GiftEmail, ProviderError } from "@memento/protocol";
import { render, toPlainText } from "react-email";

import { GiftInvitation } from "./templates/gift-invitation.js";

export const renderGiftEmail = Effect.fn("Emails.renderGift")(function* (input: GiftEmail) {
  const react = <GiftInvitation {...input} />;
  const html = yield* Effect.tryPromise({
    try: () => render(react),
    catch: () =>
      new ProviderError({
        provider: "email",
        retryable: false,
        message: "Could not render gift email",
      }),
  });
  return {
    react,
    html,
    text: toPlainText(html),
    subject: `${input.senderName || "Someone special"} sent you a gift on Memento`,
  };
});
