# Backend boundaries

`protocol` owns schemas and errors. `api` owns HttpApi declarations. `database` owns persistence. `privy` and `world-id` own provider services. `application` composes workflows. `apps/server` supplies live dependencies, implements routes, and runs one durable worker pool alongside HTTP in the same Node process.

Both apps consume source exports under `memento-source` during development; production runs built ESM. `#/*` imports remain package-local. No frontend is implemented in this phase.

ENSv2 integration targets ensdomains/contracts-v2 branch `post-audit-2`, pinned source revision `6cd019f567c8eb0ca306c78851d4d58876a8e1df`. Temporary HCA actions are confined to the server adapter. Deployed bytecode and configuration require separate live verification.
