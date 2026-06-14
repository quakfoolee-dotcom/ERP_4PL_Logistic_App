export type AsnStatus = "scheduled" | "receiving" | "variance" | "putaway_ready" | "closed";
export type InspectionStatus = "not_started" | "passed" | "variance" | "damaged";
export type ConditionStatus = "unchecked" | "good" | "damaged" | "mixed";
export type InventoryRecordStatus = "not_recorded" | "recorded";
export type ReturnStatus = "authorized" | "received" | "inspecting" | "restock" | "dispose" | "closed";
export type ServiceEventStatus = "open" | "approved" | "billed";
export type DispatchStatus = "requested" | "quoted" | "assigned" | "in_transit" | "pod_pending" | "closed" | "exception";
export type BillingQueueStatus = "ready" | "needs_approval" | "approved" | "invoiced" | "blocked";
export type AccountingSyncStatus = "queued" | "ready_to_sync" | "synced" | "failed";

export interface AsnReceivingRecord {
  id: string;
  bookingRef: string;
  freightFileId: string;
  customsReleaseStatus: "not_required" | "documents_needed" | "submitted" | "released" | "hold";
  receivingAppointment: string;
  asnSource: "customer_booking" | "freight_release" | "manual";
  customer: string;
  container: string;
  warehouse: string;
  eta: string;
  skuLines: number;
  expectedUnits: number;
  receivedUnits: number;
  varianceUnits: number;
  status: AsnStatus;
  inspectionStatus: InspectionStatus;
  conditionStatus: ConditionStatus;
  inventoryStatus: InventoryRecordStatus;
  putawayLocation: string;
  recordedAt?: string;
  discrepancyReportId?: string;
  assignedTeam: string;
  note: string;
}

export interface ReturnAuthorizationRecord {
  id: string;
  customer: string;
  originalOrder: string;
  sku: string;
  units: number;
  reason: string;
  disposition: "pending" | "restock" | "relabel" | "dispose";
  status: ReturnStatus;
}

export interface ServiceEventRecord {
  id: string;
  source: string;
  customer: string;
  service: string;
  quantity: number;
  rateCad: number;
  status: ServiceEventStatus;
}

export interface DispatchRecord {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  pallets: number;
  driver: string;
  carrier: string;
  quotedCostCad: number;
  estimatedRevenueCad: number;
  status: DispatchStatus;
  podRequired: boolean;
  exceptionNote: string;
}

export interface BillingQueueRecord {
  id: string;
  customer: string;
  sourceType: "transport" | "handling" | "storage" | "customs" | "return";
  sourceId: string;
  subtotalCad: number;
  taxCad: number;
  status: BillingQueueStatus;
  approvalOwner: string;
  note: string;
}

export interface AccountingSyncRecord {
  id: string;
  system: "QuickBooks" | "Bank" | "Payroll" | "BI Warehouse";
  objectType: "invoice" | "payable" | "customer" | "payment";
  objectId: string;
  amountCad: number;
  status: AccountingSyncStatus;
  lastAttempt: string;
  externalReference?: string;
  errorMessage?: string;
}

export const asnReceivingRecords: AsnReceivingRecord[] = [
  {
    id: "ASN-2026-0503-ZEN",
    bookingRef: "BK-2026-ZEN-0503",
    freightFileId: "FF-2026-0503",
    customsReleaseStatus: "documents_needed",
    receivingAppointment: "Pending docs",
    asnSource: "customer_booking",
    customer: "Zenith Marketplace",
    container: "TLLU4409123",
    warehouse: "Whybank #25",
    eta: "2026-05-03",
    skuLines: 18,
    expectedUnits: 1840,
    receivedUnits: 0,
    varianceUnits: 0,
    status: "scheduled",
    inspectionStatus: "not_started",
    conditionStatus: "unchecked",
    inventoryStatus: "not_recorded",
    putawayLocation: "Unassigned",
    assignedTeam: "Receiving A",
    note: "Waiting for commercial invoice and packing list.",
  },
  {
    id: "ASN-2026-0427-HMMU",
    bookingRef: "BK-2026-FBA-0427",
    freightFileId: "FF-2026-0427",
    customsReleaseStatus: "released",
    receivingAppointment: "2026-04-27 09:00",
    asnSource: "freight_release",
    customer: "FBA Seller",
    container: "HMMU7089094",
    warehouse: "Whybank #10",
    eta: "2026-04-27",
    skuLines: 11,
    expectedUnits: 1032,
    receivedUnits: 1032,
    varianceUnits: 0,
    status: "putaway_ready",
    inspectionStatus: "passed",
    conditionStatus: "good",
    inventoryStatus: "not_recorded",
    putawayLocation: "WB10-BIN-B04",
    assignedTeam: "FBA Prep",
    note: "Receiving complete. Awaiting final bin assignment.",
  },
  {
    id: "ASN-2026-0325-DRYU",
    bookingRef: "BK-2026-FBA-0325",
    freightFileId: "FF-2026-0418",
    customsReleaseStatus: "hold",
    receivingAppointment: "2026-03-25 14:00",
    asnSource: "freight_release",
    customer: "FBA Seller",
    container: "DRYU9624130",
    warehouse: "Whybank #25",
    eta: "2026-03-25",
    skuLines: 7,
    expectedUnits: 1200,
    receivedUnits: 1188,
    varianceUnits: -12,
    status: "variance",
    inspectionStatus: "variance",
    conditionStatus: "mixed",
    inventoryStatus: "not_recorded",
    putawayLocation: "WB25-HOLD-A01",
    discrepancyReportId: "DR-2026-0325-DRYU",
    assignedTeam: "Exception Desk",
    note: "Short 12 units. Hold billing until customer confirms.",
  },
];

export const returnAuthorizations: ReturnAuthorizationRecord[] = [
  {
    id: "RMA-2026-0091",
    customer: "AP-CBWS",
    originalOrder: "WB-251118-CBWS-001",
    sku: "YYZ7 rejected pallet lot",
    units: 13,
    reason: "Warehouse refused delivery",
    disposition: "pending",
    status: "authorized",
  },
  {
    id: "RMA-2026-0092",
    customer: "FBA Seller",
    originalOrder: "WB-260405-ZCSU6522960",
    sku: "Relabel overage",
    units: 24,
    reason: "Label mismatch",
    disposition: "relabel",
    status: "inspecting",
  },
];

export const serviceEvents: ServiceEventRecord[] = [
  { id: "SE-2026-3101", source: "DRYU9624130", customer: "FBA Seller", service: "Relabel", quantity: 1200, rateCad: 0.5, status: "open" },
  { id: "SE-2026-3102", source: "HMMU7089094", customer: "FBA Seller", service: "Pallet storage", quantity: 46, rateCad: 8, status: "approved" },
  { id: "SE-2026-3103", source: "BEAU6280647", customer: "FBA Seller", service: "Sort / palletize", quantity: 36, rateCad: 40, status: "billed" },
];

export const dispatchRecords: DispatchRecord[] = [
  {
    id: "DSP-2026-0429-HMMU",
    customer: "FBA Seller",
    origin: "Whybank #10",
    destination: "YYZ9 Amazon",
    pallets: 46,
    driver: "LH",
    carrier: "LH Driver",
    quotedCostCad: 380,
    estimatedRevenueCad: 2065,
    status: "assigned",
    podRequired: true,
    exceptionNote: "Appointment confirmed. POD required before invoice.",
  },
  {
    id: "DSP-2026-0325-DRYU",
    customer: "FBA Seller",
    origin: "Whybank #25",
    destination: "YYZ4 / YYZ7 HOLD",
    pallets: 17,
    driver: "TBD",
    carrier: "Unassigned",
    quotedCostCad: 0,
    estimatedRevenueCad: 850,
    status: "exception",
    podRequired: true,
    exceptionNote: "Hold until relabel work and customer dispatch instruction are approved.",
  },
  {
    id: "DSP-2026-0503-ZEN",
    customer: "Zenith Marketplace",
    origin: "Whybank #25",
    destination: "Toronto Rail",
    pallets: 28,
    driver: "TBD",
    carrier: "Rate compare needed",
    quotedCostCad: 525,
    estimatedRevenueCad: 1680,
    status: "quoted",
    podRequired: true,
    exceptionNote: "Choose partner before dispatch confirmation.",
  },
];

export const billingQueueRecords: BillingQueueRecord[] = [
  {
    id: "BQ-2026-101",
    customer: "FBA Seller",
    sourceType: "handling",
    sourceId: "SE-2026-3101",
    subtotalCad: 600,
    taxCad: 78,
    status: "needs_approval",
    approvalOwner: "Finance",
    note: "Relabel quantity must match warehouse photo count.",
  },
  {
    id: "BQ-2026-102",
    customer: "FBA Seller",
    sourceType: "transport",
    sourceId: "DSP-2026-0429-HMMU",
    subtotalCad: 2065,
    taxCad: 268.45,
    status: "ready",
    approvalOwner: "Ops Team",
    note: "POD pending before final invoice issue.",
  },
  {
    id: "BQ-2026-103",
    customer: "AP-CBWS",
    sourceType: "return",
    sourceId: "RMA-2026-0091",
    subtotalCad: 455,
    taxCad: 59.15,
    status: "blocked",
    approvalOwner: "Customer Success",
    note: "Customer must approve rejected-delivery charge.",
  },
];

export const accountingSyncRecords: AccountingSyncRecord[] = [
  { id: "SYNC-901", system: "QuickBooks", objectType: "invoice", objectId: "2026-0139", amountCad: 2908, status: "ready_to_sync", lastAttempt: "Not run" },
  { id: "SYNC-902", system: "QuickBooks", objectType: "payable", objectId: "AP-2026-0087", amountCad: 5153, status: "queued", lastAttempt: "Not run" },
  { id: "SYNC-903", system: "BI Warehouse", objectType: "customer", objectId: "cust-fba-seller", amountCad: 0, status: "synced", lastAttempt: "2026-06-10 08:15" },
];
