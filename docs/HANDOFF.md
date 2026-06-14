# Handoff Notes

Date: 2026-06-13

Project: ERP 4PL Logistics App

## Summary

The app has been moved from mostly independent dashboard screens toward a connected 4PL customer-to-cash workflow. The current implementation is still frontend-local, but the repository/domain layer is now structured so future backend APIs can replace localStorage state without rewriting every component.

The strongest connected flow now runs:

```text
Customer / onboarding
-> Partner rate setup
-> Freight & Customs
-> WMS ASN receiving
-> Inspection / variance / put-away
-> Inventory recording
-> Inventory dispatch request
-> TMS Dispatch
-> Live Tracking
-> POD Management
-> Finance Billing Queue
-> AR Invoice
-> Payment / Reconciliation
```

## What Was Implemented

### Customer And Rate Setup

- Added a Customer Master workflow section.
- Customer records can be created and are visible to downstream rate-card setup.
- Partner Rate Card supports adding rate items and keeps actions visible without forcing the user to horizontally scroll for basic edits.
- Removed the separate "Business Backbone" nav concept and integrated workflow modules into the existing business sections.

### Freight And Customs

- Added Freight & Customs workflow view.
- Freight documents can be submitted.
- Customs release gates the related ASN receiving flow.
- ASN records synchronize from freight release state.

### WMS Receiving And Put-away

- Added WMS workflow view for ASN Receiving & Put-away.
- Receiving workflow now supports:
  - Start receiving
  - Verify received quantity
  - Select condition
  - Create variance/discrepancy state
  - Resolve variance
  - Record WMS inventory location
- Inventory recording creates WMS service events and sends handling charges into Finance billing queue.

### Inventory To TMS

- Inventory view now merges recorded WMS inventory with existing inventory records.
- Inventory can request dispatch for available stock.
- Inventory dispatch requests create deterministic TMS dispatch IDs through `workflowRepository.requestInventoryDispatch`.

### TMS Dispatch To Live Tracking To POD To Finance

- TMS Dispatch supports assign carrier, start transit, move to POD, close with POD, and flag exception.
- Live Tracking now reads workflow dispatch records instead of only local static screen data.
- Live Tracking can start transit for assigned dispatches and move in-transit dispatches to POD pending.
- Moving to POD creates or updates a blocked Finance transport billing item.
- POD Management now reads POD-pending/closed workflow dispatches.
- Confirming POD closes the dispatch and releases the Finance billing queue item to `Ready`.

Verified browser flow:

```text
Dispatch: DSP-INV-ASN-2026-07-04-RW0D
TMS Dispatch: Start Transit -> In Transit
Live Tracking: Move to POD -> POD Pending
POD Management: Confirm -> Confirmed
Finance Hub: BQ-INV-ASN-2026-07-04-RW0D -> Ready
```

### Finance

- Added Finance Hub workflow view.
- Billing queue supports handling and transport source types.
- Billing item statuses include ready, needs approval, approved, invoiced, and blocked.
- Finance Hub `Invoice` now creates/updates an order-to-cash AR invoice, invoice PDF document record, AR collection record, and QuickBooks sync staging record.
- Accounting Sync rows in Finance Hub now support mark failed, retry/ready-to-sync, mark synced, and manual QuickBooks reference entry.
- Accounting Sync status/reference/error state is pushed back into the order-to-cash integration record and invoice timeline.
- AR Invoices subscribes to the order-to-cash backbone and can mark invoices issued, paid, or overdue.
- AR invoice detail now shows the invoice's accounting sync status, reference, last sync time, and any sync error.
- Marking AR as paid creates a payment record and updates invoice collection/reconciliation state.
- Reconciliation now refreshes from order-to-cash invoice/payment/bank deposit state, so paid and partially paid invoices show matched or partial cash status.
- Reconciliation actions now call the order-to-cash repository:
  - Match creates/updates a bank deposit and payment.
  - Partial records deposited cash and leaves open AR.
  - Write-off closes the remaining AR balance with an audit timeline note.
  - Dispute flags the invoice and AR collection as exception.
- Finance overview cash KPIs now calculate collected cash from deposited/payment-backed reconciliation rows and show unmatched/partial and disputed cash indicators.

Verified finance-to-cash browser flow:

```text
Finance Hub: BQ-INV-ASN-2026-07-04-RW0D -> Invoice
Billing Queue: Invoiced
Accounting Sync: SYNC-INV-ASN-2026-07-04-RW0D -> Ready to Sync
Accounting Sync: Fail -> Retry -> QB Ref -> Synced
Reconciliation: Bank Deposit -> Match / Partial / Write-off / Dispute
Finance Overview: Collected / Unmatched-Partial / Disputed KPIs refresh from repository state
```

### Bilingual UI

- Added or improved English/Chinese toggle behavior.
- New workflow screens use explicit `pick(language, zh, en)` labels.
- Runtime sanitizer reduces mixed Chinese/English leftovers in English mode.

## Key State Model

The current app uses frontend repositories with localStorage persistence:

- `workflowRepository.ts` owns operational workflow data:
  - freight files
  - ASNs
  - returns
  - service events
  - dispatches
  - billing queue
  - accounting sync
  - audit trail
- `orderToCashRepository.ts` owns the customer-to-cash backbone.
- Adapter/projection files translate workflow and order-to-cash records into UI-ready views.

This makes the app backend-ready at the boundary: replace repository storage methods with API calls later while keeping most component actions intact.

## Important Files

- `src/app/repositories/workflowRepository.ts`
- `src/app/repositories/orderToCashRepository.ts`
- `src/app/repositories/orderToCashAdapters.ts`
- `src/app/domain/workflowReadiness.ts`
- `src/app/domain/orderToCashModels.ts`
- `src/app/components/CustomerMasterView.tsx`
- `src/app/components/FreightCustomsView.tsx`
- `src/app/components/WmsWorkflowView.tsx`
- `src/app/components/InventoryView.tsx`
- `src/app/components/TmsDispatchView.tsx`
- `src/app/components/LiveTracking.tsx`
- `src/app/components/PODManagement.tsx`
- `src/app/components/FinanceHubWorkflowView.tsx`

## Known Gaps

### Finance To Cash Remaining Work

Completed in this pass:

```text
QuickBooks/accounting sync row
-> sync failure handling
-> retry/ready-to-sync state
-> manual QuickBooks reference
-> invoice detail visibility
```

Completed in this pass:

```text
Bank deposit matching
-> partial payment handling
-> AR write-off
-> AR dispute
-> cash KPI reporting
```

The invoice issue, accounting sync actions, AR payment, bank deposit matching, partial payment, write-off, dispute, and basic cash KPI handoff are now wired.

Current gap:

```text
Bank statement import
-> automatic match suggestion
-> AP/Transfer workflow-backed rows
-> cash dashboard drilldown
```

### Backend And Auth Not Implemented

- No real database yet.
- No user accounts, roles, permissions, or authentication.
- No API layer.
- No server-side validation.
- No audit persistence beyond browser localStorage.

### Data Quality

- Seed/mock data still includes historical 2025/2026 records.
- Some demo records exist only to illustrate operational states.
- Before production, all mock data should move into database seed scripts or be replaced by real integrations.

### External Integrations

The following are modeled but not truly integrated:

- LingXing WMS
- Yicang / e-label
- QuickBooks Online
- carrier/driver tracking
- customer portal / WeChat intake

## Next Recommended Implementation

Implement statement import and remaining finance backing data:

1. Add bank statement import/mock upload rows with source filename, bank account, statement date, and transaction reference.
2. Auto-suggest invoice matches by customer/reference/amount/date.
3. Replace static AP/Transfer rows with workflow/order-to-cash-backed rows.
4. Add cash dashboard drilldowns from KPI cards to underlying invoice/deposit rows.
5. Add backend-ready audit fields for imported bank statement source references.

Acceptance test for next gap:

```text
Bank statement row is imported
-> suggested invoice match is shown
-> finance accepts or rejects match
-> reconciliation row updates matched/partial/exception state
-> dashboard KPI drills into the exact deposit/payment rows
```

## Verification Run

Latest verification performed:

```bash
npm run build
```

Result: passed.

Browser verification was also performed on `http://127.0.0.1:5173/` for the dispatch-to-finance handoff described above.

## Notes For Future Developer

- Do not bypass repositories from components. Add workflow behavior in repository methods first, then call those methods from UI actions.
- Keep new UI labels bilingual with `pick(language, zh, en)`.
- Prefer deterministic IDs for workflow-generated records so repeated clicks refresh existing rows instead of creating duplicates.
- Preserve user/browser localStorage while testing unless intentionally resetting demo data.
- The git working tree contains many related workflow changes from the broader implementation stream; avoid reverting unrelated files.
