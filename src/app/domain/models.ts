export type CurrencyCode = "CAD" | "USD";

export interface Money {
  amountCents: number;
  currency: CurrencyCode;
}

export type OrganizationType = "customer" | "partner" | "carrier" | "warehouse" | "broker";

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  externalCode?: string;
}

export interface Location {
  id: string;
  name: string;
  code?: string;
  type: "warehouse" | "fulfillment_center" | "port" | "customer_site" | "yard";
  city?: string;
  province?: string;
  country: string;
}

export interface Driver {
  id: string;
  name: string;
  partnerId?: string;
  phone?: string;
  active: boolean;
}

export interface Vehicle {
  id: string;
  label: string;
  type: "straight_truck" | "tractor_trailer" | "cargo_van" | "other";
  plate?: string;
}

export type TransportMode = "FTL" | "LTL";
export type TransportOrderStatus = "pending_dispatch" | "in_transit" | "completed" | "exception";
export type PodStatus = "pending" | "signed" | "disputed";

export interface TransportOrder {
  id: string;
  customerId: string;
  shipmentId: string;
  originLocationId: string;
  destinationLocationId: string;
  assignedDriverIds: string[];
  vehicleId?: string;
  mode: TransportMode;
  palletCount: number;
  status: TransportOrderStatus;
  podStatus: PodStatus;
  revenue: Money;
  cost: Money;
  etaDate: string;
  createdDate: string;
}

export type ShipmentStatus = "created" | "warehouse_processing" | "dispatched" | "in_transit" | "delivered" | "hold";

export interface Shipment {
  id: string;
  customerId: string;
  fbaShipmentId?: string;
  containerIds: string[];
  status: ShipmentStatus;
  createdDate: string;
}

export interface Container {
  id: string;
  shipmentId: string;
  fbaShipmentId?: string;
  unitCount: number;
  cbm?: number;
  palletCount: number;
  currentLocationId: string;
  destinationLocationId: string;
  status: "inbound" | "processing" | "ready_dispatch" | "in_transit" | "delivered" | "hold";
  arrivedDate?: string;
  dispatchedDate?: string;
}

export interface WarehouseZone {
  id: string;
  warehouseLocationId: string;
  name: string;
  capacityPallets: number;
  usedPallets: number;
}

export interface HandlingJob {
  id: string;
  containerId: string;
  warehouseLocationId: string;
  operationType: "sort_palletize" | "repalletize" | "relabel" | "multi_fc_dispatch";
  status: "open" | "in_progress" | "completed" | "billed";
  startedDate?: string;
  completedDate?: string;
  billableAmount: Money;
}

export interface TrackingEvent {
  id: string;
  subjectType: "transport_order" | "shipment" | "container" | "pod" | "invoice" | "payable";
  subjectId: string;
  status: string;
  occurredAt: string;
  locationId?: string;
  note?: string;
}

export interface PodRecord {
  id: string;
  transportOrderId: string;
  status: PodStatus;
  signedAt?: string;
  documentId?: string;
  notes?: string;
}

export interface DocumentRecord {
  id: string;
  ownerType: "transport_order" | "shipment" | "container" | "driver" | "customs_entry";
  ownerId: string;
  kind: "pod" | "bol" | "invoice" | "customs" | "driver_compliance" | "other";
  fileName: string;
  storageKey: string;
  uploadedAt: string;
}

export type InvoiceStatus = "draft" | "pending" | "issued" | "paid" | "overdue" | "void";

export interface InvoiceHeader {
  id: string;
  customerId: string;
  status: InvoiceStatus;
  period: string;
  subtotal: Money;
  tax: Money;
  total: Money;
  dueDate: string;
  sourceOrderIds: string[];
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  sourceType: "transport_order" | "handling_job" | "storage_charge" | "custom";
  sourceId: string;
  description: string;
  quantity: number;
  unitAmount: Money;
  total: Money;
}

export type PayableStatus = "draft" | "scheduled" | "approved" | "paid" | "overdue" | "disputed";

export interface Payable {
  id: string;
  vendorId: string;
  status: PayableStatus;
  category: "driver_settlement" | "carrier_cost" | "warehouse_labor" | "reimbursement" | "customs" | "other";
  period: string;
  subtotal: Money;
  tax: Money;
  total: Money;
  dueDate: string;
  sourceOrderIds: string[];
}

export interface RateCard {
  id: string;
  partnerId: string;
  name: string;
  currency: CurrencyCode;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
}

export interface RateRule {
  id: string;
  rateCardId: string;
  service: "fba_delivery" | "pallet_storage" | "relabel" | "repalletize" | "linehaul" | "customs_clearance";
  basis: "per_pallet" | "per_label" | "per_order" | "per_hour" | "flat";
  zoneCode?: string;
  amount: Money;
  minimum?: Money;
  taxable: boolean;
}

export type CustomsEntryStatus = "draft" | "documents_needed" | "submitted" | "released" | "hold";

export interface CustomsEntry {
  id: string;
  shipmentId: string;
  brokerId?: string;
  status: CustomsEntryStatus;
  portLocationId?: string;
  hsCode?: string;
  submittedAt?: string;
  releasedAt?: string;
}

export interface ErpSeedData {
  organizations: Organization[];
  locations: Location[];
  drivers: Driver[];
  vehicles: Vehicle[];
  shipments: Shipment[];
  containers: Container[];
  warehouseZones: WarehouseZone[];
  handlingJobs: HandlingJob[];
  transportOrders: TransportOrder[];
  trackingEvents: TrackingEvent[];
  podRecords: PodRecord[];
  documents: DocumentRecord[];
  invoices: InvoiceHeader[];
  invoiceLines: InvoiceLine[];
  payables: Payable[];
  rateCards: RateCard[];
  rateRules: RateRule[];
  customsEntries: CustomsEntry[];
}
