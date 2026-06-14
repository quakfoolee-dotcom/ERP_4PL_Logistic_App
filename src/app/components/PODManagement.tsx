import { useMemo, useRef, useState } from "react";
import { AlertOctagon, CheckCircle, Clock, Eye, FileCheck, RotateCcw, Truck, Upload, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useActionDialog } from "./ActionDialog";
import { pick, type AppLanguage } from "../i18n";
import { getOperationsProjection } from "../repositories/projections";
import { useWorkflowSnapshot, workflowRepository } from "../repositories/workflowRepository";
import type { DispatchRecord } from "../domain/workflowReadiness";

const operationsProjection = getOperationsProjection();
const projectedPods = operationsProjection.pods;

type PodStatus = "confirmed" | "rejected" | "pending";
interface Pod {
  file: string;
  customer: string;
  dest: string;
  driver: string;
  pallets: number;
  date: string;
  status: PodStatus;
  note?: string;
  dispatchId?: string;
}

const card: React.CSSProperties = { background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,.04)" };
const th: React.CSSProperties = { background: "var(--muted)", fontSize: 11, fontWeight: 600, padding: "6px 10px", textAlign: "left", color: "var(--muted-foreground)" };
const td: React.CSSProperties = { padding: "9px 10px", fontSize: 12, borderBottom: "1px solid var(--border)" };

function mergeByFile(primary: Pod[], secondary: Pod[]) {
  const primaryFiles = new Set(primary.map((item) => item.file));
  return [...primary, ...secondary.filter((item) => !primaryFiles.has(item.file))];
}

function workflowPod(dispatch: DispatchRecord): Pod {
  return {
    file: `POD-${dispatch.id}.pdf`,
    customer: dispatch.customer,
    dest: dispatch.destination,
    driver: dispatch.driver === "TBD" ? dispatch.carrier : dispatch.driver,
    pallets: dispatch.pallets,
    date: dispatch.status === "closed" ? "POD received" : "Pending upload",
    status: dispatch.status === "closed" ? "confirmed" : "pending",
    note: dispatch.exceptionNote,
    dispatchId: dispatch.id,
  };
}

function badge(status: PodStatus, language: AppLanguage) {
  if (status === "confirmed") return { label: pick(language, "\u5df2\u7b7e\u6536", "Confirmed"), color: "#047857", bg: "#d1fae5" };
  if (status === "rejected") return { label: pick(language, "\u62d2\u6536", "Rejected"), color: "#b91c1c", bg: "#fee2e2" };
  return { label: pick(language, "\u5f85\u786e\u8ba4", "Pending"), color: "#b45309", bg: "#fef3c7" };
}

function notify(result: { ok: boolean; message: string }) {
  if (result.ok) toast.success(result.message);
  else toast.error(result.message);
}

export function PODManagement({ language = "zh" }: { language?: AppLanguage }) {
  const workflow = useWorkflowSnapshot();
  const { promptDialog, ActionDialog } = useActionDialog();
  const [localPods, setLocalPods] = useState<Pod[]>(projectedPods);
  const [filter, setFilter] = useState<"all" | PodStatus>("all");
  const [viewing, setViewing] = useState<Pod | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const workflowPods = useMemo(
    () => workflow.dispatches
      .filter((dispatch) => dispatch.status === "pod_pending" || dispatch.status === "closed")
      .map(workflowPod),
    [workflow.dispatches],
  );
  const pods = useMemo(() => mergeByFile(workflowPods, localPods), [workflowPods, localPods]);

  const total = pods.length;
  const confirmed = pods.filter((pod) => pod.status === "confirmed").length;
  const rejected = pods.filter((pod) => pod.status === "rejected").length;
  const pending = pods.filter((pod) => pod.status === "pending").length;
  const filtered = filter === "all" ? pods : pods.filter((pod) => pod.status === filter);

  function redispatch(file: string) {
    const pod = pods.find((item) => item.file === file);
    if (pod?.dispatchId) {
      notify(workflowRepository.markDispatchException(pod.dispatchId));
      return;
    }
    setLocalPods((items) => items.map((item) => item.file === file ? { ...item, status: "pending", note: "Re-dispatch scheduled" } : item));
    toast.success(pick(language, "\u5df2\u5b89\u6392\u91cd\u65b0\u6d3e\u9001", "Re-dispatch scheduled"));
  }

  async function dispute(file: string) {
    const reason = await promptDialog(pick(language, "\u8bb0\u5f55POD\u4e89\u8bae", "Log POD Dispute"), { message: pick(language, "\u8f93\u5165\u4e89\u8bae\u539f\u56e0", "Enter dispute reason") });
    if (!reason) return;
    const pod = pods.find((item) => item.file === file);
    if (pod?.dispatchId) {
      workflowRepository.updateDispatch(pod.dispatchId, { exceptionNote: `${pod.note || ""} | Dispute: ${reason}` });
    } else {
      setLocalPods((items) => items.map((item) => item.file === file ? { ...item, note: `${item.note || ""} | Dispute: ${reason}` } : item));
    }
    toast.warning(pick(language, "\u4e89\u8bae\u5df2\u8bb0\u5f55", "Dispute logged"), { description: reason });
  }

  function confirmPod(file: string) {
    const pod = pods.find((item) => item.file === file);
    if (pod?.dispatchId) {
      notify(workflowRepository.closeDispatchWithPod(pod.dispatchId));
    } else {
      setLocalPods((items) => items.map((item) => item.file === file ? { ...item, status: "confirmed" } : item));
      toast.success(pick(language, "POD\u5df2\u786e\u8ba4", "POD confirmed"));
    }
    setViewing(null);
  }

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !uploadTarget) return;
    const pod = pods.find((item) => item.file === uploadTarget);
    if (pod?.dispatchId) {
      notify(workflowRepository.closeDispatchWithPod(pod.dispatchId));
    } else {
      setLocalPods((items) => items.map((item) => item.file === uploadTarget ? { ...item, status: "confirmed" } : item));
      toast.success(pick(language, "POD\u5df2\u4e0a\u4f20\u5e76\u786e\u8ba4", "POD uploaded and confirmed"), { description: file.name });
    }
    setUploadTarget(null);
    event.target.value = "";
  }

  function triggerUpload(file: string) {
    setUploadTarget(file);
    fileRef.current?.click();
  }

  return (
    <div className="flex-1 overflow-auto p-5" style={{ background: "var(--background)" }}>
      <ActionDialog />
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={handleUpload} />

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,.45)" }} onClick={() => setViewing(null)}>
          <div style={{ ...card, width: 480, padding: 24 }} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span style={{ fontWeight: 700, fontSize: 15 }}>{pick(language, "POD\u9884\u89c8", "POD Preview")}</span>
              <button onClick={() => setViewing(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
            </div>
            <div style={{ background: "var(--muted)", borderRadius: 8, padding: 16, marginBottom: 16, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", color: "var(--muted-foreground)" }}>
              {viewing.file}
            </div>
            {[
              ["Customer", viewing.customer],
              ["Destination", viewing.dest],
              ["Driver", viewing.driver],
              ["Pallets", `${viewing.pallets}P`],
              ["Date", viewing.date],
              ["Status", badge(viewing.status, language).label],
            ].map(([key, value]) => (
              <div key={key} className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span style={{ color: "var(--muted-foreground)" }}>{key}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
              </div>
            ))}
            {viewing.note && <div style={{ marginTop: 12, padding: 10, background: "#fef3c7", borderRadius: 8, fontSize: 12, color: "#92400e" }}>{viewing.note}</div>}
            <div className="flex gap-2 mt-5">
              {viewing.status === "pending" && (
                <button onClick={() => confirmPod(viewing.file)} className="flex-1 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: "#10B981", color: "white" }}>
                  {pick(language, "\u786e\u8ba4POD", "Confirm POD")}
                </button>
              )}
              <button onClick={() => { triggerUpload(viewing.file); setViewing(null); }} className="flex-1 py-2 rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity" style={{ background: "var(--primary)", color: "white" }}>
                {pick(language, "\u4e0a\u4f20\u65b0\u6587\u4ef6", "Upload New File")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-5">
        {[
          { label: pick(language, "POD\u603b\u6570", "Total PODs"), value: total, icon: FileCheck, color: "var(--primary)", bg: "#eff6ff", filterValue: "all" as const },
          { label: pick(language, "\u5df2\u7b7e\u6536", "Confirmed"), value: confirmed, icon: CheckCircle, color: "#047857", bg: "#d1fae5", filterValue: "confirmed" as const },
          { label: pick(language, "\u5f85\u786e\u8ba4", "Pending"), value: pending, icon: Clock, color: "#b45309", bg: "#fef3c7", filterValue: "pending" as const },
          { label: pick(language, "\u62d2\u6536", "Rejected"), value: rejected, icon: XCircle, color: "#b91c1c", bg: "#fee2e2", filterValue: "rejected" as const },
        ].map(({ label, value, icon: Icon, color, bg, filterValue }) => (
          <div key={label} style={{ ...card, flex: 1, padding: 16, cursor: "pointer" }} onClick={() => setFilter(filterValue)}>
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
        <div style={{ ...card, flex: 3, padding: 0, overflow: "hidden" }}>
          <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{pick(language, "POD\u8bb0\u5f55", "POD Records")}</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{pick(language, "\u4eceTMS\u5f85POD\u72b6\u6001\u540c\u6b65", "Synced from TMS POD pending status")} - {filtered.length} records</div>
            </div>
            <div className="flex gap-2">
              {(["all", "confirmed", "rejected", "pending"] as const).map((filterOption) => (
                <button key={filterOption} onClick={() => setFilter(filterOption)} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, border: "1px solid var(--border)", cursor: "pointer", fontWeight: 600, background: filter === filterOption ? "var(--primary)" : "var(--card)", color: filter === filterOption ? "#fff" : "var(--foreground)" }}>
                  {filterOption === "all" ? pick(language, "\u5168\u90e8", "All") : badge(filterOption, language).label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["POD File", "Customer", "Dest", "Driver", "Pallets", "Date", "Status", "Actions"].map((header) => <th key={header} style={th}>{header}</th>)}</tr></thead>
              <tbody>
                {filtered.map((pod) => {
                  const statusBadge = badge(pod.status, language);
                  return (
                    <tr key={pod.file} style={{ background: "var(--card)" }} className="hover:bg-muted/30 transition-colors">
                      <td style={{ ...td, maxWidth: 180 }}>
                        <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={pod.file}>{pod.file}</div>
                      </td>
                      <td style={{ ...td, fontWeight: 600 }}>{pod.customer}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{pod.dest}</td>
                      <td style={td}>{pod.driver}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontWeight: 700 }}>{pod.pallets}P</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{pod.date}</td>
                      <td style={td}><span style={{ background: statusBadge.bg, color: statusBadge.color, borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{statusBadge.label}</span></td>
                      <td style={td}>
                        <div className="flex gap-1.5">
                          <button onClick={() => setViewing(pod)} title="View POD" style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", color: "var(--primary)" }}><Eye size={12} /></button>
                          <button onClick={() => triggerUpload(pod.file)} title="Upload" style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", color: "var(--muted-foreground)" }}><Upload size={12} /></button>
                          {pod.status === "pending" && <button onClick={() => confirmPod(pod.file)} title="Confirm" style={{ padding: "3px 8px", borderRadius: 6, border: "none", background: "#d1fae5", cursor: "pointer", color: "#047857", fontWeight: 700, fontSize: 11 }}>OK</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...card, flex: 1, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "#fef2f2" }}>
            <div className="flex items-center gap-2">
              <AlertOctagon size={15} style={{ color: "#b91c1c" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#b91c1c" }}>{pick(language, "\u62d2\u6536\u8ba2\u5355", "Rejected Orders")}</div>
                <div style={{ fontSize: 11, color: "#ef4444" }}>{pick(language, "\u9700\u8981\u5904\u7406", "Action required")}</div>
              </div>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            {pods.filter((pod) => pod.status === "rejected").map((pod) => (
              <div key={pod.file} style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#b91c1c", marginBottom: 4 }}>{pod.customer}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{pod.dest} - {pod.driver} - {pod.pallets}P</div>
                <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4, marginBottom: 8 }}>{pod.note}</div>
                <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 8 }}>{pod.date}</div>
                <div className="flex gap-2">
                  <button onClick={() => redispatch(pod.file)} className="flex items-center gap-1 flex-1 justify-center py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity" style={{ background: "var(--primary)", color: "white" }}>
                    <Truck size={11} /> {pick(language, "\u91cd\u65b0\u6d3e\u9001", "Re-dispatch")}
                  </button>
                  <button onClick={() => dispute(pod.file)} className="flex items-center gap-1 flex-1 justify-center py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" }}>
                    <RotateCcw size={11} /> {pick(language, "\u4e89\u8bae", "Dispute")}
                  </button>
                </div>
              </div>
            ))}
            {pods.filter((pod) => pod.status === "pending").length > 0 && (
              <div style={{ marginTop: 8, padding: "10px 12px", background: "#fef3c7", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#b45309", marginBottom: 4 }}>{pick(language, "\u5f85\u786e\u8ba4", "Pending POD")}</div>
                {pods.filter((pod) => pod.status === "pending").map((pod) => (
                  <div key={pod.file} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid #fde68a" }}>
                    <span style={{ fontSize: 11 }}>{pod.customer} - {pod.pallets}P</span>
                    <button onClick={() => confirmPod(pod.file)} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "#10B981", color: "white", border: "none", cursor: "pointer", fontWeight: 700 }}>{pick(language, "\u786e\u8ba4", "Confirm")}</button>
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
