import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileStack, Ship, Truck } from "lucide-react";
import { toast } from "sonner";
import type { AppLanguage } from "../i18n";
import { pick } from "../i18n";
import type { FreightFileRecord, FreightFileStatus } from "../domain/businessReadiness";
import { getFreightBackboneTrace } from "../repositories/orderToCashAdapters";
import { useWorkflowSnapshot, workflowRepository } from "../repositories/workflowRepository";
import { BackboneTracePanel, useOrderToCashSnapshot } from "./BackboneTracePanel";

const statusOptions: FreightFileStatus[] = ["documents_needed", "customs_review", "released", "devanning", "closed", "hold"];
const statusLabels: Record<FreightFileStatus, { zh: string; en: string; color: string; bg: string }> = {
  documents_needed: { zh: "缺文件", en: "Docs Needed", color: "#B91C1C", bg: "#FEE2E2" },
  customs_review: { zh: "清关中", en: "Customs Review", color: "#1D4ED8", bg: "#DBEAFE" },
  released: { zh: "已放行", en: "Released", color: "#047857", bg: "#D1FAE5" },
  devanning: { zh: "拆柜中", en: "Devanning", color: "#0F766E", bg: "#CCFBF1" },
  closed: { zh: "已关闭", en: "Closed", color: "#334155", bg: "#E2E8F0" },
  hold: { zh: "暂扣", en: "Hold", color: "#B45309", bg: "#FEF3C7" },
};

const customsLabels: Record<FreightFileRecord["customsStatus"], { zh: string; en: string }> = {
  "Docs Missing": { zh: "缺文件", en: "Docs Missing" },
  Submitted: { zh: "已提交", en: "Submitted" },
  Released: { zh: "已放行", en: "Released" },
  Hold: { zh: "暂扣", en: "Hold" },
};

export function FreightCustomsView({ language = "zh" }: { language?: AppLanguage }) {
  const workflow = useWorkflowSnapshot();
  const orderToCashSnapshot = useOrderToCashSnapshot();
  const files = workflow.freightFiles;
  const [selectedId, setSelectedId] = useState(files[0]?.id ?? "");
  const selected = files.find((file) => file.id === selectedId) ?? files[0];
  const selectedTrace = selected ? getFreightBackboneTrace(selected.id, orderToCashSnapshot) : null;

  const stats = useMemo(() => ({
    total: files.length,
    released: files.filter((file) => ["released", "devanning", "closed"].includes(file.status)).length,
    holds: files.filter((file) => file.status === "hold" || file.customsStatus === "Hold").length,
    missingDocs: files.filter((file) => file.status === "documents_needed").length,
    cost: files.reduce((sum, file) => sum + file.estimatedCostsCad, 0),
  }), [files]);

  function notify(result: { ok: boolean; message: string }) {
    toast[result.ok ? "success" : "error"](result.message);
  }

  function updateFile(id: string, patch: Partial<FreightFileRecord>) {
    workflowRepository.updateFreightFile(id, patch);
    toast.success(pick(language, "货运文件已更新，相关ASN已同步", "Freight file updated and related ASN synchronized"));
  }

  function releaseToAsn(file: FreightFileRecord) {
    notify(workflowRepository.releaseFreightToAsn(file.id));
  }

  function submitDocsAndCustoms(file: FreightFileRecord) {
    notify(workflowRepository.submitFreightDocuments(file.id));
  }

  function advanceMilestone(file: FreightFileRecord) {
    notify(workflowRepository.advanceFreightMilestone(file.id));
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        <Kpi icon={<FileStack size={17} />} label={pick(language, "货运文件", "Freight Files")} value={String(stats.total)} color="#1C64F2" />
        <Kpi icon={<CheckCircle2 size={17} />} label={pick(language, "已放行/关闭", "Released / Closed")} value={String(stats.released)} color="#047857" />
        <Kpi icon={<AlertTriangle size={17} />} label={pick(language, "异常/暂扣", "Exceptions / Holds")} value={String(stats.holds)} color="#B45309" />
        <Kpi icon={<Ship size={17} />} label={pick(language, "缺文件", "Missing Docs")} value={String(stats.missingDocs)} color="#DC2626" />
        <Kpi icon={<Truck size={17} />} label={pick(language, "预估成本", "Estimated Costs")} value={`CAD $${stats.cost.toLocaleString()}`} color="#6D28D9" />
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(560px, 1.7fr) minmax(360px, 1fr)" }}>
        <Panel title={pick(language, "进口货运与清关文件", "Import Freight & Customs Files")} subtitle={pick(language, "清关放行会同步到WMS ASN收货资格", "Customs release synchronizes WMS ASN receiving eligibility")}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ minWidth: 1040 }}>
              <thead>
                <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                  {[pick(language, "文件号", "File #"), pick(language, "客户", "Customer"), pick(language, "柜号", "Container"), "ETA", "LFD", pick(language, "清关", "Customs"), pick(language, "状态", "Status"), pick(language, "异常", "Exception"), pick(language, "操作", "Action")].map((header, index) => (
                    <th key={header} className="px-3 py-2.5 text-left text-xs" style={{ ...stickyColumn(index === 8), color: "var(--muted-foreground)", fontWeight: 700 }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} onClick={() => setSelectedId(file.id)} className="cursor-pointer border-b hover:bg-muted/30" style={{ borderColor: "var(--border)", background: selectedId === file.id ? "rgba(28,100,242,0.05)" : "var(--card)" }}>
                    <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 800 }}>{file.id}</td>
                    <td className="px-3 py-3 text-xs" style={{ fontWeight: 700 }}>{file.customer}</td>
                    <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace" }}>{file.container}</td>
                    <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace" }}>{file.eta}</td>
                    <td className="px-3 py-3 text-xs" style={{ color: file.status === "hold" ? "#B45309" : "var(--foreground)", fontFamily: "monospace", fontWeight: 700 }}>{file.lastFreeDay}</td>
                    <td className="px-3 py-3 text-xs">{pick(language, customsLabels[file.customsStatus].zh, customsLabels[file.customsStatus].en)}</td>
                    <td className="px-3 py-3 text-xs"><StatusPill status={file.status} language={language} /></td>
                    <td className="px-3 py-3 text-xs" style={{ color: file.exception === "None" ? "var(--muted-foreground)" : "#B45309" }}>{file.exception}</td>
                    <td className="px-3 py-3 text-xs" onClick={(event) => event.stopPropagation()} style={stickyColumn(true)}>
                      <button onClick={() => submitDocsAndCustoms(file)} className="mr-2 rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--foreground)", fontWeight: 800 }}>
                        {pick(language, "提交清关", "Submit Docs")}
                      </button>
                      <button onClick={() => releaseToAsn(file)} className="rounded-lg px-3 py-1.5 text-xs" style={{ background: file.customsStatus === "Released" ? "#10B981" : "var(--primary)", color: "white", fontWeight: 800 }}>
                        {pick(language, "放行到ASN", "Release to ASN")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {selected && (
          <Panel title={selected.container} subtitle={`${selected.vessel} / ${selected.terminal}`}>
            <div className="space-y-3">
              <Field label={pick(language, "文件状态", "File Status")}>
                <select value={selected.status} onChange={(event) => updateFile(selected.id, { status: event.target.value as FreightFileStatus })} style={inputStyle}>
                  {statusOptions.map((status) => <option key={status} value={status}>{pick(language, statusLabels[status].zh, statusLabels[status].en)}</option>)}
                </select>
              </Field>
              <Field label={pick(language, "清关状态", "Customs Status")}>
                <select value={selected.customsStatus} onChange={(event) => updateFile(selected.id, { customsStatus: event.target.value as FreightFileRecord["customsStatus"] })} style={inputStyle}>
                  {Object.keys(customsLabels).map((status) => (
                    <option key={status} value={status}>{pick(language, customsLabels[status as FreightFileRecord["customsStatus"]].zh, customsLabels[status as FreightFileRecord["customsStatus"]].en)}</option>
                  ))}
                </select>
              </Field>
              <Field label={pick(language, "目的地", "Destination")}>
                <input value={selected.destination} onChange={(event) => updateFile(selected.id, { destination: event.target.value })} style={inputStyle} />
              </Field>
              <Field label={pick(language, "异常说明", "Exception Note")}>
                <textarea value={selected.exception} onChange={(event) => updateFile(selected.id, { exception: event.target.value })} style={{ ...inputStyle, minHeight: 78, resize: "vertical" }} />
              </Field>
              <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ fontWeight: 800 }}>{pick(language, "里程碑", "Milestones")}</span>
                  <span style={{ fontFamily: "monospace", color: "var(--muted-foreground)" }}>{selected.milestonesDone}/{selected.milestonesTotal}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full" style={{ width: `${(selected.milestonesDone / selected.milestonesTotal) * 100}%`, background: selected.milestonesDone === selected.milestonesTotal ? "#10B981" : "var(--primary)" }} />
                </div>
              </div>
              <button onClick={() => advanceMilestone(selected)} className="w-full rounded-lg px-3 py-2 text-xs" style={{ background: "var(--primary)", color: "white", fontWeight: 800 }}>
                {pick(language, "完成下一个里程碑", "Complete Next Milestone")}
              </button>
              <button onClick={() => submitDocsAndCustoms(selected)} className="w-full rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--foreground)", fontWeight: 800 }}>
                {pick(language, "文件齐全并提交清关", "Docs Complete and Submit Customs")}
              </button>
              <button onClick={() => releaseToAsn(selected)} className="w-full rounded-lg px-3 py-2 text-xs" style={{ background: "#10B981", color: "white", fontWeight: 800 }}>
                {pick(language, "清关放行并同步ASN", "Release Customs and Sync ASN")}
              </button>
              <BackboneTracePanel language={language} trace={selectedTrace} />
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function stickyColumn(active: boolean): React.CSSProperties {
  return active ? { position: "sticky", right: 0, background: "var(--card)", boxShadow: "-8px 0 12px rgba(15,23,42,0.06)", zIndex: 1 } : {};
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</div>
          <div style={{ color, fontFamily: "monospace", fontSize: 22, fontWeight: 800 }}>{value}</div>
        </div>
        <div className="rounded-lg p-2" style={{ background: "var(--muted)", color }}>{icon}</div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <div className="text-sm" style={{ fontWeight: 800 }}>{title}</div>
        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{subtitle}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatusPill({ status, language }: { status: FreightFileStatus; language: AppLanguage }) {
  const meta = statusLabels[status];
  return <span className="rounded-full px-2 py-1 text-xs" style={{ background: meta.bg, color: meta.color, fontWeight: 800 }}>{pick(language, meta.zh, meta.en)}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs" style={{ color: "var(--muted-foreground)", fontWeight: 800 }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--input-background)",
  color: "var(--foreground)",
  fontSize: 13,
  padding: "8px 10px",
};
