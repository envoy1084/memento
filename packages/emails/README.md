# @memento/emails

Memento’s React Email invitation, rendering, and Effect delivery layers. The existing application worker owns encrypted jobs and retry scheduling; this package owns presentation and provider delivery.

- `EmailService.layer`: production Resend delivery. Requires `RESEND_API_KEY` and `EMAIL_FROM`. Sends the React component and generated plain text with the job’s idempotency key; requests time out after ten seconds.
- `EmailService.devLayer`: renders the same template and logs HTML/plain text to the local console. No credentials or outgoing email. These logs contain private claim links.
- `EmailService.testLayer`: captures messages in `TestEmails.sent` without rendering or contacting Resend.
- `GiftInvitation` from `@memento/emails/templates`: reusable React component with recipient/sender names, note, claim URL, and expiry in Unix seconds. Optional fields allow older queued messages to render.

## Preview

Run `pnpm --filter @memento/emails preview`, then open http://localhost:3002. React Email shows `gift-invitation` with fictional `PreviewProps`, desktop/mobile previews, and the rendered HTML/plain text. Edit `src/templates/gift-invitation.tsx` to see changes live. No database or provider credentials are needed.

The template uses Memento’s paper/lavender colors, DM Sans and Manrope, with Arial fallbacks in clients that block web fonts. Its table-based layout needs no remote images to display the gift or call to action.

Run `pnpm --filter @memento/emails typecheck`, `test`, or `build`. The server selects the layer based on `NODE_ENV`; production never falls back to console delivery.
