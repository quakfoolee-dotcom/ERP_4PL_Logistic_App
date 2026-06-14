import { useEffect, useMemo, useState } from "react";
import { ArchiveRestore, ClipboardList, FileWarning, PackageCheck, ReceiptText, Ship, Warehouse } from "lucide-react";
import { toast } from "sonner";
import type { AppLanguage } from "../i18n";
import { pick } from "../i18n";
import type { AsnReceivingRecord, ConditionStatus, ReturnStatus } from "../domain/workflowReadiness";
import { getAsnBackboneTrace } from "../repositories/orderToCashAdapters";
import { useWorkflowSnapshot, workflowRepository } from "../repositories/workflowRepository";
import { BackboneTracePanel, useOrderToCashSnapshot } from "./BackboneTracePanel";

const returnStatuses: ReturnStatus[] = ["authorized", "received", "inspecting", "restock", "dispose", "closed"];
const conditionStatuses: ConditionStatus[] = ["unchecked", "good", "damaged", "mixed"];

const labelMap = {
  scheduled: { zh: "已预约", en: "Scheduled" },
  receiving: { zh: "收货中", en: "Receiving" },
  variance: { zh: "差异", en: "Variance" },
  putaway_ready: { zh: "待上架", en: "Put-away Ready" },
  closed: { zh: "已关闭", en: "Closed" },
  authorized: { zh: "已授权", en: "Authorized" },
  received: { zh: "已收货", en: "Received" },
  inspecting: { zh: "检查中", en: "Inspecting" },
  restock: { zh: "可入库", en: "Restock" },
  dispose: { zh: "处置", en: "Dispose" },
  open: { zh: "待处理", en: "Open" },
  approved: { zh: "已批准", en: "Approved" },
  billed: { zh: "已计费", en: "Billed" },
  not_started: { zh: "未开始", en: "Not Started" },
  passed: { zh: "通过", en: "Passed" },
  damaged: { zh: "破损", en: "Damaged" },
  unchecked: { zh: "未检查", en: "Unchecked" },
  good: { zh: "良好", en: "Good" },
  mixed: { zh: "混合", en: "Mixed" },
  not_recorded: { zh: "未入账", en: "Not Recorded" },
  recorded: { zh: "已入账", en: "Recorded" },
  not_required: { zh: "无需清关", en: "Not Required" },
  documents_needed: { zh: "缺文件", en: "Docs Needed" },
  submitted: { zh: "已提交", en: "Submitted" },
  released: { zh: "已放行", en: "Released" },
  hold: { zh: "暂扣", en: "Hold" },
} as const;

export function WmsWorkflowView({ language = "zh" }: { language?: AppLanguage }) {
  const workflow = useWorkflowSnapshot();
  const orderToCashSnapshot = useOrderToCashSnapshot();
  const { asns, returns, serviceEvents: events } = workflow;
  const [selectedAsnId, setSelectedAsnId] = useState(asns[0]?.id ?? "");
  const selectedAsn = asns.find((asn) => asn.id === selectedAsnId) ?? asns[0];
  const selectedTrace = selectedAsn ? getAsnBackboneTrace(selectedAsn.id, orderToCashSnapshot) : null;
  const [receivedDraft, setReceivedDraft] = useState("");
  const [conditionDraft, setConditionDraft] = useState<ConditionStatus>("unchecked");
  const [locationDraft, setLocationDraft] = useState("");
  const [inspectionNote, setInspectionNote] = useState("");

  useEffect(() => {
    if (!selectedAsn) return;
    setReceivedDraft(String(selectedAsn.receivedUnits || selectedAsn.expectedUnits));
    setConditionDraft(selectedAsn.conditionStatus);
    setLocationDraft(selectedAsn.putawayLocation === "Unassigned" ? suggestedLocation(selectedAsn) : selectedAsn.putawayLocation);
    setInspectionNote("");
  }, [selectedAsn?.id]);

  const stats = useMemo(() => ({
    expectedUnits: asns.reduce((sum, asn) => sum + asn.expectedUnits, 0),
    varianceCount: asns.filter((asn) => asn.status === "variance").length,
    returnsOpen: returns.filter((item) => item.status !== "closed").length,
    billableCad: events.filter((event) => event.status !== "billed").reduce((sum, event) => sum + event.quantity * event.rateCad, 0),
  }), [asns, returns, events]);

  function notify(result: { ok: boolean; message: string }) {
    toast[result.ok ? "success" : "error"](result.message);
  }

  function startReceiving(asn: AsnReceivingRecord) {
    notify(workflowRepository.startAsnReceiving(asn.id));
  }

  function verifyInspection(asn: AsnReceivingRecord) {
    const receivedUnits = Math.max(0, Math.round(Number(receivedDraft) || 0));
    notify(workflowRepository.verifyAsnInspection(asn.id, receivedUnits, conditionDraft, inspectionNote));
  }

  function recordInventory(asn: AsnReceivingRecord) {
    notify(workflowRepository.recordAsnInventory(asn.id, locationDraft));
  }

  function resolveVariance(asn: AsnReceivingRecord) {
    notify(workflowRepository.resolveAsnVariance(asn.id));
  }

  function updateReturn(id: string, status: ReturnStatus) {
    workflowRepository.updateReturn(id, (item) => ({ ...item, status, disposition: status === "restock" ? "restock" : status === "dispose" ? "dispose" : item.disposition }));
    toast.success(pick(language, "退货状态已更新", "Return status updated"));
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <Kpi icon={<ClipboardList size={17} />} label={pick(language, "预计收货件数", "Expected Receiving Units")} value={stats.expectedUnits.toLocaleString()} color="#1C64F2" />
        <Kpi icon={<PackageCheck size={17} />} label={pick(language, "收货差异", "Receiving Variances")} value={String(stats.varianceCount)} color="#DC2626" />
        <Kpi icon={<ArchiveRestore size={17} />} label={pick(language, "未结退货", "Open Returns")} value={String(stats.returnsOpen)} color="#B45309" />
        <Kpi icon={<ReceiptText size={17} />} label={pick(language, "待计费服务", "Unbilled Services")} value={`CAD $${stats.billableCad.toLocaleString()}`} color="#047857" />
      </div>

      <Panel
        title={pick(language, "入库到ASN流程", "Inbound to ASN Workflow")}
        subtitle={pick(language, "货运清关放行后，ASN才能开始仓库收货、检验和WMS入账", "After freight/customs release, ASN can move through receiving, inspection, and WMS inventory recording")}
      >
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
          {[
            [pick(language, "1 客户订舱/PO", "1 Customer Booking / PO"), pick(language, "客户提交PO、供应商和预计到货信息", "Customer submits PO, supplier, and inbound ETA")],
            [pick(language, "2 货运文件", "2 Freight File"), pick(language, "生成柜号、BOL/AWB、装箱单和运输节点", "Container, BOL/AWB, packing list, and freight milestones")],
            [pick(language, "3 清关/放行", "3 Customs / Release"), pick(language, "清关放行决定是否可收货", "Customs release decides receiving eligibility")],
            [pick(language, "4 收货预约/ASN", "4 Appointment / ASN"), pick(language, "仓库生成收货预约和ASN任务", "Warehouse creates receiving appointment and ASN task")],
            [pick(language, "5 收货上架", "5 Receive / Put-away"), pick(language, "检验数量和货况，记录库存到WMS库位", "Verify quantity and condition, then record inventory to WMS location")],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <div className="text-xs" style={{ color: "var(--primary)", fontWeight: 800 }}>{title}</div>
              <div className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{detail}</div>
            </div>
          ))}
        </div>
        <DataTable
          stickyLast
          headers={[pick(language, "订舱/PO", "Booking / PO"), pick(language, "货运文件", "Freight File"), pick(language, "清关状态", "Customs"), pick(language, "收货预约", "Appointment"), "ASN", pick(language, "仓库", "Warehouse"), pick(language, "下一步", "Next Step")]}
          rows={asns.map((asn) => {
            const ready = canStartReceiving(asn);
            return [
              <Mono key="booking">{asn.bookingRef}</Mono>,
              <MonoLink key="freight">{asn.freightFileId}</MonoLink>,
              <StatusBadge key="customs" value={asn.customsReleaseStatus} language={language} />,
              <Mono key="appointment">{asn.receivingAppointment}</Mono>,
              <MonoLink key="asn">{asn.id}</MonoLink>,
              asn.warehouse,
              <button key="open" onClick={() => setSelectedAsnId(asn.id)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs" style={{ background: ready ? "var(--primary)" : "var(--muted)", color: ready ? "white" : "var(--muted-foreground)", fontWeight: 800 }}>
                <Ship size={12} /> {ready ? asn.status === "scheduled" ? pick(language, "开始收货", "Start Receiving") : pick(language, "打开收货", "Open Receiving") : pick(language, "等待放行", "Awaiting Release")}
              </button>,
            ];
          })}
        />
      </Panel>

      {selectedAsn && (
        <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(520px, 1.4fr) minmax(420px, 1fr)" }}>
          <Panel
            title={pick(language, "仓库收货工作台", "Warehouse Receiving Workbench")}
            subtitle={pick(language, "按顺序完成收货、数量/状态检验、差异处理和WMS库存记录", "Run receiving, inspection, discrepancy handling, and WMS inventory recording in sequence")}
          >
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              <StepCard active={["scheduled", "receiving", "variance", "putaway_ready", "closed"].includes(selectedAsn.status)} title={pick(language, "1 收货", "1 Receive")} detail={selectedAsn.status === "scheduled" ? pick(language, "等待收货", "Waiting") : pick(language, "已开始", "Started")} />
              <StepCard active={selectedAsn.inspectionStatus !== "not_started"} title={pick(language, "2 检验", "2 Inspect")} detail={labelFor(selectedAsn.inspectionStatus, language)} warning={selectedAsn.inspectionStatus === "variance" || selectedAsn.inspectionStatus === "damaged"} />
              <StepCard active={selectedAsn.status === "putaway_ready" || selectedAsn.status === "closed"} title={pick(language, "3 上架", "3 Put-away")} detail={selectedAsn.putawayLocation} />
              <StepCard active={selectedAsn.inventoryStatus === "recorded"} title={pick(language, "4 入账", "4 Record")} detail={labelFor(selectedAsn.inventoryStatus, language)} />
            </div>

            <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <InfoRows rows={[
                [pick(language, "ASN", "ASN"), selectedAsn.id],
                [pick(language, "客户", "Customer"), selectedAsn.customer],
                [pick(language, "柜号", "Container"), selectedAsn.container],
                [pick(language, "仓库", "Warehouse"), selectedAsn.warehouse],
                [pick(language, "预计数量", "Expected Qty"), selectedAsn.expectedUnits.toLocaleString()],
                [pick(language, "实收数量", "Received Qty"), selectedAsn.receivedUnits.toLocaleString()],
                [pick(language, "差异", "Variance"), String(selectedAsn.varianceUnits)],
                [pick(language, "状态", "Status"), labelFor(selectedAsn.status, language)],
              ]} />
              <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
                <div className="mb-2 flex items-center gap-2 text-xs" style={{ fontWeight: 800 }}>
                  {selectedAsn.status === "variance" ? <FileWarning size={14} color="#DC2626" /> : <Warehouse size={14} color="#1C64F2" />}
                  {pick(language, "当前处理说明", "Current Handling Notes")}
                </div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{selectedAsn.note}</div>
                {selectedAsn.discrepancyReportId && (
                  <div className="mt-2 rounded-md px-2 py-1 text-xs" style={{ background: "#FEE2E2", color: "#B91C1C", fontWeight: 800 }}>
                    {pick(language, "差异报告", "Discrepancy Report")}: {selectedAsn.discrepancyReportId}
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <Panel
            title={pick(language, "收货操作", "Receiving Actions")}
            subtitle={pick(language, "动作会校验清关、检验、差异和库位要求", "Actions validate customs, inspection, variance, and location requirements")}
          >
            <div className="space-y-3">
              <button disabled={!canStartDockReceiving(selectedAsn)} onClick={() => startReceiving(selectedAsn)} className="w-full rounded-lg px-3 py-2 text-xs" style={{ background: canStartDockReceiving(selectedAsn) ? "var(--primary)" : "#CBD5E1", color: "white", fontWeight: 800 }}>
                {receivingStartLabel(selectedAsn, language)}
              </button>
              <Field label={pick(language, "实收数量", "Received Quantity")}>
                <input type="number" min={0} value={receivedDraft} onChange={(event) => setReceivedDraft(event.target.value)} style={inputStyle} />
              </Field>
              <Field label={pick(language, "货况", "Condition")}>
                <select value={conditionDraft} onChange={(event) => setConditionDraft(event.target.value as ConditionStatus)} style={inputStyle}>
                  {conditionStatuses.map((status) => <option key={status} value={status}>{labelFor(status, language)}</option>)}
                </select>
              </Field>
              <Field label={pick(language, "检验备注", "Inspection Note")}>
                <textarea value={inspectionNote} onChange={(event) => setInspectionNote(event.target.value)} placeholder={pick(language, "例如：外箱完好，短少12件", "Example: cartons good, short 12 units")} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />
              </Field>
              <button disabled={!canVerifyInspection(selectedAsn)} onClick={() => verifyInspection(selectedAsn)} className="w-full rounded-lg px-3 py-2 text-xs" style={{ background: canVerifyInspection(selectedAsn) ? "#0D9488" : "#94A3B8", color: "white", fontWeight: 800 }}>
                {pick(language, "检验并确认数量/状态", "Verify Qty / Condition")}
              </button>
              {selectedAsn.status === "variance" && (
                <button onClick={() => resolveVariance(selectedAsn)} className="w-full rounded-lg px-3 py-2 text-xs" style={{ background: "#F59E0B", color: "white", fontWeight: 800 }}>
                  {pick(language, "审核差异并允许上架", "Resolve Variance for Put-away")}
                </button>
              )}
              <Field label={pick(language, "WMS库位", "WMS Location")}>
                <input value={locationDraft} onChange={(event) => setLocationDraft(event.target.value)} style={inputStyle} />
              </Field>
              <button disabled={!canRecordInventory(selectedAsn)} onClick={() => recordInventory(selectedAsn)} className="w-full rounded-lg px-3 py-2 text-xs" style={{ background: canRecordInventory(selectedAsn) ? "#10B981" : "#94A3B8", color: "white", fontWeight: 800 }}>
                {pick(language, "记录库存到WMS", "Record Inventory in WMS")}
              </button>
              <BackboneTracePanel language={language} trace={selectedTrace} />
            </div>
          </Panel>
        </div>
      )}

      <Panel
        title={pick(language, "ASN收货与上架", "ASN Receiving & Put-away")}
        subtitle={pick(language, "状态由收货动作驱动，不再通过下拉框直接跳转", "Status is driven by receiving actions instead of direct dropdown jumps")}
      >
        <DataTable
          stickyLast
          headers={[pick(language, "ASN", "ASN"), pick(language, "客户", "Customer"), pick(language, "柜号", "Container"), pick(language, "仓库", "Warehouse"), "ETA", pick(language, "预计/实收/差异", "Expected / Received / Variance"), pick(language, "货况", "Condition"), pick(language, "库存", "Inventory"), pick(language, "状态", "Status"), pick(language, "操作", "Action")]}
          rows={asns.map((asn) => {
            const ready = canStartReceiving(asn);
            return [
              <MonoLink key="id">{asn.id}</MonoLink>,
              asn.customer,
              <Mono key="container">{asn.container}</Mono>,
              asn.warehouse,
              <Mono key="eta">{asn.eta}</Mono>,
              <Mono key="units">{asn.expectedUnits.toLocaleString()} / {asn.receivedUnits.toLocaleString()} / {asn.varianceUnits}</Mono>,
              <Muted key="condition">{labelFor(asn.conditionStatus, language)}</Muted>,
              <Muted key="inventory">{labelFor(asn.inventoryStatus, language)} · {asn.putawayLocation}</Muted>,
              <StatusBadge key="status" value={asn.status} language={language} />,
              <button
                key="open"
                disabled={!ready}
                onClick={() => setSelectedAsnId(asn.id)}
                className="rounded-lg px-3 py-1.5 text-xs"
                style={{
                  background: !ready ? "#E2E8F0" : selectedAsnId === asn.id ? "var(--primary)" : "var(--muted)",
                  color: !ready ? "#64748B" : selectedAsnId === asn.id ? "white" : "var(--foreground)",
                  cursor: ready ? "pointer" : "not-allowed",
                  fontWeight: 800,
                }}
              >
                {ready ? pick(language, "打开", "Open") : pick(language, "等待放行", "Awaiting Release")}
              </button>,
            ];
          })}
        />
      </Panel>

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Panel title={pick(language, "退货授权与处置", "Return Authorization & Disposition")} subtitle={pick(language, "连接RMA、检查、重新入库、重贴标或报废", "Connects RMA, inspection, restock, relabel, or disposal")}>
          <DataTable
            minWidth={720}
            headers={[pick(language, "RMA", "RMA"), pick(language, "客户", "Customer"), pick(language, "原订单", "Original Order"), "SKU", pick(language, "数量", "Units"), pick(language, "原因", "Reason"), pick(language, "状态", "Status")]}
            rows={returns.map((item) => [
              <MonoLink key="id">{item.id}</MonoLink>,
              item.customer,
              <Mono key="order">{item.originalOrder}</Mono>,
              item.sku,
              <Mono key="units">{item.units}</Mono>,
              <Muted key="reason">{item.reason}</Muted>,
              <StatusSelect key="status" value={item.status} options={returnStatuses} language={language} onChange={(status) => updateReturn(item.id, status)} />,
            ])}
          />
        </Panel>

        <Panel title={pick(language, "可计费服务事件", "Billable Service Events")} subtitle={pick(language, "批准服务会生成或更新财务计费队列", "Approving a service creates or updates the Finance Billing Queue")}>
          <DataTable
            stickyLast
            minWidth={780}
            headers={[pick(language, "事件", "Event"), pick(language, "来源", "Source"), pick(language, "客户", "Customer"), pick(language, "服务", "Service"), pick(language, "数量", "Qty"), pick(language, "费率", "Rate"), pick(language, "金额", "Amount"), pick(language, "状态", "Status"), pick(language, "操作", "Action")]}
            rows={events.map((event) => [
              <MonoLink key="id">{event.id}</MonoLink>,
              <Mono key="source">{event.source}</Mono>,
              event.customer,
              event.service,
              <Mono key="qty">{event.quantity}</Mono>,
              <Mono key="rate">CAD ${event.rateCad}</Mono>,
              <Mono key="amount">CAD ${(event.quantity * event.rateCad).toLocaleString()}</Mono>,
              <StatusBadge key="status" value={event.status} language={language} />,
              <div key="actions" className="flex gap-2">
                <SmallButton label={pick(language, "批准计费", "Approve")} onClick={() => notify(workflowRepository.approveServiceEventForBilling(event.id))} />
                <SmallButton label={pick(language, "标记已计费", "Billed")} muted onClick={() => notify(workflowRepository.markServiceEventBilled(event.id))} />
              </div>,
            ])}
          />
        </Panel>
      </div>
    </div>
  );
}

function labelFor(value: string, language: AppLanguage) {
  const item = labelMap[value as keyof typeof labelMap];
  return item ? pick(language, item.zh, item.en) : value;
}

function suggestedLocation(asn: AsnReceivingRecord) {
  if (asn.status === "variance") return `${asn.warehouse.includes("#10") ? "WB10" : "WB25"}-HOLD-A01`;
  if (asn.container.includes("HMMU")) return "WB10-BIN-B04";
  if (asn.container.includes("DRYU")) return "WB25-HOLD-A01";
  return `${asn.warehouse.includes("#10") ? "WB10" : "WB25"}-RCV-A01`;
}

function canStartReceiving(asn: AsnReceivingRecord) {
  return ["released", "not_required"].includes(asn.customsReleaseStatus);
}

function canStartDockReceiving(asn: AsnReceivingRecord) {
  return canStartReceiving(asn) && asn.status === "scheduled";
}

function canVerifyInspection(asn: AsnReceivingRecord) {
  return canStartReceiving(asn) && asn.status === "receiving";
}

function canRecordInventory(asn: AsnReceivingRecord) {
  return asn.status === "putaway_ready" && asn.inspectionStatus === "passed";
}

function receivingStartLabel(asn: AsnReceivingRecord, language: AppLanguage) {
  if (!canStartReceiving(asn)) return pick(language, "等待清关放行", "Awaiting Customs Release");
  if (asn.status === "scheduled") return pick(language, "开始收货", "Start Receiving");
  if (asn.status === "receiving") return pick(language, "收货进行中", "Receiving Started");
  if (asn.status === "closed") return pick(language, "库存已入账", "Inventory Recorded");
  return pick(language, "已进入下一步", "Moved to Next Step");
}

function StatusSelect<T extends string>({ value, options, language, onChange }: { value: T; options: T[]; language: AppLanguage; onChange: (value: T) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as T)} style={selectStyle}>
      {options.map((option) => <option key={option} value={option}>{labelFor(option, language)}</option>)}
    </select>
  );
}

function StatusBadge({ value, language }: { value: string; language: AppLanguage }) {
  const isBad = ["variance", "damaged", "hold", "documents_needed", "blocked"].includes(value);
  const isGood = ["closed", "recorded", "released", "approved", "billed", "passed", "good"].includes(value);
  return (
    <span className="rounded-full px-2 py-1" style={{ background: isBad ? "#FEE2E2" : isGood ? "#D1FAE5" : "#E0ECFF", color: isBad ? "#B91C1C" : isGood ? "#047857" : "#1D4ED8", fontSize: 11, fontWeight: 800 }}>
      {labelFor(value, language)}
    </span>
  );
}

function SmallButton({ label, onClick, muted = false }: { label: string; onClick: () => void; muted?: boolean }) {
  return <button onClick={onClick} className="rounded-lg px-3 py-1.5 text-xs" style={{ background: muted ? "var(--muted)" : "var(--primary)", color: muted ? "var(--foreground)" : "white", fontWeight: 800 }}>{label}</button>;
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between">
        <div><div className="mb-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</div><div style={{ color, fontFamily: "monospace", fontSize: 22, fontWeight: 800 }}>{value}</div></div>
        <div className="rounded-lg p-2" style={{ background: "var(--muted)", color }}>{icon}</div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, actions, children }: { title: string; subtitle: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <div><div className="text-sm" style={{ fontWeight: 800 }}>{title}</div><div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{subtitle}</div></div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StepCard({ title, detail, active, warning = false }: { title: string; detail: string; active: boolean; warning?: boolean }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: active ? warning ? "#FCA5A5" : "#93C5FD" : "var(--border)", background: active ? warning ? "#FEF2F2" : "#EFF6FF" : "var(--card)" }}>
      <div className="text-xs" style={{ color: warning ? "#B91C1C" : active ? "#1D4ED8" : "var(--muted-foreground)", fontWeight: 800 }}>{title}</div>
      <div className="mt-1 truncate" style={{ color: "var(--foreground)", fontSize: 11, fontWeight: 700 }}>{detail}</div>
    </div>
  );
}

function InfoRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 border-b py-2 text-xs last:border-b-0" style={{ borderColor: "var(--border)" }}>
          <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
          <span style={{ fontFamily: value.match(/^(ASN|CAD|\d|WB|DR-)/) ? "monospace" : "inherit", fontWeight: 800, textAlign: "right" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs" style={{ color: "var(--muted-foreground)", fontWeight: 800 }}>{label}</div>
      {children}
    </label>
  );
}

function DataTable({ headers, rows, minWidth = 980, stickyLast = false }: { headers: string[]; rows: React.ReactNode[][]; minWidth?: number; stickyLast?: boolean }) {
  return (
    <div className="mt-4" style={{ overflowX: "auto" }}>
      <table className="w-full" style={{ minWidth }}>
        <thead>
          <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
            {headers.map((header, index) => <th key={header} className="px-3 py-2.5 text-left text-xs" style={{ ...stickyStyle(stickyLast && index === headers.length - 1), color: "var(--muted-foreground)", fontWeight: 700 }}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b hover:bg-muted/30" style={{ borderColor: "var(--border)" }}>
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-3 text-xs" style={stickyStyle(stickyLast && cellIndex === row.length - 1)}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function stickyStyle(active: boolean): React.CSSProperties {
  return active ? { position: "sticky", right: 0, background: "var(--card)", boxShadow: "-8px 0 12px rgba(15,23,42,0.06)", zIndex: 1 } : {};
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{children}</span>;
}

function MonoLink({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 800 }}>{children}</span>;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "var(--muted-foreground)" }}>{children}</span>;
}

const selectStyle: React.CSSProperties = {
  minWidth: 130,
  border: "1px solid var(--border)",
  borderRadius: 999,
  background: "var(--input-background)",
  color: "var(--foreground)",
  fontSize: 12,
  fontWeight: 700,
  padding: "5px 10px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--input-background)",
  color: "var(--foreground)",
  fontSize: 13,
  padding: "8px 10px",
};
