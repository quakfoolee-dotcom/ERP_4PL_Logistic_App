import type {
  ARCollection,
  CarrierShipment,
  Customer,
  CustomerOrder,
  CustomsDeclaration,
  DeliveryRecord,
  DocumentLink,
  ExceptionCase,
  FulfillmentTask,
  IntegrationStatus,
  InventoryItem,
  Invoice,
  Lead,
  OrderToCashSeedData,
  Payment,
  Quotation,
  ReturnRecord,
  ServiceAgreement,
  Shipment,
  TimelineEvent,
  WarehouseReceipt,
  WorkflowStatus,
} from "../domain/orderToCashModels";

function related(type: Parameters<typeof ref>[0], id: string) {
  return ref(type, id);
}

function ref(type: OrderToCashSeedDataKey, id: string) {
  return { type, id };
}

type OrderToCashSeedDataKey =
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

function base(input: {
  id: string;
  customerId?: string;
  status: WorkflowStatus;
  owner: string;
  responsiblePerson?: string;
  createdDate: string;
  updatedDate?: string;
  notes?: string;
  documentIds?: string[];
  relatedRecords?: ReturnType<typeof ref>[];
}) {
  return {
    id: input.id,
    customerId: input.customerId,
    status: input.status,
    owner: input.owner,
    responsiblePerson: input.responsiblePerson,
    createdDate: input.createdDate,
    updatedDate: input.updatedDate ?? input.createdDate,
    notes: input.notes ?? "",
    documentIds: input.documentIds ?? [],
    relatedRecords: input.relatedRecords ?? [],
  };
}

export const orderToCashCustomers: Customer[] = [
  {
    ...base({ id: "cust-fba-seller", customerId: "cust-fba-seller", status: "completed", owner: "Ops Team", createdDate: "2026-01-12", notes: "Primary FBA warehouse and delivery customer." }),
    customerId: "cust-fba-seller",
    name: "FBA Seller",
    contactPerson: "Mia Chen",
    contactEmail: "ops@fbaseller.example",
    serviceTypes: ["freight_import", "warehouse_storage", "fba_prep", "transport_delivery", "returns"],
    billingTerms: "Net 30, monthly invoice",
    communicationSetup: "complete",
    onboardingStatus: "completed",
    rateSheetVersion: "FBA-2026-v3",
    agreementStatus: "completed",
    wmsCustomerId: "LX-FBA-1007",
    quickBooksCustomerId: "QBO-FBA-SELLER",
  },
  {
    ...base({ id: "cust-zenith", customerId: "cust-zenith", status: "in_progress", owner: "Customer Success", createdDate: "2026-05-16", notes: "New China-origin import customer in onboarding." }),
    customerId: "cust-zenith",
    name: "Zenith Marketplace",
    contactPerson: "Olivia Zhang",
    contactEmail: "logistics@zenith.example",
    serviceTypes: ["freight_import", "customs_clearance", "warehouse_storage"],
    billingTerms: "Prepaid recharge before first release",
    communicationSetup: "wechat_group",
    onboardingStatus: "in_progress",
    rateSheetVersion: "Quote Q-2026-044",
    agreementStatus: "pending_review",
    wmsCustomerId: "LX-ZEN-DRAFT",
  },
  {
    ...base({ id: "cust-ap-cbws", customerId: "cust-ap-cbws", status: "exception", owner: "Finance", createdDate: "2025-11-10", notes: "Rejected delivery and overdue AR follow-up." }),
    customerId: "cust-ap-cbws",
    name: "AP-CBWS",
    contactPerson: "Chris Wang",
    serviceTypes: ["transport_delivery", "returns"],
    billingTerms: "Net 15, collection hold after rejection dispute",
    communicationSetup: "email",
    onboardingStatus: "completed",
    rateSheetVersion: "CBWS-FBA-Draft",
    agreementStatus: "completed",
    quickBooksCustomerId: "QBO-AP-CBWS",
  },
];

export const orderToCashLeads: Lead[] = [
  {
    ...base({ id: "lead-zenith-2026", status: "in_progress", owner: "Sales", responsiblePerson: "Jill Anderson", createdDate: "2026-05-14", documentIds: ["doc-zenith-inquiry"], relatedRecords: [related("customer", "cust-zenith")] }),
    source: "wechat",
    companyName: "Zenith Marketplace",
    contactPerson: "Olivia Zhang",
    requestedServices: ["freight_import", "customs_clearance", "warehouse_storage"],
    inquiryChannel: "wechat",
    requirementsSummary: "China-origin container import, customs broker support, receiving into LingXing WMS.",
    solutionDesignStatus: "pending_review",
  },
];

export const orderToCashQuotations: Quotation[] = [
  {
    ...base({ id: "quote-zenith-044", customerId: "cust-zenith", status: "pending_review", owner: "Sales", createdDate: "2026-05-18", documentIds: ["doc-zenith-rate-sheet"], relatedRecords: [related("lead", "lead-zenith-2026"), related("customer", "cust-zenith")] }),
    leadId: "lead-zenith-2026",
    rateSheetVersion: "Quote Q-2026-044",
    quoteStatus: "revision_required",
    quotedAmountCad: 4980,
    validUntil: "2026-07-15",
  },
  {
    ...base({ id: "quote-fba-2026-v3", customerId: "cust-fba-seller", status: "completed", owner: "Sales", createdDate: "2026-01-08", documentIds: ["doc-fba-rate-sheet"], relatedRecords: [related("customer", "cust-fba-seller")] }),
    leadId: "lead-fba-renewal-2026",
    rateSheetVersion: "FBA-2026-v3",
    quoteStatus: "accepted",
    quotedAmountCad: 75250,
    validUntil: "2026-12-31",
  },
];

export const orderToCashServiceAgreements: ServiceAgreement[] = [
  {
    ...base({ id: "agr-fba-2026", customerId: "cust-fba-seller", status: "completed", owner: "Customer Success", createdDate: "2026-01-15", documentIds: ["doc-fba-service-agreement"], relatedRecords: [related("quotation", "quote-fba-2026-v3")] }),
    quotationId: "quote-fba-2026-v3",
    agreementStatus: "completed",
    signedDate: "2026-01-16",
    billingTerms: "Net 30, monthly invoice",
    wmsSetupStatus: "completed",
    accountSetupStatus: "completed",
  },
  {
    ...base({ id: "agr-zenith-draft", customerId: "cust-zenith", status: "pending_review", owner: "Customer Success", createdDate: "2026-05-22", relatedRecords: [related("quotation", "quote-zenith-044")] }),
    quotationId: "quote-zenith-044",
    agreementStatus: "pending_review",
    billingTerms: "Prepaid recharge",
    wmsSetupStatus: "in_progress",
    accountSetupStatus: "in_progress",
  },
];

export const orderToCashShipments: Shipment[] = [
  {
    ...base({ id: "ship-zenith-tllu4409123", customerId: "cust-zenith", status: "waiting_broker", owner: "Freight Team", createdDate: "2026-05-24", documentIds: ["doc-zenith-po", "doc-zenith-manifest"], relatedRecords: [related("customer", "cust-zenith")] }),
    shipmentId: "SHP-2026-ZEN-0503",
    supplier: "Shenzhen Prime Supplier",
    poNumber: "PO-ZEN-2026-0503",
    freightForwarder: "Pacific Forwarding CN",
    broker: "GTA Customs Broker",
    transportMode: "sea",
    origin: "Yantian, CN",
    destination: "Whybank #25, Brampton",
    eta: "2026-07-01",
    bolAwbNumber: "BOL-YTN-770193",
    manifestDocumentId: "doc-zenith-manifest",
    customsDeclarationId: "custdec-zenith-001",
    customsStatus: "waiting_broker",
    exceptionNotes: "Commercial invoice needs supplier correction before customs submission.",
  },
  {
    ...base({ id: "ship-fba-dryu9624130", customerId: "cust-fba-seller", status: "on_hold", owner: "Freight Team", createdDate: "2026-03-18", documentIds: ["doc-dryu-bol", "doc-dryu-entry-summary"], relatedRecords: [related("customer", "cust-fba-seller")] }),
    shipmentId: "SHP-2026-FBA-DRYU",
    supplier: "Ningbo Home Goods",
    poNumber: "PO-FBA-DRYU-0318",
    freightForwarder: "Evergreen Forwarding",
    broker: "GTA Customs Broker",
    transportMode: "sea",
    origin: "Ningbo, CN",
    destination: "Whybank #25, Brampton",
    eta: "2026-03-25",
    bolAwbNumber: "BOL-NGB-9624130",
    manifestDocumentId: "doc-dryu-bol",
    customsDeclarationId: "custdec-dryu-001",
    customsStatus: "cleared",
    customsReleaseDate: "2026-03-24",
    entrySummaryDocumentId: "doc-dryu-entry-summary",
    exceptionNotes: "Inventory discrepancy and relabel work block billing release.",
  },
];

export const orderToCashCustomsDeclarations: CustomsDeclaration[] = [
  {
    ...base({ id: "custdec-zenith-001", customerId: "cust-zenith", status: "waiting_broker", owner: "Broker Desk", createdDate: "2026-05-27", relatedRecords: [related("shipment", "ship-zenith-tllu4409123")] }),
    shipmentId: "ship-zenith-tllu4409123",
    broker: "GTA Customs Broker",
    declarationNumber: "DRAFT-ZEN-0503",
    customsStatus: "waiting_broker",
  },
  {
    ...base({ id: "custdec-dryu-001", customerId: "cust-fba-seller", status: "cleared", owner: "Broker Desk", createdDate: "2026-03-21", documentIds: ["doc-dryu-entry-summary"], relatedRecords: [related("shipment", "ship-fba-dryu9624130")] }),
    shipmentId: "ship-fba-dryu9624130",
    broker: "GTA Customs Broker",
    declarationNumber: "CAD-2026-DRYU-001",
    customsStatus: "cleared",
    submittedDate: "2026-03-22",
    clearedDate: "2026-03-24",
    releaseDocumentId: "doc-dryu-customs-release",
    entrySummaryDocumentId: "doc-dryu-entry-summary",
  },
];

export const orderToCashWarehouseReceipts: WarehouseReceipt[] = [
  {
    ...base({ id: "recv-zenith-tllu", customerId: "cust-zenith", status: "waiting_broker", owner: "Receiving A", createdDate: "2026-05-28", relatedRecords: [related("shipment", "ship-zenith-tllu4409123")] }),
    receivingId: "RCV-2026-ZEN-TLLU",
    shipmentId: "ship-zenith-tllu4409123",
    sku: "ZEN-SKU-MIXED",
    productName: "Mixed ecommerce cartons",
    expectedQuantity: 1840,
    receivedQuantity: 0,
    damagedQuantity: 0,
    shortageOverageQuantity: 0,
    inspectionStatus: "draft",
    discrepancyStatus: "draft",
    storageLocation: "Unassigned",
    putawayStatus: "draft",
    wmsInventoryStatus: "draft",
    cycleCountStatus: "draft",
  },
  {
    ...base({ id: "recv-fba-dryu", customerId: "cust-fba-seller", status: "exception", owner: "Exception Desk", createdDate: "2026-03-25", documentIds: ["doc-dryu-discrepancy"], relatedRecords: [related("shipment", "ship-fba-dryu9624130"), related("exception_case", "ex-inventory-dryu")] }),
    receivingId: "RCV-2026-DRYU",
    shipmentId: "ship-fba-dryu9624130",
    sku: "FBA-YYZ7-RELBL",
    productName: "YYZ7 relabel pallet lot",
    expectedQuantity: 1200,
    receivedQuantity: 1188,
    damagedQuantity: 0,
    shortageOverageQuantity: -12,
    inspectionStatus: "exception",
    discrepancyStatus: "exception",
    storageLocation: "WB25-HOLD-A01",
    putawayStatus: "on_hold",
    wmsInventoryStatus: "on_hold",
    cycleCountStatus: "pending_review",
  },
];

export const orderToCashInventoryItems: InventoryItem[] = [
  {
    ...base({ id: "inv-fba-dryu", customerId: "cust-fba-seller", status: "on_hold", owner: "WMS Team", createdDate: "2026-03-25", relatedRecords: [related("warehouse_receipt", "recv-fba-dryu")] }),
    warehouseReceiptId: "recv-fba-dryu",
    sku: "FBA-YYZ7-RELBL",
    productName: "YYZ7 relabel pallet lot",
    warehouse: "Whybank #25",
    storageLocation: "WB25-HOLD-A01",
    onHandQuantity: 1188,
    availableQuantity: 0,
    reservedQuantity: 0,
    damagedQuantity: 0,
    wmsInventoryId: "LX-INV-DRYU9624130",
  },
];

export const orderToCashCustomerOrders: CustomerOrder[] = [
  {
    ...base({ id: "ord-fba-hmmu-yyz9", customerId: "cust-fba-seller", status: "waiting_carrier", owner: "Fulfillment Team", createdDate: "2026-04-27", relatedRecords: [related("shipment", "ship-fba-dryu9624130")] }),
    orderId: "ORD-2026-HMMU-YYZ9",
    orderChannel: "wms_portal",
    sku: "FBA-YYZ9-46P",
    quantityOrdered: 1032,
    pickListNumber: "PL-LX-2026-0427-009",
    pickingStatus: "completed",
    packingStatus: "completed",
    valueAddedServices: ["inspection", "relabel"],
    labelSystem: "yicang",
    trackingNumber: "TRK-HMMU7089094",
    carrier: "Trucking",
    manifestNumber: "MAN-YC-0427-11",
    handoverDate: "2026-04-28",
    fulfillmentStatus: "waiting_carrier",
  },
  {
    ...base({ id: "ord-cbws-reject", customerId: "cust-ap-cbws", status: "exception", owner: "Delivery Team", createdDate: "2025-11-18", relatedRecords: [related("exception_case", "ex-return-cbws")] }),
    orderId: "ORD-2025-CBWS-YYZ7",
    orderChannel: "email",
    sku: "CBWS-YYZ7-13P",
    quantityOrdered: 13,
    pickListNumber: "PL-LX-2025-1118-003",
    pickingStatus: "completed",
    packingStatus: "completed",
    valueAddedServices: [],
    labelSystem: "manual",
    trackingNumber: "TRK-CBWS-251118",
    carrier: "Trucking",
    manifestNumber: "MAN-TRUCK-251118",
    handoverDate: "2025-11-18",
    fulfillmentStatus: "exception",
  },
];

export const orderToCashFulfillmentTasks: FulfillmentTask[] = [
  { ...base({ id: "task-hmmu-label", customerId: "cust-fba-seller", status: "completed", owner: "FBA Prep", createdDate: "2026-04-27", relatedRecords: [related("customer_order", "ord-fba-hmmu-yyz9")] }), orderId: "ord-fba-hmmu-yyz9", taskType: "shipping_label", sku: "FBA-YYZ9-46P", quantity: 1032, system: "yicang_elabel", completedDate: "2026-04-27" },
  { ...base({ id: "task-cbws-manifest", customerId: "cust-ap-cbws", status: "completed", owner: "Delivery Team", createdDate: "2025-11-18", relatedRecords: [related("customer_order", "ord-cbws-reject")] }), orderId: "ord-cbws-reject", taskType: "carrier_handoff", sku: "CBWS-YYZ7-13P", quantity: 13, system: "lingxing_wms", completedDate: "2025-11-18" },
];

export const orderToCashCarrierShipments: CarrierShipment[] = [
  { ...base({ id: "car-hmmu-yyz9", customerId: "cust-fba-seller", status: "waiting_carrier", owner: "TMS Dispatch", createdDate: "2026-04-28", relatedRecords: [related("customer_order", "ord-fba-hmmu-yyz9")] }), orderId: "ord-fba-hmmu-yyz9", trackingNumber: "TRK-HMMU7089094", carrier: "Trucking", labelSystem: "yicang", manifestNumber: "MAN-YC-0427-11", handoverDate: "2026-04-28", deliveryEta: "2026-04-30" },
  { ...base({ id: "car-cbws-reject", customerId: "cust-ap-cbws", status: "exception", owner: "TMS Dispatch", createdDate: "2025-11-18", relatedRecords: [related("customer_order", "ord-cbws-reject")] }), orderId: "ord-cbws-reject", trackingNumber: "TRK-CBWS-251118", carrier: "Trucking", labelSystem: "manual", manifestNumber: "MAN-TRUCK-251118", handoverDate: "2025-11-18", deliveryEta: "2025-11-18" },
];

export const orderToCashDeliveryRecords: DeliveryRecord[] = [
  { ...base({ id: "del-hmmu-yyz9", customerId: "cust-fba-seller", status: "waiting_carrier", owner: "Delivery Team", createdDate: "2026-04-28", relatedRecords: [related("carrier_shipment", "car-hmmu-yyz9")] }), orderId: "ord-fba-hmmu-yyz9", trackingNumber: "TRK-HMMU7089094", carrier: "Trucking", deliveryStatus: "waiting_carrier", podStatus: "draft", returnRequested: false, customerNotificationStatus: "draft" },
  { ...base({ id: "del-cbws-reject", customerId: "cust-ap-cbws", status: "exception", owner: "Delivery Team", createdDate: "2025-11-18", documentIds: ["doc-cbws-pod-rejected"], relatedRecords: [related("carrier_shipment", "car-cbws-reject"), related("exception_case", "ex-return-cbws")] }), orderId: "ord-cbws-reject", trackingNumber: "TRK-CBWS-251118", carrier: "Trucking", deliveryStatus: "exception", deliveryDate: "2025-11-18", podStatus: "exception", podDocumentId: "doc-cbws-pod-rejected", returnRequested: true, customerNotificationStatus: "waiting_customer" },
];

export const orderToCashReturnRecords: ReturnRecord[] = [
  { ...base({ id: "ret-cbws-251118", customerId: "cust-ap-cbws", status: "waiting_customer", owner: "Returns Desk", createdDate: "2025-11-18", relatedRecords: [related("delivery_record", "del-cbws-reject"), related("exception_case", "ex-return-cbws")] }), orderId: "ord-cbws-reject", trackingNumber: "TRK-CBWS-251118", returnReason: "Warehouse refused delivery; no matching appointment.", returnReceivedDate: "2025-11-18", returnInspectionStatus: "completed", inventoryAdjustment: "No inventory added; rejected freight returned to hold area.", customerNotificationStatus: "waiting_customer" },
];

export const orderToCashInvoices: Invoice[] = [
  { ...base({ id: "inv-fba-2026-0139", customerId: "cust-fba-seller", status: "submitted", owner: "Finance", createdDate: "2026-04-30", documentIds: ["doc-fba-invoice-0139"], relatedRecords: [related("customer_order", "ord-fba-hmmu-yyz9")] }), invoiceId: "2026-0139", relatedShipmentIds: ["ship-fba-dryu9624130"], relatedOrderIds: ["ord-fba-hmmu-yyz9"], invoiceType: "monthly", invoiceAmountCad: 2908, taxCad: 378.04, invoiceDate: "2026-04-30", dueDate: "2026-05-30", paymentMethod: "eft", paymentClearedStatus: "draft", arAgingBucket: "1_30", collectionStatus: "in_progress", quickBooksReferenceNumber: "QBO-2026-0139", reconciliationStatus: "pending_review" },
  { ...base({ id: "inv-cbws-2026-0141", customerId: "cust-ap-cbws", status: "overdue", owner: "Finance", createdDate: "2026-01-31", relatedRecords: [related("return_record", "ret-cbws-251118"), related("exception_case", "ex-overdue-cbws")] }), invoiceId: "2026-0141", relatedShipmentIds: [], relatedOrderIds: ["ord-cbws-reject"], invoiceType: "transaction_based", invoiceAmountCad: 455, taxCad: 59.15, invoiceDate: "2026-01-31", dueDate: "2026-02-15", paymentClearedStatus: "overdue", arAgingBucket: "90_plus", collectionStatus: "overdue", reconciliationStatus: "exception" },
];

export const orderToCashPayments: Payment[] = [
  { ...base({ id: "pay-fba-0139", customerId: "cust-fba-seller", status: "submitted", owner: "Finance", createdDate: "2026-05-08", relatedRecords: [related("invoice", "inv-fba-2026-0139")] }), invoiceId: "inv-fba-2026-0139", paymentMethod: "eft", amountCad: 3286.04, receivedDate: "2026-05-08", paymentClearedStatus: "pending_review" },
];

export const orderToCashARCollections: ARCollection[] = [
  { ...base({ id: "arc-cbws-0141", customerId: "cust-ap-cbws", status: "overdue", owner: "Finance", responsiblePerson: "Collections", createdDate: "2026-02-16", relatedRecords: [related("invoice", "inv-cbws-2026-0141"), related("exception_case", "ex-overdue-cbws")] }), invoiceId: "inv-cbws-2026-0141", arAgingBucket: "90_plus", collectionStatus: "overdue", lastContactDate: "2026-06-07", nextFollowUpDate: "2026-06-14", collectionOwner: "Finance" },
];

export const orderToCashExceptionCases: ExceptionCase[] = [
  { ...base({ id: "ex-quote-zenith", customerId: "cust-zenith", status: "waiting_customer", owner: "Sales", responsiblePerson: "Jill Anderson", createdDate: "2026-05-20", relatedRecords: [related("quotation", "quote-zenith-044")] }), exceptionId: "EX-2026-0101", exceptionType: "quote_revision", severity: "medium", dateOpened: "2026-05-20", dueDate: "2026-06-18" },
  { ...base({ id: "ex-customs-zenith", customerId: "cust-zenith", status: "waiting_broker", owner: "Broker Desk", responsiblePerson: "GTA Customs Broker", createdDate: "2026-05-27", relatedRecords: [related("shipment", "ship-zenith-tllu4409123"), related("customs_declaration", "custdec-zenith-001")] }), exceptionId: "EX-2026-0102", relatedShipmentId: "ship-zenith-tllu4409123", exceptionType: "customs_not_cleared", severity: "high", dateOpened: "2026-05-27", dueDate: "2026-06-17" },
  { ...base({ id: "ex-inventory-dryu", customerId: "cust-fba-seller", status: "in_progress", owner: "Exception Desk", createdDate: "2026-03-25", documentIds: ["doc-dryu-discrepancy"], relatedRecords: [related("warehouse_receipt", "recv-fba-dryu")] }), exceptionId: "EX-2026-0097", relatedShipmentId: "ship-fba-dryu9624130", exceptionType: "inventory_discrepancy", severity: "high", dateOpened: "2026-03-25", dueDate: "2026-04-02" },
  { ...base({ id: "ex-return-cbws", customerId: "cust-ap-cbws", status: "waiting_customer", owner: "Returns Desk", createdDate: "2025-11-18", documentIds: ["doc-cbws-pod-rejected"], relatedRecords: [related("return_record", "ret-cbws-251118")] }), exceptionId: "EX-2025-0118", relatedOrderId: "ord-cbws-reject", exceptionType: "delivery_return", severity: "medium", dateOpened: "2025-11-18", dueDate: "2025-11-20" },
  { ...base({ id: "ex-overdue-cbws", customerId: "cust-ap-cbws", status: "overdue", owner: "Finance", responsiblePerson: "Collections", createdDate: "2026-02-16", relatedRecords: [related("invoice", "inv-cbws-2026-0141")] }), exceptionId: "EX-2026-0141", relatedInvoiceId: "inv-cbws-2026-0141", exceptionType: "overdue_ar", severity: "critical", dateOpened: "2026-02-16", dueDate: "2026-02-29" },
];

export const orderToCashDocuments: DocumentLink[] = [
  { id: "doc-zenith-inquiry", ownerType: "lead", ownerId: "lead-zenith-2026", kind: "supplier_document", fileName: "Zenith WeChat inquiry summary.pdf", uploadedAt: "2026-05-14 09:10", uploadedBy: "Sales" },
  { id: "doc-zenith-rate-sheet", ownerType: "quotation", ownerId: "quote-zenith-044", kind: "rate_sheet", fileName: "Quote Q-2026-044 Rate Sheet.pdf", uploadedAt: "2026-05-18 15:30", uploadedBy: "Sales" },
  { id: "doc-zenith-po", ownerType: "shipment", ownerId: "ship-zenith-tllu4409123", kind: "po", fileName: "PO-ZEN-2026-0503.pdf", uploadedAt: "2026-05-24 11:40", uploadedBy: "Customer" },
  { id: "doc-zenith-manifest", ownerType: "shipment", ownerId: "ship-zenith-tllu4409123", kind: "manifest", fileName: "TLLU4409123 Manifest.pdf", uploadedAt: "2026-05-25 10:22", uploadedBy: "Freight Team" },
  { id: "doc-fba-rate-sheet", ownerType: "quotation", ownerId: "quote-fba-2026-v3", kind: "rate_sheet", fileName: "FBA-2026-v3 Rate Sheet.pdf", uploadedAt: "2026-01-08 14:05", uploadedBy: "Sales" },
  { id: "doc-fba-service-agreement", ownerType: "service_agreement", ownerId: "agr-fba-2026", kind: "service_agreement", fileName: "FBA Seller Service Agreement 2026.pdf", uploadedAt: "2026-01-16 08:45", uploadedBy: "Customer Success" },
  { id: "doc-dryu-bol", ownerType: "shipment", ownerId: "ship-fba-dryu9624130", kind: "bol", fileName: "BOL-NGB-9624130.pdf", uploadedAt: "2026-03-18 13:12", uploadedBy: "Freight Team" },
  { id: "doc-dryu-customs-release", ownerType: "customs_declaration", ownerId: "custdec-dryu-001", kind: "customs_release", fileName: "DRYU Customs Release.pdf", uploadedAt: "2026-03-24 16:00", uploadedBy: "Broker Desk" },
  { id: "doc-dryu-entry-summary", ownerType: "customs_declaration", ownerId: "custdec-dryu-001", kind: "entry_summary", fileName: "DRYU Entry Summary.pdf", uploadedAt: "2026-03-24 16:10", uploadedBy: "Broker Desk" },
  { id: "doc-dryu-discrepancy", ownerType: "warehouse_receipt", ownerId: "recv-fba-dryu", kind: "discrepancy_report", fileName: "DRYU9624130 discrepancy report.pdf", uploadedAt: "2026-03-25 15:22", uploadedBy: "Receiving A" },
  { id: "doc-cbws-pod-rejected", ownerType: "delivery_record", ownerId: "del-cbws-reject", kind: "pod", fileName: "CBWS rejected POD.pdf", uploadedAt: "2025-11-18 18:05", uploadedBy: "Driver WH" },
  { id: "doc-fba-invoice-0139", ownerType: "invoice", ownerId: "inv-fba-2026-0139", kind: "invoice", fileName: "Invoice 2026-0139.pdf", uploadedAt: "2026-04-30 17:00", uploadedBy: "Finance" },
];

export const orderToCashTimelineEvents: TimelineEvent[] = [
  { id: "tl-zenith-lead", ownerType: "customer", ownerId: "cust-zenith", occurredAt: "2026-05-14 09:10", stage: "Lead", status: "submitted", title: "Inquiry received", note: "WeChat inquiry received from Zenith Marketplace.", actor: "Sales", level: "info" },
  { id: "tl-zenith-quote", ownerType: "customer", ownerId: "cust-zenith", occurredAt: "2026-05-18 15:30", stage: "Quotation", status: "pending_review", title: "Rate sheet sent", note: "Quote Q-2026-044 sent; customer requested prepaid review.", actor: "Sales", level: "warning" },
  { id: "tl-zenith-customs", ownerType: "shipment", ownerId: "ship-zenith-tllu4409123", occurredAt: "2026-05-27 10:20", stage: "Customs", status: "waiting_broker", title: "Customs document issue", note: "Commercial invoice correction required.", actor: "Broker Desk", level: "error" },
  { id: "tl-dryu-receiving", ownerType: "warehouse_receipt", ownerId: "recv-fba-dryu", occurredAt: "2026-03-25 14:00", stage: "Receiving", status: "exception", title: "Short 12 units", note: "Discrepancy report generated and billing held.", actor: "Receiving A", level: "error" },
  { id: "tl-cbws-return", ownerType: "return_record", ownerId: "ret-cbws-251118", occurredAt: "2025-11-18 18:05", stage: "Return", status: "waiting_customer", title: "Rejected delivery returned", note: "Customer approval needed for rejected delivery fee.", actor: "Returns Desk", level: "warning" },
  { id: "tl-cbws-ar", ownerType: "invoice", ownerId: "inv-cbws-2026-0141", occurredAt: "2026-06-07 09:00", stage: "Collections", status: "overdue", title: "AR overdue follow-up", note: "Invoice remains in 90+ aging.", actor: "Finance", level: "error" },
];

export const orderToCashIntegrationStatuses: IntegrationStatus[] = [
  { id: "sync-fba-customer-lx", ownerType: "customer", ownerId: "cust-fba-seller", system: "lingxing_wms", externalSystemId: "LX-FBA-1007", syncStatus: "synced", lastSyncTime: "2026-06-10 08:15", manualUpdateFlag: false },
  { id: "sync-zenith-customer-lx", ownerType: "customer", ownerId: "cust-zenith", system: "lingxing_wms", externalSystemId: "LX-ZEN-DRAFT", syncStatus: "manual", syncErrorMessage: "Pending final service agreement.", manualUpdateFlag: true },
  { id: "sync-hmmu-label-yc", ownerType: "customer_order", ownerId: "ord-fba-hmmu-yyz9", system: "yicang_elabel", externalSystemId: "YC-MAN-0427-11", syncStatus: "synced", lastSyncTime: "2026-04-27 17:40", manualUpdateFlag: false },
  { id: "sync-fba-invoice-qb", ownerType: "invoice", ownerId: "inv-fba-2026-0139", system: "quickbooks", externalSystemId: "QBO-2026-0139", syncStatus: "queued", manualUpdateFlag: false },
  { id: "sync-zenith-wechat", ownerType: "lead", ownerId: "lead-zenith-2026", system: "wechat_crm", externalSystemId: "WX-GRP-ZENITH", syncStatus: "manual", manualUpdateFlag: true },
];

export const orderToCashSeed: OrderToCashSeedData = {
  customers: orderToCashCustomers,
  leads: orderToCashLeads,
  quotations: orderToCashQuotations,
  serviceAgreements: orderToCashServiceAgreements,
  shipments: orderToCashShipments,
  customsDeclarations: orderToCashCustomsDeclarations,
  warehouseReceipts: orderToCashWarehouseReceipts,
  inventoryItems: orderToCashInventoryItems,
  customerOrders: orderToCashCustomerOrders,
  fulfillmentTasks: orderToCashFulfillmentTasks,
  carrierShipments: orderToCashCarrierShipments,
  deliveryRecords: orderToCashDeliveryRecords,
  returnRecords: orderToCashReturnRecords,
  invoices: orderToCashInvoices,
  payments: orderToCashPayments,
  arCollections: orderToCashARCollections,
  exceptionCases: orderToCashExceptionCases,
  documents: orderToCashDocuments,
  timelineEvents: orderToCashTimelineEvents,
  integrationStatuses: orderToCashIntegrationStatuses,
};
