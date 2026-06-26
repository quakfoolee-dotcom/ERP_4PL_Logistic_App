import { formatMoney } from "./money";
import type { ErpSeedData, InvoiceStatus, Location, Money, Organization, PayableStatus } from "./models";

export type FinanceStatusKey = "pending" | "issued" | "paid" | "overdue" | "approved" | "scheduled" | "completed";
export type ReconciliationStatus = "matched" | "partial" | "unmatched" | "disputed";

export interface FinanceInvoiceRow {
  id: string;
  customer: string;
  period: string;
  orders: number;
  amount: string;
  tax: string;
  total: string;
  status: FinanceStatusKey;
  due: string;
}

export interface FinancePayableRow {
  id: string;
  vendor: string;
  category: string;
  period: string;
  runs: number;
  subtotal: string;
  tax: string;
  total: string;
  status: FinanceStatusKey;
  due: string;
}

export interface FinanceTransferRow {
  id: string;
  lane: string;
  partner: string;
  runs: number;
  revenue: string;
  cost: string;
  margin: string;
  status: FinanceStatusKey;
  settled: string;
}

export interface MonthlyFlowRow {
  month: string;
  ar: number;
  ap: number;
  net: number;
}

export interface SettlementSummaryRow {
  partner: string;
  orders: number;
  amount: string;
  settled: string;
  pending: string;
  rate: number;
}

export interface ReconciliationRow {
  id: string;
  customer: string;
  invoiceAmt: number;
  driverCost: number;
  depositedAmt?: number;
  openAmt?: number;
  bankReference?: string;
  status: ReconciliationStatus;
  note?: string;
}

export interface BankStatementRow {
  depositId: string;
  reference: string;
  customer: string;
  amountCad: number;
  receivedDate: string;
  bankAccount: string;
  sourceFileName?: string;
  invoiceId?: string;
  suggestedInvoiceId?: string;
  suggestionReason?: string;
  suggestionConfidence?: "high" | "medium" | "low";
  status: "unmatched" | "matched" | "partial" | "exception";
  openAmountCad?: number;
  memo?: string;
}

export interface FinanceProjection {
  invoices: FinanceInvoiceRow[];
  payables: FinancePayableRow[];
  transfers: FinanceTransferRow[];
  monthlyFlow: MonthlyFlowRow[];
  settlementSummary: SettlementSummaryRow[];
  reconciliationRows: ReconciliationRow[];
  bankStatementRows: BankStatementRow[];
}

function organizationName(organizations: Organization[], id: string) {
  return organizations.find((item) => item.id === id)?.name ?? id;
}

function locationName(locations: Location[], id: string) {
  const location = locations.find((item) => item.id === id);
  return location?.code ? `${location.name} (${location.code})` : location?.name ?? id;
}

function driverNames(data: ErpSeedData, driverIds: string[]) {
  return driverIds
    .map((id) => data.drivers.find((driver) => driver.id === id)?.name)
    .filter(Boolean)
    .join(" / ") || "TBD";
}

function moneyToNumber(value: Money) {
  return value.amountCents / 100;
}

function compactMoney(value: Money) {
  const amount = moneyToNumber(value);
  if (amount >= 1000) return `${value.currency} $${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}K`;
  return formatMoney(value);
}

function mapInvoiceStatus(status: InvoiceStatus): FinanceStatusKey {
  if (status === "draft") return "pending";
  if (status === "void") return "overdue";
  return status;
}

function mapPayableStatus(status: PayableStatus): FinanceStatusKey {
  if (status === "draft" || status === "disputed") return "pending";
  return status;
}

function monthLabel(period: string) {
  const [, month] = period.split("-");
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return labels[Math.max(0, Math.min(11, Number(month) - 1))] ?? period;
}

function sumMoney(values: Money[]): Money {
  return {
    currency: values[0]?.currency ?? "CAD",
    amountCents: values.reduce((total, value) => total + value.amountCents, 0),
  };
}

export function buildFinanceProjection(data: ErpSeedData): FinanceProjection {
  const invoices = data.invoices.map((invoice) => ({
    id: invoice.id,
    customer: organizationName(data.organizations, invoice.customerId),
    period: invoice.period,
    orders: invoice.sourceOrderIds.length,
    amount: formatMoney(invoice.subtotal),
    tax: formatMoney(invoice.tax),
    total: formatMoney(invoice.total),
    status: mapInvoiceStatus(invoice.status),
    due: invoice.dueDate,
  }));

  const invoicedOrderIds = new Set(data.invoices.flatMap((invoice) => invoice.sourceOrderIds));
  const pendingInvoices = data.transportOrders
    .filter((order) => !invoicedOrderIds.has(order.id))
    .slice(0, 6)
    .map((order, index) => {
      const tax = { amountCents: Math.round(order.revenue.amountCents * 0.13), currency: order.revenue.currency };
      return {
        id: `DRAFT-${String(index + 1).padStart(3, "0")}`,
        customer: organizationName(data.organizations, order.customerId),
        period: order.createdDate.slice(0, 7),
        orders: 1,
        amount: formatMoney(order.revenue),
        tax: formatMoney(tax),
        total: formatMoney({ amountCents: order.revenue.amountCents + tax.amountCents, currency: order.revenue.currency }),
        status: "pending" as FinanceStatusKey,
        due: order.etaDate,
      };
    });

  const payables = data.payables.map((payable) => ({
    id: payable.id,
    vendor: organizationName(data.organizations, payable.vendorId),
    category: payable.category.replace(/_/g, " "),
    period: payable.period,
    runs: payable.sourceOrderIds.length,
    subtotal: formatMoney(payable.subtotal),
    tax: formatMoney(payable.tax),
    total: formatMoney(payable.total),
    status: mapPayableStatus(payable.status),
    due: payable.dueDate,
  }));

  const transfers = data.transportOrders.slice(0, 8).map((order, index) => {
    const margin = {
      amountCents: order.revenue.amountCents - order.cost.amountCents,
      currency: order.revenue.currency,
    };
    return {
      id: `TR-${order.createdDate.slice(2, 4)}${order.createdDate.slice(5, 7)}-${String(index + 1).padStart(3, "0")}`,
      lane: `${locationName(data.locations, order.originLocationId)} -> ${locationName(data.locations, order.destinationLocationId)}`,
      partner: driverNames(data, order.assignedDriverIds),
      runs: order.palletCount,
      revenue: formatMoney(order.revenue),
      cost: formatMoney(order.cost),
      margin: formatMoney(margin),
      status: (order.status === "completed" ? "completed" : order.status === "exception" ? "pending" : "issued") as FinanceStatusKey,
      settled: order.status === "completed" ? order.etaDate : "Pending",
    };
  });

  const periods = Array.from(new Set([...data.invoices.map((item) => item.period), ...data.payables.map((item) => item.period)])).sort();
  const monthlyFlow = periods.map((period) => {
    const ar = data.invoices.filter((invoice) => invoice.period === period).reduce((total, invoice) => total + moneyToNumber(invoice.total), 0);
    const ap = data.payables.filter((payable) => payable.period === period).reduce((total, payable) => total + moneyToNumber(payable.total), 0);
    return { month: monthLabel(period), ar: Number((ar / 1000).toFixed(1)), ap: Number((ap / 1000).toFixed(1)), net: Number(((ar - ap) / 1000).toFixed(1)) };
  });

  const settlementSummary = data.payables.map((payable) => {
    const settled = payable.status === "paid" || payable.status === "approved" ? payable.total : { amountCents: 0, currency: payable.total.currency };
    const pending = { amountCents: payable.total.amountCents - settled.amountCents, currency: payable.total.currency };
    return {
      partner: organizationName(data.organizations, payable.vendorId),
      orders: payable.sourceOrderIds.length,
      amount: formatMoney(payable.total),
      settled: settled.amountCents > 0 ? formatMoney(settled) : "-",
      pending: pending.amountCents > 0 ? formatMoney(pending) : "-",
      rate: payable.total.amountCents > 0 ? Math.round((settled.amountCents / payable.total.amountCents) * 100) : 0,
    };
  });

  const invoiceByOrder = new Map<string, Money>();
  data.invoices.forEach((invoice) => {
    const split = Math.round(invoice.subtotal.amountCents / Math.max(1, invoice.sourceOrderIds.length));
    invoice.sourceOrderIds.forEach((orderId) => invoiceByOrder.set(orderId, { amountCents: split, currency: invoice.subtotal.currency }));
  });

  const reconciliationRows = data.transportOrders.slice(0, 10).map((order) => {
    const invoiceAmt = invoiceByOrder.get(order.id)?.amountCents ?? order.revenue.amountCents;
    const driverCost = order.cost.amountCents;
    const grossMargin = invoiceAmt - driverCost;
    return {
      id: order.id.replace("WB-", "REC-"),
      customer: organizationName(data.organizations, order.customerId),
      invoiceAmt: Math.round(invoiceAmt / 100),
      driverCost: Math.round(driverCost / 100),
      status: (order.status === "exception" ? "disputed" : invoiceAmt === 0 ? "unmatched" : "matched") as ReconciliationStatus,
      note: order.status === "exception" ? "Operational exception requires finance review" : grossMargin < 0 ? "Negative margin review required" : undefined,
    };
  });

  return {
    invoices: [...invoices, ...pendingInvoices],
    payables,
    transfers,
    monthlyFlow,
    settlementSummary,
    reconciliationRows,
    bankStatementRows: [],
  };
}

export function summarizeFinance(projection: FinanceProjection) {
  const totalAr = sumMoney(projection.invoices.map((invoice) => ({ amountCents: Number(invoice.total.replace(/[^0-9.-]/g, "")) * 100, currency: "CAD" })));
  const totalAp = sumMoney(projection.payables.map((payable) => ({ amountCents: Number(payable.total.replace(/[^0-9.-]/g, "")) * 100, currency: "CAD" })));
  const collected = sumMoney(projection.reconciliationRows.map((row) => ({ amountCents: (row.depositedAmt ?? 0) * 100, currency: "CAD" })));
  const overdue = sumMoney(projection.invoices.filter((invoice) => invoice.status === "overdue").map((invoice) => ({ amountCents: Number(invoice.total.replace(/[^0-9.-]/g, "")) * 100, currency: "CAD" })));

  return {
    totalAr: compactMoney(totalAr),
    totalAp: compactMoney(totalAp),
    collected: compactMoney(collected),
    pendingInvoices: String(projection.invoices.filter((invoice) => invoice.status === "pending").length),
    overdue: compactMoney(overdue),
    unmatchedDeposits: String(projection.reconciliationRows.filter((row) => row.status === "unmatched" || row.status === "partial").length),
    disputedAmount: compactMoney(sumMoney(projection.reconciliationRows.filter((row) => row.status === "disputed").map((row) => ({ amountCents: row.invoiceAmt * 100, currency: "CAD" })))),
  };
}
