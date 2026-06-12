# Privacy Review

This prototype contains realistic logistics, finance, driver, invoice, container, and customer identifiers for a Brampton/FBA workflow.

Before publishing outside a private workspace:

- Confirm whether container IDs, customer codes, invoice numbers, driver initials, route names, addresses, phone numbers, emails, and amounts are safe to share.
- Replace real operational data with anonymized fixtures or load it from a protected backend.
- Keep uploaded POD files and imported PDFs out of public repositories unless they are explicitly cleared.
- Treat `src/app/data/transportOrders.ts` as the current seed-data boundary for future API integration.
