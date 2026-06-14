import { useMemo, useState } from "react";
import { Banknote, CheckCircle2, FileWarning, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { AppLanguage } from "../i18n";
import { pick } from "../i18n";
import type { AccountingSyncStatus, BillingQueueStatus } from "../domain/workflowReadiness";
import { getBillingBackboneTrace } from "../repositories/orderToCashAdapters";
import { useWorkflowSnapshot, workflowRepository } from "../repositories/workflowRepository";
import { useActionDialog } from "./ActionDialog";
import { BackboneTracePanel, useOrderToCashSnapshot } from "./BackboneTracePanel";

const labels = {
  ready: { zh: "待开票", en: "Ready" },
  needs_approval: { zh: "需审批", en: "Needs Approval" },
  approved: { zh: "已审批", en: "Approved" },
  invoiced: { zh: "已开票", en: "Invoiced" },
  blocked: { zh: "阻塞", en: "Blocked" },
  queued: { zh: "排队", en: "Queued" },
  ready_to_sync: { zh: "待同步", en: "Ready to Sync" },
  synced: { zh: "已同步", en: "Synced" },
  failed: { zh: "失败", en: "Failed" },
} as const;

export function FinanceHubWorkflowView({ language = "zh" }: { language?: AppLanguage }) {
  const workflow = useWorkflowSnapshot();
  const orderToCashSnapshot = useOrderToCashSnapshot();
  const { promptDialog, ActionDialog } = useActionDialog();
  const billingQueue = workflow.billingQueue;
  const syncRows = workflow.accountingSync;
  const auditTrail = workflow.auditTrail.slice(0, 8);
  const [selectedBillingId, setSelectedBillingId] = useState(billingQueue[0]?.id ?? "");
  const defaultTraceableBilling = billingQueue.find((item) => getBillingBackboneTrace(item.id, orderToCashSnapshot)) ?? billingQueue[0];
  const selectedBilling = billingQueue.find((item) => item.id === selectedBillingId && getBillingBackboneTrace(item.id, orderToCashSnapshot)) ?? defaultTraceableBilling;
  const selectedTrace = selectedBilling ? getBillingBackboneTrace(selectedBilling.id, orderToCashSnapshot) : null;

  const stats = useMemo(() => ({
    queueCad: billingQueue.reduce((sum, item) => sum + item.subtotalCad + item.taxCad, 0),
    approval: billingQueue.filter((item) => item.status === "needs_approval").length,
    blocked: billingQueue.filter((item) => item.status === "blocked").length,
    syncReady: syncRows.filter((item) => item.status === "ready_to_sync").length,
  }), [billingQueue, syncRows]);

  function notify(result: { ok: boolean; message: string }) {
    toast[result.ok ? "success" : "error"](result.message);
  }

  function updateSync(id: string, status: AccountingSyncStatus) {
    notify(workflowRepository.updateAccountingSyncStatus(id, status));
  }

  async function setSyncReference(id: string, currentReference?: string) {
    const reference = await promptDialog(pick(language, "QuickBooks\u53c2\u8003\u53f7", "QuickBooks Reference"), {
      message: pick(language, "\u8f93\u5165\u5916\u90e8\u4f1a\u8ba1\u7cfb\u7edf\u53c2\u8003\u53f7\u3002", "Enter the external accounting reference."),
      defaultValue: currentReference ?? "",
    });
    if (reference === null) return;
    notify(workflowRepository.updateAccountingSyncReference(id, reference));
  }

  function approveAllReady() {
    workflowRepository.approveBillingQueueItems();
    toast.success(pick(language, "所有待审批项目已批准", "All approval-needed items approved"));
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <ActionDialog />
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <Kpi icon={<Banknote size={17} />} label={pick(language, "队列金额", "Queue Amount")} value={`CAD $${stats.queueCad.toLocaleString()}`} color="#1C64F2" />
        <Kpi icon={<CheckCircle2 size={17} />} label={pick(language, "需审批", "Needs Approval")} value={String(stats.approval)} color="#B45309" />
        <Kpi icon={<FileWarning size={17} />} label={pick(language, "阻塞", "Blocked")} value={String(stats.blocked)} color="#DC2626" />
        <Kpi icon={<RefreshCw size={17} />} label={pick(language, "待同步", "Ready to Sync")} value={String(stats.syncReady)} color="#6D28D9" />
      </div>

      <Panel title={pick(language, "财务计费队列", "Finance Billing Queue")} subtitle={pick(language, "由运输POD、仓库服务、清关和退货事件生成", "Generated from transport POD, warehouse services, customs, and return events")} actions={<button onClick={approveAllReady} className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--primary)", color: "white", fontWeight: 800 }}>{pick(language, "批量审批", "Batch Approve")}</button>}>
        <div style={{ overflowX: "auto" }}>
          <table className="w-full" style={{ minWidth: 1080 }}>
            <thead>
              <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                {[pick(language, "队列号", "Queue #"), pick(language, "客户", "Customer"), pick(language, "来源", "Source"), pick(language, "小计", "Subtotal"), "HST", pick(language, "合计", "Total"), pick(language, "审批人", "Owner"), pick(language, "状态", "Status"), pick(language, "备注", "Note"), pick(language, "操作", "Action")].map((header, index) => <th key={header} className="px-3 py-2.5 text-left text-xs" style={{ ...stickyStyle(index === 9), color: "var(--muted-foreground)", fontWeight: 700 }}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {billingQueue.map((item) => (
                <tr key={item.id} onClick={() => setSelectedBillingId(item.id)} className="cursor-pointer border-b hover:bg-muted/30" style={{ borderColor: "var(--border)", background: selectedBilling?.id === item.id ? "rgba(28,100,242,0.05)" : "var(--card)" }}>
                  <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 800 }}>{item.id}</td>
                  <td className="px-3 py-3 text-xs" style={{ fontWeight: 700 }}>{item.customer}</td>
                  <td className="px-3 py-3 text-xs">{item.sourceType} / <span style={{ fontFamily: "monospace" }}>{item.sourceId}</span></td>
                  <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace" }}>CAD ${item.subtotalCad.toLocaleString()}</td>
                  <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace" }}>CAD ${item.taxCad.toLocaleString()}</td>
                  <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace", fontWeight: 800 }}>CAD ${(item.subtotalCad + item.taxCad).toLocaleString()}</td>
                  <td className="px-3 py-3 text-xs">{item.approvalOwner}</td>
                  <td className="px-3 py-3 text-xs"><StatusPill value={item.status} language={language} /></td>
                  <td className="px-3 py-3 text-xs" style={{ color: "var(--muted-foreground)", maxWidth: 260 }}>{item.note}</td>
                  <td className="px-3 py-3 text-xs" style={stickyStyle(true)}>
                    <BillingActions status={item.status} onApprove={() => notify(workflowRepository.approveBillingQueue(item.id))} onInvoice={() => notify(workflowRepository.issueInvoiceFromBilling(item.id))} onBlock={() => notify(workflowRepository.markBillingBlocked(item.id))} language={language} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <BackboneTracePanel language={language} trace={selectedTrace} />

      <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(620px, 1.4fr) minmax(360px, 0.8fr)" }}>
        <Panel title={pick(language, "会计同步暂存区", "Accounting Sync Staging")} subtitle={pick(language, "QuickBooks、银行、工资和BI同步状态暂存", "Staging for QuickBooks, bank, payroll, and BI sync statuses")}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ minWidth: 1080 }}>
              <thead><tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>{[pick(language, "\u540c\u6b65\u53f7", "Sync #"), pick(language, "\u7cfb\u7edf", "System"), pick(language, "\u5bf9\u8c61", "Object"), pick(language, "\u91d1\u989d", "Amount"), pick(language, "\u53c2\u8003\u53f7", "Reference"), pick(language, "\u4e0a\u6b21\u5c1d\u8bd5", "Last Attempt"), pick(language, "\u72b6\u6001", "Status"), pick(language, "\u95ee\u9898", "Issue"), pick(language, "\u64cd\u4f5c", "Action")].map((header, index) => <th key={header} className="px-3 py-2.5 text-left text-xs" style={{ ...stickyStyle(index === 8), color: "var(--muted-foreground)", fontWeight: 700 }}>{header}</th>)}</tr></thead>
              <tbody>{syncRows.map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/30" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                  <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 800 }}>{item.id}</td>
                  <td className="px-3 py-3 text-xs" style={{ fontWeight: 700 }}>{item.system}</td>
                  <td className="px-3 py-3 text-xs">{item.objectType} / <span style={{ fontFamily: "monospace" }}>{item.objectId}</span></td>
                  <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace" }}>{item.amountCad ? `CAD $${item.amountCad.toLocaleString()}` : "-"}</td>
                  <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace", color: item.externalReference ? "var(--foreground)" : "var(--muted-foreground)" }}>{item.externalReference ?? "-"}</td>
                  <td className="px-3 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>{item.lastAttempt}</td>
                  <td className="px-3 py-3 text-xs"><StatusPill value={item.status} language={language} /></td>
                  <td className="px-3 py-3 text-xs" style={{ color: item.errorMessage ? "#B91C1C" : "var(--muted-foreground)", maxWidth: 220 }}>{item.errorMessage ?? "-"}</td>
                  <td className="px-3 py-3 text-xs" style={stickyStyle(true)}>
                    <SyncActions
                      status={item.status}
                      language={language}
                      onSynced={() => updateSync(item.id, "synced")}
                      onFailed={() => updateSync(item.id, "failed")}
                      onRetry={() => updateSync(item.id, "ready_to_sync")}
                      onReference={() => setSyncReference(item.id, item.externalReference)}
                    />
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Panel>

        <Panel title={pick(language, "变更审计", "Change Audit")} subtitle={pick(language, "记录关键工作流状态变化", "Tracks key workflow status changes")}>
          <div className="space-y-2">
            {auditTrail.length === 0 && <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{pick(language, "暂无审计记录", "No audit entries yet")}</div>}
            {auditTrail.map((event) => (
              <div key={event.id} className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <strong>{event.action}</strong>
                  <span style={{ color: "var(--muted-foreground)", fontFamily: "monospace" }}>{event.at}</span>
                </div>
                <div className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{event.module} / {event.entityId}</div>
                <div className="mt-1 text-xs">{event.note}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SyncActions({
  status,
  onSynced,
  onFailed,
  onRetry,
  onReference,
  language,
}: {
  status: AccountingSyncStatus;
  onSynced: () => void;
  onFailed: () => void;
  onRetry: () => void;
  onReference: () => void;
  language: AppLanguage;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "synced" && <Action label={pick(language, "\u6807\u8bb0\u540c\u6b65", "Mark Synced")} onClick={onSynced} />}
      {status !== "failed" && <Action muted label={pick(language, "\u6807\u8bb0\u5931\u8d25", "Fail")} onClick={onFailed} />}
      {status === "failed" && <Action label={pick(language, "\u91cd\u8bd5", "Retry")} onClick={onRetry} />}
      <Action muted label={pick(language, "\u53c2\u8003\u53f7", "QB Ref")} onClick={onReference} />
    </div>
  );
}

function BillingActions({ status, onApprove, onInvoice, onBlock, language }: { status: BillingQueueStatus; onApprove: () => void; onInvoice: () => void; onBlock: () => void; language: AppLanguage }) {
  return (
    <div className="flex gap-2">
      {status !== "approved" && status !== "invoiced" && <Action label={pick(language, "审批", "Approve")} onClick={onApprove} />}
      {status !== "invoiced" && <Action label={pick(language, "开票", "Invoice")} onClick={onInvoice} />}
      {status !== "blocked" && <Action muted label={pick(language, "阻塞", "Block")} onClick={onBlock} />}
    </div>
  );
}

function Action({ label, onClick, muted = false }: { label: string; onClick: () => void; muted?: boolean }) {
  return <button onClick={onClick} className="rounded-lg px-3 py-1.5 text-xs" style={{ background: muted ? "var(--muted)" : "var(--primary)", color: muted ? "var(--foreground)" : "white", fontWeight: 800, whiteSpace: "nowrap" }}>{label}</button>;
}

function StatusPill({ value, language }: { value: BillingQueueStatus | AccountingSyncStatus; language: AppLanguage }) {
  const item = labels[value];
  const isBad = value === "blocked" || value === "failed";
  const isGood = value === "approved" || value === "invoiced" || value === "synced";
  return <span className="rounded-full px-2 py-1 text-xs" style={{ background: isBad ? "#FEE2E2" : isGood ? "#D1FAE5" : "#E0ECFF", color: isBad ? "#B91C1C" : isGood ? "#047857" : "#1D4ED8", fontWeight: 800 }}>{pick(language, item.zh, item.en)}</span>;
}

function stickyStyle(active: boolean): React.CSSProperties {
  return active ? { position: "sticky", right: 0, background: "var(--card)", boxShadow: "-8px 0 12px rgba(15,23,42,0.06)", zIndex: 1 } : {};
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return <div className="rounded-xl border bg-card p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}><div className="flex items-center justify-between"><div><div className="mb-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</div><div style={{ color, fontFamily: "monospace", fontSize: 22, fontWeight: 800 }}>{value}</div></div><div className="rounded-lg p-2" style={{ background: "var(--muted)", color }}>{icon}</div></div></div>;
}

function Panel({ title, subtitle, actions, children }: { title: string; subtitle: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border bg-card" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}><div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}><div><div className="text-sm" style={{ fontWeight: 800 }}>{title}</div><div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{subtitle}</div></div>{actions}</div><div className="p-4">{children}</div></div>;
}
