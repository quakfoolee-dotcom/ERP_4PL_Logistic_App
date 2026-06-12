import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { FileText, CheckCircle2, Clock, AlertCircle, Download, Send, X } from "lucide-react";
import { toast } from "sonner";

// Real container invoice numbers from 2026 dispatch sheet (CAD)
const invoices = [
  { id: "2026-0140", customer: "HMMU4464340", period: "2026-04", orders: 1, amount: "CAD $2,018", tax: "CAD $263", total: "CAD $2,281", status: "待开具", due: "2026-05-30" },
  { id: "2026-0139", customer: "BEAU6280647", period: "2026-04", orders: 2, amount: "CAD $2,573", tax: "CAD $335", total: "CAD $2,908", status: "待开具", due: "2026-05-28" },
  { id: "2026-0138", customer: "HMMU7089094", period: "2026-04", orders: 1, amount: "CAD $2,065", tax: "CAD $268", total: "CAD $2,333", status: "已开具", due: "2026-05-25" },
  { id: "2026-0137", customer: "ZCSU6522960", period: "2026-03", orders: 3, amount: "CAD $3,279", tax: "CAD $426", total: "CAD $3,705", status: "已收款", due: "2026-04-30" },
  { id: "2026-0136", customer: "AP-PDN", period: "2025-11", orders: 2, amount: "CAD $2,178", tax: "CAD $283", total: "CAD $2,461", status: "已收款", due: "2025-12-31" },
  { id: "2026-0135", customer: "CSGU6675337", period: "2026-04", orders: 1, amount: "CAD $2,966", tax: "CAD $386", total: "CAD $3,352", status: "逾期", due: "2026-05-15" },
  { id: "2026-0134", customer: "AP-PANEX", period: "2025-11", orders: 1, amount: "CAD $1,782", tax: "CAD $232", total: "CAD $2,014", status: "已收款", due: "2025-12-15" },
  { id: "2026-0133", customer: "AP-DB", period: "2025-11", orders: 4, amount: "CAD $2,890", tax: "CAD $376", total: "CAD $3,266", status: "已收款", due: "2025-12-31" },
  { id: "2026-0132", customer: "TD-JW", period: "2025-11", orders: 8, amount: "CAD $2,482", tax: "CAD $323", total: "CAD $2,805", status: "已收款", due: "2025-12-15" },
  { id: "2026-0131", customer: "AP-LLL", period: "2025-11", orders: 6, amount: "CAD $2,245", tax: "CAD $292", total: "CAD $2,537", status: "已收款", due: "2025-12-15" },
];

// Monthly AR vs AP in CAD $K (actual operations)
const monthlyFlow = [
  { month: "Jan", ar: 38.4, ap: 26.8, net: 11.6 },
  { month: "Feb", ar: 42.6, ap: 29.4, net: 13.2 },
  { month: "Mar", ar: 58.8, ap: 39.6, net: 19.2 },
  { month: "Apr", ar: 62.4, ap: 42.1, net: 20.3 },
  { month: "May", ar: 56.7, ap: 38.2, net: 18.5 },
  { month: "Jun", ar: 49.2, ap: 32.8, net: 16.4 },
];

// Driver/partner settlement summary (Nov 2025)
const transferSummary = [
  { partner: "AD — Straightship Daily", orders: 88, amount: "CAD $5,510", settled: "CAD $5,510", pending: "—", rate: "100%" },
  { partner: "LH Driver", orders: 38, amount: "CAD $4,560", settled: "CAD $4,560", pending: "—", rate: "100%" },
  { partner: "AF Driver", orders: 52, amount: "CAD $6,240", settled: "CAD $5,720", pending: "CAD $520", rate: "91.7%" },
  { partner: "WH — Jeff (Sysco)", orders: 45, amount: "CAD $3,375", settled: "CAD $3,375", pending: "—", rate: "100%" },
  { partner: "LF Driver", orders: 31, amount: "CAD $3,720", settled: "CAD $2,790", pending: "CAD $930", rate: "75.0%" },
];

const invoiceStatus: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  "待开具": { bg: "#FEF3C7", color: "#D97706", icon: <Clock size={11} /> },
  "已开具": { bg: "#DBEAFE", color: "#1D4ED8", icon: <FileText size={11} /> },
  "已收款": { bg: "#D1FAE5", color: "#059669", icon: <CheckCircle2 size={11} /> },
  "逾期": { bg: "#FEE2E2", color: "#DC2626", icon: <AlertCircle size={11} /> },
};

export function FinanceView() {
  const [invoiceStatuses, setInvoiceStatuses] = useState<Record<string, string>>({});
  const [selectedInvoice, setSelectedInvoice] = useState<typeof invoices[0] | null>(null);

  function getStatus(id: string, def: string) {
    return invoiceStatuses[id] ?? def;
  }

  function issue(id: string) {
    setInvoiceStatuses(prev => ({ ...prev, [id]: "已开具" }));
  }

  function batchIssue() {
    const updates: Record<string, string> = {};
    let count = 0;
    invoices.forEach(inv => {
      if (getStatus(inv.id, inv.status) === "待开具") { updates[inv.id] = "已开具"; count++; }
    });
    setInvoiceStatuses(prev => ({ ...prev, ...updates }));
    if (count > 0) toast.success(`Batch issued ${count} invoice${count > 1 ? "s" : ""}`, { description: "All pending invoices marked as issued." });
    else toast.info("No pending invoices to issue");
  }

  function handleExport() {
    const rows = invoices.map(i => `${i.id},${i.customer},${i.total},${getStatus(i.id, i.status)}`).join("\n");
    const csv = `Invoice#,Customer,Total (CAD incl. HST),Status\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "invoices_export.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          status={getStatus(selectedInvoice.id, selectedInvoice.status)}
          onClose={() => setSelectedInvoice(null)}
          onIssue={() => {
            issue(selectedInvoice.id);
            setSelectedInvoice(null);
            toast.success(`Invoice ${selectedInvoice.id} issued`, { description: `${selectedInvoice.customer} · ${selectedInvoice.total} issued` });
          }}
        />
      )}
      {/* KPI row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {[
          { label: "应收总额 Total AR", value: "CAD $62.4K", color: "#1C64F2" },
          { label: "应付总额 Total AP", value: "CAD $42.1K", color: "#8B5CF6" },
          { label: "已收款 Collected", value: "CAD $48.7K", color: "#10B981" },
          { label: "待开发票 Pending", value: "4 invoices", color: "#F59E0B" },
          { label: "逾期账款 Overdue", value: "CAD $3,352", color: "#EF4444" },
        ].map((k, i) => (
          <div key={i} className="bg-card rounded-xl border p-4"
            style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="bg-card rounded-xl border p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="mb-3">
            <span className="text-sm" style={{ fontWeight: 600 }}>应收应付对比</span>
            <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>AR vs AP Monthly (CAD $K)</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyFlow} barSize={18} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`CAD $${v}K`, ""]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ar" name="AR ($K)" fill="#1C64F2" radius={[3, 3, 0, 0]} />
              <Bar dataKey="ap" name="AP ($K)" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="net" name="Net ($K)" fill="#10B981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="mb-3">
            <span className="text-sm" style={{ fontWeight: 600 }}>司机结算汇总</span>
            <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Driver Settlement Summary — Nov 2025</span>
          </div>
          <div className="space-y-2.5">
            {transferSummary.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-28 text-xs truncate" style={{ color: "var(--foreground)", fontWeight: 500 }}>{p.partner}</div>
                <div className="flex-1">
                  <div className="flex justify-between mb-0.5">
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{p.orders} runs</span>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: p.rate === "100%" ? "#059669" : "var(--muted-foreground)" }}>{p.rate}</span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ background: "var(--muted)" }}>
                    <div className="h-1.5 rounded-full"
                      style={{ width: p.rate, background: p.rate === "100%" ? "#10B981" : p.rate > "80%" ? "#1C64F2" : "#F59E0B" }} />
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace" }}>{p.settled}</div>
                  {p.pending !== "—" && <div style={{ fontSize: 10, color: "#F59E0B", fontFamily: "monospace" }}>Pending: {p.pending}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice table */}
      <div className="bg-card rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <span className="text-sm" style={{ fontWeight: 600 }}>发票管理</span>
            <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Invoice Management — CAD (13% HST)</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs hover:bg-muted transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
              <Download size={12} /> Export CSV
            </button>
            <button onClick={batchIssue} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-90 transition-opacity"
              style={{ background: "var(--primary)", color: "white", fontWeight: 500 }}>
              <Send size={12} /> Batch Issue
            </button>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
              {["Invoice #", "Customer / Container", "Period", "Runs", "Pre-tax (CAD)", "HST 13%", "Total (CAD)", "Status", "Due Date", "Action"].map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-left whitespace-nowrap"
                  style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => {
              const currentStatus = getStatus(inv.id, inv.status);
              const st = invoiceStatus[currentStatus];
              return (
                <tr key={i} className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  style={{ borderColor: "var(--border)" }}
                  onClick={() => setSelectedInvoice(inv)}>
                  <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: "monospace", color: "var(--primary)", fontWeight: 600 }}>{inv.id}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ fontWeight: 500 }}>{inv.customer}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ fontFamily: "monospace" }}>{inv.period}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ fontFamily: "monospace" }}>{inv.orders}</td>
                  <td className="px-3 py-2.5" style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 500 }}>{inv.amount}</td>
                  <td className="px-3 py-2.5" style={{ fontSize: 12, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{inv.tax}</td>
                  <td className="px-3 py-2.5" style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "var(--foreground)" }}>{inv.total}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs w-fit"
                      style={{ background: st?.bg, color: st?.color, fontWeight: 500, fontSize: 11 }}>
                      {st?.icon}{currentStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs"
                    style={{ color: currentStatus === "逾期" ? "#DC2626" : "var(--muted-foreground)", fontFamily: "monospace", fontWeight: currentStatus === "逾期" ? 600 : 400 }}>
                    {inv.due}
                  </td>
                  <td className="px-3 py-2.5">
                    {currentStatus === "待开具" ? (
                      <button onClick={(e) => { e.stopPropagation(); issue(inv.id); toast.success(`Invoice ${inv.id} issued`, { description: `${inv.customer} · ${inv.total} issued` }); }}
                        className="text-xs px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
                        style={{ background: "var(--primary)", color: "white", fontWeight: 500 }}>
                        Issue Invoice
                      </button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }}
                        className="text-xs px-2 py-0.5 rounded hover:bg-muted transition-colors"
                        style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontWeight: 500 }}>
                        View Detail
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoiceDetailModal({ invoice, status, onClose, onIssue }: { invoice: typeof invoices[0]; status: string; onClose: () => void; onIssue: () => void }) {
  const st = invoiceStatus[status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-card shadow-2xl" style={{ borderColor: "var(--border)" }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: "var(--primary)" }}>{invoice.id}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Invoice Detail · CAD / 13% HST</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted" style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
        </div>
        <div className="space-y-2 px-5 py-4">
          {[
            ["Customer / Container", invoice.customer],
            ["Period", invoice.period],
            ["Runs", String(invoice.orders)],
            ["Pre-tax", invoice.amount],
            ["HST 13%", invoice.tax],
            ["Total", invoice.total],
            ["Due Date", invoice.due],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between border-b py-2 text-xs" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
              <span style={{ fontWeight: 600, fontFamily: value.startsWith("CAD") ? "monospace" : "inherit" }}>{value}</span>
            </div>
          ))}
          <div className="flex justify-between border-b py-2 text-xs" style={{ borderColor: "var(--border)" }}>
            <span style={{ color: "var(--muted-foreground)" }}>Status</span>
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: st?.bg, color: st?.color, fontWeight: 600 }}>{st?.icon}{status}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-xs hover:bg-muted" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>Close</button>
          {status === "待开具" && (
            <button onClick={onIssue} className="rounded-lg px-4 py-2 text-xs" style={{ background: "var(--primary)", color: "white", fontWeight: 600 }}>Issue Invoice</button>
          )}
        </div>
      </div>
    </div>
  );
}
