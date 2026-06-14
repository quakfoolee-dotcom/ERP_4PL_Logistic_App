import type { WorkflowStatus } from "../domain/orderToCashModels";
import { orderToCashRepository } from "./orderToCashRepository";

const finishedStatuses = new Set<WorkflowStatus>(["completed", "cleared", "closed", "cancelled"]);
const problemStatuses = new Set<WorkflowStatus>(["exception", "overdue", "on_hold", "rejected"]);

function isOpen(status: WorkflowStatus) {
  return !finishedStatuses.has(status);
}

function isProblem(status: WorkflowStatus) {
  return problemStatuses.has(status);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function countOpen(statuses: WorkflowStatus[]) {
  return statuses.filter(isOpen).length;
}

function countProblem(statuses: WorkflowStatus[]) {
  return statuses.filter(isProblem).length;
}

export function getOrderToCashSnapshot() {
  return orderToCashRepository.getSnapshot();
}

export function getOrderToCashEntityCounts() {
  const snapshot = getOrderToCashSnapshot();

  return {
    customers: snapshot.customers.length,
    leads: snapshot.leads.length,
    quotations: snapshot.quotations.length,
    serviceAgreements: snapshot.serviceAgreements.length,
    shipments: snapshot.shipments.length,
    customsDeclarations: snapshot.customsDeclarations.length,
    warehouseReceipts: snapshot.warehouseReceipts.length,
    inventoryItems: snapshot.inventoryItems.length,
    customerOrders: snapshot.customerOrders.length,
    fulfillmentTasks: snapshot.fulfillmentTasks.length,
    carrierShipments: snapshot.carrierShipments.length,
    deliveryRecords: snapshot.deliveryRecords.length,
    returnRecords: snapshot.returnRecords.length,
    invoices: snapshot.invoices.length,
    payments: snapshot.payments.length,
    arCollections: snapshot.arCollections.length,
    exceptionCases: snapshot.exceptionCases.length,
    documents: snapshot.documents.length,
    timelineEvents: snapshot.timelineEvents.length,
    integrationStatuses: snapshot.integrationStatuses.length,
  };
}

export function getOrderToCashDashboardProjection() {
  const snapshot = getOrderToCashSnapshot();
  const openInvoices = snapshot.invoices.filter((invoice) => isOpen(invoice.status));
  const overdueInvoices = snapshot.invoices.filter((invoice) => invoice.status === "overdue" || invoice.arAgingBucket === "90_plus");
  const openExceptionCases = snapshot.exceptionCases.filter((exceptionCase) => isOpen(exceptionCase.status));
  const failedIntegrations = snapshot.integrationStatuses.filter((status) => status.syncStatus === "failed" || status.manualUpdateFlag);

  const pipeline = [
    {
      stage: "Sales & Onboarding",
      total: snapshot.leads.length + snapshot.quotations.length + snapshot.serviceAgreements.length + snapshot.customers.length,
      open: countOpen([...snapshot.leads, ...snapshot.quotations, ...snapshot.serviceAgreements, ...snapshot.customers].map((record) => record.status)),
      exceptions: countProblem([...snapshot.leads, ...snapshot.quotations, ...snapshot.serviceAgreements, ...snapshot.customers].map((record) => record.status)),
    },
    {
      stage: "Freight & Import",
      total: snapshot.shipments.length + snapshot.customsDeclarations.length,
      open: countOpen([...snapshot.shipments, ...snapshot.customsDeclarations].map((record) => record.status)),
      exceptions: countProblem([...snapshot.shipments, ...snapshot.customsDeclarations].map((record) => record.status)),
    },
    {
      stage: "Warehouse Operations",
      total: snapshot.warehouseReceipts.length + snapshot.inventoryItems.length,
      open: countOpen([...snapshot.warehouseReceipts, ...snapshot.inventoryItems].map((record) => record.status)),
      exceptions: countProblem([...snapshot.warehouseReceipts, ...snapshot.inventoryItems].map((record) => record.status)),
    },
    {
      stage: "Fulfillment",
      total: snapshot.customerOrders.length + snapshot.fulfillmentTasks.length + snapshot.carrierShipments.length,
      open: countOpen([...snapshot.customerOrders, ...snapshot.fulfillmentTasks, ...snapshot.carrierShipments].map((record) => record.status)),
      exceptions: countProblem([...snapshot.customerOrders, ...snapshot.fulfillmentTasks, ...snapshot.carrierShipments].map((record) => record.status)),
    },
    {
      stage: "Delivery & Returns",
      total: snapshot.deliveryRecords.length + snapshot.returnRecords.length,
      open: countOpen([...snapshot.deliveryRecords, ...snapshot.returnRecords].map((record) => record.status)),
      exceptions: countProblem([...snapshot.deliveryRecords, ...snapshot.returnRecords].map((record) => record.status)),
    },
    {
      stage: "Finance & Accounting",
      total: snapshot.invoices.length + snapshot.payments.length + snapshot.arCollections.length,
      open: countOpen([...snapshot.invoices, ...snapshot.payments, ...snapshot.arCollections].map((record) => record.status)),
      exceptions: countProblem([...snapshot.invoices, ...snapshot.payments, ...snapshot.arCollections].map((record) => record.status)),
    },
  ];

  return {
    kpis: {
      openCustomerInquiries: snapshot.leads.filter((lead) => isOpen(lead.status)).length,
      quotesPendingReview: snapshot.quotations.filter((quotation) => quotation.status === "pending_review" || quotation.quoteStatus === "revision_required").length,
      activeShipments: snapshot.shipments.filter((shipment) => isOpen(shipment.status)).length,
      customsPending: snapshot.customsDeclarations.filter((declaration) => isOpen(declaration.customsStatus)).length,
      warehouseReceiptsPending: snapshot.warehouseReceipts.filter((receipt) => isOpen(receipt.putawayStatus) || isOpen(receipt.wmsInventoryStatus)).length,
      inventoryDiscrepancies: snapshot.warehouseReceipts.filter((receipt) => receipt.discrepancyStatus === "exception").length,
      ordersPendingFulfillment: snapshot.customerOrders.filter((order) => isOpen(order.fulfillmentStatus)).length,
      deliveriesPendingPod: snapshot.deliveryRecords.filter((delivery) => isOpen(delivery.podStatus)).length,
      returnsPendingCustomerNotification: snapshot.returnRecords.filter((returnRecord) => isOpen(returnRecord.customerNotificationStatus)).length,
      invoicesOpen: openInvoices.length,
      overdueAr: overdueInvoices.length,
      openExceptions: openExceptionCases.length,
      integrationFollowUps: failedIntegrations.length,
      invoicedCad: sum(snapshot.invoices.map((invoice) => invoice.invoiceAmountCad)),
      taxCad: sum(snapshot.invoices.map((invoice) => invoice.taxCad)),
    },
    pipeline,
    openExceptions: openExceptionCases,
    integrationFollowUps: failedIntegrations,
  };
}
