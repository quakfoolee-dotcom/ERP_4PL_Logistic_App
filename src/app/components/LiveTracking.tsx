import { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, MapPin, RefreshCw, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { useActionDialog } from "./ActionDialog";
import { pick, type AppLanguage } from "../i18n";
import { getOperationsProjection } from "../repositories/projections";
import { useWorkflowSnapshot, workflowRepository } from "../repositories/workflowRepository";
import type { DispatchRecord } from "../domain/workflowReadiness";

const operationsProjection = getOperationsProjection();
const projectedContainers = operationsProjection.liveContainers;
const projectedAppointments = operationsProjection.appointments;

type ProjectionContainer = (typeof projectedContainers)[number];
type ProjectionAppointment = (typeof projectedAppointments)[number];
type KeyedAppointment = ProjectionAppointment & { id: string };
type LiveStatus = "scheduled" | "on-route" | "pod-pending" | "delivered" | "hold";
type LiveContainer = Omit<ProjectionContainer, "status"> & {
  status: LiveStatus;
  dispatchId?: string;
};

const card: React.CSSProperties = { background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,.04)" };
const th: React.CSSProperties = { background: "var(--muted)", fontSize: 11, fontWeight: 600, padding: "8px 12px", textAlign: "left", color: "var(--muted-foreground)" };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12, borderBottom: "1px solid var(--border)" };

function asLiveContainer(container: ProjectionContainer): LiveContainer {
  const status = ["scheduled", "on-route", "pod-pending", "delivered", "hold"].includes(container.status)
    ? container.status as LiveStatus
    : "hold";
  return { ...container, status };
}

function dispatchStatus(dispatch: DispatchRecord): LiveStatus {
  if (dispatch.status === "closed") return "delivered";
  if (dispatch.status === "pod_pending") return "pod-pending";
  if (dispatch.status === "in_transit") return "on-route";
  if (dispatch.status === "exception") return "hold";
  return "scheduled";
}

function workflowContainer(dispatch: DispatchRecord): LiveContainer {
  const status = dispatchStatus(dispatch);
  return {
    id: dispatch.id,
    dispatchId: dispatch.id,
    pallets: dispatch.pallets,
    dest: dispatch.destination,
    driver: dispatch.driver === "TBD" ? dispatch.carrier : `${dispatch.driver} / ${dispatch.carrier}`,
    departed: status === "scheduled" ? "Pending departure" : status === "hold" ? "Exception" : "Started",
    eta: status === "pod-pending" ? "POD required" : status === "delivered" ? "Delivered" : status === "scheduled" ? "Awaiting carrier" : "Live tracking",
    status,
    notes: dispatch.exceptionNote,
  };
}

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]) {
  const primaryIds = new Set(primary.map((item) => item.id));
  return [...primary, ...secondary.filter((item) => !primaryIds.has(item.id))];
}

function notify(result: { ok: boolean; message: string }) {
  if (result.ok) toast.success(result.message);
  else toast.error(result.message);
}

function statusBadge(status: LiveStatus, language: AppLanguage) {
  const labels: Record<LiveStatus, { zh: string; en: string; color: string; bg: string }> = {
    scheduled: { zh: "\u5df2\u6392\u7a0b", en: "Scheduled", color: "#1d4ed8", bg: "#dbeafe" },
    "on-route": { zh: "\u8fd0\u8f93\u4e2d", en: "In Transit", color: "#047857", bg: "#d1fae5" },
    "pod-pending": { zh: "\u5f85POD", en: "POD Pending", color: "#b45309", bg: "#fef3c7" },
    delivered: { zh: "\u5df2\u5230\u8fbe", en: "Delivered", color: "#1d4ed8", bg: "#dbeafe" },
    hold: { zh: "\u6682\u6263", en: "Hold", color: "#b45309", bg: "#fef3c7" },
  };
  const badge = labels[status];
  return { ...badge, label: pick(language, badge.zh, badge.en) };
}

export function LiveTracking({ language = "zh" }: { language?: AppLanguage }) {
  const workflow = useWorkflowSnapshot();
  const { promptDialog, ActionDialog } = useActionDialog();
  const [localContainers, setLocalContainers] = useState<LiveContainer[]>(projectedContainers.map(asLiveContainer));
  const [localAppts, setLocalAppts] = useState<ProjectionAppointment[]>(projectedAppointments);
  const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString("en-CA"));
  const [selected, setSelected] = useState<LiveContainer | null>(null);

  const workflowContainers = useMemo(
    () => workflow.dispatches.map(workflowContainer),
    [workflow.dispatches],
  );
  const containers = useMemo(
    () => mergeById(workflowContainers, localContainers),
    [workflowContainers, localContainers],
  );
  const workflowAppts = useMemo<KeyedAppointment[]>(() => workflow.dispatches
    .filter((dispatch) => ["assigned", "in_transit", "pod_pending", "closed"].includes(dispatch.status))
    .map((dispatch) => ({
      id: dispatch.id,
      time: dispatch.status === "closed" ? "Closed" : dispatch.status === "pod_pending" ? "POD pending" : dispatch.status === "in_transit" ? "In transit" : "Assigned",
      desc: `${dispatch.pallets}P - ${dispatch.driver === "TBD" ? dispatch.carrier : dispatch.driver} -> ${dispatch.destination} (${dispatch.id})`,
      status: dispatch.status === "closed" ? "done" : dispatch.status === "in_transit" ? "active" : "pending",
      cid: dispatch.id,
    })),
    [workflow.dispatches],
  );
  const appts = useMemo(() => mergeById(workflowAppts, localAppts.map((appt, index) => ({ ...appt, id: `${appt.cid}-${index}` }))).map(({ id: _id, ...appt }) => appt), [workflowAppts, localAppts]);

  const onRoute = containers.filter((container) => container.status === "on-route").length;
  const delivered = containers.filter((container) => container.status === "delivered").length;
  const podPending = containers.filter((container) => container.status === "pod-pending").length;
  const onHold = containers.filter((container) => container.status === "hold").length;
  const selectedContainer = selected ? containers.find((container) => container.id === selected.id) ?? selected : null;

  function refresh() {
    setLastRefresh(new Date().toLocaleTimeString("en-CA"));
    toast.success(pick(language, "\u72b6\u6001\u5df2\u5237\u65b0", "Status refreshed"), {
      description: pick(language, "\u8fd0\u8f93\u3001POD\u548c\u8d22\u52a1\u961f\u5217\u5df2\u540c\u6b65\u3002", "TMS, POD, and Finance queue are synchronized."),
    });
  }

  function startTransit(container: LiveContainer) {
    if (!container.dispatchId) return;
    notify(workflowRepository.moveDispatchToTransit(container.dispatchId));
    setSelected(null);
  }

  function moveToPod(container: LiveContainer) {
    if (container.dispatchId) {
      notify(workflowRepository.moveDispatchToPod(container.dispatchId));
      setSelected(null);
      return;
    }
    setLocalContainers((items) => items.map((item) => item.id === container.id ? { ...item, status: "delivered" } : item));
    setSelected(null);
    toast.success(`${container.id} ${pick(language, "\u5df2\u5230\u8fbe", "marked delivered")}`);
  }

  function clearHold(id: string) {
    setLocalContainers((items) => items.map((item) => item.id === id ? { ...item, status: "on-route", eta: "TBD", departed: new Date().toLocaleDateString("en-CA") } : item));
    setLocalAppts((items) => items.map((appointment) => appointment.cid === id && appointment.status === "pending" ? { ...appointment, status: "active", time: "Pending confirmation" } : appointment));
    setSelected(null);
    toast.info(pick(language, "\u6682\u6263\u5df2\u89e3\u9664\uff0c\u53ef\u5f00\u59cb\u6d3e\u9001", "HOLD cleared and ready to dispatch"));
  }

  function confirmAppt(index: number) {
    setLocalAppts((items) => items.map((appointment, itemIndex) => itemIndex === index ? { ...appointment, status: "done" } : appointment));
    toast.success(pick(language, "\u9884\u7ea6\u5df2\u786e\u8ba4", "Appointment confirmed"));
  }

  async function scheduleAppt(index: number) {
    const time = await promptDialog(pick(language, "\u5b89\u6392\u9884\u7ea6", "Schedule Appointment"), { message: pick(language, "\u8f93\u5165\u9884\u7ea6\u65f6\u95f4", "Enter appointment time") });
    if (!time) return;
    setLocalAppts((items) => items.map((appointment, itemIndex) => itemIndex === index ? { ...appointment, time, status: "active" } : appointment));
    toast.success(pick(language, "\u9884\u7ea6\u5df2\u5b89\u6392", "Appointment scheduled"), { description: time });
  }

  async function addNote(container: LiveContainer) {
    const note = await promptDialog(pick(language, "\u6dfb\u52a0\u6d3e\u9001\u5907\u6ce8", "Add Dispatch Note"));
    if (!note) return;
    if (container.dispatchId) {
      workflowRepository.updateDispatch(container.dispatchId, { exceptionNote: `${container.notes}\n[Note] ${note}` });
    } else {
      setLocalContainers((items) => items.map((item) => item.id === container.id ? { ...item, notes: `${item.notes}\n[Note] ${note}` } : item));
    }
    toast.success(pick(language, "\u5907\u6ce8\u5df2\u4fdd\u5b58", "Note saved"));
  }

  return (
    <div className="flex-1 overflow-auto p-5" style={{ background: "var(--background)" }}>
      <ActionDialog />
      <div style={{ ...card, marginBottom: 20, background: "var(--primary)", border: "none", color: "#fff", padding: 16 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Truck size={18} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{pick(language, "\u5b9e\u65f6\u8ddf\u8e2a", "Live Tracking")}</span>
            <span style={{ fontSize: 11, opacity: .75 }}>Updated {lastRefresh}</span>
          </div>
          <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-80 transition-opacity"
            style={{ background: "rgba(255,255,255,.2)", color: "#fff", fontWeight: 500 }}>
            <RefreshCw size={13} /> {pick(language, "\u5237\u65b0", "Refresh")}
          </button>
        </div>
        <div className="flex gap-10">
          {[
            { label: pick(language, "\u8fd0\u8f93\u4e2d", "In Transit"), value: onRoute },
            { label: pick(language, "\u5f85POD", "POD Pending"), value: podPending },
            { label: pick(language, "\u5df2\u5230\u8fbe", "Delivered"), value: delivered },
            { label: pick(language, "\u6682\u6263", "On Hold"), value: onHold },
          ].map((stat) => (
            <div key={stat.label} className="flex items-end gap-2">
              <span style={{ fontSize: 30, fontWeight: 800, fontFamily: "monospace" }}>{stat.value}</span>
              <span style={{ fontSize: 12, opacity: .85, marginBottom: 4 }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4" style={{ alignItems: "flex-start" }}>
        <div style={{ ...card, flex: 2, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{pick(language, "\u6d3b\u8dc3\u6d3e\u9001", "Active Dispatches")}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{pick(language, "\u4eceTMS\u72b6\u6001\u540c\u6b65\uff0c\u53ef\u63a8\u8fdb\u5230POD", "Synced from TMS status and can advance to POD")}</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Dispatch #", "Pallets", "Destination", "Driver", "Departed", "ETA", "Status", ""].map((header) => <th key={header} style={th}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {containers.map((container) => {
                const badge = statusBadge(container.status, language);
                const isSelected = selectedContainer?.id === container.id;
                return (
                  <tr key={container.id} onClick={() => setSelected(isSelected ? null : container)}
                    style={{ background: isSelected ? "var(--secondary)" : "var(--card)", cursor: "pointer", transition: "background .15s" }}>
                    <td style={td}><span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)", fontSize: 11 }}>{container.id}</span></td>
                    <td style={{ ...td, fontFamily: "monospace", fontWeight: 700 }}>{container.pallets}P</td>
                    <td style={{ ...td, fontFamily: "monospace" }}>{container.dest}</td>
                    <td style={td}>{container.driver}</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{container.departed}</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{container.eta}</td>
                    <td style={td}><span style={{ background: badge.bg, color: badge.color, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{badge.label}</span></td>
                    <td style={{ ...td, width: 24 }}><ChevronRight size={14} style={{ color: "var(--muted-foreground)", transform: isSelected ? "rotate(90deg)" : "none", transition: "transform .2s" }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {selectedContainer && (
            <div style={{ borderTop: "2px solid var(--primary)", background: "var(--secondary)", padding: 16 }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)", fontSize: 13 }}>{selectedContainer.id}</span>
                  <span className="ml-3 px-2 py-0.5 rounded-full text-xs" style={{ background: statusBadge(selectedContainer.status, language).bg, color: statusBadge(selectedContainer.status, language).color, fontWeight: 600 }}>
                    {statusBadge(selectedContainer.status, language).label}
                  </span>
                </div>
                <button onClick={() => setSelected(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={15} /></button>
              </div>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12, lineHeight: 1.5, whiteSpace: "pre-line" }}>{selectedContainer.notes}</p>
              <div className="flex gap-2 flex-wrap">
                {selectedContainer.status === "scheduled" && selectedContainer.dispatchId && (
                  <button onClick={() => startTransit(selectedContainer)} className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity" style={{ background: "var(--primary)", color: "white" }}>
                    {pick(language, "\u5f00\u59cb\u8fd0\u8f93", "Start Transit")}
                  </button>
                )}
                {selectedContainer.status === "on-route" && (
                  <button onClick={() => moveToPod(selectedContainer)} className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity" style={{ background: "#10B981", color: "white" }}>
                    {pick(language, "\u8f6c\u5230POD", "Move to POD")}
                  </button>
                )}
                {selectedContainer.status === "hold" && !selectedContainer.dispatchId && (
                  <button onClick={() => clearHold(selectedContainer.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity" style={{ background: "#F59E0B", color: "white" }}>
                    {pick(language, "\u89e3\u9664\u6682\u6263\u5e76\u6d3e\u9001", "Release HOLD and Dispatch")}
                  </button>
                )}
                <button onClick={() => addNote(selectedContainer)} className="px-3 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors" style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}>
                  {pick(language, "\u6dfb\u52a0\u5907\u6ce8", "Add Note")}
                </button>
                <button onClick={() => toast.info(`${pick(language, "\u8054\u7cfb\u53f8\u673a", "Contacting driver")} ${selectedContainer.id}`)} className="px-3 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors" style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}>
                  {pick(language, "\u8054\u7cfb\u53f8\u673a", "Contact Driver")}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ ...card, flex: 1, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{pick(language, "\u9884\u7ea6\u65f6\u95f4\u8868", "Schedule")}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{pick(language, "\u5305\u542bTMS\u6d3e\u9001\u72b6\u6001", "Includes TMS dispatch status")}</div>
          </div>
          <div style={{ padding: "8px 12px" }}>
            {appts.map((appointment, index) => {
              const dot = appointment.status === "done" ? "#10b981" : appointment.status === "active" ? "#1C64F2" : "#f59e0b";
              return (
                <div key={`${appointment.cid}-${index}`} onClick={() => appointment.status === "active" ? confirmAppt(index) : appointment.status === "pending" ? scheduleAppt(index) : toast.info(pick(language, "\u5df2\u5b8c\u6210", "Already completed"))}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors mb-1">
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, marginTop: 5, flexShrink: 0 }} />
                  <div className="flex-1">
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600 }}>{appointment.time}</div>
                    <div style={{ fontSize: 12, marginTop: 1 }}>{appointment.desc}</div>
                    <div style={{ fontSize: 10, marginTop: 2, color: appointment.status === "done" ? "#10B981" : appointment.status === "active" ? "#1C64F2" : "#D97706" }}>
                      {appointment.status === "done" ? pick(language, "\u5df2\u786e\u8ba4", "Confirmed") : appointment.status === "active" ? pick(language, "\u70b9\u51fb\u786e\u8ba4", "Tap to confirm") : pick(language, "\u70b9\u51fb\u5b89\u6392", "Tap to schedule")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ margin: "4px 12px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 10 }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={13} style={{ color: "#b45309" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#b45309" }}>{pick(language, "\u5f02\u5e38\u6d3e\u9001\u9700\u5904\u7406", "Exception dispatch needs action")}</span>
            </div>
            <p style={{ fontSize: 11, color: "#92400e", marginBottom: 8 }}>{pick(language, "\u6682\u6263\u9879\u76ee\u89e3\u9664\u540e\u4f1a\u56de\u5230\u5728\u9014\u8ddf\u8e2a\u3002", "Hold items return to live tracking after release.")}</p>
          </div>
          <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--muted-foreground)" }}>
            <div className="flex items-center gap-1 mb-1"><MapPin size={10} /><strong>{pick(language, "\u76ee\u7684\u5730", "Destinations")}</strong></div>
            <div>YYZ9 Brampton - YHM1 Hamilton</div><div>YOO1 Oakville - YOW1 Ottawa</div>
          </div>
        </div>
      </div>
    </div>
  );
}
