import { useEffect, useMemo, useState } from "react";
import { DollarSign, AlertTriangle, CheckCircle2, TrendingUp, XCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { useActionDialog } from "./ActionDialog";
import { pick, type AppLanguage } from "../i18n";
import type { BankStatementRow, ReconciliationStatus } from "../domain/financeProjection";
import { getFinanceProjection } from "../repositories/projections";
import { orderToCashRepository } from "../repositories/orderToCashRepository";
import { useOrderToCashSnapshot } from "./BackboneTracePanel";

type RecStatus = ReconciliationStatus;
interface RecRow { id: string; customer: string; invoiceAmt: number; driverCost: number; depositedAmt?: number; openAmt?: number; bankReference?: string; status: RecStatus; note?: string; }

const init: RecRow[] = [
  { id:"2026-0131", customer:"AP-LLL",      invoiceAmt:2245, driverCost:1540, status:"matched" },
  { id:"2026-0132", customer:"TD-JW",       invoiceAmt:2482, driverCost:1620, status:"matched" },
  { id:"2026-0133", customer:"AP-DB",       invoiceAmt:2890, driverCost:1610, status:"matched" },
  { id:"2026-0134", customer:"AP-PANEX",    invoiceAmt:1782, driverCost:1050, status:"matched" },
  { id:"2026-0135", customer:"CSGU6675337", invoiceAmt:2966, driverCost:1480, status:"matched" },
  { id:"2026-0136", customer:"AP-PDN",      invoiceAmt:2178, driverCost:1705, status:"matched" },
  { id:"2026-0137", customer:"ZCSU6522960", invoiceAmt:3279, driverCost:2010, status:"matched" },
  { id:"2026-0138", customer:"AP-QX",       invoiceAmt:1840, driverCost:1150, status:"disputed", note:"费率争议 Rate dispute — $735 billed vs $1,150 expected" },
  { id:"2026-0139", customer:"AP-CBWS",     invoiceAmt:0,    driverCost:455,  status:"unmatched", note:"拒收未开票 Rejected delivery — no invoice raised, driver cost outstanding" },
  { id:"2026-0140", customer:"AP-LT",       invoiceAmt:2320, driverCost:1510, status:"matched" },
];

const sm: Record<RecStatus,{label:string;labelEn:string;color:string;bg:string}> = {
  matched:   { label:"\u5df2\u5bf9\u8d26",  labelEn:"Matched",   color:"#047857", bg:"#d1fae5" },
  partial:   { label:"\u90e8\u5206\u5339\u914d",  labelEn:"Partial",   color:"#b45309", bg:"#fef3c7" },
  unmatched: { label:"\u672a\u5339\u914d",  labelEn:"Unmatched", color:"#b91c1c", bg:"#fee2e2" },
  disputed:  { label:"\u4e89\u8bae\u4e2d",  labelEn:"Disputed",  color:"#b45309", bg:"#fef3c7" },
};
const card: React.CSSProperties = { background:"var(--card)", borderRadius:12, border:"1px solid var(--border)", boxShadow:"0 1px 4px rgba(0,0,0,.04)" };
const th: React.CSSProperties = { background:"var(--muted)", fontSize:11, fontWeight:600, padding:"8px 12px", textAlign:"left", color:"var(--muted-foreground)" };
const td: React.CSSProperties = { padding:"10px 12px", fontSize:12, borderBottom:"1px solid var(--border)" };

function BankStatementImportPanel({
  language,
  rows,
  onImport,
  onAccept,
  onReject,
}: {
  language: AppLanguage;
  rows: BankStatementRow[];
  onImport: () => void;
  onAccept: (row: BankStatementRow) => void;
  onReject: (row: BankStatementRow) => void;
}) {
  const activeRows = rows.filter((row) => row.sourceFileName || row.suggestedInvoiceId || row.status !== "matched").slice(0, 6);
  const statusLabel = (row: BankStatementRow) => {
    if (row.status === "matched") return pick(language, "\u5df2\u5339\u914d", "Matched");
    if (row.status === "partial") return pick(language, "\u90e8\u5206\u5339\u914d", "Partial");
    if (row.status === "exception") return pick(language, "\u9700\u590d\u6838", "Review");
    return row.suggestedInvoiceId ? pick(language, "\u5efa\u8bae\u5339\u914d", "Suggested") : pick(language, "\u672a\u5339\u914d", "Unmatched");
  };

  return (
    <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
      <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{pick(language, "\u94f6\u884c\u6d41\u6c34\u5bfc\u5165\u4e0e\u667a\u80fd\u5339\u914d", "Bank Statement Import & Match Suggestions")}</div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{pick(language, "\u5bfc\u5165\u94f6\u884c\u6d41\u6c34\uff0c\u6839\u636e\u53c2\u8003\u53f7\u3001\u91d1\u989d\u548c\u5ba2\u6237\u63a8\u8350\u5e94\u6536\u53d1\u7968\u5339\u914d\u3002", "Import statement rows and suggest AR invoice matches by reference, amount, and customer.")}</div>
        </div>
        <button onClick={onImport} className="flex items-center gap-1" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, border: "none", cursor: "pointer", background: "var(--primary)", color: "#fff", fontWeight: 700 }}>
          <Download size={13} /> {pick(language, "\u5bfc\u5165\u6d41\u6c34", "Import Statement")}
        </button>
      </div>
      {activeRows.length === 0 ? (
        <div style={{ padding: 16, fontSize: 12, color: "var(--muted-foreground)" }}>
          {pick(language, "\u6682\u65e0\u94f6\u884c\u6d41\u6c34\u3002\u70b9\u51fb\u5bfc\u5165\u6d41\u6c34\u4ee5\u751f\u6210\u5f85\u590d\u6838\u5339\u914d\u3002", "No statement rows yet. Import a statement to generate match suggestions.")}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr>
                {(language === "en"
                  ? ["Reference", "Customer", "Amount", "Received", "Suggested Invoice", "Confidence", "Status", "Source", "Action"]
                  : ["\u53c2\u8003\u53f7", "\u5ba2\u6237", "\u91d1\u989d", "\u5165\u8d26\u65e5", "\u5efa\u8bae\u53d1\u7968", "\u4fe1\u5fc3", "\u72b6\u6001", "\u6765\u6e90", "\u64cd\u4f5c"]).map((header) => <th key={header} style={th}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row) => (
                <tr key={row.depositId}>
                  <td style={{ ...td, fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>{row.reference}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{row.customer}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontWeight: 800 }}>CAD ${row.amountCad.toLocaleString("en-CA")}</td>
                  <td style={{ ...td, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{row.receivedDate}</td>
                  <td style={{ ...td }}>
                    <div style={{ fontFamily: "monospace", fontWeight: 700 }}>{row.suggestedInvoiceId ?? row.invoiceId ?? "-"}</div>
                    {row.suggestionReason && <div style={{ color: "var(--muted-foreground)", fontSize: 11, maxWidth: 280 }}>{row.suggestionReason}</div>}
                  </td>
                  <td style={td}>{row.suggestionConfidence ?? "-"}</td>
                  <td style={td}>
                    <span style={{ borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700, background: row.status === "matched" ? "#d1fae5" : row.status === "exception" ? "#fee2e2" : "#fef3c7", color: row.status === "matched" ? "#047857" : row.status === "exception" ? "#b91c1c" : "#b45309" }}>
                      {statusLabel(row)}
                    </span>
                  </td>
                  <td style={{ ...td, color: "var(--muted-foreground)" }}>{row.sourceFileName ?? row.bankAccount}</td>
                  <td style={td}>
                    <div className="flex gap-1.5">
                      {row.suggestedInvoiceId && row.status === "unmatched" && (
                        <>
                          <button onClick={() => onAccept(row)} style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, border: "none", background: "#d1fae5", color: "#047857", cursor: "pointer", fontWeight: 700 }}>{pick(language, "\u63a5\u53d7", "Accept")}</button>
                          <button onClick={() => onReject(row)} style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)", cursor: "pointer" }}>{pick(language, "\u62d2\u7edd", "Reject")}</button>
                        </>
                      )}
                      {!row.suggestedInvoiceId && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{row.memo ?? "-"}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ReconciliationView({ language }: { language: AppLanguage }) {
  const orderToCashSnapshot = useOrderToCashSnapshot();
  const liveProjection = useMemo(() => getFinanceProjection(), [orderToCashSnapshot]);
  const liveRows = liveProjection.reconciliationRows;
  const liveStatementRows = liveProjection.bankStatementRows;
  const { promptDialog, confirmDialog, ActionDialog } = useActionDialog();
  const [rows, setRows] = useState<RecRow[]>(() => getFinanceProjection().reconciliationRows);
  const [statementRows, setStatementRows] = useState<BankStatementRow[]>(() => getFinanceProjection().bankStatementRows);
  const [filter, setFilter] = useState<"all"|RecStatus>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ invoiceAmt: string; driverCost: string; status: RecStatus; note: string }>({
    invoiceAmt: "",
    driverCost: "",
    status: "matched",
    note: "",
  });

  useEffect(() => {
    setRows(liveRows);
    setStatementRows(liveStatementRows);
  }, [liveRows, liveStatementRows]);

  const totalAR    = rows.reduce((s,r)=>s+r.invoiceAmt,0);
  const totalAP    = rows.reduce((s,r)=>s+r.driverCost,0);
  const net        = totalAR - totalAP;
  const unmatched  = rows.filter(r=>r.status==="unmatched").length;
  const partial    = rows.filter(r=>r.status==="partial").length;
  const disputed   = rows.filter(r=>r.status==="disputed").length;

  const displayed = filter==="all" ? rows : rows.filter(r=>r.status===filter);

  function refreshRows() {
    const projection = getFinanceProjection();
    setRows(projection.reconciliationRows);
    setStatementRows(projection.bankStatementRows);
  }

  function importStatementRows() {
    const imported = orderToCashRepository.importSampleBankStatementRows();
    refreshRows();
    toast.success(imported.length > 0
      ? pick(language, `${imported.length} \u6761\u94f6\u884c\u6d41\u6c34\u5df2\u5bfc\u5165`, `${imported.length} bank statement row${imported.length > 1 ? "s" : ""} imported`)
      : pick(language, "\u6ca1\u6709\u53ef\u5bfc\u5165\u7684\u672a\u7ed3\u53d1\u7968\u6d41\u6c34", "No open invoice statement rows to import"));
  }

  function acceptStatementMatch(row: BankStatementRow) {
    const invoice = orderToCashRepository.matchBankStatementDeposit(row.depositId, row.suggestedInvoiceId ?? row.invoiceId);
    refreshRows();
    if (invoice) toast.success(pick(language, "\u94f6\u884c\u6d41\u6c34\u5df2\u5339\u914d\u5e76\u66f4\u65b0\u5bf9\u8d26", "Bank statement row matched and reconciliation updated"));
    else toast.error(pick(language, "\u65e0\u6cd5\u5339\u914d\u8be5\u94f6\u884c\u6d41\u6c34", "Unable to match this statement row"));
  }

  async function rejectStatementMatch(row: BankStatementRow) {
    const note = await promptDialog(pick(language, "\u62d2\u7edd\u5339\u914d\u539f\u56e0", "Reject Match Reason"), {
      defaultValue: pick(language, "\u91d1\u989d\u3001\u5ba2\u6237\u6216\u53c2\u8003\u53f7\u9700\u8981\u4eba\u5de5\u590d\u6838\u3002", "Amount, customer, or reference requires manual review."),
    });
    if (!note) return;
    const deposit = orderToCashRepository.rejectBankStatementSuggestion(row.depositId, note);
    refreshRows();
    if (deposit) toast.warning(pick(language, "\u5efa\u8bae\u5339\u914d\u5df2\u62d2\u7edd", "Suggested match rejected"));
    else toast.error(pick(language, "\u627e\u4e0d\u5230\u94f6\u884c\u6d41\u6c34", "Statement row not found"));
  }

  function startEdit(row: RecRow) {
    setEditingId(row.id);
    setDraft({
      invoiceAmt: String(row.invoiceAmt),
      driverCost: String(row.driverCost),
      status: row.status,
      note: row.note || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ invoiceAmt: "", driverCost: "", status: "matched", note: "" });
  }

  function saveEdit(id: string) {
    const invoiceAmt = Number(draft.invoiceAmt);
    const driverCost = Number(draft.driverCost);
    if (!Number.isFinite(invoiceAmt) || !Number.isFinite(driverCost) || invoiceAmt < 0 || driverCost < 0) {
      toast.error(pick(language, "请输入有效的非负发票金额和司机成本。", "Enter valid non-negative invoice and driver cost amounts."));
      return;
    }
    setRows(prev => prev.map(row => row.id === id ? {
      ...row,
      invoiceAmt,
      driverCost,
      status: draft.status,
      note: draft.note.trim() || undefined,
    } : row));
    setEditingId(null);
    toast.success(pick(language, `${id} 已更新`, `${id} updated`));
  }

  function matchRow(id: string) {
    const invoice = orderToCashRepository.matchInvoiceBankDeposit(id);
    refreshRows();
    if (invoice) toast.success(`${id} matched`);
    else toast.error(`${id} not found`);
  }

  async function partialRow(id: string) {
    const amount = await promptDialog(pick(language, "\u90e8\u5206\u4ed8\u6b3e\u91d1\u989d", "Partial Payment Amount"), { message: pick(language, "\u8f93\u5165\u5df2\u5230\u8d26\u94f6\u884c\u91d1\u989d\uff08CAD\uff09\u3002", "Enter received bank amount in CAD.") });
    if (!amount) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(pick(language, "\u8bf7\u8f93\u5165\u6709\u6548\u91d1\u989d", "Enter a valid amount"));
      return;
    }
    const reference = await promptDialog(pick(language, "\u94f6\u884c\u53c2\u8003\u53f7", "Bank Reference"), { defaultValue: `PARTIAL-${id}` });
    const invoice = orderToCashRepository.markInvoicePartialPayment(id, value, reference ?? undefined);
    refreshRows();
    if (invoice) toast.success(`${id} partial payment matched`);
    else toast.error(`${id} not found`);
  }

  async function disputeRow(id: string) {
    const reason = await promptDialog(pick(language, "\u4e89\u8bae\u539f\u56e0", "Dispute Reason"));
    if (!reason) return;
    const invoice = orderToCashRepository.disputeInvoiceCollection(id, reason);
    refreshRows();
    if (invoice) toast.warning("Dispute flagged", { description: reason });
    else toast.error(`${id} not found`);
  }

  function resolveRow(id: string) {
    const invoice = orderToCashRepository.matchInvoiceBankDeposit(id);
    refreshRows();
    if (invoice) toast.success(`Dispute resolved - ${id} matched`);
    else toast.error(`${id} not found`);
  }

  function escalateRow(id: string) {
    orderToCashRepository.disputeInvoiceCollection(id, "Dispute escalated to management.");
    refreshRows();
    toast.warning(`${id} escalated`, { description: "Row remains in disputed status with escalation note." });
  }

  async function writeOffRow(id: string) {
    const ok = await confirmDialog(pick(language, "\u6838\u9500\u5bf9\u8d26", "Write Off Reconciliation"), { message: pick(language, `\u6838\u9500 ${id}\uff1f\u8fd9\u4f1a\u5173\u95ed\u5269\u4f59\u5e94\u6536\u4f59\u989d\u3002`, `Write off ${id}? This closes the remaining AR balance.`) });
    if (!ok) return;
    const invoice = orderToCashRepository.writeOffInvoiceBalance(id);
    refreshRows();
    if (invoice) toast.info(`${id} written off`);
    else toast.error(`${id} not found`);
  }

  function exportCSV() {
    const header = "Invoice#,Customer,Invoice Amount (CAD),Deposited (CAD),Open AR (CAD),Bank Reference,Driver Cost (CAD),Gross Margin,Margin %,Status,Notes";
    const body = rows.map(r=>{
      const gm = r.invoiceAmt - r.driverCost;
      const pct = r.invoiceAmt>0 ? ((gm/r.invoiceAmt)*100).toFixed(1) : "N/A";
      return `${r.id},${r.customer},${r.invoiceAmt},${r.depositedAmt ?? ""},${r.openAmt ?? ""},${r.bankReference ?? ""},${r.driverCost},${gm},${pct}%,${sm[r.status].labelEn},"${r.note||""}"`;
    }).join("\n");
    const blob = new Blob([header+"\n"+body],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="reconciliation.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported reconciliation.csv");
  }

  return (
    <div className="flex-1 overflow-auto p-5" style={{background:"var(--background)"}}>
      <ActionDialog />
      <BankStatementImportPanel
        language={language}
        rows={statementRows}
        onImport={importStatementRows}
        onAccept={acceptStatementMatch}
        onReject={rejectStatementMatch}
      />
      {/* KPIs — clickable to filter */}
      <div className="flex gap-4 mb-5">
        {[
          { label:pick(language, "应收开票总额", "Total Billed (AR)"),   value:`CAD $${totalAR.toLocaleString()}`,  icon:DollarSign,    color:"var(--primary)", bg:"#eff6ff",  f:"all" },
          { label:pick(language, "司机成本总额", "Total Driver Cost"),   value:`CAD $${totalAP.toLocaleString()}`,  icon:TrendingUp,    color:"#8B5CF6",       bg:"#f3e8ff",  f:"all" },
          { label:pick(language, "净毛利", "Net Margin"),          value:`CAD $${net.toLocaleString()}`,       icon:CheckCircle2,  color:"#047857",       bg:"#d1fae5",  f:"matched" },
          { label:pick(language, "\u90e8\u5206\u5339\u914d", "Partial Matches"),      value:String(partial),                      icon:AlertTriangle, color:"#b45309",       bg:"#fef3c7",  f:"partial" },
          { label:pick(language, "未匹配项目", "Unmatched Items"),     value:String(unmatched),                    icon:XCircle,       color:"#b91c1c",       bg:"#fee2e2",  f:"unmatched" },
          { label:pick(language, "争议项目", "Disputed Items"),      value:String(disputed),                     icon:AlertTriangle, color:"#b45309",       bg:"#fef3c7",  f:"disputed" },
        ].map(({ label, value, icon: Icon, color, bg, f })=>(
          <div key={label} style={{...card,flex:1,padding:16,cursor:"pointer"}} onClick={()=>setFilter(f as any)}>
            <div className="flex items-center justify-between">
              <div>
                <div style={{fontSize:11,color:"var(--muted-foreground)",marginBottom:4}}>{label}</div>
                <div style={{fontSize:20,fontWeight:700,fontFamily:"monospace",color}}>{value}</div>
              </div>
              <div style={{background:bg,borderRadius:10,padding:10}}><Icon size={18} style={{color}}/></div>
            </div>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div className="flex items-center justify-between" style={{padding:"12px 16px",borderBottom:"1px solid var(--border)"}}>
          <div>
            <div style={{fontWeight:700,fontSize:14}}>{pick(language, "对账明细", "Reconciliation Table")}</div>
            <div style={{fontSize:11,color:"var(--muted-foreground)"}}>{pick(language, "发票应收与司机应付成本匹配 — CAD", "Invoice AR matched against Driver AP costs — CAD")}</div>
          </div>
          <div className="flex gap-2">
            {(["all","matched","partial","unmatched","disputed"] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{padding:"4px 12px",borderRadius:6,fontSize:11,border:"1px solid var(--border)",cursor:"pointer",fontWeight:600,background:filter===f?"var(--primary)":"var(--card)",color:filter===f?"#fff":"var(--foreground)"}}>
                {f==="all"?pick(language, "全部", "All"):(language === "en" ? sm[f]?.labelEn : sm[f]?.label)||f}
              </button>
            ))}
            <button onClick={exportCSV} className="flex items-center gap-1" style={{padding:"4px 12px",borderRadius:6,fontSize:11,border:"1px solid var(--border)",cursor:"pointer",color:"var(--muted-foreground)",background:"var(--card)"}}>
              <Download size={12}/> {pick(language, "导出", "Export")}
            </button>
          </div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>{(language === "en" ? ["Invoice #","Customer","Invoice (CAD)","Deposited","Open AR","Bank Ref","Driver Cost","Gross Margin","Margin %","Status","Notes","Actions"] : ["\u53d1\u7968\u53f7","\u5ba2\u6237","\u53d1\u7968(CAD)","\u5df2\u5165\u8d26","\u672a\u6536\u6b3e","\u94f6\u884c\u53c2\u8003","\u53f8\u673a\u6210\u672c","\u6bdb\u5229","\u6bdb\u5229\u7387","\u72b6\u6001","\u5907\u6ce8","\u64cd\u4f5c"]).map(h=><th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {displayed.map(r=>{
              const gm = r.invoiceAmt - r.driverCost;
              const pct = r.invoiceAmt>0 ? ((gm/r.invoiceAmt)*100).toFixed(1) : "N/A";
              const s = sm[r.status];
              const alert = r.invoiceAmt===0 || gm<0;
              const editing = editingId === r.id;
              return (
                <tr key={r.id} style={{background:alert?"#fff5f5":"var(--card)"}} className="hover:bg-muted/30 transition-colors">
                  <td style={{...td,fontFamily:"monospace",fontWeight:700,color:"var(--primary)"}}>{r.id}</td>
                  <td style={{...td,fontWeight:600}}>{r.customer}</td>
                  <td style={{...td,fontFamily:"monospace",fontWeight:700,color:r.invoiceAmt===0?"#b91c1c":"#1d4ed8"}}>
                    {editing ? (
                      <input type="number" min="0" value={draft.invoiceAmt} onChange={event => setDraft(current => ({ ...current, invoiceAmt: event.target.value }))}
                        className="w-24 rounded-md border px-2 py-1 text-xs outline-none"
                        style={{ borderColor: "var(--border)", background: "var(--input-background)", color: "var(--foreground)" }} />
                    ) : r.invoiceAmt===0?pick(language, "无发票", "No Invoice"):`$${r.invoiceAmt.toLocaleString()}`}
                  </td>
                  <td style={{...td,fontFamily:"monospace",fontWeight:700,color:(r.depositedAmt ?? 0)>0?"#047857":"var(--muted-foreground)"}}>
                    {r.depositedAmt === undefined ? "—" : `$${Number(r.depositedAmt).toLocaleString()}`}
                  </td>
                  <td style={{...td,fontFamily:"monospace",fontWeight:700,color:(r.openAmt ?? 0)>0?"#b45309":"#047857"}}>
                    {r.openAmt === undefined ? "—" : `$${Number(r.openAmt).toLocaleString()}`}
                  </td>
                  <td style={{...td,fontFamily:"monospace",color:"var(--muted-foreground)"}}>{r.bankReference ?? "\u2014"}</td>
                  <td style={{...td,fontFamily:"monospace",color:"#8B5CF6"}}>
                    {editing ? (
                      <input type="number" min="0" value={draft.driverCost} onChange={event => setDraft(current => ({ ...current, driverCost: event.target.value }))}
                        className="w-24 rounded-md border px-2 py-1 text-xs outline-none"
                        style={{ borderColor: "var(--border)", background: "var(--input-background)", color: "var(--foreground)" }} />
                    ) : `$${r.driverCost.toLocaleString()}`}
                  </td>
                  <td style={{...td,fontFamily:"monospace",fontWeight:700,color:gm<0?"#b91c1c":gm>800?"#047857":"var(--foreground)"}}>
                    {gm>=0?`$${gm.toLocaleString()}`:`-$${Math.abs(gm).toLocaleString()}`}
                  </td>
                  <td style={{...td,fontFamily:"monospace",color:Number(pct)>30?"#047857":Number(pct)<0?"#b91c1c":"var(--muted-foreground)"}}>
                    {pct}%
                  </td>
                  <td style={td}>
                    {editing ? (
                      <select value={draft.status} onChange={event => setDraft(current => ({ ...current, status: event.target.value as RecStatus }))}
                        className="rounded-md border px-2 py-1 text-xs outline-none"
                        style={{ borderColor: "var(--border)", background: "var(--input-background)", color: "var(--foreground)" }}>
                        {(["matched", "partial", "unmatched", "disputed"] as const).map(status => <option key={status} value={status}>{language === "en" ? sm[status].labelEn : sm[status].label}</option>)}
                      </select>
                    ) : (
                      <span style={{background:s.bg,color:s.color,borderRadius:999,padding:"2px 8px",fontSize:11,fontWeight:600}}>{language === "en" ? s.labelEn : s.label}</span>
                    )}
                  </td>
                  <td style={{...td,fontSize:11,color:"var(--muted-foreground)",maxWidth:220}}>
                    {editing ? (
                      <textarea value={draft.note} onChange={event => setDraft(current => ({ ...current, note: event.target.value }))}
                        rows={2} placeholder={pick(language, "添加对账备注...", "Add reconciliation note...")}
                        className="w-full resize-none rounded-md border px-2 py-1 text-xs outline-none"
                        style={{ borderColor: "var(--border)", background: "var(--input-background)", color: "var(--foreground)" }} />
                    ) : r.note||"—"}
                  </td>
                  <td style={td}>
                    <div className="flex gap-1.5 flex-wrap">
                      {editing ? <>
                        <button onClick={()=>saveEdit(r.id)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"none",background:"#d1fae5",color:"#047857",cursor:"pointer",fontWeight:700}}>{pick(language, "保存", "Save")}</button>
                        <button onClick={cancelEdit} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"1px solid var(--border)",background:"var(--card)",color:"var(--muted-foreground)",cursor:"pointer"}}>{pick(language, "取消", "Cancel")}</button>
                      </> : <>
                      <button onClick={()=>startEdit(r)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"1px solid var(--border)",background:"var(--card)",color:"var(--muted-foreground)",cursor:"pointer",fontWeight:600}}>{pick(language, "编辑", "Edit")}</button>
                      {r.status==="unmatched" && <>
                        <button onClick={()=>matchRow(r.id)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"none",background:"#d1fae5",color:"#047857",cursor:"pointer",fontWeight:700}}>{pick(language, "匹配", "Match")}</button>
                        <button onClick={()=>partialRow(r.id)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"none",background:"#fef3c7",color:"#b45309",cursor:"pointer",fontWeight:700}}>{pick(language, "\u90e8\u5206", "Partial")}</button>
                        <button onClick={()=>disputeRow(r.id)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"none",background:"#fef3c7",color:"#b45309",cursor:"pointer",fontWeight:700}}>{pick(language, "争议", "Dispute")}</button>
                        <button onClick={()=>writeOffRow(r.id)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"1px solid var(--border)",background:"var(--card)",color:"var(--muted-foreground)",cursor:"pointer"}}>{pick(language, "核销", "Write-off")}</button>
                      </>}
                      {r.status==="partial" && <>
                        <button onClick={()=>matchRow(r.id)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"none",background:"#d1fae5",color:"#047857",cursor:"pointer",fontWeight:700}}>{pick(language, "\u5b8c\u6210\u5339\u914d", "Complete")}</button>
                        <button onClick={()=>disputeRow(r.id)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"none",background:"#fef3c7",color:"#b45309",cursor:"pointer",fontWeight:700}}>{pick(language, "\u4e89\u8bae", "Dispute")}</button>
                        <button onClick={()=>writeOffRow(r.id)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"1px solid var(--border)",background:"var(--card)",color:"var(--muted-foreground)",cursor:"pointer"}}>{pick(language, "\u6838\u9500", "Write-off")}</button>
                      </>}
                      {r.status==="disputed" && <>
                        <button onClick={()=>resolveRow(r.id)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"none",background:"#d1fae5",color:"#047857",cursor:"pointer",fontWeight:700}}>{pick(language, "解决", "Resolve")}</button>
                        <button onClick={()=>escalateRow(r.id)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"1px solid var(--border)",background:"var(--card)",color:"var(--muted-foreground)",cursor:"pointer"}}>{pick(language, "升级", "Escalate")}</button>
                      </>}
                      {r.status==="matched" && <span style={{fontSize:11,color:"#047857"}}>✓</span>}
                      </>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{padding:"10px 16px",borderTop:"1px solid var(--border)",fontSize:12,color:"var(--muted-foreground)"}}>
          {displayed.length} {pick(language, "条记录 · 点击KPI卡片筛选 · 点击表格操作进行匹配、争议或解决", "records · Click KPI cards to filter · Click table actions to match, dispute or resolve")}
        </div>
      </div>
    </div>
  );
}
