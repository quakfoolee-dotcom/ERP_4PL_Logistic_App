import { useState } from "react";
import { AlertTriangle, RefreshCw, MapPin, Truck, X, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useActionDialog } from "./ActionDialog";

const initContainers = [
  { id: "ZCSU6522960", pallets: 49, dest: "YYZ9", driver: "LH+AF+JH", departed: "2026-04-05", eta: "2026-04-08", status: "delivered", notes: "3 trips dispatched: 26P LH, 23P AF, 4P JH. All confirmed at YYZ9." },
  { id: "CSGU6675337", pallets: 38, dest: "YYZ9", driver: "LH+JH", departed: "2026-04-08", eta: "2026-04-10", status: "delivered", notes: "22P LH (Apr 8 11:00) + 16P JH (Apr 8 20:00). Fully delivered." },
  { id: "BEAU6280647", pallets: 36, dest: "YHM1", driver: "LH+AF", departed: "2026-04-23", eta: "2026-04-25", status: "on-route", notes: "14P LH (Apr 23 14:00) + 22P AF (Apr 24 13:00). In transit to Hamilton." },
  { id: "HMMU7089094", pallets: 46, dest: "YYZ9", driver: "LH+AF", departed: "2026-04-28", eta: "2026-04-30", status: "on-route", notes: "20P LH (Apr 28 19:00) + 26P AF (Apr 28 20:00). En route to YYZ9." },
  { id: "DRYU9624130", pallets: 17, dest: "YYZ4/YYZ7", driver: "TBD", departed: "HOLD", eta: "Pending", status: "hold", notes: "換標中: 300箱→YYZ4 (May dispatch), 600箱→YYZ7. CAD $0.50/label. Awaiting seller confirmation." },
  { id: "NYKU5151652", pallets: 3, dest: "Multi-FC", driver: "LH", departed: "2026-05-01", eta: "2026-05-04", status: "delivered", notes: "FBA1985MY2TR + M6049 + N186F. Delivered to YYZ4, YYZ7, YOO1." },
];

const initAppts = [
  { time: "26/04/05 11:00", desc: "26P · LH → YYZ9 (ZCSU6522960)", status: "done",    cid: "ZCSU6522960" },
  { time: "26/04/05 13:00", desc: "23P · AF → YYZ9 (ZCSU6522960)", status: "done",    cid: "ZCSU6522960" },
  { time: "26/04/08 20:00", desc: "4P  · JH → YYZ9 (ZCSU6522960)", status: "done",    cid: "ZCSU6522960" },
  { time: "26/04/23 14:00", desc: "36P · LH+AF → YHM1 (BEAU6280647)", status: "active", cid: "BEAU6280647" },
  { time: "26/04/28 19:00", desc: "46P · LH+AF → YYZ9 (HMMU7089094)", status: "active", cid: "HMMU7089094" },
  { time: "26/05/01 08:00", desc: "3P  · LH → Multi-FC (NYKU5151652)", status: "done",    cid: "NYKU5151652" },
  { time: "TBD",            desc: "17P · 换标后派送 (DRYU9624130)", status: "pending", cid: "DRYU9624130" },
];

const sc: Record<string, { label: string; color: string; bg: string }> = {
  "on-route": { label: "运输中", color: "#047857", bg: "#d1fae5" },
  delivered:  { label: "已到达", color: "#1d4ed8", bg: "#dbeafe" },
  hold:       { label: "暂扣",   color: "#b45309", bg: "#fef3c7" },
};
const card: React.CSSProperties = { background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,.04)" };
const th: React.CSSProperties = { background: "var(--muted)", fontSize: 11, fontWeight: 600, padding: "8px 12px", textAlign: "left", color: "var(--muted-foreground)" };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12, borderBottom: "1px solid var(--border)" };

export function LiveTracking() {
  const { promptDialog, ActionDialog } = useActionDialog();
  const [containers, setContainers] = useState(initContainers);
  const [appts, setAppts]           = useState(initAppts);
  const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString("en-CA"));
  const [selected, setSelected]     = useState<typeof initContainers[0] | null>(null);

  const onRoute   = containers.filter(c => c.status === "on-route").length;
  const delivered = containers.filter(c => c.status === "delivered").length;
  const onHold    = containers.filter(c => c.status === "hold").length;

  function refresh() {
    setLastRefresh(new Date().toLocaleTimeString("en-CA"));
    toast.success("Status refreshed", { description: "All container positions updated." });
  }

  function markDelivered(id: string) {
    setContainers(p => p.map(c => c.id === id ? { ...c, status: "delivered" } : c));
    setSelected(p => p?.id === id ? { ...p!, status: "delivered" } : p);
    toast.success(`${id} marked as Delivered`);
  }

  function clearHold(id: string) {
    setContainers(p => p.map(c => c.id === id ? { ...c, status: "on-route", eta: "TBD", departed: new Date().toLocaleDateString("en-CA") } : c));
    setSelected(p => p?.id === id ? { ...p!, status: "on-route" } : p);
    setAppts(p => p.map(a => a.cid === id && a.status === "pending" ? { ...a, status: "active", time: "Pending confirmation" } : a));
    toast.info(`HOLD cleared for ${id} — ready to dispatch`);
  }

  function confirmAppt(i: number) {
    setAppts(p => p.map((a, idx) => idx === i ? { ...a, status: "done" } : a));
    toast.success("Appointment confirmed ✓");
  }

  async function scheduleAppt(i: number) {
    const t = await promptDialog("Schedule Appointment", { message: "Enter appointment time (e.g. 26/05/10 10:00)" });
    if (!t) return;
    setAppts(p => p.map((a, idx) => idx === i ? { ...a, time: t, status: "active" } : a));
    toast.success("Appointment scheduled", { description: t });
  }

  async function addNote(id: string) {
    const note = await promptDialog("Add Dispatch Note");
    if (!note) return;
    setContainers(p => p.map(c => c.id === id ? { ...c, notes: c.notes + `\n[Note] ${note}` } : c));
    setSelected(p => p?.id === id ? { ...p!, notes: p!.notes + `\n[Note] ${note}` } : p);
    toast.success("Note saved");
  }

  return (
    <div className="flex-1 overflow-auto p-5" style={{ background: "var(--background)" }}>
      <ActionDialog />
      {/* Banner */}
      <div style={{ ...card, marginBottom: 20, background: "var(--primary)", border: "none", color: "#fff", padding: 16 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Truck size={18} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>实时货况 · Real-Time Status</span>
            <span style={{ fontSize: 11, opacity: .75 }}>Updated {lastRefresh}</span>
          </div>
          <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-80 transition-opacity"
            style={{ background: "rgba(255,255,255,.2)", color: "#fff", fontWeight: 500 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        <div className="flex gap-10">
          {[{ l: "On Route 运输中", v: onRoute }, { l: "Delivered 已到达", v: delivered }, { l: "On Hold 暂扣", v: onHold }].map(s => (
            <div key={s.l} className="flex items-end gap-2">
              <span style={{ fontSize: 30, fontWeight: 800, fontFamily: "monospace" }}>{s.v}</span>
              <span style={{ fontSize: 12, opacity: .85, marginBottom: 4 }}>{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4" style={{ alignItems: "flex-start" }}>
        {/* Containers */}
        <div style={{ ...card, flex: 2, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>在途集装箱 Active Containers</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Click row for details and actions</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Container #", "Pallets", "Dest FC", "Driver", "Departed", "ETA", "Status", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {containers.map(c => {
                const s = sc[c.status];
                const isSel = selected?.id === c.id;
                return (
                  <tr key={c.id} onClick={() => setSelected(isSel ? null : c)}
                    style={{ background: isSel ? "var(--secondary)" : "var(--card)", cursor: "pointer", transition: "background .15s" }}
                    onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = "var(--muted)"; }}
                    onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = "var(--card)"; }}>
                    <td style={td}><span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)", fontSize: 11 }}>{c.id}</span></td>
                    <td style={{ ...td, fontFamily: "monospace", fontWeight: 700 }}>{c.pallets}P</td>
                    <td style={{ ...td, fontFamily: "monospace" }}>{c.dest}</td>
                    <td style={td}>{c.driver}</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{c.departed}</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 11, color: c.status === "hold" ? "#b45309" : "inherit" }}>{c.eta}</td>
                    <td style={td}><span style={{ background: s.bg, color: s.color, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{s.label}</span></td>
                    <td style={{ ...td, width: 24 }}><ChevronRight size={14} style={{ color: "var(--muted-foreground)", transform: isSel ? "rotate(90deg)" : "none", transition: "transform .2s" }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Inline detail panel */}
          {selected && (
            <div style={{ borderTop: "2px solid var(--primary)", background: "var(--secondary)", padding: 16 }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)", fontSize: 13 }}>{selected.id}</span>
                  <span className="ml-3 px-2 py-0.5 rounded-full text-xs" style={{ background: sc[selected.status].bg, color: sc[selected.status].color, fontWeight: 600 }}>{sc[selected.status].label}</span>
                </div>
                <button onClick={() => setSelected(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={15} /></button>
              </div>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12, lineHeight: 1.5 }}>{selected.notes}</p>
              <div className="flex gap-2 flex-wrap">
                {selected.status === "on-route" && (
                  <button onClick={() => markDelivered(selected.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity" style={{ background: "#10B981", color: "white" }}>
                    ✓ Mark Delivered
                  </button>
                )}
                {selected.status === "hold" && (
                  <button onClick={() => clearHold(selected.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity" style={{ background: "#F59E0B", color: "white" }}>
                    Release HOLD & Dispatch
                  </button>
                )}
                <button onClick={() => addNote(selected.id)} className="px-3 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors" style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}>
                  + Add Note
                </button>
                <button onClick={() => toast.info(`Contacting driver for ${selected.id}`)} className="px-3 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors" style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}>
                  Contact Driver
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Appointments */}
        <div style={{ ...card, flex: 1, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>预约时间表 Schedule</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Click to confirm · pending to schedule</div>
          </div>
          <div style={{ padding: "8px 12px" }}>
            {appts.map((a, i) => {
              const dot = a.status === "done" ? "#10b981" : a.status === "active" ? "#1C64F2" : "#f59e0b";
              return (
                <div key={i} onClick={() => a.status === "active" ? confirmAppt(i) : a.status === "pending" ? scheduleAppt(i) : toast.info("Already completed")}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors mb-1">
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, marginTop: 5, flexShrink: 0 }} />
                  <div className="flex-1">
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600 }}>{a.time}</div>
                    <div style={{ fontSize: 12, marginTop: 1 }}>{a.desc}</div>
                    <div style={{ fontSize: 10, marginTop: 2, color: a.status === "done" ? "#10B981" : a.status === "active" ? "#1C64F2" : "#D97706" }}>
                      {a.status === "done" ? "✓ Confirmed" : a.status === "active" ? "Tap to confirm ↩" : "Tap to schedule ↩"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ margin: "4px 12px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 10 }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={13} style={{ color: "#b45309" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#b45309" }}>DRYU9624130 · 换标待放行</span>
            </div>
            <p style={{ fontSize: 11, color: "#92400e", marginBottom: 8 }}>17P · CAD $0.50/label · Confirm to dispatch</p>
            <button onClick={() => clearHold("DRYU9624130")} className="w-full py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity" style={{ background: "#F59E0B", color: "white" }}>
              Release for Dispatch
            </button>
          </div>
          <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--muted-foreground)" }}>
            <div className="flex items-center gap-1 mb-1"><MapPin size={10} /><strong>FC Codes</strong></div>
            <div>YYZ9 Brampton · YHM1 Hamilton</div><div>YOO1 Oakville · YOW1 Ottawa</div>
          </div>
        </div>
      </div>
    </div>
  );
}
