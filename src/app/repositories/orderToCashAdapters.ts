import type { CustomerCaseRecord, CustomerProfileRecord, FreightFileRecord } from "../domain/businessReadiness";
import type { FinanceInvoiceRow, FinanceProjection, FinanceStatusKey, FinanceTransferRow, ReconciliationRow } from "../domain/financeProjection";
import type {
  BillingQueueRecord,
  AccountingSyncRecord,
  AsnReceivingRecord,
  ConditionStatus,
  DispatchRecord,
  ReturnAuthorizationRecord,
  ServiceEventRecord,
} from "../domain/workflowReadiness";
import type {
  BaseWorkflowEntity,
  Customer,
  CustomerOrder,
  CustomsDeclaration,
  DocumentLink,
  IntegrationStatus,
  Invoice,
  OrderToCashSeedData,
  OrderToCashEntityType,
  Shipment,
  TimelineEvent,
  WarehouseReceipt,
  WorkflowStatus,
} from "../domain/orderToCashModels";
import { orderToCashRepository } from "./orderToCashRepository";

function cad(value: number) {
  return `CAD $${Math.round(value).toLocaleString("en-CA")}`;
}

function taxCad(invoice: Invoice) {
  return invoice.taxCad > 0 ? invoice.taxCad : invoice.invoiceAmountCad * 0.13;
}

function totalCad(invoice: Invoice) {
  return invoice.invoiceAmountCad + taxCad(invoice);
}

function customerName(snapshot: OrderToCashSeedData, customerId?: string) {
  return snapshot.customers.find((customer) => customer.customerId === customerId || customer.id === customerId)?.name ?? customerId ?? "Unknown Customer";
}

function customerStage(customer: Customer): CustomerProfileRecord["stage"] {
  if (customer.onboardingStatus === "completed" || customer.status === "completed") return "active";
  if (customer.agreementStatus === "pending_review") return "quoted";
  if (customer.onboardingStatus === "in_progress") return "onboarding";
  if (customer.status === "submitted") return "qualified";
  return "lead";
}

function statusToFinance(status: WorkflowStatus): FinanceStatusKey {
  if (status === "completed" || status === "cleared" || status === "closed") return "paid";
  if (status === "overdue" || status === "exception" || status === "rejected") return "overdue";
  if (status === "submitted" || status === "in_progress") return "issued";
  return "pending";
}

function customsStatus(status: WorkflowStatus): FreightFileRecord["customsStatus"] {
  if (status === "cleared" || status === "completed" || status === "closed") return "Released";
  if (status === "submitted" || status === "in_progress" || status === "pending_review") return "Submitted";
  if (status === "on_hold" || status === "exception" || status === "rejected") return "Hold";
  return "Docs Missing";
}

function freightStatus(shipment: Shipment): FreightFileRecord["status"] {
  if (shipment.status === "completed" || shipment.status === "closed") return "closed";
  if (shipment.customsStatus === "cleared") return shipment.status === "on_hold" ? "hold" : "released";
  if (shipment.status === "on_hold" || shipment.status === "exception") return "hold";
  if (shipment.customsStatus === "submitted" || shipment.customsStatus === "pending_review") return "customs_review";
  return "documents_needed";
}

function freightId(shipment: Shipment) {
  if (shipment.id.includes("zenith")) return "FF-2026-0503";
  if (shipment.id.includes("dryu")) return "FF-2026-0418";
  return `FF-${shipment.eta.replace(/-/g, "").slice(0, 8)}-${shipment.id.slice(-4).toUpperCase()}`;
}

function containerCode(shipment: Shipment) {
  if (shipment.id.includes("tllu")) return "TLLU4409123";
  if (shipment.id.includes("dryu")) return "DRYU9624130";
  return shipment.shipmentId;
}

function asnId(receipt: WarehouseReceipt, shipment: Shipment) {
  if (receipt.id.includes("zenith")) return "ASN-2026-0503-ZEN";
  if (receipt.id.includes("dryu")) return "ASN-2026-0325-DRYU";
  return `ASN-${shipment.eta}-${receipt.id.slice(-4).toUpperCase()}`;
}

function asnStatus(receipt: WarehouseReceipt): AsnReceivingRecord["status"] {
  if (receipt.wmsInventoryStatus === "completed" || receipt.status === "closed" || receipt.status === "completed") return "closed";
  if (receipt.discrepancyStatus === "exception" || receipt.status === "exception" || receipt.status === "on_hold") return "variance";
  if (receipt.putawayStatus === "in_progress") return "putaway_ready";
  if (receipt.inspectionStatus === "in_progress") return "receiving";
  return "scheduled";
}

function asnInspectionStatus(receipt: WarehouseReceipt): AsnReceivingRecord["inspectionStatus"] {
  if (receipt.discrepancyStatus === "exception") return "variance";
  if (receipt.damagedQuantity > 0) return "damaged";
  if (receipt.receivedQuantity > 0) return "passed";
  return "not_started";
}

function asnCondition(receipt: WarehouseReceipt): ConditionStatus {
  if (receipt.damagedQuantity > 0) return "damaged";
  if (receipt.discrepancyStatus === "exception") return "mixed";
  if (receipt.receivedQuantity > 0) return "good";
  return "unchecked";
}

function customsReleaseStatus(status: WorkflowStatus): AsnReceivingRecord["customsReleaseStatus"] {
  if (status === "cleared" || status === "completed" || status === "closed") return "released";
  if (status === "submitted" || status === "pending_review" || status === "in_progress") return "submitted";
  if (status === "on_hold" || status === "exception" || status === "rejected") return "hold";
  return "documents_needed";
}

function billingStatus(invoice: Invoice): BillingQueueRecord["status"] {
  if (invoice.status === "completed" || invoice.paymentClearedStatus === "completed") return "invoiced";
  if (invoice.status === "overdue" || invoice.status === "exception") return "blocked";
  if (invoice.status === "pending_review") return "needs_approval";
  return "ready";
}

function orderDispatchStatus(order: CustomerOrder): DispatchRecord["status"] {
  if (order.status === "completed" || order.fulfillmentStatus === "completed") return "closed";
  if (order.status === "exception" || order.fulfillmentStatus === "exception") return "exception";
  if (order.trackingNumber && order.handoverDate) return "in_transit";
  if (order.carrier) return "assigned";
  return "requested";
}

function mergeById<T extends { id: string }>(base: T[], additions: T[]) {
  const byId = new Map(base.map((item) => [item.id, item]));
  additions.forEach((item) => byId.set(item.id, { ...byId.get(item.id), ...item }));
  return Array.from(byId.values());
}

export interface BackboneTrace {
  ownerType: OrderToCashEntityType;
  ownerId: string;
  title: string;
  status: WorkflowStatus;
  owner: string;
  note: string;
  relatedRecords: BaseWorkflowEntity["relatedRecords"];
  documents: DocumentLink[];
  timelineEvents: TimelineEvent[];
  integrationStatuses: IntegrationStatus[];
}

function findEntity(snapshot: OrderToCashSeedData, ownerType: OrderToCashEntityType, ownerId: string): (BaseWorkflowEntity & { name?: string; shipmentId?: string; invoiceId?: string; orderId?: string; receivingId?: string }) | undefined {
  const collections: Partial<Record<OrderToCashEntityType, BaseWorkflowEntity[]>> = {
    customer: snapshot.customers,
    lead: snapshot.leads,
    quotation: snapshot.quotations,
    service_agreement: snapshot.serviceAgreements,
    shipment: snapshot.shipments,
    customs_declaration: snapshot.customsDeclarations,
    warehouse_receipt: snapshot.warehouseReceipts,
    inventory_item: snapshot.inventoryItems,
    customer_order: snapshot.customerOrders,
    fulfillment_task: snapshot.fulfillmentTasks,
    carrier_shipment: snapshot.carrierShipments,
    delivery_record: snapshot.deliveryRecords,
    return_record: snapshot.returnRecords,
    invoice: snapshot.invoices,
    payment: snapshot.payments,
    ar_collection: snapshot.arCollections,
    exception_case: snapshot.exceptionCases,
  };
  return collections[ownerType]?.find((item) => item.id === ownerId) as ReturnType<typeof findEntity>;
}

function traceTitle(entity: ReturnType<typeof findEntity>, ownerType: OrderToCashEntityType, ownerId: string) {
  if (!entity) return ownerId;
  return entity.name ?? entity.shipmentId ?? entity.invoiceId ?? entity.orderId ?? entity.receivingId ?? `${ownerType} ${ownerId}`;
}

function buildTrace(snapshot: OrderToCashSeedData, ownerType: OrderToCashEntityType, ownerId: string): BackboneTrace | null {
  const entity = findEntity(snapshot, ownerType, ownerId);
  if (!entity) return null;
  return {
    ownerType,
    ownerId,
    title: traceTitle(entity, ownerType, ownerId),
    status: entity.status,
    owner: entity.owner,
    note: entity.notes,
    relatedRecords: entity.relatedRecords,
    documents: snapshot.documents.filter((document) => document.ownerType === ownerType && document.ownerId === ownerId),
    timelineEvents: snapshot.timelineEvents
      .filter((event) => event.ownerType === ownerType && event.ownerId === ownerId)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
    integrationStatuses: snapshot.integrationStatuses.filter((status) => status.ownerType === ownerType && status.ownerId === ownerId),
  };
}

function shipmentForFreightFile(snapshot: OrderToCashSeedData, freightFileId: string) {
  if (freightFileId.includes("0503")) return snapshot.shipments.find((shipment) => shipment.id.includes("zenith"));
  if (freightFileId.includes("0418") || freightFileId.toLowerCase().includes("dryu")) return snapshot.shipments.find((shipment) => shipment.id.includes("dryu"));
  return snapshot.shipments.find((shipment) => freightFileId.includes(shipment.eta.replace(/-/g, "")) || freightFileId.includes(shipment.shipmentId));
}

function receiptForAsn(snapshot: OrderToCashSeedData, asnId: string) {
  if (asnId.includes("ZEN")) return snapshot.warehouseReceipts.find((receipt) => receipt.id.includes("zenith"));
  if (asnId.includes("DRYU")) return snapshot.warehouseReceipts.find((receipt) => receipt.id.includes("dryu"));
  return snapshot.warehouseReceipts.find((receipt) => asnId.includes(receipt.receivingId) || asnId.includes(receipt.id));
}

function orderForDispatch(snapshot: OrderToCashSeedData, dispatchId: string) {
  const normalized = dispatchId.replace(/^DSP-/, "");
  const lowerDispatchId = dispatchId.toLowerCase();
  return snapshot.customerOrders.find((order) => {
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

function invoiceForQueue(snapshot: OrderToCashSeedData, queueId: string) {
  const normalized = queueId.replace(/^BQ-/, "");
  return snapshot.invoices.find((invoice) => normalized === invoice.invoiceId || queueId.includes(invoice.invoiceId) || invoice.relatedOrderIds.includes(normalized));
}

function invoiceForSync(snapshot: OrderToCashSeedData, syncId: string) {
  const normalized = syncId.replace(/^SYNC-/, "").toLowerCase();
  const syncRecord = snapshot.integrationStatuses.find((item) => item.id.replace(/^sync-/, "").toLowerCase() === normalized || syncId.includes(item.ownerId));
  if (!syncRecord) return null;
  return buildTrace(snapshot, syncRecord.ownerType, syncRecord.ownerId);
}

export function getCustomerBackboneTrace(customerId: string, snapshot = orderToCashRepository.getSnapshot()) {
  const customer = snapshot.customers.find((item) => item.id === customerId || item.customerId === customerId || item.name === customerId);
  return customer ? buildTrace(snapshot, "customer", customer.id) : null;
}

export function getFreightBackboneTrace(freightFileId: string, snapshot = orderToCashRepository.getSnapshot()) {
  const shipment = shipmentForFreightFile(snapshot, freightFileId);
  return shipment ? buildTrace(snapshot, "shipment", shipment.id) : null;
}

export function getAsnBackboneTrace(asnId: string, snapshot = orderToCashRepository.getSnapshot()) {
  const receipt = receiptForAsn(snapshot, asnId);
  return receipt ? buildTrace(snapshot, "warehouse_receipt", receipt.id) : null;
}

export function getDispatchBackboneTrace(dispatchId: string, snapshot = orderToCashRepository.getSnapshot()) {
  const order = orderForDispatch(snapshot, dispatchId);
  return order ? buildTrace(snapshot, "customer_order", order.id) : null;
}

export function getBillingBackboneTrace(queueId: string, snapshot = orderToCashRepository.getSnapshot()) {
  const invoice = invoiceForQueue(snapshot, queueId);
  return invoice ? buildTrace(snapshot, "invoice", invoice.id) : null;
}

export function getSyncBackboneTrace(syncId: string, snapshot = orderToCashRepository.getSnapshot()) {
  return invoiceForSync(snapshot, syncId);
}

export function buildCustomerReadinessFromOrderToCash(snapshot = orderToCashRepository.getSnapshot()) {
  const customers: CustomerProfileRecord[] = snapshot.customers.map((customer) => {
    const graph = orderToCashRepository.getCustomerGraph(customer.customerId);
    const totalSetup = 6;
    const operatingRulesDone = graph?.timelineEvents.some((event) => event.title === "Operating rules confirmed");
    const setupDone = [
      customer.communicationSetup !== "not_started",
      customer.rateSheetVersion.length > 0 && customer.rateSheetVersion !== "Draft",
      customer.agreementStatus === "completed",
      customer.wmsCustomerId,
      customer.quickBooksCustomerId,
      operatingRulesDone,
    ].filter(Boolean).length;

    return {
      id: customer.customerId,
      name: customer.name,
      stage: customerStage(customer),
      owner: customer.owner,
      services: customer.serviceTypes.map((service) => service.replace(/_/g, " ")),
      rateCard: customer.rateSheetVersion,
      onboardingDone: Math.min(totalSetup, setupDone),
      onboardingTotal: totalSetup,
      openCases: graph?.exceptionCases.filter((item) => item.status !== "completed" && item.status !== "closed").length ?? 0,
      instructions: customer.notes || customer.billingTerms,
      creditLimitCad: customer.billingTerms.toLowerCase().includes("prepaid") ? 0 : customer.name === "FBA Seller" ? 75000 : 25000,
    };
  });

  const cases: CustomerCaseRecord[] = snapshot.exceptionCases.map((item) => ({
    id: item.exceptionId,
    customerId: item.customerId ?? "",
    subject: item.notes || item.exceptionType.replace(/_/g, " "),
    status: item.status === "completed" || item.status === "closed" ? "resolved" : item.status === "waiting_customer" ? "waiting_customer" : "open",
    priority: item.severity === "critical" || item.severity === "high" ? "High" : item.severity === "medium" ? "Medium" : "Low",
    nextStep: item.resolutionDate ? `Resolved ${item.resolutionDate}` : `Due ${item.dueDate}`,
  }));

  return { customers, cases };
}

export function buildFreightFilesFromOrderToCash(snapshot = orderToCashRepository.getSnapshot()): FreightFileRecord[] {
  return snapshot.shipments.map((shipment) => ({
    id: freightId(shipment),
    customer: customerName(snapshot, shipment.customerId),
    container: containerCode(shipment),
    vessel: shipment.freightForwarder,
    terminal: shipment.origin,
    eta: shipment.eta,
    lastFreeDay: shipment.customsReleaseDate ?? shipment.eta,
    status: freightStatus(shipment),
    broker: shipment.broker,
    customsStatus: customsStatus(shipment.customsStatus),
    destination: shipment.destination,
    milestonesDone: shipment.customsStatus === "cleared" ? 6 : 3,
    milestonesTotal: 9,
    estimatedCostsCad: shipment.id.includes("zenith") ? 980 : 1625,
    exception: shipment.exceptionNotes || "None",
  }));
}

export function buildWorkflowSeedFromOrderToCash(snapshot = orderToCashRepository.getSnapshot()) {
  const freightFiles = buildFreightFilesFromOrderToCash(snapshot);
  const shipmentsById = new Map(snapshot.shipments.map((shipment) => [shipment.id, shipment]));
  const ordersById = new Map(snapshot.customerOrders.map((order) => [order.id, order]));

  const asns: AsnReceivingRecord[] = snapshot.warehouseReceipts.flatMap((receipt) => {
    const shipment = shipmentsById.get(receipt.shipmentId);
    if (!shipment) return [];
    return [{
      id: asnId(receipt, shipment),
      bookingRef: shipment.poNumber,
      freightFileId: freightId(shipment),
      customsReleaseStatus: customsReleaseStatus(shipment.customsStatus),
      receivingAppointment: shipment.customsStatus === "cleared" ? `${shipment.eta} 09:00` : "Pending docs",
      asnSource: shipment.customsStatus === "cleared" ? "freight_release" : "customer_booking",
      customer: customerName(snapshot, receipt.customerId),
      container: containerCode(shipment),
      warehouse: shipment.destination.includes("Whybank #10") ? "Whybank #10" : "Whybank #25",
      eta: shipment.eta,
      skuLines: 1,
      expectedUnits: receipt.expectedQuantity,
      receivedUnits: receipt.receivedQuantity,
      varianceUnits: receipt.shortageOverageQuantity,
      status: asnStatus(receipt),
      inspectionStatus: asnInspectionStatus(receipt),
      conditionStatus: asnCondition(receipt),
      inventoryStatus: receipt.wmsInventoryStatus === "completed" ? "recorded" : "not_recorded",
      putawayLocation: receipt.storageLocation,
      discrepancyReportId: receipt.discrepancyStatus === "exception" ? receipt.documentIds[0] ?? `DR-${receipt.receivingId}` : undefined,
      assignedTeam: receipt.owner,
      note: receipt.notes || shipment.exceptionNotes || "Ready for receiving workflow.",
    }];
  });

  const returns: ReturnAuthorizationRecord[] = snapshot.returnRecords.map((returnRecord) => {
    const order = ordersById.get(returnRecord.orderId);
    return {
      id: `RMA-${returnRecord.id.replace(/^ret-/, "").toUpperCase()}`,
      customer: customerName(snapshot, returnRecord.customerId),
      originalOrder: order?.orderId ?? returnRecord.orderId,
      sku: order?.sku ?? "Returned freight",
      units: order?.quantityOrdered ?? 0,
      reason: returnRecord.returnReason,
      disposition: returnRecord.inventoryAdjustment.toLowerCase().includes("dispose") ? "dispose" : returnRecord.inventoryAdjustment.toLowerCase().includes("restock") ? "restock" : "pending",
      status: returnRecord.returnInspectionStatus === "completed" ? "received" : "authorized",
    };
  });

  const serviceEvents: ServiceEventRecord[] = snapshot.customerOrders.flatMap((order) => order.valueAddedServices.map((service, index) => ({
    id: `SE-${order.orderId.replace(/[^0-9A-Z]/gi, "").slice(-8)}-${index + 1}`,
    source: order.trackingNumber ?? order.orderId,
    customer: customerName(snapshot, order.customerId),
    service: service.replace(/_/g, " "),
    quantity: order.quantityOrdered,
    rateCad: service === "relabel" ? 0.5 : service === "inspection" ? 0.2 : 1,
    status: order.status === "completed" ? "billed" : "open",
  })));

  const dispatches: DispatchRecord[] = snapshot.customerOrders.map((order) => {
    const shipment = snapshot.shipments.find((candidate) => order.relatedRecords.some((relation) => relation.type === "shipment" && relation.id === candidate.id));
    const invoice = snapshot.invoices.find((candidate) => candidate.relatedOrderIds.includes(order.id));
    return {
      id: `DSP-${order.orderId.replace(/^ORD-/, "")}`,
      customer: customerName(snapshot, order.customerId),
      origin: shipment?.destination.split(",")[0] ?? "Warehouse",
      destination: order.manifestNumber?.includes("YYZ9") ? "YYZ9 Amazon" : shipment?.destination ?? "Customer destination",
      pallets: Number(order.sku.match(/(\d+)P/)?.[1] ?? 1),
      driver: order.carrier === "Trucking" ? "LH" : "TBD",
      carrier: order.carrier ?? "Unassigned",
      quotedCostCad: invoice ? Math.round(invoice.invoiceAmountCad * 0.35) : 0,
      estimatedRevenueCad: invoice?.invoiceAmountCad ?? 0,
      status: orderDispatchStatus(order),
      podRequired: true,
      exceptionNote: order.notes || "POD required before invoice release.",
    };
  });

  const billingQueue: BillingQueueRecord[] = snapshot.invoices.map((invoice) => ({
    id: `BQ-${invoice.invoiceId}`,
    customer: customerName(snapshot, invoice.customerId),
    sourceType: invoice.relatedOrderIds.length > 0 ? "transport" : "customs",
    sourceId: invoice.relatedOrderIds[0] ?? invoice.relatedShipmentIds[0] ?? invoice.id,
    subtotalCad: invoice.invoiceAmountCad,
    taxCad: taxCad(invoice),
    status: billingStatus(invoice),
    approvalOwner: invoice.owner,
    note: invoice.notes || `Created from order-to-cash invoice ${invoice.invoiceId}.`,
  }));

  const accountingSync: AccountingSyncRecord[] = snapshot.integrationStatuses
    .filter((status) => status.system === "quickbooks")
    .map((status) => {
      const invoice = snapshot.invoices.find((candidate) => candidate.id === status.ownerId);
      return {
        id: `SYNC-${status.id.replace(/^sync-/, "").toUpperCase()}`,
        system: "QuickBooks",
        objectType: "invoice",
        objectId: invoice?.invoiceId ?? status.ownerId,
        amountCad: invoice ? totalCad(invoice) : 0,
        status: status.syncStatus === "synced" ? "synced" : status.syncStatus === "failed" ? "failed" : status.syncStatus === "queued" ? "ready_to_sync" : "queued",
        lastAttempt: status.lastSyncTime ?? "Not run",
        externalReference: status.externalSystemId,
        errorMessage: status.syncErrorMessage,
      };
    });

  return { freightFiles, asns, returns, serviceEvents, dispatches, billingQueue, accountingSync };
}

export function mergeWorkflowSeeds<T extends { id: string }>(existing: T[], additions: T[]) {
  return mergeById(existing, additions);
}

export function mergeFinanceProjectionWithOrderToCash(projection: FinanceProjection, snapshot = orderToCashRepository.getSnapshot()): FinanceProjection {
  const invoices: FinanceInvoiceRow[] = snapshot.invoices.map((invoice) => ({
    id: invoice.invoiceId,
    customer: customerName(snapshot, invoice.customerId),
    period: invoice.invoiceDate.slice(0, 7),
    orders: Math.max(1, invoice.relatedOrderIds.length + invoice.relatedShipmentIds.length),
    amount: cad(invoice.invoiceAmountCad),
    tax: cad(taxCad(invoice)),
    total: cad(totalCad(invoice)),
    status: statusToFinance(invoice.status),
    due: invoice.dueDate,
  }));

  const transfers: FinanceTransferRow[] = snapshot.customerOrders.map((order) => {
    const invoice = snapshot.invoices.find((candidate) => candidate.relatedOrderIds.includes(order.id));
    const revenue = invoice?.invoiceAmountCad ?? 0;
    const cost = Math.round(revenue * 0.35);
    return {
      id: `OTC-${order.orderId.replace(/^ORD-/, "")}`,
      lane: `${order.orderChannel.replace(/_/g, " ")} -> ${order.carrier ?? "Carrier TBD"}`,
      partner: order.carrier ?? "Unassigned",
      runs: Math.max(1, Number(order.sku.match(/(\d+)P/)?.[1] ?? 1)),
      revenue: cad(revenue),
      cost: cad(cost),
      margin: cad(revenue - cost),
      status: statusToFinance(order.status),
    settled: order.status === "completed" ? order.updatedDate : "Pending",
    };
  });

  const reconciliationRows: ReconciliationRow[] = snapshot.invoices.map((invoice) => {
    const invoiceTotal = totalCad(invoice);
    const invoiceAmt = Math.round(invoiceTotal);
    const driverCost = Math.round(invoice.invoiceAmountCad * 0.35);
    const payments = snapshot.payments.filter((payment) => payment.invoiceId === invoice.id);
    const deposits = snapshot.bankDeposits.filter((deposit) => deposit.invoiceId === invoice.id);
    const depositedAmount = payments.reduce((sum, payment) => sum + payment.amountCad, 0);
    const openAmount = Math.max(0, invoiceTotal - depositedAmount);
    const latestDeposit = deposits[0];
    const status = invoice.reconciliationStatus === "completed"
      ? "matched"
      : invoice.reconciliationStatus === "exception" || invoice.collectionStatus === "exception"
        ? "disputed"
        : depositedAmount > 0 && openAmount > 0
          ? "partial"
          : depositedAmount > 0 && openAmount === 0
            ? "matched"
            : "unmatched";
    return {
      id: invoice.invoiceId,
      customer: customerName(snapshot, invoice.customerId),
      invoiceAmt,
      driverCost,
      depositedAmt: Math.round(depositedAmount),
      openAmt: Math.round(openAmount),
      bankReference: latestDeposit?.reference ?? payments.find((payment) => payment.bankReference)?.bankReference,
      status,
      note: invoice.notes,
    };
  });

  return {
    ...projection,
    invoices: mergeById(projection.invoices, invoices),
    transfers: mergeById(projection.transfers, transfers),
    reconciliationRows: mergeById(projection.reconciliationRows, reconciliationRows),
  };
}
