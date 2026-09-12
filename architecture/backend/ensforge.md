# ENSForge registration flow

Individual new-name gifts use `MementoRegistration` on Sepolia. ENSForge 0.4.0 prepares the
commitment, predicts the resolver, quotes registration and reads the registrar's commitment status.
The recipient needs no ETH or USDC. Privy sponsors both receiver transactions.

1. A verified recipient chooses a name. The backend binds the normalized name, recipient,
   resolver, duration, nonce and deadline, and encrypts the registration secret.
2. The browser submits the ENSForge-prepared registrar commitment through `useGiftTransactions`
   with Privy sponsorship. It then signs the fixed Memento intent using ERC-1271-compatible signing;
   the backend verifies consent and the recipient's email and signs its attestation.
3. The UI polls setup while showing the registrar's real `readyAt` countdown. After the minimum
   commitment age, it automatically submits one sponsored `registerGift` call.
4. That call atomically authorizes the claim, deploys a recipient-controlled resolver with their
   forward address, approves the exact registrar quote, registers directly to the recipient,
   verifies ownership and resolver, clears the allowance and refunds unused USDC to the sender.
5. The worker verifies the final ownership, resolver implementation, permissions and address
   before recording completion. It does not submit registration transactions.

No HCA deployment, session enablement, separate fund release or completion transaction is needed.
Profile editing is outside this product.

The two transactions cannot be atomic across the ENS waiting period. The first spends only
sponsored gas; all registration spending happens atomically in the second. An unavailable name,
expired intent, increased price above the gift budget or failed registration cannot partially spend
the escrow. Cancellation/refund rules of the sponsorship base still apply.

The recipient keeps the page open for automatic continuation. Known transaction hashes are reused
for receipt checks after interruptions; unknown submission outcomes are not blindly replayed.
Sender funding remains one required atomic ENSForge approval/deposit batch. Automatic development
email delivery logs the invitation to the server console.

Tests cover registration delay, ownership/resolver redirection, fixed duration, price ceilings,
rollback of resolver deployment and payment, leftover refunds, replay rejection, sponsored transport,
no paid fallback, and backend waiting/final-call construction. Actual Privy sponsorship latency still
requires a live claim using the recipient's account.
