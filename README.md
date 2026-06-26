# ERP 4PL Logistics App

Bilingual 4PL / FBA logistics control tower for customer-to-cash operations. The app is a Vite + React prototype that now models connected workflows across customer onboarding, rate cards, freight/customs, WMS receiving, inventory, TMS dispatch, live tracking, POD, and finance billing.

Original Figma source: https://www.figma.com/design/SU7zzOyLCZkqbzSXkqW4JQ/Bilingual-Logistics-Control-Tower

## Run The App

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Open the app at the Vite URL, normally:

```text
http://127.0.0.1:5173/
```

Build verification:

```bash
npm run build
```

The browser entry point is `index.html`; the React app entry is under `src/main.tsx` / `src/app/App.tsx`.

## Current Workflow Coverage

The main customer-to-cash flow is now partially connected end to end:

1. Customer Master creates a lead/customer profile and onboarding status.
2. Partner Quote Cards can use customer information for rate setup.
3. Freight & Customs creates shipment/customs release records.
4. WMS Workflows gates ASN receiving until customs release.
5. WMS receiving supports receive, inspect/verify quantity and condition, resolve variance, put-away, and inventory recording.
6. Inventory can request dispatch from recorded WMS stock.
7. TMS Dispatch assigns carrier, starts transit, moves dispatch to POD, or flags exception.
8. Live Tracking reads workflow dispatch records and can advance in-transit dispatches to POD pending.
9. POD Management reads POD-pending dispatches and confirms POD against the same dispatch record.
10. Finance Hub receives handling and transport billing queue items, including blocked POD items and ready-to-invoice items.
11. Finance Hub can issue a billing queue item into an AR invoice and QuickBooks sync staging row.
12. Finance Hub can mark accounting sync rows as failed, retried/ready, synced, and can store an external QuickBooks reference.
13. AR Invoices can mark payment received, show the invoice's accounting sync status/reference, and update payment/reconciliation state.
14. Reconciliation can match bank deposits, record partial payments, write off remaining AR balances, and flag disputes against the order-to-cash invoice record.
15. Reconciliation can import sample bank statement rows, suggest invoice matches, accept matches into payment/deposit state, or reject suggestions for manual review.
16. AP Payables and Transfer Summary now refresh from the live finance projection and calculate KPI totals from table rows instead of fixed card values.

Latest verified handoff:

```text
Inventory dispatch DSP-INV-ASN-2026-07-04-RW0D
TMS Start Transit -> Live Tracking In Transit
Live Tracking Move to POD -> POD Management Pending
POD Confirm -> Finance Hub billing queue Ready
Finance queue item: BQ-INV-ASN-2026-07-04-RW0D
Finance Invoice -> AR invoice INV-ASN-2026-07-04-RW0D
Accounting Sync -> Fail / Retry / QB Ref / Synced
Bank Deposit -> Match / Partial / Write-off / Dispute
Reconciliation -> Matched / Partial / Disputed
Bank Statement Import -> Suggested Invoice Match -> Accept / Reject -> Reconciliation Refresh
```

## Key Files

- `src/app/App.tsx` - route/page shell, global actions, language state.
- `src/app/components/Sidebar.tsx` - module navigation.
- `src/app/components/CustomerMasterView.tsx` - customer onboarding.
- `src/app/components/PartnerQuotes.tsx` - partner/customer rate card management.
- `src/app/components/FreightCustomsView.tsx` - freight/customs workflow.
- `src/app/components/WmsWorkflowView.tsx` - ASN receiving, inspection, variance, put-away.
- `src/app/components/InventoryView.tsx` - inventory records and dispatch request action.
- `src/app/components/TmsDispatchView.tsx` - dispatch lifecycle.
- `src/app/components/LiveTracking.tsx` - workflow-backed live dispatch tracking.
- `src/app/components/PODManagement.tsx` - workflow-backed POD confirmation.
- `src/app/components/FinanceHubWorkflowView.tsx` - workflow billing queue and accounting sync.
- `src/app/repositories/workflowRepository.ts` - operational workflow state and handoff logic.
- `src/app/repositories/orderToCashRepository.ts` - customer-to-cash backbone state.
- `src/app/domain/workflowReadiness.ts` - WMS/TMS/finance workflow models and seed records.
- `src/app/domain/orderToCashModels.ts` - customer-to-cash domain model.

## State And Data

This is still frontend-local. Workflow state is stored in browser `localStorage`, not a backend database.

Important localStorage keys:

- `erp4pl.workflowReadiness.v3`
- Order-to-cash repository storage key is managed in `orderToCashRepository.ts`

Mock/seed data is intentionally used for demo continuity. Database-backed replacement should start at the repository layer, keeping components pointed at repository APIs instead of direct mock imports.

## Language

The app supports English and Chinese. New workflow screens use `pick(language, zh, en)` for labels, and `installLanguageDomSanitizer` helps remove mixed-language leftovers at runtime. Any new text should be added through the same language pattern.

## Handoff Notes

Detailed implementation notes, verified workflow steps, known gaps, and next work are in:

```text
docs/HANDOFF.md
```

## Recommended Next Work

Next process gap: backend-backed bank statement/AP/transfer integration.

Target flow:

```text
CSV / bank feed import -> match suggestions -> approval queue -> persisted payments/AP transfers -> cash dashboard drilldown
```

Current frontend implementation includes the statement import workbench and live projection wiring. The next production step is replacing the sample statement import with a real uploaded CSV/bank-feed parser and persisting imported rows through an API/database.
