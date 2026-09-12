# Memento architecture

Memento has one product: fund a new ENS name for an email recipient.

- [Frontend](frontend/README.md): sender and recipient journeys.
- [Backend](backend/README.md): API, provider boundaries and workers.
- [Registration](backend/ensforge.md): sponsored claim sequence.
- [Database](database/README.md): fresh schema, transactions and jobs.
- [Contracts](contracts/README.md): escrow and atomic registration.
- [Deployment](deployment/README.md): configuration and manual deployment.
- [Testing](engineering/testing.md): verification boundaries.

Local tests do not prove live provider configuration. A fresh deployment and an end-to-end sponsored claim remain required before the demo.
