# Contracts

Deploy only `MementoRegistration`. Its abstract `MementoSponsorship` base owns deposits and refunds; `ClaimAuthorization` owns recipient signatures, coordinator email attestations, nonces and administrator rotation. The bases are required implementation code, not separate deployments.

A sender deposits a bounded USDC budget for a hashed invitation and email identity. The recipient commits an ENS name, waits for the registrar delay, then calls `registerGift`. That final transaction authorizes the recipient, creates their resolver, pays the registrar within the gift budget, registers directly to their wallet, verifies ownership, clears allowance and refunds unused funds. Any failure rolls back the entire registration transaction. The commitment transaction is separate because ENS requires a wait.

The coordinator attests to the verified email identity. It cannot change the signed recipient, name or resolver. The sponsor can cancel an unclaimed gift; after expiry anyone can trigger a refund to the original sponsor.

The shared public manifest is `packages/chain/src/deployments/sepolia.json`. ENS dependencies come from ENSForge’s Sepolia v2 deployment. `sponsorship` is `0x4Ec8b826F3664cc9874cF4Af32337CC2650F6b31`. After the operator deployed it, read-only Sepolia checks confirmed bytecode, ENS dependencies, payment token, admin and coordinator against the current configuration. Etherscan reports the `MementoRegistration` source as an exact verified match. Startup validates bytecode and configured bindings. Do not use the previous escrow address with this ABI.

Foundry tests cover delayed registration, recipient/resolver redirection, price ceilings, rollback, replay and refunds using local provider doubles. Live ENS compatibility and Privy sponsorship require a fresh end-to-end test. Generate TypeScript ABIs with `pnpm --filter @memento/chain generate` after Solidity changes.
