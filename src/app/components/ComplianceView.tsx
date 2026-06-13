import { useState } from "react";
import { Shield, CheckCircle2, AlertTriangle, XCircle, FileText, User, Clock, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { useActionDialog } from "./ActionDialog";
import type { AppLanguage } from "../i18n";

type DocStatus = "valid"|"expiring"|"expired";
interface DocRow { driver:string; type:string; expiry:string; status:DocStatus; }
interface LogRow { date:string; user:string; action:string; entity:string; detail:string; }
interface CheckItem { id:string; label:string; labelEn:string; done:boolean; }

const initDocs: DocRow[] = [
  {driver:"AF", type:"CDL (A)",       expiry:"2027-03-15", status:"valid"},
  {driver:"AF", type:"CVOR",          expiry:"2026-11-30", status:"valid"},
  {driver:"AF", type:"商业保险",        expiry:"2026-08-01", status:"expiring"},
  {driver:"AD", type:"CDL (F)",       expiry:"2027-06-20", status:"valid"},
  {driver:"AD", type:"CVOR",          expiry:"2026-12-15", status:"valid"},
  {driver:"AD", type:"商业保险",        expiry:"2026-07-30", status:"expiring"},
  {driver:"LH", type:"CDL (D)",       expiry:"2026-09-10", status:"expiring"},
  {driver:"LH", type:"药物测试",        expiry:"2026-06-01", status:"expiring"},
  {driver:"LF", type:"CDL (D)",       expiry:"2027-01-25", status:"valid"},
  {driver:"LF", type:"CVOR",          expiry:"2026-10-20", status:"valid"},
  {driver:"WH", type:"CDL (A)",       expiry:"2025-12-01", status:"expired"},
  {driver:"WH", type:"商业保险",        expiry:"2026-03-15", status:"expired"},
];
const initLog: LogRow[] = [
  {date:"2026-06-10 09:14", user:"Ops Team", action:"POD Confirmed",     entity:"JW-251105-YOW1",          detail:"POD signed and filed"},
  {date:"2026-06-09 15:32", user:"Ops Team", action:"Invoice Issued",    entity:"2026-0139",               detail:"CAD $2,908 issued to BEAU6280647"},
  {date:"2026-06-08 11:20", user:"Ops Team", action:"Dispute Logged",    entity:"2026-0138",               detail:"Rate dispute — CBWS YYZ7 rejection"},
  {date:"2026-06-07 14:05", user:"System",   action:"HOLD Flagged",      entity:"DRYU9624130",             detail:"Container placed on HOLD — relabeling required"},
  {date:"2026-06-05 08:47", user:"Ops Team", action:"Doc Renewed",       entity:"AF — CVOR",               detail:"CVOR renewed, new expiry 2026-11-30"},
  {date:"2026-06-04 16:30", user:"System",   action:"Settlement Batch",  entity:"Nov 2025 Payroll",        detail:"5 drivers — CAD $23,405 total"},
  {date:"2026-06-03 10:11", user:"Ops Team", action:"Container Cleared", entity:"ZCSU6522960",             detail:"49P delivered to YYZ9, fully reconciled"},
  {date:"2026-06-02 13:55", user:"System",   action:"Rate Card Updated", entity:"Partner Quotes",          detail:"YOW1/YOW3 confirmed at $1,150/load (Mark)"},
];
const initChecks: CheckItem[] = [
  {id:"c1",  label:"所有司机CDL有效",           labelEn:"All drivers have valid CDL",           done:false},
  {id:"c2",  label:"POD在48小时内归档",          labelEn:"POD filed within 48h of delivery",     done:true},
  {id:"c3",  label:"发票在30天内开具",           labelEn:"Invoices issued within 30 days",       done:true},
  {id:"c4",  label:"月度司机药物测试完成",        labelEn:"Monthly driver drug tests complete",   done:false},
  {id:"c5",  label:"保险文件最新",               labelEn:"Insurance documents up to date",       done:false},
  {id:"c6",  label:"所有拒收订单已跟进",          labelEn:"All rejected orders followed up",      done:true},
  {id:"c7",  label:"CVOR证书有效",              labelEn:"CVOR certificates valid",              done:true},
  {id:"c8",  label:"发票余额已对账",             labelEn:"Invoice balances reconciled",          done:true},
  {id:"c9",  label:"仓储操作费已收取",           labelEn:"All handling fees collected",          done:false},
  {id:"c10", label:"司机超时记录已审核",          labelEn:"Wait-time records audited",            done:true},
];

const ds: Record<DocStatus,{label:string;color:string;bg:string}> = {
  valid:    {label:"有效",     color:"#047857", bg:"#d1fae5"},
  expiring: {label:"即将到期", color:"#b45309", bg:"#fef3c7"},
  expired:  {label:"已过期",   color:"#b91c1c", bg:"#fee2e2"},
};
const card: React.CSSProperties = {background:"var(--card)",borderRadius:12,border:"1px solid var(--border)",boxShadow:"0 1px 4px rgba(0,0,0,.04)"};
const th: React.CSSProperties = {background:"var(--muted)",fontSize:11,fontWeight:600,padding:"8px 10px",textAlign:"left",color:"var(--muted-foreground)"};
const td: React.CSSProperties = {padding:"9px 10px",fontSize:12,borderBottom:"1px solid var(--border)"};

export function ComplianceView({ language = "zh" }: { language?: AppLanguage }) {
  void language;
  const { promptDialog, ActionDialog } = useActionDialog();
  const [docs, setDocs]     = useState<DocRow[]>(initDocs);
  const [checks, setChecks] = useState<CheckItem[]>(initChecks);
  const [log, setLog]       = useState<LogRow[]>(initLog);

  const done    = checks.filter(c=>c.done).length;
  const total   = checks.length;
  const expired = docs.filter(d=>d.status==="expired").length;
  const expiring= docs.filter(d=>d.status==="expiring").length;

  function toggleCheck(id: string) {
    setChecks(p=>p.map(c=>c.id===id?{...c,done:!c.done}:c));
    const item = checks.find(c=>c.id===id);
    if (item) toast.success(item.done?"Item unchecked":item.labelEn+" ✓");
  }
  async function renewDoc(driver: string, type: string) {
    const newExpiry = await promptDialog(`Renew ${driver} — ${type}`, { message: "New expiry (YYYY-MM-DD)", defaultValue: "2027-06-01" });
    if (!newExpiry) return;
    setDocs(p=>p.map(d=>d.driver===driver&&d.type===type?{...d,expiry:newExpiry,status:"valid"}:d));
    const entry: LogRow = {date:new Date().toLocaleString("en-CA"),user:"Ops Team",action:"Doc Renewed",entity:`${driver} — ${type}`,detail:`Renewed to ${newExpiry}`};
    setLog(p=>[entry,...p]);
    toast.success(`${driver} ${type} renewed to ${newExpiry}`);
  }
  async function addLogEntry() {
    const action = await promptDialog("Add Audit Log Entry", { message: "Log action (e.g. Document Uploaded)" });
    if (!action) return;
    const entity = await promptDialog("Audit Entity", { message: "Entity (e.g. AF — CDL)", defaultValue: "—" }) || "—";
    const entry: LogRow = {date:new Date().toLocaleString("en-CA"),user:"Ops Team",action,entity,detail:"Manual entry"};
    setLog(p=>[entry,...p]);
    toast.success("Audit log entry added");
  }
  function exportReport() {
    const lines = ["Compliance Report — Fengtu Logistics Canada","Generated: "+new Date().toLocaleDateString(),"",
      "=== CHECKLIST ===",
      ...checks.map(c=>`[${c.done?"✓":" "}] ${c.labelEn}`),
      "","=== DOCUMENTS ===",
      "Driver,Type,Expiry,Status",
      ...docs.map(d=>`${d.driver},${d.type},${d.expiry},${ds[d.status].label}`),
      "","=== AUDIT LOG ===",
      "Date,User,Action,Entity,Detail",
      ...log.map(l=>`${l.date},${l.user},${l.action},${l.entity},${l.detail}`)
    ].join("\n");
    const blob = new Blob([lines],{type:"text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="compliance_report.txt"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Compliance report exported");
  }

  return (
    <div className="flex-1 overflow-auto p-5" style={{background:"var(--background)"}}>
      <ActionDialog />
      {/* KPI strip */}
      <div className="flex gap-4 mb-5">
        {[
          {label:"Checklist Done",   value:`${done}/${total}`, color:"#047857", bg:"#d1fae5", icon:CheckCircle2, onClick:()=>toast.info(`Checklist: ${done}/${total} complete`,{description:`${total-done} item${total-done!==1?"s":""} remaining`})},
          {label:"Expired Docs",     value:String(expired),    color:"#b91c1c", bg:"#fee2e2", icon:XCircle,       onClick:()=>toast.error(`${expired} expired document${expired!==1?"s":""} require renewal`,{description:docs.filter(d=>d.status==="expired").map(d=>`${d.driver} — ${d.type}`).join(" · ")})},
          {label:"Expiring Soon",    value:String(expiring),   color:"#b45309", bg:"#fef3c7", icon:AlertTriangle, onClick:()=>toast.warning(`${expiring} document${expiring!==1?"s":""} expiring soon`,{description:docs.filter(d=>d.status==="expiring").map(d=>`${d.driver} — ${d.type} (${d.expiry})`).join(" · ")})},
          {label:"Audit Entries",    value:String(log.length), color:"var(--primary)", bg:"#eff6ff", icon:FileText, onClick:()=>toast.info(`${log.length} audit entries`,{description:`Most recent: ${log[0]?.action} — ${log[0]?.entity}`})},
        ].map(({label,value,color,bg,icon:Icon,onClick})=>(
          <div key={label} style={{...card,flex:1,padding:16,cursor:"pointer"}} onClick={onClick}>
            <div className="flex items-center justify-between">
              <div><div style={{fontSize:11,color:"var(--muted-foreground)",marginBottom:4}}>{label}</div><div style={{fontSize:28,fontWeight:700,fontFamily:"monospace",color}}>{value}</div></div>
              <div style={{background:bg,borderRadius:10,padding:10}}><Icon size={18} style={{color}}/></div>
            </div>
          </div>
        ))}
        <button onClick={exportReport} className="flex items-center gap-2 px-4 rounded-xl hover:opacity-90 transition-opacity" style={{background:"var(--primary)",color:"white",border:"none",cursor:"pointer",fontWeight:600,fontSize:13}}>
          <Download size={15}/> Export Report
        </button>
      </div>

      <div className="flex gap-4">
        {/* Left: Docs + Audit Log */}
        <div style={{flex:2,display:"flex",flexDirection:"column",gap:16}}>
          {/* Documents table */}
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)"}}>
              <div style={{fontWeight:700,fontSize:14}}>证件到期管理 Document Expiry</div>
              <div style={{fontSize:11,color:"var(--muted-foreground)"}}>Click Renew to update expiry and mark valid</div>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Driver","Document","Expiry","Status","Action"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {docs.map((d,i)=>{
                  const s=ds[d.status];
                  return (
                    <tr key={i} style={{background:d.status==="expired"?"#fff5f5":"var(--card)"}} className="hover:bg-muted/30 transition-colors">
                      <td style={{...td,fontWeight:700}}>{d.driver}</td>
                      <td style={td}><span className="flex items-center gap-1"><FileText size={11}/>{d.type}</span></td>
                      <td style={{...td,fontFamily:"monospace",color:d.status!=="valid"?"#b91c1c":"inherit"}}>{d.expiry}</td>
                      <td style={td}><span style={{background:s.bg,color:s.color,borderRadius:999,padding:"2px 8px",fontSize:11,fontWeight:600}}>{s.label}</span></td>
                      <td style={td}>
                        {(d.status==="expiring"||d.status==="expired")
                          ? <button onClick={()=>renewDoc(d.driver,d.type)} style={{padding:"3px 10px",borderRadius:6,fontSize:11,border:"none",background:"var(--primary)",color:"white",cursor:"pointer",fontWeight:700}}>Renew</button>
                          : <span style={{fontSize:11,color:"#047857"}}>✓</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Audit log */}
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <div className="flex items-center justify-between" style={{padding:"12px 16px",borderBottom:"1px solid var(--border)"}}>
              <div><div style={{fontWeight:700,fontSize:14}}>审计日志 Audit Log</div><div style={{fontSize:11,color:"var(--muted-foreground)"}}>System and manual activity log</div></div>
              <button onClick={addLogEntry} className="flex items-center gap-1" style={{padding:"4px 12px",borderRadius:6,fontSize:11,border:"none",background:"var(--primary)",color:"white",cursor:"pointer",fontWeight:600}}>
                <Plus size={11}/> + Add Entry
              </button>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Date/Time","User","Action","Entity","Detail"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {log.map((l,i)=>(
                  <tr key={i} style={{background:"var(--card)"}} className="hover:bg-muted/30 transition-colors">
                    <td style={{...td,fontFamily:"monospace",fontSize:10,color:"var(--muted-foreground)"}}>{l.date}</td>
                    <td style={{...td,fontSize:11}}><span className="flex items-center gap-1"><User size={10}/>{l.user}</span></td>
                    <td style={{...td,fontWeight:600}}>{l.action}</td>
                    <td style={{...td,fontFamily:"monospace",fontSize:11,color:"var(--primary)"}}>{l.entity}</td>
                    <td style={{...td,fontSize:11,color:"var(--muted-foreground)"}}>{l.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Checklist */}
        <div style={{...card,flex:1,padding:0,overflow:"hidden",alignSelf:"flex-start"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)"}}>
            <div className="flex items-center gap-2">
              <Shield size={15} style={{color:"var(--primary)"}}/>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>合规清单 Checklist</div>
                <div style={{fontSize:11,color:"var(--muted-foreground)"}}>{done}/{total} complete · Click to toggle</div>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{marginTop:10,height:6,borderRadius:3,background:"var(--muted)"}}>
              <div style={{height:6,borderRadius:3,background:done===total?"#10B981":"var(--primary)",width:`${(done/total)*100}%`,transition:"width .3s"}}/>
            </div>
          </div>
          <div style={{padding:"8px 12px"}}>
            {checks.map(c=>(
              <div key={c.id} onClick={()=>toggleCheck(c.id)}
                className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mb-1">
                <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${c.done?"#10B981":"var(--border)"}`,background:c.done?"#10B981":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all .15s"}}>
                  {c.done&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:c.done?400:500,color:c.done?"var(--muted-foreground)":"var(--foreground)",textDecoration:c.done?"line-through":"none"}}>{c.label}</div>
                  <div style={{fontSize:10,color:"var(--muted-foreground)",marginTop:1}}>{c.labelEn}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
