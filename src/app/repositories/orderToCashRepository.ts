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
  InquirySource,
  InventoryItem,
  Invoice,
  Lead,
  OrderToCashEntityType,
  OrderToCashSeedData,
  Payment,
  Quotation,
  ReturnRecord,
  ServiceAgreement,
  ServiceType,
  Shipment,
  TimelineEvent,
  WarehouseReceipt,
  WorkflowStatus,
} from "../domain/orderToCashModels";
import { orderToCashSeed } from "../mocks/orderToCashSeed";

const STORAGE_KEY = "erp4pl.orderToCash.v1";

export interface OrderToCashCustomerGraph {
  customer: Customer;
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
  arCollections: ARCollection[];
  exceptionCases: ExceptionCase[];
  documents: DocumentLink[];
  timelineEvents: TimelineEvent[];
  integrationStatuses: IntegrationStatus[];
}

export interface OrderToCashShipmentGraph {
  shipment: Shipment;
  customer: Customer | null;
  customsDeclaration: CustomsDeclaration | null;
  warehouseReceipts: WarehouseReceipt[];
  inventoryItems: InventoryItem[];
  customerOrders: CustomerOrder[];
  fulfillmentTasks: FulfillmentTask[];
  carrierShipments: CarrierShipment[];
  deliveryRecords: DeliveryRecord[];
  returnRecords: ReturnRecord[];
  invoices: Invoice[];
  exceptionCases: ExceptionCase[];
  documents: DocumentLink[];
  timelineEvents: TimelineEvent[];
  integrationStatuses: IntegrationStatus[];
}

export interface OrderToCashRepository {
  getSnapshot(): OrderToCashSeedData;
  getLiveSnapshot(): OrderToCashSeedData;
  subscribe(listener: () => void): () => void;
  createCustomerLead(input: CreateCustomerLeadInput): Customer;
  createCustomerQuotation(input: CreateCustomerQuotationInput): Quotation;
  acceptCustomerQuotation(customerId: string): ServiceAgreement | null;
  completeCustomerOnboardingTask(customerId: string, task: CustomerOnboardingTask): Customer | null;
  createCustomerOperationalBooking(input: CreateCustomerOperationalBookingInput): CustomerOperationalBookingResult | null;
  listCustomers(): Customer[];
  listShipments(): Shipment[];
  listCustomerOrders(): CustomerOrder[];
  listInvoices(): Invoice[];
  listExceptionCases(): ExceptionCase[];
  listDocumentsFor(ownerType: OrderToCashEntityType, ownerId: string): DocumentLink[];
  listTimelineFor(ownerType: OrderToCashEntityType, ownerId: string): TimelineEvent[];
  listIntegrationStatusesFor(ownerType: OrderToCashEntityType, ownerId: string): IntegrationStatus[];
  getCustomerGraph(customerId: string): OrderToCashCustomerGraph | null;
  getShipmentGraph(shipmentId: string): OrderToCashShipmentGraph | null;
  syncFreightCustomsSubmitted(freightFileId: string): void;
  syncFreightRelease(freightFileId: string): void;
  syncAsnReceiving(asnId: string, patch: AsnBackbonePatch): void;
  syncDispatchStatus(dispatchId: string, status: WorkflowStatus, note: string): void;
  syncBillingStatus(queueId: string, status: WorkflowStatus, note: string): void;
  syncAccountingSyncStatus(syncId: string, status: IntegrationStatus["syncStatus"], note: string): void;
  issueInvoiceFromBillingQueue(input: BillingInvoiceInput): Invoice;
  updateInvoiceFinanceStatus(invoiceId: string, status: InvoiceFinanceStatus, note?: string): Invoice | null;
  markInvoicePaymentReceived(invoiceId: string, method?: PaymentMethod): Invoice | null;
}

export interface CreateCustomerLeadInput {
  companyName: string;
  contactPerson: string;
  contactEmail?: string;
  contactPhone?: string;
  source: InquirySource;
  inquiryChannel: Lead["inquiryChannel"];
  serviceTypes: ServiceType[];
  owner: string;
  billingTerms: string;
  requirementsSummary: string;
}

export interface CreateCustomerQuotationInput {
  customerId: string;
  rateSheetVersion: string;
  quotedAmountCad: number;
  quoteNote: string;
  owner?: string;
}

export type CustomerOnboardingTask = "wms_customer" | "billing_profile" | "communication_setup" | "operating_rules";

export interface CreateCustomerOperationalBookingInput {
  customerId: string;
  supplier?: string;
  poNumber?: string;
  containerNumber?: string;
  freightForwarder?: string;
  broker?: string;
  origin?: string;
  destination?: string;
  eta?: string;
  sku?: string;
  productName?: string;
  expectedQuantity?: number;
  warehouse?: "Whybank #10" | "Whybank #25";
}

export interface CustomerOperationalBookingResult {
  shipment: Shipment;
  customsDeclaration: CustomsDeclaration;
  warehouseReceipt: WarehouseReceipt;
}

export interface AsnBackbonePatch {
  stage: string;
  status: WorkflowStatus;
  title: string;
  note: string;
  receivedQuantity?: number;
  varianceQuantity?: number;
  condition?: "unchecked" | "good" | "damaged" | "mixed";
  storageLocation?: string;
  inventoryRecorded?: boolean;
  varianceResolved?: boolean;
}

export interface BillingInvoiceInput {
  queueId: string;
  customer: string;
  sourceType: string;
  sourceId: string;
  subtotalCad: number;
  taxCad: number;
  note: string;
}

export type InvoiceFinanceStatus = "pending" | "issued" | "paid" | "overdue";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function today() {
  return new Date().toLocaleDateString("en-CA");
}

function nowStamp() {
  return new Date().toLocaleString("en-CA");
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function futureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "customer";
}

function communicationSetupFor(channel: Lead["inquiryChannel"]): Customer["communicationSetup"] {
  if (channel === "wechat") return "wechat_group";
  if (channel === "email") return "email";
  return "not_started";
}

function loadInitialState(seedData: OrderToCashSeedData) {
  if (typeof window === "undefined") return clone(seedData);
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeState(JSON.parse(saved), seedData) : clone(seedData);
  } catch {
    return clone(seedData);
  }
}

function saveState(state: OrderToCashSeedData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable in restricted browser contexts.
  }
}

function mergeById<T extends { id: string }>(defaults: T[], saved: T[] | undefined): T[] {
  if (!Array.isArray(saved)) return clone(defaults);
  const savedById = new Map(saved.map((item) => [item.id, item]));
  const merged = defaults.map((item) => ({ ...item, ...savedById.get(item.id) }));
  const defaultIds = new Set(defaults.map((item) => item.id));
  return [...merged, ...saved.filter((item) => !defaultIds.has(item.id))];
}

function normalizeState(saved: Partial<OrderToCashSeedData>, seedData: OrderToCashSeedData): OrderToCashSeedData {
  return {
    customers: mergeById(seedData.customers, saved.customers),
    leads: mergeById(seedData.leads, saved.leads),
    quotations: mergeById(seedData.quotations, saved.quotations),
    serviceAgreements: mergeById(seedData.serviceAgreements, saved.serviceAgreements),
    shipments: mergeById(seedData.shipments, saved.shipments),
    customsDeclarations: mergeById(seedData.customsDeclarations, saved.customsDeclarations),
    warehouseReceipts: mergeById(seedData.warehouseReceipts, saved.warehouseReceipts),
    inventoryItems: mergeById(seedData.inventoryItems, saved.inventoryItems),
    customerOrders: mergeById(seedData.customerOrders, saved.customerOrders),
    fulfillmentTasks: mergeById(seedData.fulfillmentTasks, saved.fulfillmentTasks),
    carrierShipments: mergeById(seedData.carrierShipments, saved.carrierShipments),
    deliveryRecords: mergeById(seedData.deliveryRecords, saved.deliveryRecords),
    returnRecords: mergeById(seedData.returnRecords, saved.returnRecords),
    invoices: mergeById(seedData.invoices, saved.invoices),
    payments: mergeById(seedData.payments, saved.payments),
    arCollections: mergeById(seedData.arCollections, saved.arCollections),
    exceptionCases: mergeById(seedData.exceptionCases, saved.exceptionCases),
    documents: mergeById(seedData.documents, saved.documents),
    timelineEvents: mergeById(seedData.timelineEvents, saved.timelineEvents),
    integrationStatuses: mergeById(seedData.integrationStatuses, saved.integrationStatuses),
  };
}

function hasRelation(record: { relatedRecords: { type: OrderToCashEntityType; id: string }[] }, type: OrderToCashEntityType, id: string) {
  return record.relatedRecords.some((relation) => relation.type === type && relation.id === id);
}

function appendEntityIds(ids: Set<string>, records: { id: string }[]) {
  records.forEach((record) => ids.add(record.id));
}

function filterDocuments(seed: OrderToCashSeedData, ownerIds: Set<string>) {
  return seed.documents.filter((document) => ownerIds.has(document.ownerId));
}

function filterTimeline(seed: OrderToCashSeedData, ownerIds: Set<string>) {
  return seed.timelineEvents
    .filter((event) => ownerIds.has(event.ownerId))
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
}

function filterIntegrationStatuses(seed: OrderToCashSeedData, ownerIds: Set<string>) {
  return seed.integrationStatuses.filter((status) => ownerIds.has(status.ownerId));
}

export function createOrderToCashRepository(seedData: OrderToCashSeedData = orderToCashSeed): OrderToCashRepository {
  let state = loadInitialState(seedData);
  const listeners = new Set<() => void>();

  function publish(next: OrderToCashSeedData) {
    state = next;
    saveState(state);
    listeners.forEach((listener) => listener());
  }

  function appendTimeline(ownerType: OrderToCashEntityType, ownerId: string, input: { stage: string; status: WorkflowStatus; title: string; note: string; actor?: string; level?: TimelineEvent["level"] }) {
    const event: TimelineEvent = {
      id: `tl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ownerType,
      ownerId,
      occurredAt: nowStamp(),
      stage: input.stage,
      status: input.status,
      title: input.title,
      note: input.note,
      actor: input.actor ?? "Ops Team",
      level: input.level ?? (input.status === "exception" || input.status === "overdue" ? "error" : input.status === "completed" || input.status === "cleared" || input.status === "closed" ? "success" : "info"),
    };
    state = { ...state, timelineEvents: [event, ...state.timelineEvents] };
  }

  function shipmentForFreightFile(freightFileId: string) {
    if (freightFileId.includes("0503")) return state.shipments.find((shipment) => shipment.id.includes("zenith"));
    if (freightFileId.includes("0418") || freightFileId.toLowerCase().includes("dryu")) return state.shipments.find((shipment) => shipment.id.includes("dryu"));
    return state.shipments.find((shipment) => freightFileId.includes(shipment.eta.replace(/-/g, "")) || freightFileId.includes(shipment.shipmentId));
  }

  function receiptForAsn(asnId: string) {
    if (asnId.includes("ZEN")) return state.warehouseReceipts.find((receipt) => receipt.id.includes("zenith"));
    if (asnId.includes("DRYU")) return state.warehouseReceipts.find((receipt) => receipt.id.includes("dryu"));
    return state.warehouseReceipts.find((receipt) => asnId.includes(receipt.receivingId) || asnId.includes(receipt.id));
  }

  function orderForDispatch(dispatchId: string) {
    const normalized = dispatchId.replace(/^DSP-/, "");
    const lowerDispatchId = dispatchId.toLowerCase();
    return state.customerOrders.find((order) => {
      const orderTokens = order.orderId.toLowerCase().replace(/^ord-/, "").split("-");
      const relationMatch = order.relatedRecords.some((relation) =>
        relation.id.toLowerCase().split("-").some((part) => part.length >= 4 && lowerDispatchId.includes(part)),
      );
      return normalized.includes(order.orderId.replace(/^ORD-/, "")) ||
        lowerDispatchId.includes(order.id.toLowerCase()) ||
        orderTokens.some((part) => part.length >= 4 && lowerDispatchId.includes(part)) ||
        relationMatch;
    });
  }

  function invoiceForQueue(queueId: string) {
    const normalized = queueId.replace(/^BQ-/, "");
    return state.invoices.find((invoice) => normalized === invoice.invoiceId || queueId.includes(invoice.invoiceId) || invoice.relatedOrderIds.includes(normalized));
  }

  function invoiceByPublicId(invoiceId: string) {
    return state.invoices.find((invoice) => invoice.id === invoiceId || invoice.invoiceId === invoiceId);
  }

  function customerForName(customerName: string) {
    return state.customers.find((customer) =>
      customer.name === customerName ||
      customer.customerId === customerName ||
      customer.id === customerName ||
      customer.name.toLowerCase() === customerName.toLowerCase(),
    );
  }

  function invoiceStatusFromFinance(status: InvoiceFinanceStatus): WorkflowStatus {
    if (status === "paid") return "completed";
    if (status === "overdue") return "overdue";
    if (status === "issued") return "submitted";
    return "draft";
  }

  return {
    getSnapshot() {
      return clone(state);
    },

    getLiveSnapshot() {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    createCustomerLead(input) {
      const createdDate = today();
      const stamp = nowStamp();
      const suffix = Date.now().toString(36).slice(-5);
      const slug = slugify(input.companyName);
      const owner = input.owner.trim() || "Sales";
      const companyName = input.companyName.trim();
      const contactPerson = input.contactPerson.trim();
      const requirementsSummary = input.requirementsSummary.trim() || "New lead created from Customer Master.";
      const customerId = `CUST-${slug.toUpperCase().replace(/-/g, "")}-${suffix.toUpperCase()}`;
      const customerRecordId = `cust-${slug}-${suffix}`;
      const leadId = `lead-${slug}-${suffix}`;

      const customer: Customer = {
        id: customerRecordId,
        customerId,
        status: "draft",
        owner,
        responsiblePerson: contactPerson,
        createdDate,
        updatedDate: createdDate,
        notes: requirementsSummary,
        documentIds: [],
        relatedRecords: [{ type: "lead", id: leadId }],
        name: companyName,
        contactPerson,
        contactEmail: input.contactEmail?.trim() || undefined,
        contactPhone: input.contactPhone?.trim() || undefined,
        serviceTypes: input.serviceTypes,
        billingTerms: input.billingTerms.trim() || "Pending qualification",
        communicationSetup: communicationSetupFor(input.inquiryChannel),
        onboardingStatus: "draft",
        rateSheetVersion: "Draft",
        agreementStatus: "draft",
      };

      const lead: Lead = {
        id: leadId,
        customerId,
        status: "submitted",
        owner,
        responsiblePerson: contactPerson,
        createdDate,
        updatedDate: createdDate,
        notes: requirementsSummary,
        documentIds: [],
        relatedRecords: [{ type: "customer", id: customerRecordId }],
        source: input.source,
        companyName,
        contactPerson,
        requestedServices: input.serviceTypes,
        inquiryChannel: input.inquiryChannel,
        requirementsSummary,
        solutionDesignStatus: "draft",
      };

      const timeline: TimelineEvent = {
        id: `tl-${leadId}`,
        ownerType: "customer",
        ownerId: customerRecordId,
        occurredAt: stamp,
        stage: "Sales & Onboarding",
        status: "submitted",
        title: "Lead/customer profile created",
        note: requirementsSummary,
        actor: owner,
        level: "info",
      };

      const leadTimeline: TimelineEvent = {
        id: `tl-${leadId}-intake`,
        ownerType: "lead",
        ownerId: leadId,
        occurredAt: stamp,
        stage: "Lead Intake",
        status: "submitted",
        title: "Inquiry captured",
        note: `Inquiry from ${input.source.replace(/_/g, " ")} via ${input.inquiryChannel}.`,
        actor: owner,
        level: "info",
      };

      const integrationStatuses: IntegrationStatus[] = input.inquiryChannel === "wechat"
        ? [{
          id: `sync-${leadId}-wechat`,
          ownerType: "customer",
          ownerId: customerRecordId,
          system: "wechat_crm",
          externalSystemId: `WX-${slug.toUpperCase().replace(/-/g, "")}`,
          syncStatus: "manual",
          manualUpdateFlag: true,
        }]
        : [];

      publish({
        ...state,
        customers: [customer, ...state.customers],
        leads: [lead, ...state.leads],
        timelineEvents: [timeline, leadTimeline, ...state.timelineEvents],
        integrationStatuses: [...integrationStatuses, ...state.integrationStatuses],
      });

      return clone(customer);
    },

    createCustomerQuotation(input) {
      const customer = state.customers.find((item) => item.customerId === input.customerId || item.id === input.customerId || item.name === input.customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${input.customerId}`);
      }
      const createdDate = today();
      const stamp = nowStamp();
      const suffix = Date.now().toString(36).slice(-5);
      const lead = state.leads.find((item) => item.customerId === customer.customerId || hasRelation(item, "customer", customer.id));
      const rateSheetVersion = input.rateSheetVersion.trim() || `Quote-${customer.customerId}-${suffix.toUpperCase()}`;
      const owner = input.owner?.trim() || customer.owner || "Sales Team";

      const quotation: Quotation = {
        id: `quote-${slugify(customer.name)}-${suffix}`,
        customerId: customer.customerId,
        status: "submitted",
        owner,
        responsiblePerson: customer.contactPerson,
        createdDate,
        updatedDate: createdDate,
        notes: input.quoteNote,
        documentIds: [],
        relatedRecords: [
          { type: "customer", id: customer.id },
          ...(lead ? [{ type: "lead" as OrderToCashEntityType, id: lead.id }] : []),
        ],
        leadId: lead?.id ?? "",
        rateSheetVersion,
        quoteStatus: "sent",
        quotedAmountCad: input.quotedAmountCad,
        validUntil: futureDate(30),
      };

      const timeline: TimelineEvent = {
        id: `tl-${quotation.id}`,
        ownerType: "customer",
        ownerId: customer.id,
        occurredAt: stamp,
        stage: "Quotation",
        status: "submitted",
        title: "Quote / rate card prepared",
        note: `${rateSheetVersion}: CAD $${Math.round(input.quotedAmountCad).toLocaleString("en-CA")}. ${input.quoteNote}`,
        actor: owner,
        level: "info",
      };

      publish({
        ...state,
        quotations: [quotation, ...state.quotations],
        customers: state.customers.map((item) => item.id === customer.id ? {
          ...item,
          status: "submitted",
          updatedDate: createdDate,
          rateSheetVersion,
          agreementStatus: "pending_review",
          notes: input.quoteNote || item.notes,
          relatedRecords: item.relatedRecords.some((record) => record.id === quotation.id)
            ? item.relatedRecords
            : [...item.relatedRecords, { type: "quotation", id: quotation.id }],
        } : item),
        timelineEvents: [timeline, ...state.timelineEvents],
      });

      return clone(quotation);
    },

    acceptCustomerQuotation(customerId) {
      const customer = state.customers.find((item) => item.customerId === customerId || item.id === customerId || item.name === customerId);
      if (!customer) return null;

      const quotation = state.quotations
        .filter((item) => item.customerId === customer.customerId)
        .sort((left, right) => right.createdDate.localeCompare(left.createdDate) || right.id.localeCompare(left.id))[0];
      if (!quotation) return null;

      const createdDate = today();
      const stamp = nowStamp();
      const suffix = Date.now().toString(36).slice(-5);
      const agreement: ServiceAgreement = {
        id: `sa-${slugify(customer.name)}-${suffix}`,
        customerId: customer.customerId,
        status: "completed",
        owner: customer.owner,
        responsiblePerson: customer.contactPerson,
        createdDate,
        updatedDate: createdDate,
        notes: `Accepted ${quotation.rateSheetVersion}. Onboarding setup started for WMS, billing, and customer communication.`,
        documentIds: [],
        relatedRecords: [
          { type: "customer", id: customer.id },
          { type: "quotation", id: quotation.id },
        ],
        quotationId: quotation.id,
        agreementStatus: "completed",
        signedDate: createdDate,
        billingTerms: customer.billingTerms,
        wmsSetupStatus: customer.wmsCustomerId ? "completed" : "in_progress",
        accountSetupStatus: customer.quickBooksCustomerId ? "completed" : "in_progress",
      };

      const timelineEvents: TimelineEvent[] = [
        {
          id: `tl-${agreement.id}-accepted`,
          ownerType: "customer",
          ownerId: customer.id,
          occurredAt: stamp,
          stage: "Service Agreement",
          status: "completed",
          title: "Quote accepted / service agreement signed",
          note: `${quotation.rateSheetVersion} accepted. Service agreement created and onboarding can begin.`,
          actor: customer.owner,
          level: "success",
        },
        {
          id: `tl-${agreement.id}-onboarding`,
          ownerType: "customer",
          ownerId: customer.id,
          occurredAt: stamp,
          stage: "Customer Onboarding",
          status: "in_progress",
          title: "Onboarding setup started",
          note: "Create WMS customer, billing profile, communication channel, and service operating rules.",
          actor: "Ops Team",
          level: "info",
        },
      ];

      const existingCustomerIntegrations = new Set(
        state.integrationStatuses
          .filter((item) => item.ownerType === "customer" && item.ownerId === customer.id)
          .map((item) => item.system),
      );
      const onboardingIntegrations: IntegrationStatus[] = [
        !existingCustomerIntegrations.has("lingxing_wms") ? {
          id: `sync-${agreement.id}-wms`,
          ownerType: "customer",
          ownerId: customer.id,
          system: "lingxing_wms",
          syncStatus: "queued",
          manualUpdateFlag: false,
        } : null,
        !existingCustomerIntegrations.has("quickbooks") ? {
          id: `sync-${agreement.id}-qb`,
          ownerType: "customer",
          ownerId: customer.id,
          system: "quickbooks",
          syncStatus: "queued",
          manualUpdateFlag: false,
        } : null,
      ].filter(Boolean) as IntegrationStatus[];

      publish({
        ...state,
        serviceAgreements: [agreement, ...state.serviceAgreements],
        quotations: state.quotations.map((item) => item.id === quotation.id ? {
          ...item,
          status: "completed",
          quoteStatus: "accepted",
          updatedDate: createdDate,
        } : item),
        customers: state.customers.map((item) => item.id === customer.id ? {
          ...item,
          status: "in_progress",
          updatedDate: createdDate,
          onboardingStatus: "in_progress",
          agreementStatus: "completed",
          relatedRecords: [
            ...item.relatedRecords.filter((record) => record.id !== agreement.id),
            { type: "service_agreement", id: agreement.id },
          ],
        } : item),
        timelineEvents: [...timelineEvents, ...state.timelineEvents],
        integrationStatuses: [...onboardingIntegrations, ...state.integrationStatuses],
      });

      return clone(agreement);
    },

    completeCustomerOnboardingTask(customerId, task) {
      const customer = state.customers.find((item) => item.customerId === customerId || item.id === customerId || item.name === customerId);
      if (!customer) return null;

      const updatedDate = today();
      const stamp = nowStamp();
      const latestAgreement = state.serviceAgreements
        .filter((item) => item.customerId === customer.customerId)
        .sort((left, right) => right.createdDate.localeCompare(left.createdDate) || right.id.localeCompare(left.id))[0];
      const taskMeta: Record<CustomerOnboardingTask, { title: string; note: string; system?: IntegrationStatus["system"] }> = {
        wms_customer: {
          title: "WMS customer setup completed",
          note: "LingXing WMS customer profile, warehouse service scope, and receiving rules are configured.",
          system: "lingxing_wms",
        },
        billing_profile: {
          title: "Billing profile setup completed",
          note: "QuickBooks customer profile, billing terms, taxes, and invoice routing are configured.",
          system: "quickbooks",
        },
        communication_setup: {
          title: "Customer communication setup completed",
          note: "Customer communication channel, escalation contacts, and operations owner are confirmed.",
          system: "wechat_crm",
        },
        operating_rules: {
          title: "Operating rules confirmed",
          note: "Service instructions, rate application rules, exception handling, and warehouse/TMS handoff rules are confirmed.",
        },
      };
      const meta = taskMeta[task];
      const wmsCustomerId = task === "wms_customer" ? customer.wmsCustomerId ?? `LX-${customer.customerId}` : customer.wmsCustomerId;
      const quickBooksCustomerId = task === "billing_profile" ? customer.quickBooksCustomerId ?? `QB-${customer.customerId}` : customer.quickBooksCustomerId;
      const communicationSetup = task === "communication_setup" ? "complete" : customer.communicationSetup;
      const existingOperatingRulesDone = state.timelineEvents.some((event) => event.ownerType === "customer" && event.ownerId === customer.id && event.title === taskMeta.operating_rules.title);
      const operatingRulesDone = task === "operating_rules" || existingOperatingRulesDone;
      const onboardingCompleted = Boolean(wmsCustomerId && quickBooksCustomerId && communicationSetup !== "not_started" && customer.agreementStatus === "completed" && customer.rateSheetVersion && operatingRulesDone);

      const timeline: TimelineEvent = {
        id: `tl-onboarding-${task}-${Date.now()}`,
        ownerType: "customer",
        ownerId: customer.id,
        occurredAt: stamp,
        stage: "Customer Onboarding",
        status: "completed",
        title: meta.title,
        note: meta.note,
        actor: "Ops Team",
        level: "success",
      };

      const integrationStatuses = meta.system
        ? state.integrationStatuses.some((item) => item.ownerType === "customer" && item.ownerId === customer.id && item.system === meta.system)
          ? state.integrationStatuses.map((item) => item.ownerType === "customer" && item.ownerId === customer.id && item.system === meta.system ? {
            ...item,
            externalSystemId: meta.system === "lingxing_wms" ? wmsCustomerId : meta.system === "quickbooks" ? quickBooksCustomerId : item.externalSystemId,
            syncStatus: "synced" as const,
            lastSyncTime: stamp,
            manualUpdateFlag: false,
          } : item)
          : [{
            id: `sync-${customer.id}-${meta.system}-${Date.now()}`,
            ownerType: "customer" as const,
            ownerId: customer.id,
            system: meta.system,
            externalSystemId: meta.system === "lingxing_wms" ? wmsCustomerId : meta.system === "quickbooks" ? quickBooksCustomerId : undefined,
            syncStatus: "synced" as const,
            lastSyncTime: stamp,
            manualUpdateFlag: false,
          }, ...state.integrationStatuses]
        : state.integrationStatuses;

      const nextCustomer: Customer = {
        ...customer,
        status: onboardingCompleted ? "completed" : "in_progress",
        updatedDate,
        wmsCustomerId,
        quickBooksCustomerId,
        communicationSetup,
        onboardingStatus: onboardingCompleted ? "completed" : "in_progress",
        notes: task === "operating_rules" ? `${customer.notes}\n${meta.note}`.trim() : customer.notes,
      };

      publish({
        ...state,
        customers: state.customers.map((item) => item.id === customer.id ? nextCustomer : item),
        serviceAgreements: state.serviceAgreements.map((item) => item.id === latestAgreement?.id ? {
          ...item,
          updatedDate,
          wmsSetupStatus: task === "wms_customer" ? "completed" : item.wmsSetupStatus,
          accountSetupStatus: task === "billing_profile" ? "completed" : item.accountSetupStatus,
        } : item),
        timelineEvents: [timeline, ...state.timelineEvents],
        integrationStatuses,
      });

      return clone(nextCustomer);
    },

    createCustomerOperationalBooking(input) {
      const customer = state.customers.find((item) => item.customerId === input.customerId || item.id === input.customerId || item.name === input.customerId);
      if (!customer) return null;

      const createdDate = today();
      const stamp = nowStamp();
      const suffix = Date.now().toString(36).slice(-5);
      const customerSlug = slugify(customer.name);
      const eta = input.eta ?? futureDate(21);
      const poNumber = input.poNumber?.trim() || `PO-${customer.customerId}-${suffix.toUpperCase()}`;
      const containerNumber = input.containerNumber?.trim() || `CNT${suffix.toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
      const warehouse = input.warehouse ?? "Whybank #25";
      const shipment: Shipment = {
        id: `ship-${customerSlug}-${suffix}`,
        customerId: customer.customerId,
        status: "submitted",
        owner: "Freight Team",
        responsiblePerson: customer.owner,
        createdDate,
        updatedDate: createdDate,
        notes: "Customer booking created after onboarding. Freight documents pending.",
        documentIds: [],
        relatedRecords: [{ type: "customer", id: customer.id }],
        shipmentId: containerNumber,
        supplier: input.supplier?.trim() || `${customer.name} Supplier`,
        poNumber,
        freightForwarder: input.freightForwarder?.trim() || "Forwarder TBD",
        broker: input.broker?.trim() || "Broker TBD",
        transportMode: "sea",
        origin: input.origin?.trim() || "Port of Vancouver",
        destination: input.destination?.trim() || `${warehouse} Receiving`,
        eta,
        bolAwbNumber: `BOL-${suffix.toUpperCase()}`,
        customsStatus: "draft",
        exceptionNotes: "Documents pending from customer / broker.",
      };

      const customsDeclaration: CustomsDeclaration = {
        id: `cd-${customerSlug}-${suffix}`,
        customerId: customer.customerId,
        status: "draft",
        owner: "Broker Team",
        responsiblePerson: shipment.broker,
        createdDate,
        updatedDate: createdDate,
        notes: "Customs declaration shell created from customer booking.",
        documentIds: [],
        relatedRecords: [
          { type: "customer", id: customer.id },
          { type: "shipment", id: shipment.id },
        ],
        shipmentId: shipment.id,
        broker: shipment.broker,
        declarationNumber: `DEC-${suffix.toUpperCase()}`,
        customsStatus: "draft",
      };

      const warehouseReceipt: WarehouseReceipt = {
        id: `wr-${customerSlug}-${suffix}`,
        customerId: customer.customerId,
        status: "waiting_broker",
        owner: "WMS Team",
        responsiblePerson: customer.owner,
        createdDate,
        updatedDate: createdDate,
        notes: "ASN staged from customer booking. Receiving remains gated until customs release.",
        documentIds: [],
        relatedRecords: [
          { type: "customer", id: customer.id },
          { type: "shipment", id: shipment.id },
          { type: "customs_declaration", id: customsDeclaration.id },
        ],
        receivingId: `RCV-${suffix.toUpperCase()}`,
        shipmentId: shipment.id,
        sku: input.sku?.trim() || `SKU-${customerSlug.toUpperCase().slice(0, 8)}`,
        productName: input.productName?.trim() || `${customer.name} inbound goods`,
        expectedQuantity: input.expectedQuantity ?? 1000,
        receivedQuantity: 0,
        damagedQuantity: 0,
        shortageOverageQuantity: 0,
        inspectionStatus: "draft",
        discrepancyStatus: "draft",
        storageLocation: `${warehouse.replace(/\s|#/g, "").toUpperCase()}-STAGE`,
        putawayStatus: "draft",
        wmsInventoryStatus: "draft",
        cycleCountStatus: "draft",
      };

      const timelineEvents: TimelineEvent[] = [
        {
          id: `tl-${shipment.id}-booking`,
          ownerType: "customer",
          ownerId: customer.id,
          occurredAt: stamp,
          stage: "Shipment Booking",
          status: "submitted",
          title: "First operational booking created",
          note: `${poNumber} / ${containerNumber} created and routed to Freight & Customs plus ASN Receiving.`,
          actor: "Ops Team",
          level: "info",
        },
        {
          id: `tl-${shipment.id}-freight`,
          ownerType: "shipment",
          ownerId: shipment.id,
          occurredAt: stamp,
          stage: "Freight & Customs",
          status: "submitted",
          title: "Freight file opened",
          note: "Collect BOL/AWB, manifest, broker documents, and customs declaration before warehouse release.",
          actor: "Freight Team",
          level: "info",
        },
        {
          id: `tl-${warehouseReceipt.id}-asn`,
          ownerType: "warehouse_receipt",
          ownerId: warehouseReceipt.id,
          occurredAt: stamp,
          stage: "ASN Receiving",
          status: "waiting_broker",
          title: "ASN staged from customer booking",
          note: "Receiving, inspection, and WMS inventory recording are gated by customs release.",
          actor: "WMS Team",
          level: "warning",
        },
      ];

      const linkedCustomerRecords = [
        ...customer.relatedRecords,
        { type: "shipment" as const, id: shipment.id },
        { type: "customs_declaration" as const, id: customsDeclaration.id },
        { type: "warehouse_receipt" as const, id: warehouseReceipt.id },
      ];

      publish({
        ...state,
        customers: state.customers.map((item) => item.id === customer.id ? {
          ...item,
          status: item.status === "completed" ? item.status : "in_progress",
          updatedDate: createdDate,
          relatedRecords: linkedCustomerRecords,
        } : item),
        shipments: [shipment, ...state.shipments],
        customsDeclarations: [customsDeclaration, ...state.customsDeclarations],
        warehouseReceipts: [warehouseReceipt, ...state.warehouseReceipts],
        timelineEvents: [...timelineEvents, ...state.timelineEvents],
      });

      return clone({ shipment, customsDeclaration, warehouseReceipt });
    },

    listCustomers() {
      return clone(state.customers);
    },

    listShipments() {
      return clone(state.shipments);
    },

    listCustomerOrders() {
      return clone(state.customerOrders);
    },

    listInvoices() {
      return clone(state.invoices);
    },

    listExceptionCases() {
      return clone(state.exceptionCases);
    },

    listDocumentsFor(ownerType, ownerId) {
      return clone(state.documents.filter((document) => document.ownerType === ownerType && document.ownerId === ownerId));
    },

    listTimelineFor(ownerType, ownerId) {
      return clone(
        state.timelineEvents
          .filter((event) => event.ownerType === ownerType && event.ownerId === ownerId)
          .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)),
      );
    },

    listIntegrationStatusesFor(ownerType, ownerId) {
      return clone(state.integrationStatuses.filter((status) => status.ownerType === ownerType && status.ownerId === ownerId));
    },

    getCustomerGraph(customerId) {
      const customer = state.customers.find((candidate) => candidate.id === customerId || candidate.customerId === customerId);

      if (!customer) {
        return null;
      }

      const leads = state.leads.filter((lead) => lead.customerId === customer.customerId || hasRelation(lead, "customer", customer.id));
      const quotations = state.quotations.filter((quotation) => quotation.customerId === customer.customerId);
      const serviceAgreements = state.serviceAgreements.filter((agreement) => agreement.customerId === customer.customerId);
      const shipments = state.shipments.filter((shipment) => shipment.customerId === customer.customerId);
      const shipmentIds = new Set(shipments.map((shipment) => shipment.id));
      const customsDeclarations = state.customsDeclarations.filter((declaration) => shipmentIds.has(declaration.shipmentId) || declaration.customerId === customer.customerId);
      const warehouseReceipts = state.warehouseReceipts.filter((receipt) => shipmentIds.has(receipt.shipmentId) || receipt.customerId === customer.customerId);
      const receiptIds = new Set(warehouseReceipts.map((receipt) => receipt.id));
      const inventoryItems = state.inventoryItems.filter((item) => receiptIds.has(item.warehouseReceiptId) || item.customerId === customer.customerId);
      const customerOrders = state.customerOrders.filter((order) => order.customerId === customer.customerId);
      const orderIds = new Set(customerOrders.map((order) => order.id));
      const fulfillmentTasks = state.fulfillmentTasks.filter((task) => orderIds.has(task.orderId) || task.customerId === customer.customerId);
      const carrierShipments = state.carrierShipments.filter((carrierShipment) => orderIds.has(carrierShipment.orderId) || carrierShipment.customerId === customer.customerId);
      const deliveryRecords = state.deliveryRecords.filter((delivery) => orderIds.has(delivery.orderId) || delivery.customerId === customer.customerId);
      const returnRecords = state.returnRecords.filter((returnRecord) => orderIds.has(returnRecord.orderId) || returnRecord.customerId === customer.customerId);
      const invoices = state.invoices.filter((invoice) => invoice.customerId === customer.customerId);
      const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
      const payments = state.payments.filter((payment) => invoiceIds.has(payment.invoiceId) || payment.customerId === customer.customerId);
      const arCollections = state.arCollections.filter((collection) => invoiceIds.has(collection.invoiceId) || collection.customerId === customer.customerId);
      const exceptionCases = state.exceptionCases.filter((exceptionCase) => exceptionCase.customerId === customer.customerId);

      const ownerIds = new Set<string>([customer.id]);
      [
        leads,
        quotations,
        serviceAgreements,
        shipments,
        customsDeclarations,
        warehouseReceipts,
        inventoryItems,
        customerOrders,
        fulfillmentTasks,
        carrierShipments,
        deliveryRecords,
        returnRecords,
        invoices,
        payments,
        arCollections,
        exceptionCases,
      ].forEach((records) => appendEntityIds(ownerIds, records));

      return clone({
        customer,
        leads,
        quotations,
        serviceAgreements,
        shipments,
        customsDeclarations,
        warehouseReceipts,
        inventoryItems,
        customerOrders,
        fulfillmentTasks,
        carrierShipments,
        deliveryRecords,
        returnRecords,
        invoices,
        payments,
        arCollections,
        exceptionCases,
        documents: filterDocuments(state, ownerIds),
        timelineEvents: filterTimeline(state, ownerIds),
        integrationStatuses: filterIntegrationStatuses(state, ownerIds),
      });
    },

    getShipmentGraph(shipmentId) {
      const shipment = state.shipments.find((candidate) => candidate.id === shipmentId || candidate.shipmentId === shipmentId);

      if (!shipment) {
        return null;
      }

      const customer = state.customers.find((candidate) => candidate.customerId === shipment.customerId) ?? null;
      const customsDeclaration = state.customsDeclarations.find((declaration) => declaration.shipmentId === shipment.id) ?? null;
      const warehouseReceipts = state.warehouseReceipts.filter((receipt) => receipt.shipmentId === shipment.id);
      const receiptIds = new Set(warehouseReceipts.map((receipt) => receipt.id));
      const inventoryItems = state.inventoryItems.filter((item) => receiptIds.has(item.warehouseReceiptId));
      const customerOrders = state.customerOrders.filter((order) => hasRelation(order, "shipment", shipment.id));
      const orderIds = new Set(customerOrders.map((order) => order.id));
      const fulfillmentTasks = state.fulfillmentTasks.filter((task) => orderIds.has(task.orderId));
      const carrierShipments = state.carrierShipments.filter((carrierShipment) => orderIds.has(carrierShipment.orderId));
      const deliveryRecords = state.deliveryRecords.filter((delivery) => orderIds.has(delivery.orderId));
      const returnRecords = state.returnRecords.filter((returnRecord) => orderIds.has(returnRecord.orderId));
      const invoices = state.invoices.filter((invoice) => invoice.relatedShipmentIds.includes(shipment.id) || invoice.relatedOrderIds.some((orderId) => orderIds.has(orderId)));
      const exceptionCases = state.exceptionCases.filter(
        (exceptionCase) => exceptionCase.relatedShipmentId === shipment.id || exceptionCase.relatedOrderId !== undefined && orderIds.has(exceptionCase.relatedOrderId) || hasRelation(exceptionCase, "shipment", shipment.id),
      );

      const ownerIds = new Set<string>([shipment.id]);
      if (customsDeclaration) {
        ownerIds.add(customsDeclaration.id);
      }
      [
        warehouseReceipts,
        inventoryItems,
        customerOrders,
        fulfillmentTasks,
        carrierShipments,
        deliveryRecords,
        returnRecords,
        invoices,
        exceptionCases,
      ].forEach((records) => appendEntityIds(ownerIds, records));

      return clone({
        shipment,
        customer,
        customsDeclaration,
        warehouseReceipts,
        inventoryItems,
        customerOrders,
        fulfillmentTasks,
        carrierShipments,
        deliveryRecords,
        returnRecords,
        invoices,
        exceptionCases,
        documents: filterDocuments(state, ownerIds),
        timelineEvents: filterTimeline(state, ownerIds),
        integrationStatuses: filterIntegrationStatuses(state, ownerIds),
      });
    },

    syncFreightCustomsSubmitted(freightFileId) {
      const shipment = shipmentForFreightFile(freightFileId);
      if (!shipment) return;
      const submittedDate = today();
      const customsDeclaration = state.customsDeclarations.find((declaration) => declaration.shipmentId === shipment.id);
      appendTimeline("shipment", shipment.id, {
        stage: "Freight & Customs",
        status: "submitted",
        title: "Freight documents submitted for customs",
        note: `Freight file ${freightFileId} documents are complete and customs declaration is under broker review.`,
        actor: "Freight Team",
      });
      publish({
        ...state,
        shipments: state.shipments.map((item) => item.id === shipment.id ? {
          ...item,
          status: "pending_review",
          customsStatus: "submitted",
          updatedDate: submittedDate,
          exceptionNotes: "Documents submitted; awaiting customs release.",
        } : item),
        customsDeclarations: state.customsDeclarations.map((item) => item.id === customsDeclaration?.id ? {
          ...item,
          status: "submitted",
          customsStatus: "submitted",
          submittedDate,
          updatedDate: submittedDate,
          notes: "Customs declaration submitted to broker.",
        } : item),
        warehouseReceipts: state.warehouseReceipts.map((item) => item.shipmentId === shipment.id ? {
          ...item,
          status: item.status === "waiting_broker" ? "waiting_broker" : item.status,
          notes: item.notes || `Freight file ${freightFileId} submitted; receiving still requires customs release.`,
          updatedDate: submittedDate,
        } : item),
      });
    },

    syncFreightRelease(freightFileId) {
      const shipment = shipmentForFreightFile(freightFileId);
      if (!shipment) return;
      const releasedDate = today();
      const customsDeclaration = state.customsDeclarations.find((declaration) => declaration.shipmentId === shipment.id);
      appendTimeline("shipment", shipment.id, {
        stage: "Freight & Customs",
        status: "cleared",
        title: "Freight released to ASN receiving",
        note: `Freight file ${freightFileId} cleared customs and unlocked warehouse receiving.`,
      });
      publish({
        ...state,
        shipments: state.shipments.map((item) => item.id === shipment.id ? {
          ...item,
          status: item.status === "closed" ? item.status : "cleared",
          customsStatus: "cleared",
          customsReleaseDate: releasedDate,
          updatedDate: releasedDate,
          exceptionNotes: item.exceptionNotes === "None" ? item.exceptionNotes : "Released to warehouse receiving.",
        } : item),
        customsDeclarations: state.customsDeclarations.map((item) => item.id === customsDeclaration?.id ? {
          ...item,
          status: "cleared",
          customsStatus: "cleared",
          clearedDate: releasedDate,
          updatedDate: releasedDate,
        } : item),
        warehouseReceipts: state.warehouseReceipts.map((item) => item.shipmentId === shipment.id && item.status === "waiting_broker" ? {
          ...item,
          status: "submitted",
          updatedDate: releasedDate,
          notes: item.notes || `Freight file ${freightFileId} released; receiving can start.`,
        } : item),
      });
    },

    syncAsnReceiving(asnId, patch) {
      const receipt = receiptForAsn(asnId);
      if (!receipt) return;
      const updatedDate = today();
      const damagedQuantity = patch.condition === "damaged" ? Math.max(1, receipt.damagedQuantity) : receipt.damagedQuantity;
      appendTimeline("warehouse_receipt", receipt.id, {
        stage: patch.stage,
        status: patch.status,
        title: patch.title,
        note: patch.note,
        level: patch.status === "exception" ? "error" : patch.inventoryRecorded ? "success" : "info",
      });
      const updatedReceipt: WarehouseReceipt = {
        ...receipt,
        status: patch.status,
        updatedDate,
        receivedQuantity: patch.receivedQuantity ?? receipt.receivedQuantity,
        shortageOverageQuantity: patch.varianceQuantity ?? receipt.shortageOverageQuantity,
        damagedQuantity,
        inspectionStatus: patch.varianceResolved ? "completed" : patch.status === "in_progress" ? "in_progress" : patch.status === "exception" ? "exception" : receipt.inspectionStatus,
        discrepancyStatus: patch.status === "exception" ? "exception" : patch.varianceResolved ? "completed" : receipt.discrepancyStatus,
        putawayStatus: patch.inventoryRecorded ? "completed" : patch.varianceResolved ? "in_progress" : receipt.putawayStatus,
        wmsInventoryStatus: patch.inventoryRecorded ? "completed" : receipt.wmsInventoryStatus,
        storageLocation: patch.storageLocation ?? receipt.storageLocation,
        inventoryAvailableDate: patch.inventoryRecorded ? updatedDate : receipt.inventoryAvailableDate,
        notes: patch.note,
      };
      const nextInventoryItems = patch.inventoryRecorded
        ? state.inventoryItems.some((item) => item.warehouseReceiptId === receipt.id)
          ? state.inventoryItems.map((item) => item.warehouseReceiptId === receipt.id ? {
            ...item,
            status: "completed" as WorkflowStatus,
            updatedDate,
            storageLocation: patch.storageLocation ?? receipt.storageLocation,
            onHandQuantity: updatedReceipt.receivedQuantity,
            availableQuantity: Math.max(0, updatedReceipt.receivedQuantity - updatedReceipt.damagedQuantity),
            damagedQuantity: updatedReceipt.damagedQuantity,
          } : item)
          : [...state.inventoryItems, {
            id: `inv-${receipt.id}`,
            customerId: receipt.customerId,
            status: "completed" as WorkflowStatus,
            owner: "WMS Team",
            createdDate: updatedDate,
            updatedDate,
            notes: `Created from ${asnId}.`,
            documentIds: [],
            relatedRecords: [{ type: "warehouse_receipt" as OrderToCashEntityType, id: receipt.id }],
            warehouseReceiptId: receipt.id,
            sku: receipt.sku,
            productName: receipt.productName,
            warehouse: patch.storageLocation?.startsWith("WB10") ? "Whybank #10" : "Whybank #25",
            storageLocation: patch.storageLocation ?? receipt.storageLocation,
            onHandQuantity: updatedReceipt.receivedQuantity,
            availableQuantity: Math.max(0, updatedReceipt.receivedQuantity - updatedReceipt.damagedQuantity),
            reservedQuantity: 0,
            damagedQuantity: updatedReceipt.damagedQuantity,
            wmsInventoryId: `LX-${receipt.receivingId}`,
          }]
        : state.inventoryItems;
      publish({
        ...state,
        warehouseReceipts: state.warehouseReceipts.map((item) => item.id === receipt.id ? updatedReceipt : item),
        inventoryItems: nextInventoryItems,
      });
    },

    syncDispatchStatus(dispatchId, status, note) {
      const order = orderForDispatch(dispatchId);
      if (!order) return;
      const updatedDate = today();
      appendTimeline("customer_order", order.id, {
        stage: "TMS Dispatch",
        status,
        title: `Dispatch ${dispatchId} updated`,
        note,
      });
      publish({
        ...state,
        customerOrders: state.customerOrders.map((item) => item.id === order.id ? {
          ...item,
          status,
          fulfillmentStatus: status,
          updatedDate,
          notes: note,
        } : item),
        deliveryRecords: state.deliveryRecords.map((item) => item.orderId === order.id ? {
          ...item,
          status,
          deliveryStatus: status,
          podStatus: status === "completed" ? "completed" : item.podStatus,
          customerNotificationStatus: status === "completed" ? "completed" : item.customerNotificationStatus,
          updatedDate,
          notes: note,
        } : item),
      });
    },

    syncBillingStatus(queueId, status, note) {
      const invoice = invoiceForQueue(queueId);
      if (!invoice) return;
      const updatedDate = today();
      appendTimeline("invoice", invoice.id, {
        stage: "Finance",
        status,
        title: `Billing queue ${queueId} updated`,
        note,
      });
      publish({
        ...state,
        invoices: state.invoices.map((item) => item.id === invoice.id ? {
          ...item,
          status,
          paymentClearedStatus: status === "completed" ? "completed" : item.paymentClearedStatus,
          collectionStatus: status === "exception" ? "exception" : item.collectionStatus,
          reconciliationStatus: status === "completed" ? "completed" : status === "exception" ? "exception" : item.reconciliationStatus,
          updatedDate,
          notes: note,
        } : item),
      });
    },

    issueInvoiceFromBillingQueue(input) {
      const updatedDate = today();
      const stamp = nowStamp();
      const customer = customerForName(input.customer);
      const dispatchOrder = input.sourceType === "transport" ? orderForDispatch(input.sourceId) : undefined;
      const invoiceBase = input.queueId.replace(/^BQ-/, "");
      const invoiceId = invoiceBase.startsWith("INV-") ? invoiceBase : `INV-${invoiceBase}`;
      const internalId = `inv-${invoiceId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
      const existing = invoiceByPublicId(invoiceId) ?? invoiceForQueue(input.queueId);
      const subtotalCad = Math.max(0, money(input.subtotalCad));
      const taxCadValue = Math.max(0, money(input.taxCad));
      const relatedOrderIds = dispatchOrder ? [dispatchOrder.id] : input.sourceType === "transport" ? [input.sourceId] : [];
      const relatedShipmentIds = input.sourceType === "customs" || input.sourceType === "handling" || input.sourceType === "storage" ? [input.sourceId] : [];
      const customerId = customer?.customerId ?? input.customer;
      const invoice: Invoice = {
        id: existing?.id ?? internalId,
        customerId,
        status: "submitted",
        owner: existing?.owner ?? "Finance",
        responsiblePerson: existing?.responsiblePerson ?? "Finance Team",
        createdDate: existing?.createdDate ?? updatedDate,
        updatedDate,
        notes: input.note || `Issued from billing queue ${input.queueId}.`,
        documentIds: existing?.documentIds ?? [],
        relatedRecords: [
          ...(customer ? [{ type: "customer" as const, id: customer.id }] : []),
          ...(dispatchOrder ? [{ type: "customer_order" as const, id: dispatchOrder.id }] : []),
        ],
        invoiceId,
        relatedShipmentIds: existing?.relatedShipmentIds?.length ? existing.relatedShipmentIds : relatedShipmentIds,
        relatedOrderIds: existing?.relatedOrderIds?.length ? existing.relatedOrderIds : relatedOrderIds,
        invoiceType: "transaction_based",
        invoiceAmountCad: subtotalCad,
        taxCad: taxCadValue,
        invoiceDate: updatedDate,
        dueDate: futureDate(30),
        paymentMethod: existing?.paymentMethod,
        paymentReceivedDate: existing?.paymentReceivedDate,
        paymentClearedStatus: existing?.paymentClearedStatus ?? "pending_review",
        arAgingBucket: existing?.arAgingBucket ?? "current",
        collectionStatus: existing?.collectionStatus ?? "in_progress",
        quickBooksReferenceNumber: existing?.quickBooksReferenceNumber,
        reconciliationStatus: existing?.reconciliationStatus ?? "pending_review",
      };
      const integration: IntegrationStatus = {
        id: `sync-${invoice.id}-quickbooks`,
        ownerType: "invoice",
        ownerId: invoice.id,
        system: "quickbooks",
        externalSystemId: invoice.quickBooksReferenceNumber,
        syncStatus: "queued",
        manualUpdateFlag: false,
      };
      const document: DocumentLink = {
        id: `doc-${invoice.id}-invoice`,
        ownerType: "invoice",
        ownerId: invoice.id,
        kind: "invoice",
        fileName: `${invoice.invoiceId}.pdf`,
        uploadedAt: stamp,
        uploadedBy: "Finance",
      };
      const collection: ARCollection = {
        id: `arc-${invoice.id}`,
        customerId,
        status: "in_progress",
        owner: "Finance",
        responsiblePerson: "Finance Team",
        createdDate: existing?.createdDate ?? updatedDate,
        updatedDate,
        notes: `AR collection opened from ${input.queueId}.`,
        documentIds: [],
        relatedRecords: [{ type: "invoice", id: invoice.id }],
        invoiceId: invoice.id,
        arAgingBucket: invoice.arAgingBucket,
        collectionStatus: "in_progress",
        nextFollowUpDate: invoice.dueDate,
        collectionOwner: "Finance",
      };

      appendTimeline("invoice", invoice.id, {
        stage: "Finance",
        status: "submitted",
        title: `Invoice ${invoice.invoiceId} issued`,
        note: `Created from billing queue ${input.queueId}; QuickBooks sync is queued.`,
        actor: "Finance",
      });
      publish({
        ...state,
        invoices: existing
          ? state.invoices.map((item) => item.id === existing.id ? invoice : item)
          : [invoice, ...state.invoices],
        integrationStatuses: state.integrationStatuses.some((item) => item.id === integration.id)
          ? state.integrationStatuses.map((item) => item.id === integration.id ? { ...item, ...integration, syncStatus: item.syncStatus === "synced" ? item.syncStatus : integration.syncStatus } : item)
          : [integration, ...state.integrationStatuses],
        documents: state.documents.some((item) => item.id === document.id) ? state.documents : [document, ...state.documents],
        arCollections: state.arCollections.some((item) => item.id === collection.id)
          ? state.arCollections.map((item) => item.id === collection.id ? { ...item, updatedDate, collectionStatus: item.collectionStatus === "completed" ? item.collectionStatus : "in_progress" } : item)
          : [collection, ...state.arCollections],
      });
      return clone(invoice);
    },

    updateInvoiceFinanceStatus(invoiceId, status, note) {
      const invoice = invoiceByPublicId(invoiceId);
      if (!invoice) return null;
      const updatedDate = today();
      if (status === "paid") return this.markInvoicePaymentReceived(invoice.invoiceId);
      const workflowStatus = invoiceStatusFromFinance(status);
      appendTimeline("invoice", invoice.id, {
        stage: "Finance",
        status: workflowStatus,
        title: `Invoice ${invoice.invoiceId} status updated`,
        note: note ?? `Invoice status changed to ${status}.`,
        actor: "Finance",
        level: workflowStatus === "overdue" ? "warning" : "info",
      });
      const nextInvoice: Invoice = {
        ...invoice,
        status: workflowStatus,
        updatedDate,
        collectionStatus: workflowStatus === "overdue" ? "overdue" : invoice.collectionStatus,
        reconciliationStatus: workflowStatus === "overdue" ? "exception" : invoice.reconciliationStatus,
        notes: note ?? invoice.notes,
      };
      publish({
        ...state,
        invoices: state.invoices.map((item) => item.id === invoice.id ? nextInvoice : item),
        arCollections: state.arCollections.map((item) => item.invoiceId === invoice.id ? {
          ...item,
          status: workflowStatus === "overdue" ? "overdue" : item.status,
          collectionStatus: workflowStatus === "overdue" ? "overdue" : item.collectionStatus,
          updatedDate,
          notes: note ?? item.notes,
        } : item),
      });
      return clone(nextInvoice);
    },

    markInvoicePaymentReceived(invoiceId, method = "eft") {
      const invoice = invoiceByPublicId(invoiceId);
      if (!invoice) return null;
      const receivedDate = today();
      const paymentId = `pay-${invoice.invoiceId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const payment: Payment = {
        id: paymentId,
        customerId: invoice.customerId,
        status: "completed",
        owner: "Finance",
        responsiblePerson: "Finance Team",
        createdDate: receivedDate,
        updatedDate: receivedDate,
        notes: `Payment received for ${invoice.invoiceId}.`,
        documentIds: [],
        relatedRecords: [{ type: "invoice", id: invoice.id }],
        invoiceId: invoice.id,
        paymentMethod: method,
        amountCad: invoice.invoiceAmountCad + invoice.taxCad,
        receivedDate,
        clearedDate: receivedDate,
        paymentClearedStatus: "completed",
      };
      const nextInvoice: Invoice = {
        ...invoice,
        status: "completed",
        updatedDate: receivedDate,
        paymentMethod: method,
        paymentReceivedDate: receivedDate,
        paymentClearedStatus: "completed",
        collectionStatus: "completed",
        reconciliationStatus: "completed",
        notes: `Payment received and reconciled on ${receivedDate}.`,
      };
      appendTimeline("invoice", invoice.id, {
        stage: "Cash Collection",
        status: "completed",
        title: `Payment received for ${invoice.invoiceId}`,
        note: `CAD $${payment.amountCad.toLocaleString("en-CA")} received by ${method.replace(/_/g, " ")} and reconciliation marked complete.`,
        actor: "Finance",
        level: "success",
      });
      publish({
        ...state,
        invoices: state.invoices.map((item) => item.id === invoice.id ? nextInvoice : item),
        payments: state.payments.some((item) => item.id === payment.id)
          ? state.payments.map((item) => item.id === payment.id ? payment : item)
          : [payment, ...state.payments],
        arCollections: state.arCollections.map((item) => item.invoiceId === invoice.id ? {
          ...item,
          status: "completed",
          collectionStatus: "completed",
          updatedDate: receivedDate,
          lastContactDate: receivedDate,
          notes: "Payment received and collection closed.",
        } : item),
      });
      return clone(nextInvoice);
    },

    syncAccountingSyncStatus(syncId, status, note) {
      const normalized = syncId.replace(/^SYNC-/, "").toLowerCase();
      const syncRecord = state.integrationStatuses.find((item) => item.id.replace(/^sync-/, "").toLowerCase() === normalized || syncId.includes(item.ownerId));
      if (!syncRecord) return;
      appendTimeline(syncRecord.ownerType, syncRecord.ownerId, {
        stage: "Integration",
        status: status === "synced" ? "completed" : status === "failed" ? "exception" : "in_progress",
        title: `Integration ${syncRecord.system} ${status}`,
        note,
        level: status === "failed" ? "error" : status === "synced" ? "success" : "info",
      });
      publish({
        ...state,
        integrationStatuses: state.integrationStatuses.map((item) => item.id === syncRecord.id ? {
          ...item,
          syncStatus: status,
          lastSyncTime: status === "synced" ? nowStamp() : item.lastSyncTime,
          syncErrorMessage: status === "failed" ? note : undefined,
          manualUpdateFlag: status === "failed" || status === "manual",
        } : item),
      });
    },
  };
}

export const orderToCashRepository = createOrderToCashRepository();
