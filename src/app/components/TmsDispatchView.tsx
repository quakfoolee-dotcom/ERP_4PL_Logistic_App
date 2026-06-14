import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Route, Truck } from "lucide-react";
import { toast } from "sonner";
import type { AppLanguage } from "../i18n";
import { pick } from "../i18n";
import type { DispatchRecord, DispatchStatus } from "../domain/workflowReadiness";
import { getDispatchBackboneTrace } from "../repositories/orderToCashAdapters";
import { useWorkflowSnapshot, workflowRepository } from "../repositories/workflowRepository";
import { BackboneTracePanel, useOrderToCashSnapshot } from "./BackboneTracePanel";

const statusLabels: Record<DispatchStatus, { zh: string; en: string }> = {
  requested: { zh: "已请求", en: "Requested" },
  quoted: { zh: "已报价", en: "Quoted" },
  assigned: { zh: "已派车", en: "Assigned" },
  in_transit: { zh: "运输中", en: "In Transit" },
  pod_pending: { zh: "待POD", en: "POD Pending" },
  closed: { zh: "已关闭", en: "Closed" },
  exception: { zh: "异常", en: "Exception" },
};

export function TmsDispatchView({ language = "zh" }: { language?: AppLanguage }) {
  const workflow = useWorkflowSnapshot();
  const orderToCashSnapshot = useOrderToCashSnapshot();
  const dispatches = workflow.dispatches;
  const [selectedId, setSelectedId] = useState(dispatches[0]?.id ?? "");
  const selected = dispatches.find((item) => item.id === selectedId) ?? dispatches[0];
  const selectedTrace = selected ? getDispatchBackboneTrace(selected.id, orderToCashSnapshot) : null;

  const stats = useMemo(() => ({
    total: dispatches.length,
    assigned: dispatches.filter((item) => ["assigned", "in_transit", "pod_pending"].includes(item.status)).length,
    exceptions: dispatches.filter((item) => item.status === "exception").length,
    marginCad: dispatches.reduce((sum, item) => sum + item.estimatedRevenueCad - item.quotedCostCad, 0),
  }), [dispatches]);

  function notify(result: { ok: boolean; message: string }) {
    toast[result.ok ? "success" : "error"](result.message);
  }

  function updateDispatch(id: string, patch: Partial<DispatchRecord>) {
    workflowRepository.updateDispatch(id, patch);
    toast.success(pick(language, "派车记录已更新", "Dispatch record updated"));
  }

  function nextPrimaryAction(item: DispatchRecord) {
    if (item.status === "requested" || item.status === "quoted") return <Action label={pick(language, "分配承运商", "Assign Carrier")} onClick={() => notify(workflowRepository.assignDispatchCarrier(item.id))} />;
    if (item.status === "assigned") return <Action label={pick(language, "开始运输", "Start Transit")} onClick={() => notify(workflowRepository.moveDispatchToTransit(item.id))} />;
    if (item.status === "in_transit") return <Action label={pick(language, "转待POD", "Move to POD")} onClick={() => notify(workflowRepository.moveDispatchToPod(item.id))} />;
    if (item.status === "pod_pending") return <Action label={pick(language, "POD关闭", "Close with POD")} onClick={() => notify(workflowRepository.closeDispatchWithPod(item.id))} />;
    return <Action muted label={pick(language, "标记异常", "Flag Exception")} onClick={() => notify(workflowRepository.markDispatchException(item.id))} />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <Kpi icon={<Truck size={17} />} label={pick(language, "派车任务", "Dispatch Jobs")} value={String(stats.total)} color="#1C64F2" />
        <Kpi icon={<CheckCircle2 size={17} />} label={pick(language, "已派车/在途", "Assigned / Active")} value={String(stats.assigned)} color="#047857" />
        <Kpi icon={<AlertTriangle size={17} />} label={pick(language, "异常", "Exceptions")} value={String(stats.exceptions)} color="#DC2626" />
        <Kpi icon={<Route size={17} />} label={pick(language, "预计毛利", "Projected Margin")} value={`CAD $${stats.marginCad.toLocaleString()}`} color="#6D28D9" />
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(680px, 1.8fr) minmax(360px, 1fr)" }}>
        <Panel title={pick(language, "TMS派车工作台", "TMS Dispatch Workbench")} subtitle={pick(language, "派车动作会驱动POD和财务计费队列", "Dispatch actions drive POD and Finance Billing Queue state")}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ minWidth: 1040 }}>
              <thead>
                <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                  {[pick(language, "派车号", "Dispatch #"), pick(language, "客户", "Customer"), pick(language, "路线", "Lane"), pick(language, "托盘", "Pallets"), pick(language, "司机/承运商", "Driver / Carrier"), pick(language, "成本", "Cost"), pick(language, "收入", "Revenue"), pick(language, "状态", "Status"), pick(language, "操作", "Action")].map((header, index) => (
                    <th key={header} className="px-3 py-2.5 text-left text-xs" style={{ ...stickyStyle(index === 8), color: "var(--muted-foreground)", fontWeight: 700 }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dispatches.map((item) => (
                  <tr key={item.id} onClick={() => setSelectedId(item.id)} className="cursor-pointer border-b hover:bg-muted/30" style={{ borderColor: "var(--border)", background: selectedId === item.id ? "rgba(28,100,242,0.05)" : "var(--card)" }}>
                    <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 800 }}>{item.id}</td>
                    <td className="px-3 py-3 text-xs" style={{ fontWeight: 700 }}>{item.customer}</td>
                    <td className="px-3 py-3 text-xs">{item.origin} {"->"} {item.destination}</td>
                    <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace" }}>{item.pallets}P</td>
                    <td className="px-3 py-3 text-xs">{item.driver} / {item.carrier}</td>
                    <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace" }}>CAD ${item.quotedCostCad.toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 800 }}>CAD ${item.estimatedRevenueCad.toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs"><StatusPill status={item.status} language={language} /></td>
                    <td className="px-3 py-3 text-xs" onClick={(event) => event.stopPropagation()} style={stickyStyle(true)}>
                      <div className="flex gap-2">{nextPrimaryAction(item)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {selected && (
          <Panel title={selected.id} subtitle={pick(language, "承运商成本比较和异常备注", "Carrier cost comparison and exception note")}>
            <div className="space-y-3">
              <Field label={pick(language, "司机", "Driver")}><input value={selected.driver} onChange={(event) => updateDispatch(selected.id, { driver: event.target.value })} style={inputStyle} /></Field>
              <Field label={pick(language, "承运商", "Carrier")}><input value={selected.carrier} onChange={(event) => updateDispatch(selected.id, { carrier: event.target.value })} style={inputStyle} /></Field>
              <Field label={pick(language, "报价成本CAD", "Quoted Cost CAD")}><input type="number" value={selected.quotedCostCad} onChange={(event) => updateDispatch(selected.id, { quotedCostCad: Number(event.target.value) || 0 })} style={inputStyle} /></Field>
              <Field label={pick(language, "异常/备注", "Exception / Note")}><textarea value={selected.exceptionNote} onChange={(event) => updateDispatch(selected.id, { exceptionNote: event.target.value })} style={{ ...inputStyle, minHeight: 88, resize: "vertical" }} /></Field>
              <div className="rounded-lg border p-3 text-xs" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
                <div className="flex justify-between"><span>{pick(language, "预计毛利", "Projected Margin")}</span><strong>CAD ${(selected.estimatedRevenueCad - selected.quotedCostCad).toLocaleString()}</strong></div>
                <div className="mt-2 flex justify-between"><span>POD</span><strong>{selected.podRequired ? pick(language, "需要", "Required") : pick(language, "不需要", "Not Required")}</strong></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {nextPrimaryAction(selected)}
                  <Action muted label={pick(language, "标记异常", "Flag Exception")} onClick={() => notify(workflowRepository.markDispatchException(selected.id))} />
                </div>
              </div>
              <BackboneTracePanel language={language} trace={selectedTrace} />
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status, language }: { status: DispatchStatus; language: AppLanguage }) {
  const isBad = status === "exception";
  const isGood = status === "closed";
  return <span className="rounded-full px-2 py-1 text-xs" style={{ background: isBad ? "#FEE2E2" : isGood ? "#D1FAE5" : "#E0ECFF", color: isBad ? "#B91C1C" : isGood ? "#047857" : "#1D4ED8", fontWeight: 800 }}>{pick(language, statusLabels[status].zh, statusLabels[status].en)}</span>;
}

function Action({ label, onClick, muted = false }: { label: string; onClick: () => void; muted?: boolean }) {
  return <button onClick={onClick} className="rounded-lg px-3 py-1.5 text-xs" style={{ background: muted ? "var(--muted)" : "var(--primary)", color: muted ? "var(--foreground)" : "white", fontWeight: 800, whiteSpace: "nowrap" }}>{label}</button>;
}

function stickyStyle(active: boolean): React.CSSProperties {
  return active ? { position: "sticky", right: 0, background: "var(--card)", boxShadow: "-8px 0 12px rgba(15,23,42,0.06)", zIndex: 1 } : {};
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return <div className="rounded-xl border bg-card p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}><div className="flex items-center justify-between"><div><div className="mb-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</div><div style={{ color, fontFamily: "monospace", fontSize: 22, fontWeight: 800 }}>{value}</div></div><div className="rounded-lg p-2" style={{ background: "var(--muted)", color }}>{icon}</div></div></div>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border bg-card" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}><div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}><div className="text-sm" style={{ fontWeight: 800 }}>{title}</div><div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{subtitle}</div></div><div className="p-4">{children}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1 text-xs" style={{ color: "var(--muted-foreground)", fontWeight: 800 }}>{label}</div>{children}</label>;
}

const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid var(--border)", borderRadius: 8, background: "var(--input-background)", color: "var(--foreground)", fontSize: 13, padding: "8px 10px" };
