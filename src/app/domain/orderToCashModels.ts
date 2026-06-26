export type WorkflowStatus =
  | "draft"
  | "submitted"
  | "pending_review"
  | "in_progress"
  | "waiting_customer"
  | "waiting_broker"
  | "waiting_carrier"
  | "completed"
  | "cleared"
  | "rejected"
  | "exception"
  | "on_hold"
  | "cancelled"
  | "overdue"
  | "closed";

export type SystemKey = "lingxing_wms" | "yicang_elabel" | "quickbooks" | "wechat_crm";
export type SyncStatus = "not_connected" | "manual" | "queued" | "synced" | "failed";
export type TimelineLevel = "info" | "success" | "warning" | "error";
export type ExceptionSeverity = "low" | "medium" | "high" | "critical";
export type InquirySource = "google_ads" | "website" | "referral" | "wechat" | "industry_networking";
export type ServiceType = "freight_import" | "warehouse_storage" | "fba_prep" | "transport_delivery" | "customs_clearance" | "returns";
export type TransportMode = "sea" | "air" | "truck";
export type OrderChannel = "wms_portal" | "wechat" | "email";
export type ValueAddedService = "inspection" | "repack" | "relabel" | "kitting";
export type LabelSystem = "yicang" | "elabel" | "manual";
export type CarrierName = "UPS" | "FedEx" | "Canada Post" | "Trucking";
export type InvoiceType = "monthly" | "transaction_based" | "prepaid_recharge";
export type PaymentMethod = "eft" | "emt" | "cheque" | "bank_transfer";

export type OrderToCashEntityType =
  | "customer"
  | "lead"
  | "quotation"
  | "service_agreement"
  | "shipment"
  | "customs_declaration"
  | "warehouse_receipt"
  | "inventory_item"
  | "customer_order"
  | "fulfillment_task"
  | "carrier_shipment"
  | "delivery_record"
  | "return_record"
  | "invoice"
  | "payment"
  | "ar_collection"
  | "exception_case"
  | "kpi_report";

export interface LinkedRecordRef {
  type: OrderToCashEntityType;
  id: string;
}

export interface BaseWorkflowEntity {
  id: string;
  customerId?: string;
  status: WorkflowStatus;
  owner: string;
  responsiblePerson?: string;
  createdDate: string;
  updatedDate: string;
  notes: string;
  documentIds: string[];
  relatedRecords: LinkedRecordRef[];
}

export interface Customer extends BaseWorkflowEntity {
  customerId: string;
  name: string;
  contactPerson: string;
  contactEmail?: string;
  contactPhone?: string;
  serviceTypes: ServiceType[];
  billingTerms: string;
  communicationSetup: "not_started" | "wechat_group" | "email" | "portal" | "complete";
  onboardingStatus: WorkflowStatus;
  rateSheetVersion: string;
  agreementStatus: WorkflowStatus;
  wmsCustomerId?: string;
  quickBooksCustomerId?: string;
}

export interface Lead extends BaseWorkflowEntity {
  source: InquirySource;
  companyName: string;
  contactPerson: string;
  requestedServices: ServiceType[];
  inquiryChannel: "wechat" | "email" | "phone";
  requirementsSummary: string;
  solutionDesignStatus: WorkflowStatus;
}

export interface Quotation extends BaseWorkflowEntity {
  leadId: string;
  rateSheetVersion: string;
  quoteStatus: "draft" | "sent" | "accepted" | "rejected" | "revision_required";
  quotedAmountCad: number;
  validUntil: string;
  revisionOfQuoteId?: string;
}

export interface ServiceAgreement extends BaseWorkflowEntity {
  quotationId: string;
  agreementStatus: WorkflowStatus;
  signedDate?: string;
  billingTerms: string;
  wmsSetupStatus: WorkflowStatus;
  accountSetupStatus: WorkflowStatus;
}

export interface Shipment extends BaseWorkflowEntity {
  shipmentId: string;
  supplier: string;
  poNumber: string;
  freightForwarder: string;
  broker: string;
  transportMode: TransportMode;
  origin: string;
  destination: string;
  eta: string;
  bolAwbNumber: string;
  manifestDocumentId?: string;
  customsDeclarationId?: string;
  customsStatus: WorkflowStatus;
  customsReleaseDate?: string;
  entrySummaryDocumentId?: string;
  exceptionNotes: string;
}

export interface CustomsDeclaration extends BaseWorkflowEntity {
  shipmentId: string;
  broker: string;
  declarationNumber: string;
  customsStatus: WorkflowStatus;
  submittedDate?: string;
  clearedDate?: string;
  releaseDocumentId?: string;
  entrySummaryDocumentId?: string;
}

export interface WarehouseReceipt extends BaseWorkflowEntity {
  receivingId: string;
  shipmentId: string;
  sku: string;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  shortageOverageQuantity: number;
  inspectionStatus: WorkflowStatus;
  discrepancyStatus: WorkflowStatus;
  storageLocation: string;
  putawayStatus: WorkflowStatus;
  wmsInventoryStatus: WorkflowStatus;
  cycleCountStatus: WorkflowStatus;
  inventoryAvailableDate?: string;
}

export interface InventoryItem extends BaseWorkflowEntity {
  warehouseReceiptId: string;
  sku: string;
  productName: string;
  warehouse: string;
  storageLocation: string;
  onHandQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  damagedQuantity: number;
  wmsInventoryId?: string;
}

export interface CustomerOrder extends BaseWorkflowEntity {
  orderId: string;
  orderChannel: OrderChannel;
  sku: string;
  quantityOrdered: number;
  pickListNumber?: string;
  pickingStatus: WorkflowStatus;
  packingStatus: WorkflowStatus;
  valueAddedServices: ValueAddedService[];
  labelSystem: LabelSystem;
  trackingNumber?: string;
  carrier?: CarrierName;
  manifestNumber?: string;
  handoverDate?: string;
  fulfillmentStatus: WorkflowStatus;
}

export interface FulfillmentTask extends BaseWorkflowEntity {
  orderId: string;
  taskType: "pick_list" | "pick_pack" | "inspection" | "repack" | "relabel" | "kitting" | "shipping_label" | "manifest" | "carrier_handoff";
  sku: string;
  quantity: number;
  system: SystemKey;
  completedDate?: string;
}

export interface CarrierShipment extends BaseWorkflowEntity {
  orderId: string;
  trackingNumber: string;
  carrier: CarrierName;
  labelSystem: LabelSystem;
  manifestNumber: string;
  handoverDate?: string;
  deliveryEta?: string;
}

export interface DeliveryRecord extends BaseWorkflowEntity {
  orderId: string;
  trackingNumber: string;
  carrier: CarrierName;
  deliveryStatus: WorkflowStatus;
  deliveryDate?: string;
  podStatus: WorkflowStatus;
  podDocumentId?: string;
  returnRequested: boolean;
  customerNotificationStatus: WorkflowStatus;
}

export interface ReturnRecord extends BaseWorkflowEntity {
  orderId: string;
  trackingNumber?: string;
  returnReason: string;
  returnReceivedDate?: string;
  returnInspectionStatus: WorkflowStatus;
  inventoryAdjustment: string;
  customerNotificationStatus: WorkflowStatus;
}

export interface Invoice extends BaseWorkflowEntity {
  invoiceId: string;
  relatedShipmentIds: string[];
  relatedOrderIds: string[];
  invoiceType: InvoiceType;
  invoiceAmountCad: number;
  taxCad: number;
  invoiceDate: string;
  dueDate: string;
  paymentMethod?: PaymentMethod;
  paymentReceivedDate?: string;
  paymentClearedStatus: WorkflowStatus;
  arAgingBucket: "current" | "1_30" | "31_60" | "61_90" | "90_plus";
  collectionStatus: WorkflowStatus;
  quickBooksReferenceNumber?: string;
  reconciliationStatus: WorkflowStatus;
}

export interface Payment extends BaseWorkflowEntity {
  invoiceId: string;
  paymentMethod: PaymentMethod;
  amountCad: number;
  receivedDate: string;
  clearedDate?: string;
  paymentClearedStatus: WorkflowStatus;
  proofDocumentId?: string;
  bankDepositId?: string;
  bankReference?: string;
}

export interface BankDeposit extends BaseWorkflowEntity {
  depositId: string;
  bankAccount: string;
  customerId?: string;
  invoiceId?: string;
  amountCad: number;
  receivedDate: string;
  reference: string;
  memo?: string;
  matchStatus: "unmatched" | "matched" | "partial" | "exception";
  matchedAmountCad?: number;
  openAmountCad?: number;
  sourceFileName?: string;
  statementDate?: string;
  importedAt?: string;
  suggestedInvoiceId?: string;
  suggestionReason?: string;
  suggestionConfidence?: "high" | "medium" | "low";
  rejectedInvoiceIds?: string[];
}

export interface ARCollection extends BaseWorkflowEntity {
  invoiceId: string;
  arAgingBucket: Invoice["arAgingBucket"];
  collectionStatus: WorkflowStatus;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  collectionOwner: string;
}

export interface ExceptionCase extends BaseWorkflowEntity {
  exceptionId: string;
  relatedShipmentId?: string;
  relatedOrderId?: string;
  relatedInvoiceId?: string;
  exceptionType: "quote_revision" | "customs_not_cleared" | "inventory_discrepancy" | "delivery_return" | "payment_not_cleared" | "overdue_ar";
  severity: ExceptionSeverity;
  dateOpened: string;
  dueDate: string;
  resolutionDate?: string;
}

export interface DocumentLink {
  id: string;
  ownerType: OrderToCashEntityType;
  ownerId: string;
  kind:
    | "rate_sheet"
    | "service_agreement"
    | "po"
    | "supplier_document"
    | "bol"
    | "awb"
    | "manifest"
    | "customs_declaration"
    | "customs_release"
    | "entry_summary"
    | "receiving_report"
    | "discrepancy_report"
    | "shipping_label"
    | "carrier_manifest"
    | "pod"
    | "return_inspection"
    | "invoice"
    | "payment_proof"
    | "kpi_report";
  fileName: string;
  url?: string;
  externalSystemId?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface TimelineEvent {
  id: string;
  ownerType: OrderToCashEntityType;
  ownerId: string;
  occurredAt: string;
  stage: string;
  status: WorkflowStatus;
  title: string;
  note: string;
  actor: string;
  level: TimelineLevel;
}

export interface IntegrationStatus {
  id: string;
  ownerType: OrderToCashEntityType;
  ownerId: string;
  system: SystemKey;
  externalSystemId?: string;
  syncStatus: SyncStatus;
  lastSyncTime?: string;
  syncErrorMessage?: string;
  manualUpdateFlag: boolean;
}

export interface OrderToCashSeedData {
  customers: Customer[];
  leads: Lead[];
  quotations: Quotation[];
  serviceAgreements: ServiceAgreement[];
  shipments: Shipment[];
  customsDeclarations: CustomsDeclaration[];
  warehouseReceipts: WarehouseReceipt[];
  inventoryItems: InventoryItem[];
  customerOrders: CustomerOrder[];
  fulfillmentTasks: FulfillmentTask[];
  carrierShipments: CarrierShipment[];
  deliveryRecords: DeliveryRecord[];
  returnRecords: ReturnRecord[];
  invoices: Invoice[];
  payments: Payment[];
  bankDeposits: BankDeposit[];
  arCollections: ARCollection[];
  exceptionCases: ExceptionCase[];
  documents: DocumentLink[];
  timelineEvents: TimelineEvent[];
  integrationStatuses: IntegrationStatus[];
}
