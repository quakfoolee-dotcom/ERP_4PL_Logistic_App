# Changelog

## 2026-06-25

### Added

- Added bank statement metadata to the order-to-cash bank deposit model, including source filename, statement date, suggested invoice, confidence, and rejected suggestions.
- Added repository actions to import sample statement rows, accept suggested matches into payment/deposit/reconciliation state, and reject suggestions for manual finance review.
- Added a Reconciliation bank statement workbench with import, accept, and reject actions.
- Added bank statement rows to the finance projection so imported cash data can be surfaced consistently across finance screens.

### Changed

- AP Payables and Transfer Summary now refresh from the live finance projection instead of staying pinned to initial page-load rows.
- AP and transfer KPI cards now calculate totals from visible finance rows rather than fixed demo values.

### Verified

- `npm run build` passed.

### Remaining

- Replace sample statement import with real CSV/bank-feed upload parsing.
- Persist statement imports, AP state, and transfer settlement updates through a backend API/database.
- Add role-based permissions and server-side audit logging before production use.
