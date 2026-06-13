import { useState } from "react";
import { DollarSign, AlertTriangle, CheckCircle2, TrendingUp, XCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { useActionDialog } from "./ActionDialog";
import { pick, type AppLanguage } from "../i18n";
import { buildFinanceProjection, type ReconciliationStatus } from "../domain/financeProjection";
import { demoErpSeed } from "../mocks/erpSeed";

type RecStatus = ReconciliationStatus;
interface RecRow { id: string; customer: string; invoiceAmt: number; driverCost: number; status: RecStatus; note?: string; }

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
  matched:   { label:"已对账",  labelEn:"Matched",   color:"#047857", bg:"#d1fae5" },
  unmatched: { label:"未匹配",  labelEn:"Unmatched", color:"#b91c1c", bg:"#fee2e2" },
  disputed:  { label:"争议中",  labelEn:"Disputed",  color:"#b45309", bg:"#fef3c7" },
};
const card: React.CSSProperties = { background:"var(--card)", borderRadius:12, border:"1px solid var(--border)", boxShadow:"0 1px 4px rgba(0,0,0,.04)" };
const th: React.CSSProperties = { background:"var(--muted)", fontSize:11, fontWeight:600, padding:"8px 12px", textAlign:"left", color:"var(--muted-foreground)" };
const td: React.CSSProperties = { padding:"10px 12px", fontSize:12, borderBottom:"1px solid var(--border)" };

export function ReconciliationView({ language }: { language: AppLanguage }) {
  const { promptDialog, confirmDialog, ActionDialog } = useActionDialog();
  const [rows, setRows] = useState<RecRow[]>(() => buildFinanceProjection(demoErpSeed).reconciliationRows);
  const [filter, setFilter] = useState<"all"|RecStatus>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ invoiceAmt: string; driverCost: string; status: RecStatus; note: string }>({
    invoiceAmt: "",
    driverCost: "",
    status: "matched",
    note: "",
  });

  const totalAR    = rows.reduce((s,r)=>s+r.invoiceAmt,0);
  const totalAP    = rows.reduce((s,r)=>s+r.driverCost,0);
  const net        = totalAR - totalAP;
  const unmatched  = rows.filter(r=>r.status==="unmatched").length;
  const disputed   = rows.filter(r=>r.status==="disputed").length;

  const displayed = filter==="all" ? rows : rows.filter(r=>r.status===filter);

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
    setRows(p=>p.map(r=>r.id===id?{...r,status:"matched",note:undefined}:r));
    toast.success(`${id} matched ✓`);
  }
  async function disputeRow(id: string) {
    const reason = await promptDialog(pick(language, "争议原因", "Dispute Reason"));
    if (!reason) return;
    setRows(p=>p.map(r=>r.id===id?{...r,status:"disputed",note:reason}:r));
    toast.warning("Dispute flagged", { description: reason });
  }
  function resolveRow(id: string) {
    setRows(p=>p.map(r=>r.id===id?{...r,status:"matched",note:undefined}:r));
    toast.success(`Dispute resolved — ${id} matched`);
  }
  function escalateRow(id: string) {
    setRows(p=>p.map(r=>r.id===id?{...r,status:"disputed",note:`${r.note || "Dispute"} · Escalated to management`}:r));
    toast.warning(`${id} escalated`, { description: "Row remains in disputed status with escalation note." });
  }
  async function writeOffRow(id: string) {
    const ok = await confirmDialog(pick(language, "核销对账", "Write Off Reconciliation"), { message: pick(language, `核销 ${id}？这会用零调整标记为已对账。`, `Write off ${id}? This marks it as matched with a zero-cost adjustment.`) });
    if (!ok) return;
    setRows(p=>p.map(r=>r.id===id?{...r,status:"matched",note:"Written off — zero adjustment"}:r));
    toast.info(`${id} written off`);
  }
  function exportCSV() {
    const header = "Invoice#,Customer,Invoice Amount (CAD),Driver Cost (CAD),Gross Margin,Margin %,Status,Notes";
    const body = rows.map(r=>{
      const gm = r.invoiceAmt - r.driverCost;
      const pct = r.invoiceAmt>0 ? ((gm/r.invoiceAmt)*100).toFixed(1) : "N/A";
      return `${r.id},${r.customer},${r.invoiceAmt},${r.driverCost},${gm},${pct}%,${sm[r.status].labelEn},"${r.note||""}"`;
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
      {/* KPIs — clickable to filter */}
      <div className="flex gap-4 mb-5">
        {[
          { label:pick(language, "应收开票总额", "Total Billed (AR)"),   value:`CAD $${totalAR.toLocaleString()}`,  icon:DollarSign,    color:"var(--primary)", bg:"#eff6ff",  f:"all" },
          { label:pick(language, "司机成本总额", "Total Driver Cost"),   value:`CAD $${totalAP.toLocaleString()}`,  icon:TrendingUp,    color:"#8B5CF6",       bg:"#f3e8ff",  f:"all" },
          { label:pick(language, "净毛利", "Net Margin"),          value:`CAD $${net.toLocaleString()}`,       icon:CheckCircle2,  color:"#047857",       bg:"#d1fae5",  f:"matched" },
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
            {(["all","matched","unmatched","disputed"] as const).map(f=>(
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
            <tr>{(language === "en" ? ["Invoice #","Customer","Invoice (CAD)","Driver Cost","Gross Margin","Margin %","Status","Notes","Actions"] : ["发票号","客户","发票(CAD)","司机成本","毛利","毛利率","状态","备注","操作"]).map(h=><th key={h} style={th}>{h}</th>)}</tr>
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
                        {(["matched", "unmatched", "disputed"] as const).map(status => <option key={status} value={status}>{language === "en" ? sm[status].labelEn : sm[status].label}</option>)}
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
                        <button onClick={()=>disputeRow(r.id)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"none",background:"#fef3c7",color:"#b45309",cursor:"pointer",fontWeight:700}}>{pick(language, "争议", "Dispute")}</button>
                        <button onClick={()=>writeOffRow(r.id)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,border:"1px solid var(--border)",background:"var(--card)",color:"var(--muted-foreground)",cursor:"pointer"}}>{pick(language, "核销", "Write-off")}</button>
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
