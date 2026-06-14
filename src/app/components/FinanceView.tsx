import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AlertCircle, CheckCircle2, Clock, Download, FileText, Send, X } from "lucide-react";
import { toast } from "sonner";
import type { AppLanguage } from "../i18n";
import { pick } from "../i18n";
import type { FinanceStatusKey } from "../domain/financeProjection";
import { getFinanceProjection, getFinanceSummary } from "../repositories/projections";
import { orderToCashRepository } from "../repositories/orderToCashRepository";
import { useOrderToCashSnapshot } from "./BackboneTracePanel";

type FinanceSection = "finance" | "ar" | "ap" | "transfer";
type StatusKey = FinanceStatusKey;

const financeProjection = getFinanceProjection();
const financeSummary = getFinanceSummary();
const invoices = financeProjection.invoices;
const payables = financeProjection.payables;
const transfers = financeProjection.transfers;
const monthlyFlow = financeProjection.monthlyFlow;
const settlementSummary = financeProjection.settlementSummary;

const statusMeta: Record<StatusKey, { zh: string; en: string; bg: string; color: string; icon: ReactNode }> = {
  pending: { zh: "待处理", en: "Pending", bg: "#FEF3C7", color: "#B45309", icon: <Clock size={11} /> },
  issued: { zh: "已开具", en: "Issued", bg: "#DBEAFE", color: "#1D4ED8", icon: <FileText size={11} /> },
  paid: { zh: "已付款", en: "Paid", bg: "#D1FAE5", color: "#047857", icon: <CheckCircle2 size={11} /> },
  overdue: { zh: "逾期", en: "Overdue", bg: "#FEE2E2", color: "#DC2626", icon: <AlertCircle size={11} /> },
  approved: { zh: "已批准", en: "Approved", bg: "#EDE9FE", color: "#6D28D9", icon: <CheckCircle2 size={11} /> },
  scheduled: { zh: "已排款", en: "Scheduled", bg: "#DBEAFE", color: "#1D4ED8", icon: <Clock size={11} /> },
  completed: { zh: "已完成", en: "Completed", bg: "#D1FAE5", color: "#047857", icon: <CheckCircle2 size={11} /> },
};

type InvoiceRow = (typeof invoices)[number];
type PayableRow = (typeof payables)[number];
type TransferRow = (typeof transfers)[number];

export function FinanceView({ section = "finance", language = "zh" }: { section?: FinanceSection; language?: AppLanguage }) {
  const orderToCashSnapshot = useOrderToCashSnapshot();
  const liveFinanceProjection = useMemo(() => getFinanceProjection(), [orderToCashSnapshot]);
  const liveFinanceSummary = useMemo(() => getFinanceSummary(), [orderToCashSnapshot]);
  const [invoiceRows, setInvoiceRows] = useState(invoices);
  const [payableRows] = useState(payables);
  const [transferRows, setTransferRows] = useState(transfers);
  const [invoiceStatuses, setInvoiceStatuses] = useState<Record<string, StatusKey>>({});
  const [payableStatuses, setPayableStatuses] = useState<Record<string, StatusKey>>({});
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [selectedPayable, setSelectedPayable] = useState<PayableRow | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRow | null>(null);
  const [showNewInvoice, setShowNewInvoice] = useState(false);

  useEffect(() => {
    setInvoiceRows(liveFinanceProjection.invoices);
  }, [liveFinanceProjection.invoices]);

  function invoiceStatus(invoice: InvoiceRow) {
    return invoiceStatuses[invoice.id] ?? invoice.status;
  }

  function payableStatus(payable: PayableRow) {
    return payableStatuses[payable.id] ?? payable.status;
  }

  function issue(id: string) {
    orderToCashRepository.updateInvoiceFinanceStatus(id, "issued", `Invoice ${id} issued from AR screen.`);
    setInvoiceStatuses((previous) => ({ ...previous, [id]: "issued" }));
  }

  function batchIssue() {
    const updates: Record<string, StatusKey> = {};
    let count = 0;
    invoiceRows.forEach((invoice) => {
      if (invoiceStatus(invoice) === "pending") {
        orderToCashRepository.updateInvoiceFinanceStatus(invoice.id, "issued", `Invoice ${invoice.id} issued from AR batch action.`);
        updates[invoice.id] = "issued";
        count += 1;
      }
    });
    setInvoiceStatuses((previous) => ({ ...previous, ...updates }));
    toast.success(count > 0 ? pick(language, `${count}张发票已开具`, `${count} invoice${count > 1 ? "s" : ""} issued`) : pick(language, "没有待开具发票", "No pending invoices to issue"));
  }

  function approvePayable(id: string) {
    setPayableStatuses((previous) => ({ ...previous, [id]: "approved" }));
    toast.success(pick(language, "应付账款已批准", "Payable approved"));
  }

  function updateInvoiceStatus(id: string, status: StatusKey) {
    if (status === "pending" || status === "issued" || status === "paid" || status === "overdue") {
      orderToCashRepository.updateInvoiceFinanceStatus(id, status, `Invoice ${id} changed to ${status}.`);
    }
    setInvoiceStatuses((previous) => ({ ...previous, [id]: status }));
    toast.success(pick(language, "发票状态已更新", "Invoice status updated"));
  }

  function updatePayableStatus(id: string, status: StatusKey) {
    setPayableStatuses((previous) => ({ ...previous, [id]: status }));
    toast.success(pick(language, "应付状态已更新", "Payable status updated"));
  }

  function updateTransferStatus(id: string, status: StatusKey) {
    const today = new Date().toLocaleDateString("en-CA");
    setTransferRows((current) => current.map((transfer) => {
      if (transfer.id !== id) return transfer;
      return {
        ...transfer,
        status,
        settled: status === "completed" ? (transfer.settled === "Pending" ? today : transfer.settled) : status === "pending" ? "Pending" : transfer.settled,
      };
    }));
    toast.success(pick(language, "中转状态已更新", "Transfer status updated"));
  }

  function createInvoice(invoice: InvoiceRow) {
    setInvoiceRows((current) => [invoice, ...current]);
    setInvoiceStatuses((previous) => ({ ...previous, [invoice.id]: "pending" }));
    setShowNewInvoice(false);
    toast.success(pick(language, `发票 ${invoice.id} 已新增`, `Invoice ${invoice.id} added`));
  }

  function markTransferSettled(id: string) {
    const today = new Date().toLocaleDateString("en-CA");
    setTransferRows((current) => current.map((transfer) => transfer.id === id ? { ...transfer, status: "completed" as StatusKey, settled: today } : transfer));
    toast.success(pick(language, "中转记录已标记结算", "Transfer marked as settled"));
  }

  function exportCsv(name: string, headers: string[], rows: Array<Array<string | number>>) {
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCurrentSection() {
    if (section === "ar") {
      exportCsv("ar_invoices", ["Invoice #", "Customer", "Period", "Runs", "Subtotal", "HST", "Total", "Status", "Due"], invoiceRows.map((invoice) => [invoice.id, invoice.customer, invoice.period, invoice.orders, invoice.amount, invoice.tax, invoice.total, statusLabel(invoiceStatus(invoice), language), invoice.due]));
      toast.success(pick(language, "应收发票已导出", "AR invoices exported"));
    } else if (section === "ap") {
      exportCsv("ap_payables", ["Payable #", "Vendor", "Category", "Period", "Runs", "Subtotal", "HST", "Total", "Status", "Due"], payableRows.map((payable) => [payable.id, payable.vendor, payable.category, payable.period, payable.runs, payable.subtotal, payable.tax, payable.total, statusLabel(payableStatus(payable), language), payable.due]));
      toast.success(pick(language, "应付账款已导出", "AP payables exported"));
    } else if (section === "transfer") {
      exportCsv("transfer_summary", ["Transfer #", "Lane", "Partner", "Runs", "Revenue", "Cost", "Margin", "Status", "Settlement"], transferRows.map((transfer) => [transfer.id, transfer.lane, transfer.partner, transfer.runs, transfer.revenue, transfer.cost, transfer.margin, statusLabel(transfer.status, language), transfer.settled]));
      toast.success(pick(language, "中转汇总已导出", "Transfer summary exported"));
    }
  }

  useEffect(() => {
    function handleFinanceCommand(event: Event) {
      const detail = (event as CustomEvent<{ section: FinanceSection; action: "newInvoice" | "export" }>).detail;
      if (!detail || detail.section !== section) return;
      if (detail.action === "newInvoice") setShowNewInvoice(true);
      if (detail.action === "export") exportCurrentSection();
    }
    window.addEventListener("erp4pl.finance.command", handleFinanceCommand);
    return () => window.removeEventListener("erp4pl.finance.command", handleFinanceCommand);
  }, [section, language, invoiceRows, invoiceStatuses, payableRows, payableStatuses, transferRows]);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          status={invoiceStatus(selectedInvoice)}
          language={language}
          onClose={() => setSelectedInvoice(null)}
          onIssue={() => {
            issue(selectedInvoice.id);
            setSelectedInvoice(null);
            toast.success(pick(language, `发票 ${selectedInvoice.id} 已开具`, `Invoice ${selectedInvoice.id} issued`));
          }}
        />
      )}
      {selectedPayable && <PayableDetailModal payable={selectedPayable} status={payableStatus(selectedPayable)} language={language} onClose={() => setSelectedPayable(null)} onApprove={() => { approvePayable(selectedPayable.id); setSelectedPayable(null); }} />}
      {selectedTransfer && <TransferDetailModal transfer={selectedTransfer} language={language} onClose={() => setSelectedTransfer(null)} onSettle={() => { markTransferSettled(selectedTransfer.id); setSelectedTransfer(null); }} />}
      {showNewInvoice && <NewInvoiceModal language={language} onClose={() => setShowNewInvoice(false)} onCreate={createInvoice} />}

      {section === "finance" && <FinanceOverview language={language} summary={liveFinanceSummary} />}
      {section === "ar" && (
        <ARInvoices
          language={language}
          invoices={invoiceRows}
          invoiceStatus={invoiceStatus}
          onStatusChange={updateInvoiceStatus}
          onIssue={issue}
          onBatchIssue={batchIssue}
          onSelectInvoice={setSelectedInvoice}
          onExport={exportCurrentSection}
        />
      )}
      {section === "ap" && (
        <APPayables
          language={language}
          payables={payableRows}
          payableStatus={payableStatus}
          onStatusChange={updatePayableStatus}
          onApprove={approvePayable}
          onSelectPayable={setSelectedPayable}
          onExport={exportCurrentSection}
        />
      )}
      {section === "transfer" && (
        <TransferSummary
          language={language}
          transfers={transferRows}
          onStatusChange={updateTransferStatus}
          onSelectTransfer={setSelectedTransfer}
          onSettle={markTransferSettled}
          onExport={exportCurrentSection}
        />
      )}
    </div>
  );
}

function FinanceOverview({ language, summary = financeSummary }: { language: AppLanguage; summary?: typeof financeSummary }) {
  return (
    <>
      <KpiGrid
        items={[
          { label: pick(language, "应收总额", "Total AR"), value: summary.totalAr, color: "#1C64F2" },
          { label: pick(language, "应付总额", "Total AP"), value: summary.totalAp, color: "#8B5CF6" },
          { label: pick(language, "已收款", "Collected"), value: summary.collected, color: "#10B981" },
          { label: pick(language, "待开发票", "Pending Invoices"), value: summary.pendingInvoices, color: "#F59E0B" },
          { label: pick(language, "逾期账款", "Overdue"), value: summary.overdue, color: "#EF4444" },
        ]}
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Panel
          title={pick(language, "应收应付对比", "AR vs AP")}
          subtitle={pick(language, "月度现金流，单位CAD千元", "Monthly cash flow, CAD $K")}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyFlow} barSize={18} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(value: number) => [`CAD $${value}K`, ""]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ar" name="AR" fill="#1C64F2" radius={[3, 3, 0, 0]} />
              <Bar dataKey="ap" name="AP" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="net" name="Net" fill="#10B981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={pick(language, "司机结算汇总", "Driver Settlement Summary")}
          subtitle={pick(language, "2026年4月合作方结算进度", "Apr 2026 partner settlement progress")}
        >
          <SettlementProgress language={language} />
        </Panel>
      </div>
    </>
  );
}

function ARInvoices({ language, invoices, invoiceStatus, onStatusChange, onIssue, onBatchIssue, onSelectInvoice, onExport }: {
  language: AppLanguage;
  invoices: InvoiceRow[];
  invoiceStatus: (invoice: InvoiceRow) => StatusKey;
  onStatusChange: (id: string, status: StatusKey) => void;
  onIssue: (id: string) => void;
  onBatchIssue: () => void;
  onSelectInvoice: (invoice: InvoiceRow) => void;
  onExport: () => void;
}) {
  return (
    <>
      <KpiGrid
        items={[
          { label: pick(language, "发票总额", "Invoice Total"), value: "CAD $17.0K", color: "#1C64F2" },
          { label: pick(language, "待开具", "Pending"), value: String(invoices.filter((invoice) => invoiceStatus(invoice) === "pending").length), color: "#F59E0B" },
          { label: pick(language, "已收款", "Paid"), value: String(invoices.filter((invoice) => invoiceStatus(invoice) === "paid").length), color: "#10B981" },
          { label: pick(language, "逾期", "Overdue"), value: String(invoices.filter((invoice) => invoiceStatus(invoice) === "overdue").length), color: "#EF4444" },
        ]}
      />

      <Panel
        title={pick(language, "应收发票管理", "AR Invoice Management")}
        subtitle={pick(language, "客户发票、税费、到期日与开票操作", "Customer invoices, tax, due dates, and issue actions")}
        actions={<TableActions language={language} onExport={onExport} primaryLabel={pick(language, "批量开具", "Batch Issue")} onPrimary={onBatchIssue} />}
      >
        <DataTable
          headers={language === "en" ? ["Invoice #", "Customer", "Period", "Runs", "Pre-tax", "HST", "Total", "Status", "Due Date", "Action"] : ["发票号", "客户", "期间", "趟数", "税前", "HST", "总额", "状态", "到期日", "操作"]}
          rows={invoices.map((invoice) => {
            const currentStatus = invoiceStatus(invoice);
            return [
              <MonoLink key="id">{invoice.id}</MonoLink>,
              invoice.customer,
              <Mono key="period">{invoice.period}</Mono>,
              <Mono key="runs">{invoice.orders}</Mono>,
              <Mono key="amount">{invoice.amount}</Mono>,
              <MutedMono key="tax">{invoice.tax}</MutedMono>,
              <StrongMono key="total">{invoice.total}</StrongMono>,
              <StatusSelect key="status" status={currentStatus} language={language} options={["pending", "issued", "paid", "overdue"]} onChange={(status) => onStatusChange(invoice.id, status)} />,
              <span key="due" style={{ color: currentStatus === "overdue" ? "#DC2626" : "var(--muted-foreground)", fontFamily: "monospace", fontWeight: currentStatus === "overdue" ? 700 : 400 }}>{invoice.due}</span>,
              currentStatus === "pending"
                ? <ActionButton key="action" label={pick(language, "开具发票", "Issue Invoice")} primary onClick={() => { onIssue(invoice.id); toast.success(pick(language, `发票 ${invoice.id} 已开具`, `Invoice ${invoice.id} issued`)); }} />
                : <ActionButton key="action" label={pick(language, "查看详情", "View Detail")} onClick={() => onSelectInvoice(invoice)} />,
            ];
          })}
        />
      </Panel>
    </>
  );
}

function APPayables({ language, payables, payableStatus, onStatusChange, onApprove, onSelectPayable, onExport }: {
  language: AppLanguage;
  payables: PayableRow[];
  payableStatus: (payable: PayableRow) => StatusKey;
  onStatusChange: (id: string, status: StatusKey) => void;
  onApprove: (id: string) => void;
  onSelectPayable: (payable: PayableRow) => void;
  onExport: () => void;
}) {
  return (
    <>
      <KpiGrid
        items={[
          { label: pick(language, "应付总额", "Payables Total"), value: "CAD $24.8K", color: "#8B5CF6" },
          { label: pick(language, "待批准", "Needs Approval"), value: String(payables.filter((payable) => payableStatus(payable) === "scheduled").length), color: "#F59E0B" },
          { label: pick(language, "已付款", "Paid"), value: String(payables.filter((payable) => payableStatus(payable) === "paid").length), color: "#10B981" },
          { label: pick(language, "逾期", "Overdue"), value: String(payables.filter((payable) => payableStatus(payable) === "overdue").length), color: "#EF4444" },
        ]}
      />

      <Panel
        title={pick(language, "应付账款", "AP Payables")}
        subtitle={pick(language, "司机与合作方账单、批准状态和付款日期", "Driver and partner bills, approval status, and payment due dates")}
        actions={<TableActions language={language} onExport={onExport} />}
      >
        <DataTable
          headers={language === "en" ? ["Payable #", "Vendor", "Category", "Period", "Runs", "Subtotal", "HST", "Total", "Status", "Due Date", "Action"] : ["应付号", "供应商", "类别", "期间", "趟数", "税前", "HST", "总额", "状态", "到期日", "操作"]}
          rows={payables.map((payable) => {
            const currentStatus = payableStatus(payable);
            return [
              <MonoLink key="id">{payable.id}</MonoLink>,
              payable.vendor,
              payable.category,
              <Mono key="period">{payable.period}</Mono>,
              <Mono key="runs">{payable.runs}</Mono>,
              <Mono key="subtotal">{payable.subtotal}</Mono>,
              <MutedMono key="tax">{payable.tax}</MutedMono>,
              <StrongMono key="total">{payable.total}</StrongMono>,
              <StatusSelect key="status" status={currentStatus} language={language} options={["scheduled", "approved", "paid", "overdue"]} onChange={(status) => onStatusChange(payable.id, status)} />,
              <span key="due" style={{ color: currentStatus === "overdue" ? "#DC2626" : "var(--muted-foreground)", fontFamily: "monospace", fontWeight: currentStatus === "overdue" ? 700 : 400 }}>{payable.due}</span>,
              currentStatus === "scheduled"
                ? <ActionButton key="action" label={pick(language, "批准", "Approve")} primary onClick={() => onApprove(payable.id)} />
                : <ActionButton key="action" label={pick(language, "查看", "View")} onClick={() => onSelectPayable(payable)} />,
            ];
          })}
        />
      </Panel>
    </>
  );
}

function TransferSummary({ language, transfers, onStatusChange, onSelectTransfer, onSettle, onExport }: {
  language: AppLanguage;
  transfers: TransferRow[];
  onStatusChange: (id: string, status: StatusKey) => void;
  onSelectTransfer: (transfer: TransferRow) => void;
  onSettle: (id: string) => void;
  onExport: () => void;
}) {
  return (
    <>
      <KpiGrid
        items={[
          { label: pick(language, "中转收入", "Transfer Revenue"), value: "CAD $8.9K", color: "#1C64F2" },
          { label: pick(language, "中转成本", "Transfer Cost"), value: "CAD $6.2K", color: "#8B5CF6" },
          { label: pick(language, "毛利", "Gross Margin"), value: "CAD $2.7K", color: "#10B981" },
          { label: pick(language, "待结算", "Pending Settlement"), value: "1", color: "#F59E0B" },
        ]}
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Panel title={pick(language, "结算进度", "Settlement Progress")} subtitle={pick(language, "按司机/合作方汇总", "By driver and partner")}>
          <SettlementProgress language={language} />
        </Panel>
        <Panel title={pick(language, "中转汇总", "Transfer Summary")} subtitle={pick(language, "收入、成本与毛利", "Revenue, cost, and margin")} actions={<TableActions language={language} onExport={onExport} />}>
          <DataTable
            headers={language === "en" ? ["Transfer #", "Lane", "Partner", "Runs", "Revenue", "Cost", "Margin", "Status", "Settlement", "Action"] : ["中转号", "线路", "合作方", "趟数", "收入", "成本", "毛利", "状态", "结算", "操作"]}
            rows={transfers.map((transfer) => [
              <MonoLink key="id">{transfer.id}</MonoLink>,
              transfer.lane,
              transfer.partner,
              <Mono key="runs">{transfer.runs}</Mono>,
              <StrongMono key="revenue">{transfer.revenue}</StrongMono>,
              <MutedMono key="cost">{transfer.cost}</MutedMono>,
              <StrongMono key="margin">{transfer.margin}</StrongMono>,
              <StatusSelect key="status" status={transfer.status} language={language} options={["pending", "issued", "completed"]} onChange={(status) => onStatusChange(transfer.id, status)} />,
              <span key="settled" style={{ color: transfer.settled === "Pending" ? "#B45309" : "var(--muted-foreground)", fontFamily: "monospace" }}>{transfer.settled}</span>,
              transfer.status === "pending"
                ? <ActionButton key="action" label={pick(language, "结算", "Settle")} primary onClick={() => onSettle(transfer.id)} />
                : <ActionButton key="action" label={pick(language, "查看", "View")} onClick={() => onSelectTransfer(transfer)} />,
            ])}
          />
        </Panel>
      </div>
    </>
  );
}

function KpiGrid({ items }: { items: Array<{ label: string; value: string; color: string }> }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <div key={item.label} className="bg-card rounded-xl border p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{item.label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: item.color }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, subtitle, actions, children }: { title: string; subtitle: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div>
          <div className="text-sm" style={{ fontWeight: 700 }}>{title}</div>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{subtitle}</div>
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="w-full" style={{ minWidth: 900 }}>
        <thead>
          <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2.5 text-left whitespace-nowrap" style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600 }}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b hover:bg-muted/30 transition-colors" style={{ borderColor: "var(--border)" }}>
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2.5 text-xs">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableActions({ language, onExport, primaryLabel, onPrimary }: { language: AppLanguage; onExport: () => void; primaryLabel?: string; onPrimary?: () => void }) {
  return (
    <div className="flex gap-2">
      <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs hover:bg-muted transition-colors" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
        <Download size={12} /> {pick(language, "导出", "Export")}
      </button>
      {primaryLabel && onPrimary && (
        <button onClick={onPrimary} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-90 transition-opacity" style={{ background: "var(--primary)", color: "white", fontWeight: 600 }}>
          <Send size={12} /> {primaryLabel}
        </button>
      )}
    </div>
  );
}

function SettlementProgress({ language }: { language: AppLanguage }) {
  return (
    <div className="space-y-2.5">
      {settlementSummary.map((partner) => (
        <div key={partner.partner} className="flex items-center gap-3">
          <div className="w-36 text-xs truncate" style={{ color: "var(--foreground)", fontWeight: 600 }}>{partner.partner}</div>
          <div className="flex-1">
            <div className="flex justify-between mb-0.5">
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{partner.orders} {pick(language, "趟", "runs")}</span>
              <span style={{ fontSize: 10, fontFamily: "monospace", color: partner.rate === 100 ? "#059669" : "var(--muted-foreground)" }}>{partner.rate}%</span>
            </div>
            <div className="w-full rounded-full h-1.5" style={{ background: "var(--muted)" }}>
              <div className="h-1.5 rounded-full" style={{ width: `${partner.rate}%`, background: partner.rate === 100 ? "#10B981" : partner.rate > 80 ? "#1C64F2" : "#F59E0B" }} />
            </div>
          </div>
          <div className="text-right">
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{partner.settled}</div>
            {partner.pending !== "-" && <div style={{ fontSize: 10, color: "#F59E0B", fontFamily: "monospace" }}>{pick(language, "待结", "Pending")}: {partner.pending}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ status, language }: { status: StatusKey; language: AppLanguage }) {
  const meta = statusMeta[status];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: meta.bg, color: meta.color, fontWeight: 700, fontSize: 11 }}>
      {meta.icon}{statusLabel(status, language)}
    </span>
  );
}

function StatusSelect({ status, language, options, onChange }: { status: StatusKey; language: AppLanguage; options: StatusKey[]; onChange: (status: StatusKey) => void }) {
  const meta = statusMeta[status];
  return (
    <select
      value={status}
      onChange={(event) => onChange(event.target.value as StatusKey)}
      aria-label={pick(language, "更新状态", "Update status")}
      style={{
        background: meta.bg,
        color: meta.color,
        border: "none",
        borderRadius: 999,
        padding: "3px 26px 3px 9px",
        fontSize: 11,
        fontWeight: 800,
        minWidth: 108,
        cursor: "pointer",
        outline: "none",
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>{statusLabel(option, language)}</option>
      ))}
    </select>
  );
}

function statusLabel(status: StatusKey, language: AppLanguage) {
  const meta = statusMeta[status];
  return pick(language, meta.zh, meta.en);
}

function ActionButton({ label, onClick, primary = false }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex min-w-[92px] items-center justify-center rounded-md px-3 py-1.5 text-xs hover:opacity-90 transition-opacity"
      style={{ background: primary ? "var(--primary)" : "var(--muted)", color: primary ? "white" : "var(--muted-foreground)", fontWeight: 600 }}
    >
      {label}
    </button>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return <span style={{ fontFamily: "monospace" }}>{children}</span>;
}

function MutedMono({ children }: { children: ReactNode }) {
  return <span style={{ fontFamily: "monospace", color: "var(--muted-foreground)" }}>{children}</span>;
}

function StrongMono({ children }: { children: ReactNode }) {
  return <span style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--foreground)" }}>{children}</span>;
}

function MonoLink({ children }: { children: ReactNode }) {
  return <span style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 800 }}>{children}</span>;
}

function NewInvoiceModal({ language, onClose, onCreate }: { language: AppLanguage; onClose: () => void; onCreate: (invoice: InvoiceRow) => void }) {
  const [customer, setCustomer] = useState("");
  const [period, setPeriod] = useState("2026-04");
  const [orders, setOrders] = useState("1");
  const [amount, setAmount] = useState("0");
  const [due, setDue] = useState(new Date().toISOString().slice(0, 10));
  const subtotal = Math.max(0, Number(amount) || 0);
  const tax = Math.round(subtotal * 0.13);
  const total = subtotal + tax;
  const invalid = !customer.trim() || subtotal <= 0 || Number(orders) <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border bg-card shadow-2xl" style={{ borderColor: "var(--border)" }} onClick={(event) => event.stopPropagation()}>
        <ModalHeader title={pick(language, "新建应收发票", "New AR Invoice")} subtitle={pick(language, "创建客户发票并加入待开具队列", "Create a customer invoice and add it to the pending queue")} onClose={onClose} />
        <div className="grid gap-3 px-5 py-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <EditField label={pick(language, "客户/柜号", "Customer / Container")}>
            <input value={customer} onChange={(event) => setCustomer(event.target.value)} style={inputStyle} placeholder="ZCSU6522960" />
          </EditField>
          <EditField label={pick(language, "期间", "Period")}>
            <input value={period} onChange={(event) => setPeriod(event.target.value)} style={inputStyle} placeholder="2026-04" />
          </EditField>
          <EditField label={pick(language, "趟数", "Runs")}>
            <input type="number" min={1} value={orders} onChange={(event) => setOrders(event.target.value)} style={inputStyle} />
          </EditField>
          <EditField label={pick(language, "税前金额CAD", "Pre-tax CAD")}>
            <input type="number" min={0} value={amount} onChange={(event) => setAmount(event.target.value)} style={inputStyle} />
          </EditField>
          <EditField label={pick(language, "到期日", "Due Date")}>
            <input type="date" value={due} onChange={(event) => setDue(event.target.value)} style={inputStyle} />
          </EditField>
          <div className="rounded-lg border p-3 text-xs" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
            <div className="flex justify-between"><span>HST 13%</span><strong>CAD ${tax.toLocaleString()}</strong></div>
            <div className="mt-2 flex justify-between"><span>{pick(language, "总额", "Total")}</span><strong>CAD ${total.toLocaleString()}</strong></div>
          </div>
        </div>
        <ModalFooter
          language={language}
          onClose={onClose}
          primaryLabel={pick(language, "新增发票", "Add Invoice")}
          disabled={invalid}
          onPrimary={() => onCreate({
            id: `2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
            customer: customer.trim(),
            period,
            orders: Number(orders),
            amount: `CAD $${subtotal.toLocaleString()}`,
            tax: `CAD $${tax.toLocaleString()}`,
            total: `CAD $${total.toLocaleString()}`,
            status: "pending",
            due,
          })}
        />
      </div>
    </div>
  );
}

function PayableDetailModal({ payable, status, language, onClose, onApprove }: { payable: PayableRow; status: StatusKey; language: AppLanguage; onClose: () => void; onApprove: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-card shadow-2xl" style={{ borderColor: "var(--border)" }} onClick={(event) => event.stopPropagation()}>
        <ModalHeader title={payable.id} subtitle={pick(language, "应付账款详情", "AP Payable Detail")} onClose={onClose} />
        <DetailRows rows={[
          [pick(language, "供应商", "Vendor"), payable.vendor],
          [pick(language, "类别", "Category"), payable.category],
          [pick(language, "期间", "Period"), payable.period],
          [pick(language, "趟数", "Runs"), String(payable.runs)],
          [pick(language, "税前", "Subtotal"), payable.subtotal],
          ["HST 13%", payable.tax],
          [pick(language, "总额", "Total"), payable.total],
          [pick(language, "到期日", "Due Date"), payable.due],
        ]} />
        <div className="px-5 pb-4"><StatusPill status={status} language={language} /></div>
        <ModalFooter language={language} onClose={onClose} primaryLabel={pick(language, "批准付款", "Approve Payment")} onPrimary={onApprove} disabled={status !== "scheduled"} />
      </div>
    </div>
  );
}

function TransferDetailModal({ transfer, language, onClose, onSettle }: { transfer: TransferRow; language: AppLanguage; onClose: () => void; onSettle: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-card shadow-2xl" style={{ borderColor: "var(--border)" }} onClick={(event) => event.stopPropagation()}>
        <ModalHeader title={transfer.id} subtitle={pick(language, "中转详情", "Transfer Detail")} onClose={onClose} />
        <DetailRows rows={[
          [pick(language, "线路", "Lane"), transfer.lane],
          [pick(language, "合作方", "Partner"), transfer.partner],
          [pick(language, "趟数", "Runs"), String(transfer.runs)],
          [pick(language, "收入", "Revenue"), transfer.revenue],
          [pick(language, "成本", "Cost"), transfer.cost],
          [pick(language, "毛利", "Margin"), transfer.margin],
          [pick(language, "结算日期", "Settlement"), transfer.settled],
        ]} />
        <div className="px-5 pb-4"><StatusPill status={transfer.status} language={language} /></div>
        <ModalFooter language={language} onClose={onClose} primaryLabel={pick(language, "标记结算", "Mark Settled")} onPrimary={onSettle} disabled={transfer.status !== "pending"} />
      </div>
    </div>
  );
}

function InvoiceDetailModal({ invoice, status, language, onClose, onIssue }: { invoice: InvoiceRow; status: StatusKey; language: AppLanguage; onClose: () => void; onIssue: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-card shadow-2xl" style={{ borderColor: "var(--border)" }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: "var(--primary)" }}>{invoice.id}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{pick(language, "发票详情 · CAD / 13% HST", "Invoice Detail · CAD / 13% HST")}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted" style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
        </div>
        <div className="space-y-2 px-5 py-4">
          {[
            [pick(language, "客户", "Customer"), invoice.customer],
            [pick(language, "期间", "Period"), invoice.period],
            [pick(language, "趟数", "Runs"), String(invoice.orders)],
            [pick(language, "税前", "Pre-tax"), invoice.amount],
            ["HST 13%", invoice.tax],
            [pick(language, "总额", "Total"), invoice.total],
            [pick(language, "到期日", "Due Date"), invoice.due],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between border-b py-2 text-xs" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
              <span style={{ fontWeight: 600, fontFamily: value.startsWith("CAD") ? "monospace" : "inherit" }}>{value}</span>
            </div>
          ))}
          <div className="flex justify-between border-b py-2 text-xs" style={{ borderColor: "var(--border)" }}>
            <span style={{ color: "var(--muted-foreground)" }}>{pick(language, "状态", "Status")}</span>
            <StatusPill status={status} language={language} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-xs hover:bg-muted" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>{pick(language, "关闭", "Close")}</button>
          {status === "pending" && (
            <button onClick={onIssue} className="rounded-lg px-4 py-2 text-xs" style={{ background: "var(--primary)", color: "white", fontWeight: 600 }}>{pick(language, "开具发票", "Issue Invoice")}</button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--input-background)", color: "var(--foreground)", fontSize: 13 };

function EditField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 5 }}>{label}</div>
      {children}
    </label>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: "var(--primary)" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{subtitle}</div>
      </div>
      <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted" style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
    </div>
  );
}

function ModalFooter({ language, onClose, primaryLabel, onPrimary, disabled = false }: { language: AppLanguage; onClose: () => void; primaryLabel: string; onPrimary: () => void; disabled?: boolean }) {
  return (
    <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
      <button onClick={onClose} className="rounded-lg border px-4 py-2 text-xs hover:bg-muted" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>{pick(language, "关闭", "Close")}</button>
      <button onClick={onPrimary} disabled={disabled} className="rounded-lg px-4 py-2 text-xs" style={{ background: "var(--primary)", color: "white", fontWeight: 600, opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>{primaryLabel}</button>
    </div>
  );
}

function DetailRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="space-y-2 px-5 py-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 border-b py-2 text-xs" style={{ borderColor: "var(--border)" }}>
          <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
          <span style={{ fontWeight: 600, fontFamily: value.startsWith("CAD") || value.match(/^\d{4}-/) ? "monospace" : "inherit", textAlign: "right" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}
