import { useState } from "react";
import { Star, Phone, Truck, MapPin, FileText, Shield, X, Edit2, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { useActionDialog } from "./ActionDialog";

type DocStatus = "valid" | "expiring" | "expired";
interface Driver { id: string; name: string; phone: string; vehicle: string; routes: string; ytdOrders: number; ytdEarnings: number; rating: number; status: "on-route"|"active"|"off"; statusLabel: string; color: string; }
interface Doc { driver: string; type: string; expiry: string; status: DocStatus; }

const initDrivers: Driver[] = [
  { id: "AF", name: "AF (Long-Haul)",     phone: "647-***-**21", vehicle: "大卡车 / 53ft Dry Van",      routes: "YOW1 · YOO1 · YYZ · Cross-Province", ytdOrders: 48, ytdEarnings: 52800, rating: 4.8, status: "on-route", statusLabel: "运输中", color: "#1C64F2" },
  { id: "AD", name: "AD (Straightship)",  phone: "905-***-**44", vehicle: "小货车 / Sprinter Van",      routes: "PA Scarborough · PA Mississauga · GTA", ytdOrders: 63, ytdEarnings: 28350, rating: 4.6, status: "active",   statusLabel: "待命",  color: "#047857" },
  { id: "LH", name: "LH (FBA Delivery)", phone: "416-***-**88", vehicle: "中型货车 / Cube Truck",      routes: "YYZ9 · YYZ4 · Airport CBWS",           ytdOrders: 41, ytdEarnings: 38500, rating: 4.7, status: "active",   statusLabel: "待命",  color: "#047857" },
  { id: "LF", name: "LF (FBA Delivery)", phone: "647-***-**56", vehicle: "中型货车 / Cube Truck",      routes: "YYZ7 · PA Mississauga · GTA",           ytdOrders: 35, ytdEarnings: 31200, rating: 4.5, status: "active",   statusLabel: "待命",  color: "#047857" },
  { id: "WH", name: "WH / Jeff (Sysco)", phone: "905-***-**12", vehicle: "大卡车 / Flatbed",           routes: "YYZ7 · Sysco Warehouses · Industrial",  ytdOrders: 22, ytdEarnings: 19800, rating: 4.3, status: "off",      statusLabel: "休息",  color: "#6b7280" },
];
const initDocs: Doc[] = [
  { driver: "AF", type: "CDL (A)",    expiry: "2027-03-15", status: "valid" },
  { driver: "AF", type: "CVOR",       expiry: "2026-11-30", status: "valid" },
  { driver: "AF", type: "商业保险",    expiry: "2026-08-01", status: "expiring" },
  { driver: "AD", type: "CDL (F)",    expiry: "2027-06-20", status: "valid" },
  { driver: "AD", type: "CVOR",       expiry: "2026-12-15", status: "valid" },
  { driver: "AD", type: "商业保险",    expiry: "2026-07-30", status: "expiring" },
  { driver: "LH", type: "CDL (D)",    expiry: "2026-09-10", status: "expiring" },
  { driver: "LH", type: "药物测试",    expiry: "2026-06-01", status: "expiring" },
  { driver: "LF", type: "CDL (D)",    expiry: "2027-01-25", status: "valid" },
  { driver: "LF", type: "CVOR",       expiry: "2026-10-20", status: "valid" },
  { driver: "WH", type: "CDL (A)",    expiry: "2025-12-01", status: "expired" },
  { driver: "WH", type: "商业保险",    expiry: "2026-03-15", status: "expired" },
];
const dsMap: Record<DocStatus,{label:string;color:string;bg:string}> = {
  valid:    { label:"有效",      color:"#047857", bg:"#d1fae5" },
  expiring: { label:"即将到期",  color:"#b45309", bg:"#fef3c7" },
  expired:  { label:"已过期",    color:"#b91c1c", bg:"#fee2e2" },
};
const statusColors: Record<string,{bg:string;color:string}> = {
  "on-route": { bg:"#dbeafe", color:"#1d4ed8" },
  active:     { bg:"#d1fae5", color:"#047857" },
  off:        { bg:"#f3f4f6", color:"#6b7280" },
};
const card: React.CSSProperties = { background:"var(--card)", borderRadius:12, border:"1px solid var(--border)", boxShadow:"0 1px 4px rgba(0,0,0,.04)" };
const th: React.CSSProperties = { background:"var(--muted)", fontSize:11, fontWeight:600, padding:"6px 10px", textAlign:"left", color:"var(--muted-foreground)" };
const td: React.CSSProperties = { padding:"9px 10px", fontSize:12, borderBottom:"1px solid var(--border)" };

function Stars({ r }: { r: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i=><Star key={i} size={12} fill={i<=Math.round(r)?"#f59e0b":"none"} stroke={i<=Math.round(r)?"#f59e0b":"#d1d5db"}/>)}
      <span style={{fontSize:11,color:"var(--muted-foreground)",marginLeft:3}}>{r}</span>
    </div>
  );
}

export function DriverProfiles() {
  const { promptDialog, ActionDialog } = useActionDialog();
  const [drivers, setDrivers]       = useState<Driver[]>(initDrivers);
  const [docs, setDocs]             = useState<Doc[]>(initDocs);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [editId, setEditId]         = useState<string|null>(null);
  const [editPhone, setEditPhone]   = useState("");

  const filteredDocs = selectedId ? docs.filter(d=>d.driver===selectedId) : docs;

  function startEdit(d: Driver) { setEditId(d.id); setEditPhone(d.phone); }
  function saveEdit(id: string) {
    setDrivers(p=>p.map(d=>d.id===id?{...d,phone:editPhone}:d));
    setEditId(null);
    toast.success("Driver profile updated");
  }
  async function renewDoc(driverId: string, type: string) {
    const newExpiry = await promptDialog(`Renew ${type}`, { message: "New expiry date (YYYY-MM-DD)", defaultValue: "2027-06-01" });
    if (!newExpiry) return;
    setDocs(p=>p.map(d=>d.driver===driverId&&d.type===type?{...d,expiry:newExpiry,status:"valid"}:d));
    toast.success(`${type} renewed`, { description: `New expiry: ${newExpiry}` });
  }
  function changeStatus(id: string, status: Driver["status"], label: string) {
    setDrivers(p=>p.map(d=>d.id===id?{...d,status,statusLabel:label}:d));
    toast.info(`${id} status → ${label}`);
  }
  function callDriver(d: Driver) {
    toast.info(`Calling ${d.name}`, { description: d.phone });
  }

  return (
    <div className="flex-1 overflow-auto p-5" style={{background:"var(--background)"}}>
      <ActionDialog />
      {/* Driver Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:16,marginBottom:24}}>
        {drivers.map(d=>{
          const sc = statusColors[d.status];
          const isSel = selectedId===d.id;
          const isEdit = editId===d.id;
          return (
            <div key={d.id} onClick={()=>setSelectedId(isSel?null:d.id)} style={{...card,padding:20,cursor:"pointer",outline:isSel?`2px solid var(--primary)`:"none",position:"relative"}}>
              {/* Edit / action buttons */}
              <div className="flex gap-1.5" style={{position:"absolute",top:14,right:14}}>
                {isEdit ? (
                  <button onClick={()=>saveEdit(d.id)} style={{padding:"3px 8px",borderRadius:6,background:"#10B981",color:"white",border:"none",cursor:"pointer",fontSize:11,fontWeight:700}}><Check size={12}/></button>
                ) : (
                  <button onClick={e=>{e.stopPropagation();startEdit(d);}} style={{padding:"3px 8px",borderRadius:6,border:"1px solid var(--border)",background:"var(--card)",cursor:"pointer",color:"var(--muted-foreground)"}}><Edit2 size={12}/></button>
                )}
              </div>

              <div className="flex items-start gap-3 mb-3">
                <div style={{width:44,height:44,borderRadius:"50%",background:d.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:15,flexShrink:0}}>{d.id}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:"var(--foreground)"}}>{d.name}</div>
                  {isEdit ? (
                    <input value={editPhone} onChange={e=>setEditPhone(e.target.value)} onClick={e=>e.stopPropagation()}
                      style={{fontSize:11,border:"1px solid var(--border)",borderRadius:6,padding:"2px 6px",width:140,marginTop:2}}/>
                  ) : (
                    <div className="flex items-center gap-1 mt-1" style={{fontSize:11,color:"var(--muted-foreground)"}}><Phone size={10}/>{d.phone}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 mb-1.5" style={{fontSize:11,color:"var(--muted-foreground)"}}><Truck size={11}/>{d.vehicle}</div>
              <div className="flex items-center gap-1 mb-3" style={{fontSize:11,color:"var(--muted-foreground)"}}><MapPin size={11}/>{d.routes}</div>
              <Stars r={d.rating}/>

              <div className="flex gap-4 mt-3 mb-3" style={{borderTop:"1px solid var(--border)",paddingTop:12}}>
                <div><div style={{fontSize:10,color:"var(--muted-foreground)"}}>YTD 订单</div><div style={{fontFamily:"monospace",fontWeight:700,fontSize:18}}>{d.ytdOrders}</div></div>
                <div><div style={{fontSize:10,color:"var(--muted-foreground)"}}>YTD Earnings</div><div style={{fontFamily:"monospace",fontWeight:700,fontSize:18,color:"var(--primary)"}}>CAD ${d.ytdEarnings.toLocaleString()}</div></div>
              </div>

              {/* Status + quick actions */}
              <div className="flex gap-2 flex-wrap">
                <span style={{background:sc.bg,color:sc.color,borderRadius:999,padding:"2px 10px",fontSize:11,fontWeight:600}}>{d.statusLabel}</span>
                <button onClick={e=>{e.stopPropagation();callDriver(d);}} style={{padding:"2px 10px",borderRadius:999,fontSize:11,border:"1px solid var(--border)",background:"var(--card)",cursor:"pointer",color:"var(--foreground)"}}>📞 Call</button>
                {d.status !== "on-route" && <button onClick={e=>{e.stopPropagation();changeStatus(d.id,"on-route","运输中");}} style={{padding:"2px 10px",borderRadius:999,fontSize:11,border:"none",background:"#dbeafe",cursor:"pointer",color:"#1d4ed8",fontWeight:600}}>Dispatch</button>}
                {d.status === "on-route" && <button onClick={e=>{e.stopPropagation();changeStatus(d.id,"active","待命");}} style={{padding:"2px 10px",borderRadius:999,fontSize:11,border:"none",background:"#d1fae5",cursor:"pointer",color:"#047857",fontWeight:600}}>✓ Return</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Documents table */}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div className="flex items-center justify-between" style={{padding:"12px 16px",borderBottom:"1px solid var(--border)"}}>
          <div className="flex items-center gap-2">
            <Shield size={15} style={{color:"var(--primary)"}}/>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>司机证件 Driver Documents</div>
              <div style={{fontSize:11,color:"var(--muted-foreground)"}}>CDL · CVOR · Insurance · Drug Test {selectedId&&`— filtered: ${selectedId}`}</div>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedId && <button onClick={()=>setSelectedId(null)} style={{fontSize:11,color:"var(--primary)",border:"1px solid var(--primary)",borderRadius:6,padding:"3px 10px",background:"var(--card)",cursor:"pointer"}}>Show All</button>}
            <button onClick={()=>toast.info("Add document flow — connect to document storage")} className="flex items-center gap-1" style={{fontSize:11,color:"white",border:"none",borderRadius:6,padding:"4px 10px",background:"var(--primary)",cursor:"pointer",fontWeight:600}}><Plus size={12}/>Add Doc</button>
          </div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Driver","Document Type","Expiry Date","Status","Action"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {filteredDocs.map((d,i)=>{
              const s=dsMap[d.status];
              return (
                <tr key={i} style={{background:"var(--card)"}} className="hover:bg-muted/30 transition-colors">
                  <td style={{...td,fontWeight:700}}>{d.driver}</td>
                  <td style={td}><span className="flex items-center gap-1"><FileText size={11}/>{d.type}</span></td>
                  <td style={{...td,fontFamily:"monospace"}}>{d.expiry}</td>
                  <td style={td}><span style={{background:s.bg,color:s.color,borderRadius:999,padding:"2px 8px",fontSize:11,fontWeight:600}}>{s.label}</span></td>
                  <td style={td}>
                    {(d.status==="expiring"||d.status==="expired") && (
                      <button onClick={()=>renewDoc(d.driver,d.type)} className="px-3 py-1 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity" style={{background:"var(--primary)",color:"white",border:"none",cursor:"pointer"}}>Renew</button>
                    )}
                    {d.status==="valid" && <span style={{fontSize:11,color:"#047857"}}>✓ Valid</span>}
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
