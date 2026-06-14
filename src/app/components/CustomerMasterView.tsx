import { useMemo, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, MessageSquare, Plus, Users, X } from "lucide-react";
import { toast } from "sonner";
import type { AppLanguage } from "../i18n";
import { pick } from "../i18n";
import type { CustomerCaseStatus, CustomerProfileRecord, CustomerStage } from "../domain/businessReadiness";
import type { Customer, InquirySource, ServiceType } from "../domain/orderToCashModels";
import { getCustomerBackboneTrace } from "../repositories/orderToCashAdapters";
import { orderToCashRepository, type CreateCustomerLeadInput, type CustomerOnboardingTask } from "../repositories/orderToCashRepository";
import { getCustomerReadinessProjection } from "../repositories/projections";
import { workflowRepository } from "../repositories/workflowRepository";
import { BackboneTracePanel, useOrderToCashSnapshot } from "./BackboneTracePanel";

const stageOptions: CustomerStage[] = ["lead", "qualified", "quoted", "onboarding", "active"];
const caseStatuses: CustomerCaseStatus[] = ["open", "waiting_customer", "resolved"];

const stageLabels: Record<CustomerStage, { zh: string; en: string; color: string; bg: string }> = {
  lead: { zh: "线索", en: "Lead", color: "#6D28D9", bg: "#EDE9FE" },
  qualified: { zh: "已筛选", en: "Qualified", color: "#1D4ED8", bg: "#DBEAFE" },
  quoted: { zh: "已报价", en: "Quoted", color: "#B45309", bg: "#FEF3C7" },
  onboarding: { zh: "导入中", en: "Onboarding", color: "#0F766E", bg: "#CCFBF1" },
  active: { zh: "活跃", en: "Active", color: "#047857", bg: "#D1FAE5" },
};

const caseLabels: Record<CustomerCaseStatus, { zh: string; en: string }> = {
  open: { zh: "处理中", en: "Open" },
  waiting_customer: { zh: "等客户", en: "Waiting Customer" },
  resolved: { zh: "已解决", en: "Resolved" },
};

export function CustomerMasterView({
  language = "zh",
  onPrepareRateCard,
  onOperationalBookingCreated,
}: {
  language?: AppLanguage;
  onPrepareRateCard?: (customer: CustomerProfileRecord) => void;
  onOperationalBookingCreated?: () => void;
}) {
  const orderToCashSnapshot = useOrderToCashSnapshot();
  const projection = getCustomerReadinessProjection();
  const [customers, setCustomers] = useState(projection.customers);
  const [cases, setCases] = useState(projection.cases);
  const [selectedId, setSelectedId] = useState(customers[0]?.id ?? "");
  const [showNewLead, setShowNewLead] = useState(false);
  const selected = customers.find((customer) => customer.id === selectedId) ?? customers[0];
  const selectedTrace = selected ? getCustomerBackboneTrace(selected.id, orderToCashSnapshot) ?? getCustomerBackboneTrace(selected.name, orderToCashSnapshot) : null;
  const selectedBackboneCustomer = selected
    ? orderToCashSnapshot.customers.find((customer) => customer.customerId === selected.id || customer.id === selected.id || customer.name === selected.name)
    : undefined;

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter((customer) => customer.stage === "active").length,
    onboarding: customers.filter((customer) => customer.stage === "onboarding").length,
    openCases: cases.filter((item) => item.status !== "resolved").length,
  }), [customers, cases]);

  function updateCustomer(id: string, patch: Partial<CustomerProfileRecord>) {
    setCustomers((current) => current.map((customer) => customer.id === id ? { ...customer, ...patch } : customer));
    toast.success(pick(language, "客户资料已更新", "Customer profile updated"));
  }

  function updateCase(id: string, status: CustomerCaseStatus) {
    setCases((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    toast.success(pick(language, "客户工单状态已更新", "Customer case status updated"));
  }

  function addSetupTask() {
    if (!selected || !selectedBackboneCustomer) return;
    const nextTask = (["wms_customer", "billing_profile", "communication_setup", "operating_rules"] as CustomerOnboardingTask[])
      .find((task) => !isOnboardingTaskDone(task, selectedBackboneCustomer, selectedTrace));
    if (!nextTask) {
      toast.success(pick(language, "导入任务已全部完成", "All onboarding tasks are complete"));
      return;
    }
    completeOnboardingTask(nextTask);
  }

  function refreshProjection(focusId = selectedId) {
    const nextProjection = getCustomerReadinessProjection();
    setCustomers(nextProjection.customers);
    setCases(nextProjection.cases);
    if (focusId) setSelectedId(focusId);
  }

  function createLead(input: CreateCustomerLeadInput) {
    const customer = orderToCashRepository.createCustomerLead(input);
    refreshProjection(customer.customerId);
    setShowNewLead(false);
    toast.success(pick(language, "线索和客户资料已创建", "Lead and customer profile created"));
  }

  function acceptQuoteAndStartOnboarding() {
    if (!selected) return;
    const agreement = orderToCashRepository.acceptCustomerQuotation(selected.id);
    if (!agreement) {
      toast.error(pick(language, "请先准备并保存报价", "Prepare and save a quote first"));
      return;
    }
    refreshProjection(selected.id);
    toast.success(pick(language, "报价已接受，客户导入已开始", "Quote accepted and onboarding started"));
  }

  function completeOnboardingTask(task: CustomerOnboardingTask) {
    if (!selected) return;
    const customer = orderToCashRepository.completeCustomerOnboardingTask(selected.id, task);
    if (!customer) {
      toast.error(pick(language, "请先接受报价并开始导入", "Accept the quote and start onboarding first"));
      return;
    }
    refreshProjection(selected.id);
    toast.success(pick(language, "导入任务已完成", "Onboarding task completed"));
  }

  function migrateSelectedCustomerToBackbone() {
    if (!selected) return null;
    const migrated = orderToCashRepository.createCustomerLead({
      companyName: selected.name,
      contactPerson: selected.owner || "Ops Contact",
      contactEmail: "",
      contactPhone: "",
      source: "referral",
      inquiryChannel: "email",
      serviceTypes: serviceTypesFromProfile(selected.services),
      owner: selected.owner || "Ops Team",
      billingTerms: selected.creditLimitCad > 0 ? "Net terms - migrated customer" : "Prepaid / migrated customer",
      requirementsSummary: selected.instructions || `Existing customer ${selected.name} migrated from Customer Master for operational booking.`,
    });
    orderToCashRepository.createCustomerQuotation({
      customerId: migrated.customerId,
      rateSheetVersion: selected.rateCard || "Migrated Rate Card",
      quotedAmountCad: 0,
      quoteNote: "Migrated existing customer quote/rate setup.",
      owner: selected.owner,
    });
    orderToCashRepository.acceptCustomerQuotation(migrated.customerId);
    (["wms_customer", "billing_profile", "communication_setup", "operating_rules"] as CustomerOnboardingTask[])
      .forEach((task) => orderToCashRepository.completeCustomerOnboardingTask(migrated.customerId, task));
    return migrated;
  }

  function createFirstOperationalBooking() {
    if (!selected) {
      toast.error(pick(language, "请选择客户", "Select a customer first"));
      return;
    }
    const bookingCustomer = selectedBackboneCustomer ?? migrateSelectedCustomerToBackbone();
    if (!bookingCustomer) {
      toast.error(pick(language, "无法创建客户资料", "Could not create customer profile"));
      return;
    }
    if (bookingCustomer.agreementStatus !== "completed") {
      toast.error(pick(language, "请先接受报价并完成服务协议", "Accept the quote and complete the service agreement first"));
      return;
    }
    const booking = orderToCashRepository.createCustomerOperationalBooking({
      customerId: bookingCustomer.customerId,
      expectedQuantity: 1000,
      warehouse: "Whybank #25",
    });
    if (!booking) {
      toast.error(pick(language, "无法创建客户预订", "Could not create customer booking"));
      return;
    }
    workflowRepository.refreshFromOrderToCash(`Customer booking ${booking.shipment.poNumber} created from Customer Master.`);
    refreshProjection(bookingCustomer.customerId);
    toast.success(pick(language, "客户预订已创建，并已推送到货运和ASN", "Customer booking created and pushed to freight and ASN"));
    onOperationalBookingCreated?.();
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {showNewLead && (
        <NewLeadModal
          language={language}
          onClose={() => setShowNewLead(false)}
          onCreate={createLead}
        />
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <Kpi icon={<Users size={17} />} label={pick(language, "客户/线索", "Customers / Leads")} value={String(stats.total)} color="#1C64F2" />
        <Kpi icon={<CheckCircle2 size={17} />} label={pick(language, "活跃客户", "Active Customers")} value={String(stats.active)} color="#047857" />
        <Kpi icon={<BriefcaseBusiness size={17} />} label={pick(language, "导入中", "Onboarding")} value={String(stats.onboarding)} color="#B45309" />
        <Kpi icon={<MessageSquare size={17} />} label={pick(language, "未结工单", "Open Cases")} value={String(stats.openCases)} color="#DC2626" />
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(360px, 1.2fr) minmax(420px, 1.8fr)" }}>
        <div className="flex justify-end" style={{ gridColumn: "1 / -1" }}>
          <button
            onClick={() => setShowNewLead(true)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs"
            style={{ background: "var(--primary)", color: "white", fontWeight: 800 }}
          >
            <Plus size={13} />
            {pick(language, "新建线索", "New Lead")}
          </button>
        </div>
        <Panel title={pick(language, "客户主数据", "Customer Master")} subtitle={pick(language, "线索、阶段、服务、费率卡和信用额度", "Leads, stage, services, rate card, and credit limit")}>
          <div className="space-y-2">
            {customers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => setSelectedId(customer.id)}
                className="w-full rounded-lg border p-3 text-left transition-colors"
                style={{
                  borderColor: selectedId === customer.id ? "var(--primary)" : "var(--border)",
                  background: selectedId === customer.id ? "rgba(28,100,242,0.06)" : "var(--card)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm" style={{ fontWeight: 800 }}>{customer.name}</div>
                    <div className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{customer.services.join(" / ")}</div>
                  </div>
                  <StagePill stage={customer.stage} language={language} />
                </div>
                <div className="mt-3 h-1.5 rounded-full" style={{ background: "var(--muted)" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${(customer.onboardingDone / customer.onboardingTotal) * 100}%`, background: customer.onboardingDone === customer.onboardingTotal ? "#10B981" : "var(--primary)" }} />
                </div>
              </button>
            ))}
          </div>
        </Panel>

        {selected && (
          <Panel
            title={selected.name}
            subtitle={pick(language, "客户设置、服务说明和可执行更新", "Customer setup, service instructions, and actionable updates")}
            actions={
              <div className="flex gap-2">
                <button onClick={addSetupTask} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--primary)", color: "white", fontWeight: 700 }}><Plus size={13} />{pick(language, "完成一项导入", "Complete Setup Item")}</button>
                <button onClick={() => onPrepareRateCard?.(selected)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)", color: "var(--foreground)", fontWeight: 800 }}>{pick(language, "准备报价", "Prepare Quote")}</button>
                <button onClick={acceptQuoteAndStartOnboarding} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: selected.stage === "quoted" ? "var(--primary)" : "var(--border)", background: selected.stage === "quoted" ? "rgba(28,100,242,0.08)" : "var(--card)", color: selected.stage === "quoted" ? "var(--primary)" : "var(--muted-foreground)", fontWeight: 800 }}>{pick(language, "接受报价", "Accept Quote")}</button>
                <button onClick={createFirstOperationalBooking} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: selected.stage === "active" || selected.stage === "onboarding" ? "var(--primary)" : "var(--border)", background: "var(--card)", color: "var(--foreground)", fontWeight: 800 }}>{pick(language, "创建首票预订", "Create First Booking")}</button>
              </div>
            }
          >
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Field label={pick(language, "客户阶段", "Customer Stage")}>
                <select value={selected.stage} onChange={(event) => updateCustomer(selected.id, { stage: event.target.value as CustomerStage })} style={inputStyle}>
                  {stageOptions.map((stage) => <option key={stage} value={stage}>{pick(language, stageLabels[stage].zh, stageLabels[stage].en)}</option>)}
                </select>
              </Field>
              <Field label={pick(language, "客户经理", "Owner")}>
                <input value={selected.owner} onChange={(event) => updateCustomer(selected.id, { owner: event.target.value })} style={inputStyle} />
              </Field>
              <Field label={pick(language, "费率卡/报价", "Rate Card / Quote")}>
                <input value={selected.rateCard} onChange={(event) => updateCustomer(selected.id, { rateCard: event.target.value })} style={inputStyle} />
              </Field>
              <Field label={pick(language, "信用额度 CAD", "Credit Limit CAD")}>
                <input type="number" value={selected.creditLimitCad} onChange={(event) => updateCustomer(selected.id, { creditLimitCad: Number(event.target.value) || 0 })} style={inputStyle} />
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label={pick(language, "服务说明", "Service Instructions")}>
                  <textarea value={selected.instructions} onChange={(event) => updateCustomer(selected.id, { instructions: event.target.value })} style={{ ...inputStyle, minHeight: 76, resize: "vertical" }} />
                </Field>
              </div>
            </div>
            <div className="mt-4 rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
              <div className="flex items-center justify-between text-xs">
                <span style={{ fontWeight: 800 }}>{pick(language, "导入清单", "Onboarding Checklist")}</span>
                <span style={{ fontFamily: "monospace", color: "var(--muted-foreground)" }}>{selected.onboardingDone}/{selected.onboardingTotal}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white">
                <div className="h-2 rounded-full" style={{ width: `${(selected.onboardingDone / selected.onboardingTotal) * 100}%`, background: "#10B981" }} />
              </div>
              {selectedBackboneCustomer && (
                <OnboardingTaskList
                  language={language}
                  customer={selectedBackboneCustomer}
                  trace={selectedTrace}
                  onComplete={completeOnboardingTask}
                />
              )}
            </div>
            <div className="mt-4">
              <BackboneTracePanel language={language} trace={selectedTrace} />
            </div>
          </Panel>
        )}
      </div>

      <Panel title={pick(language, "客户工单", "Customer Cases")} subtitle={pick(language, "状态可更新，后续可连接客户门户和审计日志", "Statuses are editable and ready for portal/audit integration")}>
        <div style={{ overflowX: "auto" }}>
          <table className="w-full" style={{ minWidth: 900 }}>
            <thead>
              <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                {[pick(language, "工单号", "Case #"), pick(language, "客户", "Customer"), pick(language, "主题", "Subject"), pick(language, "优先级", "Priority"), pick(language, "状态", "Status"), pick(language, "下一步", "Next Step")].map((header) => (
                  <th key={header} className="px-3 py-2.5 text-left text-xs" style={{ color: "var(--muted-foreground)", fontWeight: 700 }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/30" style={{ borderColor: "var(--border)" }}>
                  <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 800 }}>{item.id}</td>
                  <td className="px-3 py-3 text-xs" style={{ fontWeight: 700 }}>{customers.find((customer) => customer.id === item.customerId)?.name ?? item.customerId}</td>
                  <td className="px-3 py-3 text-xs">{item.subject}</td>
                  <td className="px-3 py-3 text-xs">{item.priority}</td>
                  <td className="px-3 py-3 text-xs">
                    <select value={item.status} onChange={(event) => updateCase(item.id, event.target.value as CustomerCaseStatus)} style={{ ...inputStyle, minWidth: 150, padding: "6px 8px" }}>
                      {caseStatuses.map((status) => <option key={status} value={status}>{pick(language, caseLabels[status].zh, caseLabels[status].en)}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>{item.nextStep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function isOnboardingTaskDone(task: CustomerOnboardingTask, customer: Customer, trace: ReturnType<typeof getCustomerBackboneTrace> | null) {
  if (task === "wms_customer") return Boolean(customer.wmsCustomerId);
  if (task === "billing_profile") return Boolean(customer.quickBooksCustomerId);
  if (task === "communication_setup") return customer.communicationSetup !== "not_started";
  return Boolean(trace?.timelineEvents.some((event) => event.title === "Operating rules confirmed"));
}

function serviceTypesFromProfile(services: string[]): ServiceType[] {
  const normalized = services.join(" ").toLowerCase();
  const mapped: ServiceType[] = [];
  if (normalized.includes("freight") || normalized.includes("import")) mapped.push("freight_import");
  if (normalized.includes("customs")) mapped.push("customs_clearance");
  if (normalized.includes("warehouse") || normalized.includes("storage")) mapped.push("warehouse_storage");
  if (normalized.includes("fba")) mapped.push("fba_prep");
  if (normalized.includes("transport") || normalized.includes("delivery") || normalized.includes("linehaul")) mapped.push("transport_delivery");
  if (normalized.includes("return")) mapped.push("returns");
  return mapped.length > 0 ? mapped : ["warehouse_storage", "transport_delivery"];
}

function OnboardingTaskList({
  language,
  customer,
  trace,
  onComplete,
}: {
  language: AppLanguage;
  customer: Customer;
  trace: ReturnType<typeof getCustomerBackboneTrace> | null;
  onComplete: (task: CustomerOnboardingTask) => void;
}) {
  const tasks: Array<{ id: CustomerOnboardingTask; zh: string; en: string; done: boolean; detail: string }> = [
    {
      id: "wms_customer",
      zh: "WMS 客户设置",
      en: "WMS Customer Setup",
      done: isOnboardingTaskDone("wms_customer", customer, trace),
      detail: customer.wmsCustomerId ?? "LingXing WMS",
    },
    {
      id: "billing_profile",
      zh: "财务账单资料",
      en: "Billing Profile",
      done: isOnboardingTaskDone("billing_profile", customer, trace),
      detail: customer.quickBooksCustomerId ?? "QuickBooks",
    },
    {
      id: "communication_setup",
      zh: "客户沟通渠道",
      en: "Communication Setup",
      done: isOnboardingTaskDone("communication_setup", customer, trace),
      detail: customer.communicationSetup.replace(/_/g, " "),
    },
    {
      id: "operating_rules",
      zh: "操作规则确认",
      en: "Operating Rules",
      done: isOnboardingTaskDone("operating_rules", customer, trace),
      detail: isOnboardingTaskDone("operating_rules", customer, trace) ? "Confirmed" : "Service, exception, WMS/TMS handoff",
    },
  ];

  return (
    <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
      {tasks.map((task) => (
        <div key={task.id} className="rounded-lg border bg-card p-3" style={{ borderColor: task.done ? "#A7F3D0" : "var(--border)" }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs" style={{ fontWeight: 900 }}>{pick(language, task.zh, task.en)}</div>
              <div className="mt-1 text-[11px]" style={{ color: "var(--muted-foreground)" }}>{task.detail}</div>
            </div>
            <span className="rounded-full px-2 py-1 text-[11px]" style={{ background: task.done ? "#D1FAE5" : "#FEF3C7", color: task.done ? "#047857" : "#B45309", fontWeight: 800 }}>
              {task.done ? pick(language, "完成", "Done") : pick(language, "待处理", "Pending")}
            </span>
          </div>
          <button
            onClick={() => onComplete(task.id)}
            disabled={task.done}
            className="mt-3 w-full rounded-lg px-3 py-2 text-xs disabled:opacity-50"
            style={{ background: task.done ? "var(--muted)" : "var(--primary)", color: task.done ? "var(--muted-foreground)" : "white", fontWeight: 800 }}
          >
            {task.done ? pick(language, "已完成", "Completed") : pick(language, "完成任务", "Complete Task")}
          </button>
        </div>
      ))}
    </div>
  );
}

const serviceOptions: Array<{ value: ServiceType; zh: string; en: string }> = [
  { value: "freight_import", zh: "进口货代", en: "Freight Import" },
  { value: "customs_clearance", zh: "清关", en: "Customs Clearance" },
  { value: "warehouse_storage", zh: "仓储", en: "Warehouse Storage" },
  { value: "fba_prep", zh: "FBA 处理", en: "FBA Prep" },
  { value: "transport_delivery", zh: "运输派送", en: "Transport Delivery" },
  { value: "returns", zh: "退货", en: "Returns" },
];

const sourceOptions: Array<{ value: InquirySource; zh: string; en: string }> = [
  { value: "wechat", zh: "微信", en: "WeChat" },
  { value: "website", zh: "网站", en: "Website" },
  { value: "google_ads", zh: "Google 广告", en: "Google Ads" },
  { value: "referral", zh: "转介绍", en: "Referral" },
  { value: "industry_networking", zh: "行业活动", en: "Industry Networking" },
];

function NewLeadModal({
  language,
  onClose,
  onCreate,
}: {
  language: AppLanguage;
  onClose: () => void;
  onCreate: (input: CreateCustomerLeadInput) => void;
}) {
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [source, setSource] = useState<InquirySource>("wechat");
  const [inquiryChannel, setInquiryChannel] = useState<CreateCustomerLeadInput["inquiryChannel"]>("wechat");
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(["freight_import", "warehouse_storage"]);
  const [owner, setOwner] = useState("Sales Team");
  const [billingTerms, setBillingTerms] = useState("Pending qualification");
  const [requirementsSummary, setRequirementsSummary] = useState("");
  const isValid = companyName.trim().length > 1 && contactPerson.trim().length > 1 && serviceTypes.length > 0;

  function toggleService(service: ServiceType) {
    setServiceTypes((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service],
    );
  }

  function submit() {
    if (!isValid) {
      toast.error(pick(language, "请填写公司、联系人并至少选择一项服务", "Enter company, contact, and at least one service"));
      return;
    }
    onCreate({
      companyName,
      contactPerson,
      contactEmail,
      contactPhone,
      source,
      inquiryChannel,
      serviceTypes,
      owner,
      billingTerms,
      requirementsSummary,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border bg-card shadow-xl" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="text-base" style={{ fontWeight: 900 }}>{pick(language, "新建线索 / 客户资料", "New Lead / Customer Profile")}</div>
            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{pick(language, "从销售线索开始客户到收款流程", "Start the customer-to-cash workflow from a sales inquiry")}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted" aria-label={pick(language, "关闭", "Close")}><X size={17} /></button>
        </div>

        <div className="grid gap-4 p-5" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Field label={pick(language, "公司名称", "Company Name")}>
            <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Zenith Marketplace" style={inputStyle} />
          </Field>
          <Field label={pick(language, "联系人", "Contact Person")}>
            <input value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} placeholder="Jill Anderson" style={inputStyle} />
          </Field>
          <Field label={pick(language, "邮箱", "Email")}>
            <input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="ops@example.com" style={inputStyle} />
          </Field>
          <Field label={pick(language, "电话", "Phone")}>
            <input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="+1 604 000 0000" style={inputStyle} />
          </Field>
          <Field label={pick(language, "线索来源", "Lead Source")}>
            <select value={source} onChange={(event) => setSource(event.target.value as InquirySource)} style={inputStyle}>
              {sourceOptions.map((option) => <option key={option.value} value={option.value}>{pick(language, option.zh, option.en)}</option>)}
            </select>
          </Field>
          <Field label={pick(language, "沟通渠道", "Inquiry Channel")}>
            <select value={inquiryChannel} onChange={(event) => setInquiryChannel(event.target.value as CreateCustomerLeadInput["inquiryChannel"])} style={inputStyle}>
              <option value="wechat">{pick(language, "微信", "WeChat")}</option>
              <option value="email">{pick(language, "邮件", "Email")}</option>
              <option value="phone">{pick(language, "电话", "Phone")}</option>
            </select>
          </Field>
          <Field label={pick(language, "负责人", "Owner")}>
            <input value={owner} onChange={(event) => setOwner(event.target.value)} style={inputStyle} />
          </Field>
          <Field label={pick(language, "账期 / 付款条件", "Billing Terms")}>
            <input value={billingTerms} onChange={(event) => setBillingTerms(event.target.value)} style={inputStyle} />
          </Field>

          <div style={{ gridColumn: "1 / -1" }}>
            <div className="mb-2 text-xs" style={{ color: "var(--muted-foreground)", fontWeight: 800 }}>{pick(language, "需求服务", "Requested Services")}</div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              {serviceOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)", background: serviceTypes.includes(option.value) ? "rgba(28,100,242,0.08)" : "var(--card)", fontWeight: 700 }}>
                  <input type="checkbox" checked={serviceTypes.includes(option.value)} onChange={() => toggleService(option.value)} />
                  {pick(language, option.zh, option.en)}
                </label>
              ))}
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <Field label={pick(language, "需求说明 / 解决方案备注", "Requirements / Solution Notes")}>
              <textarea value={requirementsSummary} onChange={(event) => setRequirementsSummary(event.target.value)} placeholder={pick(language, "例如：每月 2 个柜，FBA 分拣、仓储和多伦多派送。", "Example: 2 containers/month, FBA sort, storage, and Toronto delivery.")} style={{ ...inputStyle, minHeight: 92, resize: "vertical" }} />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {pick(language, "创建后会同步生成客户、线索、时间线和 CRM 状态。", "Creates customer, lead, timeline, and CRM status together.")}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-xs" style={{ borderColor: "var(--border)", fontWeight: 800 }}>{pick(language, "取消", "Cancel")}</button>
            <button onClick={submit} disabled={!isValid} className="rounded-lg px-4 py-2 text-xs disabled:opacity-50" style={{ background: "var(--primary)", color: "white", fontWeight: 900 }}>{pick(language, "创建资料", "Create Profile")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</div>
          <div style={{ color, fontFamily: "monospace", fontSize: 24, fontWeight: 800 }}>{value}</div>
        </div>
        <div className="rounded-lg p-2" style={{ background: "var(--muted)", color }}>{icon}</div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, actions, children }: { title: string; subtitle: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <div>
          <div className="text-sm" style={{ fontWeight: 800 }}>{title}</div>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{subtitle}</div>
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StagePill({ stage, language }: { stage: CustomerStage; language: AppLanguage }) {
  const meta = stageLabels[stage];
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
