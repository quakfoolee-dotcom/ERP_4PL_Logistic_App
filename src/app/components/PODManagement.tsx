import { useState, useRef } from "react";
import { FileCheck, Upload, Eye, XCircle, CheckCircle, Clock, AlertOctagon, X, RotateCcw, Truck } from "lucide-react";
import { toast } from "sonner";
import { useActionDialog } from "./ActionDialog";

type PodStatus = "confirmed" | "rejected" | "pending";
interface Pod { file: string; customer: string; dest: string; driver: string; pallets: number; date: string; status: PodStatus; note?: string; }

const initPods: Pod[] = [
  { file: "JW-251101-YOO1-26P-AF.pdf",                        customer: "TD-JW",        dest: "YOO1",             driver: "AF", pallets: 26, date: "2025-11-01", status: "confirmed" },
  { file: "LLL-251101-YYZ4-26P-AF.pdf",                       customer: "AP-LLL",       dest: "YYZ4",             driver: "AF", pallets: 26, date: "2025-11-01", status: "confirmed" },
  { file: "Hammert-251102-PA(Scarborough)-11P-AD.pdf",         customer: "AP-Hammert",   dest: "PA-Scarborough",   driver: "AD", pallets: 11, date: "2025-11-02", status: "confirmed" },
  { file: "GVT-251102-YYZ9-11P-AF.pdf",                       customer: "AP-GVT",       dest: "YYZ9",             driver: "AF", pallets: 11, date: "2025-11-02", status: "confirmed" },
  { file: "DB-251103-YOW1-22P-AF.pdf",                        customer: "AP-DB",        dest: "YOW1",             driver: "AF", pallets: 22, date: "2025-11-03", status: "confirmed" },
  { file: "JD-251104-PA(Mississauga)-22P-LF.pdf",             customer: "AP-JD",        dest: "PA-Mississauga",   driver: "LF", pallets: 22, date: "2025-11-04", status: "confirmed" },
  { file: "JW-251105-YOW1-20P-AF.pdf",                        customer: "TD-JW",        dest: "YOW1",             driver: "AF", pallets: 20, date: "2025-11-05", status: "confirmed" },
  { file: "QX-251107-YYZ7-23P-LF.pdf",                        customer: "AP-QX",        dest: "YYZ7",             driver: "LF", pallets: 23, date: "2025-11-07", status: "confirmed" },
  { file: "CBWS-251118-YYZ7-13P-WH.pdf",                      customer: "AP-CBWS",      dest: "YYZ7",             driver: "WH", pallets: 13, date: "2025-11-18", status: "rejected",   note: "仓库拒绝入库 — Warehouse refused entry" },
  { file: "PDN-251118-PA(Saint-Laurent)-23P-AF.pdf",          customer: "AP-PDN",       dest: "PA-Saint-Laurent", driver: "AF", pallets: 23, date: "2025-11-18", status: "confirmed" },
  { file: "Panex-251110-YOW1-28P-AF.pdf",                     customer: "AP-PANEX",     dest: "YOW1",             driver: "AF", pallets: 28, date: "2025-11-10", status: "confirmed" },
  { file: "Jeff-251119-PA(Mississauga)-27P-LH.pdf",           customer: "TD-JEFF",      dest: "PA-Mississauga",   driver: "LH", pallets: 27, date: "2025-11-19", status: "confirmed" },
  { file: "LT-251124-PA(Saint-Laurent)-21P-AF.pdf",           customer: "AP-LT",        dest: "PA-Saint-Laurent", driver: "AF", pallets: 21, date: "2025-11-24", status: "confirmed" },
  { file: "Aseasky8710-251129-YOO1-19P-LH.pdf",               customer: "TD-ASEASKY",   dest: "YOO1",             driver: "LH", pallets: 19, date: "2025-11-29", status: "rejected",   note: "客户拒签 — Consignee refused" },
  { file: "PENDING-251201-YYZ9-8P-LF.pdf",                    customer: "AP-GVT",       dest: "YYZ9",             driver: "LF", pallets: 8,  date: "2025-12-01", status: "pending" },
];

const badge = (s: PodStatus) => s === "confirmed" ? { label: "已签收", color: "#047857", bg: "#d1fae5" }
                                : s === "rejected"  ? { label: "拒收",   color: "#b91c1c", bg: "#fee2e2" }
                                : { label: "待确认", color: "#b45309", bg: "#fef3c7" };

const card: React.CSSProperties = { background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,.04)" };
const th: React.CSSProperties = { background: "var(--muted)", fontSize: 11, fontWeight: 600, padding: "6px 10px", textAlign: "left", color: "var(--muted-foreground)" };
const td: React.CSSProperties = { padding: "9px 10px", fontSize: 12, borderBottom: "1px solid var(--border)" };

export function PODManagement() {
  const { promptDialog, ActionDialog } = useActionDialog();
  const [pods, setPods] = useState<Pod[]>(initPods);
  const [filter, setFilter] = useState<"all" | PodStatus>("all");
  const [viewing, setViewing] = useState<Pod | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const total     = pods.length;
  const confirmed = pods.filter(p => p.status === "confirmed").length;
  const rejected  = pods.filter(p => p.status === "rejected").length;
  const pending   = pods.filter(p => p.status === "pending").length;
  const filtered  = filter === "all" ? pods : pods.filter(p => p.status === filter);

  function redispatch(file: string) {
    setPods(p => p.map(pod => pod.file === file ? { ...pod, status: "pending", note: "Re-dispatch scheduled" } : pod));
    toast.success("Re-dispatch scheduled", { description: "Status reset to Pending — assign driver to re-deliver." });
  }
  async function dispute(file: string) {
    const reason = await promptDialog("Log POD Dispute", { message: "Enter dispute reason" });
    if (!reason) return;
    setPods(p => p.map(pod => pod.file === file ? { ...pod, note: (pod.note || "") + ` | Dispute: ${reason}` } : pod));
    toast.warning("Dispute logged", { description: reason });
  }
  function confirmPod(file: string) {
    setPods(p => p.map(pod => pod.file === file ? { ...pod, status: "confirmed" } : pod));
    toast.success("POD confirmed ✓");
  }
  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !uploadTarget) return;
    setPods(p => p.map(pod => pod.file === uploadTarget ? { ...pod, status: "confirmed" } : pod));
    toast.success("POD uploaded & confirmed", { description: f.name });
    setUploadTarget(null);
    e.target.value = "";
  }
  function triggerUpload(file: string) {
    setUploadTarget(file);
    fileRef.current?.click();
  }

  return (
    <div className="flex-1 overflow-auto p-5" style={{ background: "var(--background)" }}>
      <ActionDialog />
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={handleUpload} />

      {/* POD Viewer Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,.45)" }} onClick={() => setViewing(null)}>
          <div style={{ ...card, width: 480, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span style={{ fontWeight: 700, fontSize: 15 }}>POD Preview</span>
              <button onClick={() => setViewing(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
            </div>
            <div style={{ background: "var(--muted)", borderRadius: 8, padding: 16, marginBottom: 16, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", color: "var(--muted-foreground)" }}>
              {viewing.file}
            </div>
            {[
              ["Customer", viewing.customer], ["Destination", viewing.dest],
              ["Driver", viewing.driver], ["Pallets", `${viewing.pallets}P`],
              ["Date", viewing.date], ["Status", badge(viewing.status).label],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span style={{ color: "var(--muted-foreground)" }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            {viewing.note && <div style={{ marginTop: 12, padding: 10, background: "#fef3c7", borderRadius: 8, fontSize: 12, color: "#92400e" }}>{viewing.note}</div>}
            <div className="flex gap-2 mt-5">
              {viewing.status === "pending" && (
                <button onClick={() => { confirmPod(viewing.file); setViewing(null); }} className="flex-1 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: "#10B981", color: "white" }}>
                  Confirm POD ✓
                </button>
              )}
              <button onClick={() => { triggerUpload(viewing.file); setViewing(null); }} className="flex-1 py-2 rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity" style={{ background: "var(--primary)", color: "white" }}>
                Upload New File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="flex gap-4 mb-5">
        {[
          { label: "Total PODs",    value: total,     icon: FileCheck, color: "var(--primary)", bg: "#eff6ff" },
          { label: "已签收 Confirmed", value: confirmed, icon: CheckCircle, color: "#047857", bg: "#d1fae5" },
          { label: "待确认 Pending",   value: pending,   icon: Clock,       color: "#b45309", bg: "#fef3c7" },
          { label: "拒收 Rejected",    value: rejected,  icon: XCircle,     color: "#b91c1c", bg: "#fee2e2" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{ ...card, flex: 1, padding: 16, cursor: "pointer" }} onClick={() => setFilter(label.includes("Confirm") ? "confirmed" : label.includes("Pending") ? "pending" : label.includes("Reject") ? "rejected" : "all")}>
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace", color }}>{value}</div>
              </div>
              <div style={{ background: bg, borderRadius: 10, padding: 10 }}><Icon size={18} style={{ color }} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Table */}
        <div style={{ ...card, flex: 3, padding: 0, overflow: "hidden" }}>
          <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>POD记录 Records</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Nov 2025 — {filtered.length} records</div>
            </div>
            <div className="flex gap-2">
              {(["all","confirmed","rejected","pending"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, border: "1px solid var(--border)", cursor: "pointer", fontWeight: 600, background: filter === f ? "var(--primary)" : "var(--card)", color: filter === f ? "#fff" : "var(--foreground)" }}>
                  {f === "all" ? "全部" : f === "confirmed" ? "已签收" : f === "rejected" ? "拒收" : "待确认"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["POD File", "Customer", "Dest", "Driver", "Pallets", "Date", "Status", "Actions"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(p => {
                  const b = badge(p.status);
                  return (
                    <tr key={p.file} style={{ background: "var(--card)" }} className="hover:bg-muted/30 transition-colors">
                      <td style={{ ...td, maxWidth: 180 }}>
                        <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.file}>{p.file}</div>
                      </td>
                      <td style={{ ...td, fontWeight: 600 }}>{p.customer}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{p.dest}</td>
                      <td style={td}>{p.driver}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontWeight: 700 }}>{p.pallets}P</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{p.date}</td>
                      <td style={td}><span style={{ background: b.bg, color: b.color, borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{b.label}</span></td>
                      <td style={td}>
                        <div className="flex gap-1.5">
                          <button onClick={() => setViewing(p)} title="View POD" style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", color: "var(--primary)" }}><Eye size={12} /></button>
                          <button onClick={() => triggerUpload(p.file)} title="Upload" style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", color: "var(--muted-foreground)" }}><Upload size={12} /></button>
                          {p.status === "pending" && <button onClick={() => confirmPod(p.file)} title="Confirm" style={{ padding: "3px 8px", borderRadius: 6, border: "none", background: "#d1fae5", cursor: "pointer", color: "#047857", fontWeight: 700, fontSize: 11 }}>✓</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rejected panel */}
        <div style={{ ...card, flex: 1, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "#fef2f2" }}>
            <div className="flex items-center gap-2">
              <AlertOctagon size={15} style={{ color: "#b91c1c" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#b91c1c" }}>拒收订单 Rejected</div>
                <div style={{ fontSize: 11, color: "#ef4444" }}>Action required</div>
              </div>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            {pods.filter(p => p.status === "rejected").map(p => (
              <div key={p.file} style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#b91c1c", marginBottom: 4 }}>{p.customer}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{p.dest} · {p.driver} · {p.pallets}P</div>
                <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4, marginBottom: 8 }}>{p.note}</div>
                <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 8 }}>{p.date}</div>
                <div className="flex gap-2">
                  <button onClick={() => redispatch(p.file)} className="flex items-center gap-1 flex-1 justify-center py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity" style={{ background: "var(--primary)", color: "white" }}>
                    <Truck size={11} /> Re-dispatch
                  </button>
                  <button onClick={() => dispute(p.file)} className="flex items-center gap-1 flex-1 justify-center py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" }}>
                    <RotateCcw size={11} /> Dispute
                  </button>
                </div>
              </div>
            ))}
            {pods.filter(p => p.status === "pending").length > 0 && (
              <div style={{ marginTop: 8, padding: "10px 12px", background: "#fef3c7", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#b45309", marginBottom: 4 }}>待确认 Pending</div>
                {pods.filter(p => p.status === "pending").map(p => (
                  <div key={p.file} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid #fde68a" }}>
                    <span style={{ fontSize: 11 }}>{p.customer} · {p.pallets}P</span>
                    <button onClick={() => confirmPod(p.file)} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "#10B981", color: "white", border: "none", cursor: "pointer", fontWeight: 700 }}>Confirm</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
