import { lazy, Suspense, useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { NewOrderModal } from "./components/NewOrderModal";
import { initialTransportOrders, type TransportOrder } from "./data/transportOrders";
import { installLanguageDomSanitizer, type AppLanguage } from "./i18n";
import { getCustomerReadinessProjection, getRequirementCoverageProjection } from "./repositories/projections";
import { workflowRepository } from "./repositories/workflowRepository";

const Dashboard = lazy(() => import("./components/Dashboard").then((module) => ({ default: module.Dashboard })));
const TransportOrders = lazy(() => import("./components/TransportOrders").then((module) => ({ default: module.TransportOrders })));
const FinanceView = lazy(() => import("./components/FinanceView").then((module) => ({ default: module.FinanceView })));
const DriverPayroll = lazy(() => import("./components/DriverPayroll").then((module) => ({ default: module.DriverPayroll })));
const WarehouseView = lazy(() => import("./components/WarehouseView").then((module) => ({ default: module.WarehouseView })));
const AnalyticsView = lazy(() => import("./components/AnalyticsView").then((module) => ({ default: module.AnalyticsView })));
const InventoryView = lazy(() => import("./components/InventoryView").then((module) => ({ default: module.InventoryView })));
const LiveTracking = lazy(() => import("./components/LiveTracking").then((module) => ({ default: module.LiveTracking })));
const PODManagement = lazy(() => import("./components/PODManagement").then((module) => ({ default: module.PODManagement })));
const DriverProfiles = lazy(() => import("./components/DriverProfiles").then((module) => ({ default: module.DriverProfiles })));
const PartnerQuotes = lazy(() => import("./components/PartnerQuotes").then((module) => ({ default: module.PartnerQuotes })));
const ReconciliationView = lazy(() => import("./components/ReconciliationView").then((module) => ({ default: module.ReconciliationView })));
const ComplianceView = lazy(() => import("./components/ComplianceView").then((module) => ({ default: module.ComplianceView })));
const SettingsView = lazy(() => import("./components/SettingsView").then((module) => ({ default: module.SettingsView })));
const RequirementsCoverageView = lazy(() => import("./components/RequirementsCoverageView").then((module) => ({ default: module.RequirementsCoverageView })));
const CustomerMasterView = lazy(() => import("./components/CustomerMasterView").then((module) => ({ default: module.CustomerMasterView })));
const FreightCustomsView = lazy(() => import("./components/FreightCustomsView").then((module) => ({ default: module.FreightCustomsView })));
const WmsWorkflowView = lazy(() => import("./components/WmsWorkflowView").then((module) => ({ default: module.WmsWorkflowView })));
const TmsDispatchView = lazy(() => import("./components/TmsDispatchView").then((module) => ({ default: module.TmsDispatchView })));
const FinanceHubWorkflowView = lazy(() => import("./components/FinanceHubWorkflowView").then((module) => ({ default: module.FinanceHubWorkflowView })));

const pageConfig: Record<string, { title: string; titleEn: string; addLabel?: string; addLabelEn?: string }> = {
  dashboard: { title: "运营控制台", titleEn: "Operations Dashboard" },
  requirements: { title: "需求覆盖", titleEn: "Requirements Coverage" },
  customers: { title: "客户主数据", titleEn: "Customer Master" },
  freight: { title: "货运清关", titleEn: "Freight & Customs" },
  wmsWorkflow: { title: "WMS工作流", titleEn: "WMS Workflows" },
  tmsDispatch: { title: "TMS派车", titleEn: "TMS Dispatch" },
  financeHub: { title: "财务中枢", titleEn: "Finance Hub Workflows" },
  orders: { title: "运输订单", titleEn: "Transport Orders", addLabel: "新建订单", addLabelEn: "New Order" },
  tracking: { title: "在途追踪", titleEn: "Live Tracking" },
  pod: { title: "POD管理", titleEn: "POD Management" },
  profiles: { title: "司机档案", titleEn: "Driver Profiles", addLabel: "新增司机", addLabelEn: "New Driver" },
  payroll: { title: "薪资结算", titleEn: "Driver Payroll" },
  reimbursements: { title: "报销管理", titleEn: "Reimbursements" },
  quotes: { title: "合作方报价", titleEn: "Partner Quotes" },
  reconcile: { title: "结算对账", titleEn: "Reconciliation" },
  warehouse: { title: "仓储管理", titleEn: "Warehouse" },
  handling: { title: "操作费管理", titleEn: "Handling Fees" },
  inventory: { title: "库存概览", titleEn: "Inventory Overview" },
  finance: { title: "财务管理", titleEn: "Finance" },
  ar: { title: "应收发票", titleEn: "AR Invoices", addLabel: "新建发票", addLabelEn: "New Invoice" },
  ap: { title: "应付账款", titleEn: "AP Payables" },
  transfer: { title: "中转汇总", titleEn: "Transfer Summary" },
  analytics: { title: "业务分析", titleEn: "Analytics & BI" },
  compliance: { title: "合规审计", titleEn: "Compliance" },
  settings: { title: "系统设置", titleEn: "System Settings" },
};

function PlaceholderView({ title, language }: { title: string; language: AppLanguage }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div style={{ fontSize: 48, marginBottom: 12 }}>...</div>
        <div className="text-lg" style={{ fontWeight: 600, color: "var(--foreground)" }}>{title}</div>
        <div className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>{language === "en" ? "Coming Soon" : "即将推出"}</div>
      </div>
    </div>
  );
}

function LoadingView({ language }: { language: AppLanguage }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="rounded-xl border bg-card px-4 py-3 text-sm" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
        {language === "en" ? "Loading..." : "加载中..."}
      </div>
    </div>
  );
}

function toCsv(header: string[], rows: Array<Array<unknown>>) {
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadCsv(filename: string, header: string[], rows: Array<Array<unknown>>) {
  const blob = new Blob(["\uFEFF" + toCsv(header, rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function defaultTransportEtaDate() {
  return toDateInputValue(addDays(new Date(), 18));
}

function todayDate() {
  return toDateInputValue(new Date());
}

function orderDateCode(date: string) {
  return date.replace(/-/g, "").slice(2);
}

function normalizeTransportOrderDates(order: TransportOrder): TransportOrder {
  const staleModalOrder = order.id.startsWith("WB-260430-") && order.created === "2026-04-30";
  if (!staleModalOrder) return order;

  const eta = order.eta === "2026-04-30" ? defaultTransportEtaDate() : order.eta;
  return {
    ...order,
    id: order.id.replace("WB-260430-", `WB-${orderDateCode(eta)}-`),
    eta,
    created: todayDate(),
  };
}

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [language, setLanguage] = useState<AppLanguage>(() => {
    try {
      return window.localStorage.getItem("erp4pl.language") === "en" ? "en" : "zh";
    } catch {
      return "zh";
    }
  });
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [globalOrderSearch, setGlobalOrderSearch] = useState("");
  const [rateCardCustomerId, setRateCardCustomerId] = useState<string | undefined>(() => {
    try {
      return window.localStorage.getItem("erp4pl.rateCardCustomerId") || undefined;
    } catch {
      return undefined;
    }
  });
  const [globalOrderStatus, setGlobalOrderStatus] = useState("全部");
  const [orders, setOrders] = useState<TransportOrder[]>(() => {
    try {
      const saved = window.localStorage.getItem("erp4pl.transportOrders");
      const source = saved ? JSON.parse(saved) : initialTransportOrders;
      return source.map(normalizeTransportOrderDates);
    } catch {
      return initialTransportOrders;
    }
  });

  const page = pageConfig[activePage] || pageConfig.dashboard;
  const showAdd = activePage === "orders" || activePage === "ar";

  useEffect(() => {
    window.localStorage.setItem("erp4pl.transportOrders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    window.localStorage.setItem("erp4pl.language", language);
    document.documentElement.lang = language === "en" ? "en" : "zh-Hans";
    return installLanguageDomSanitizer(language);
  }, [language]);

  function exportOrders() {
    const header = ["Order ID", "Customer", "Origin", "Destination", "Driver", "Type", "Pallets", "Status", "Revenue", "Cost", "Profit", "POD", "ETA", "Created"];
    const rows = orders.map((order) => [
      order.id, order.customer, order.origin, order.dest, order.driver, order.type, order.pallets,
      order.status, order.amount, order.cost, order.profit, order.pod, order.eta, order.created,
    ]);
    downloadCsv("transport_orders", header, rows);
  }

  function exportCurrentPage() {
    const workflow = workflowRepository.getSnapshot();
    switch (activePage) {
      case "requirements": {
        const projection = getRequirementCoverageProjection();
        downloadCsv("requirements_coverage", ["ID", "Title", "Module", "Priority", "Phase", "App Area", "Status", "Next Action"], projection.requirements.map((item) => [item.id, item.title, item.module, item.priority, item.phase, item.appArea, item.status, item.nextAction]));
        return;
      }
      case "customers": {
        const projection = getCustomerReadinessProjection();
        downloadCsv("customer_master", ["Customer", "Stage", "Owner", "Services", "Rate Card", "Open Cases", "Credit Limit"], projection.customers.map((item) => [item.name, item.stage, item.owner, item.services.join("; "), item.rateCard, item.openCases, item.creditLimitCad]));
        return;
      }
      case "freight":
        downloadCsv("freight_customs", ["File", "Customer", "Container", "ETA", "LFD", "Status", "Customs", "Destination", "Exception"], workflow.freightFiles.map((item) => [item.id, item.customer, item.container, item.eta, item.lastFreeDay, item.status, item.customsStatus, item.destination, item.exception]));
        return;
      case "wmsWorkflow":
        downloadCsv("wms_asn_receiving", ["ASN", "Booking", "Freight File", "Customer", "Container", "Warehouse", "ETA", "Expected", "Received", "Variance", "Condition", "Inventory", "Status"], workflow.asns.map((item) => [item.id, item.bookingRef, item.freightFileId, item.customer, item.container, item.warehouse, item.eta, item.expectedUnits, item.receivedUnits, item.varianceUnits, item.conditionStatus, item.inventoryStatus, item.status]));
        return;
      case "tmsDispatch":
        downloadCsv("tms_dispatch", ["Dispatch", "Customer", "Origin", "Destination", "Pallets", "Driver", "Carrier", "Cost", "Revenue", "Status", "Note"], workflow.dispatches.map((item) => [item.id, item.customer, item.origin, item.destination, item.pallets, item.driver, item.carrier, item.quotedCostCad, item.estimatedRevenueCad, item.status, item.exceptionNote]));
        return;
      case "financeHub":
        downloadCsv("finance_billing_queue", ["Queue", "Customer", "Source Type", "Source ID", "Subtotal", "Tax", "Total", "Status", "Owner", "Note"], workflow.billingQueue.map((item) => [item.id, item.customer, item.sourceType, item.sourceId, item.subtotalCad, item.taxCad, item.subtotalCad + item.taxCad, item.status, item.approvalOwner, item.note]));
        return;
      case "ar":
      case "ap":
      case "transfer":
        sendFinanceCommand("export");
        return;
      default:
        exportOrders();
    }
  }

  function updateOrder(updated: TransportOrder) {
    setOrders((current) => current.map((order) => order.id === updated.id ? updated : order));
  }

  function addOrder(order: TransportOrder) {
    setOrders((current) => [order, ...current]);
  }

  function sendFinanceCommand(action: "newInvoice" | "export") {
    window.dispatchEvent(new CustomEvent("erp4pl.finance.command", { detail: { section: activePage, action } }));
  }

  function handleAdd() {
    if (activePage === "ar") {
      sendFinanceCommand("newInvoice");
      return;
    }
    if (activePage === "orders") setShowNewOrder(true);
  }

  function openRateCardForCustomer(customerId: string) {
    setRateCardCustomerId(customerId);
    try {
      window.localStorage.setItem("erp4pl.rateCardCustomerId", customerId);
    } catch {
      // localStorage can be unavailable in restricted browser contexts.
    }
    setActivePage("quotes");
  }

  function renderContent() {
    switch (activePage) {
      case "dashboard": return <Dashboard orders={orders} onNavigate={setActivePage} onUpdateOrder={updateOrder} language={language} />;
      case "requirements": return <RequirementsCoverageView language={language} />;
      case "customers": return (
        <CustomerMasterView
          language={language}
          onPrepareRateCard={(customer) => openRateCardForCustomer(customer.id)}
          onOperationalBookingCreated={() => setActivePage("freight")}
        />
      );
      case "freight": return <FreightCustomsView language={language} />;
      case "wmsWorkflow": return <WmsWorkflowView language={language} />;
      case "tmsDispatch": return <TmsDispatchView language={language} />;
      case "financeHub": return <FinanceHubWorkflowView language={language} />;
      case "orders": return <TransportOrders orders={orders} onUpdateOrder={updateOrder} onAddOrder={addOrder} externalSearch={globalOrderSearch} externalStatus={globalOrderStatus} language={language} />;
      case "finance":
      case "ar":
      case "ap":
      case "transfer": return <FinanceView section={activePage as "finance" | "ar" | "ap" | "transfer"} language={language} />;
      case "payroll":
      case "reimbursements": return <DriverPayroll language={language} />;
      case "warehouse":
      case "handling": return <WarehouseView language={language} />;
      case "inventory": return <InventoryView language={language} />;
      case "analytics": return <AnalyticsView language={language} />;
      case "tracking": return <LiveTracking language={language} />;
      case "pod": return <PODManagement language={language} />;
      case "profiles": return <DriverProfiles language={language} />;
      case "quotes": return <PartnerQuotes language={language} initialCustomerId={rateCardCustomerId} />;
      case "reconcile": return <ReconciliationView language={language} />;
      case "compliance": return <ComplianceView language={language} />;
      case "settings": return <SettingsView language={language} />;
      default: return <PlaceholderView title={language === "en" ? page.titleEn : page.title} language={language} />;
    }
  }

  return (
    <div className="erp-shell flex h-screen w-full overflow-hidden" style={{ background: "var(--background)", minWidth: 0 }}>
      <Sidebar activeKey={activePage} onSelect={setActivePage} language={language} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title={language === "en" ? page.titleEn : page.title}
          titleEn=""
          language={language}
          onToggleLanguage={() => setLanguage((current) => current === "en" ? "zh" : "en")}
          addLabel={showAdd ? language === "en" ? page.addLabelEn : page.addLabel : undefined}
          onAdd={showAdd ? handleAdd : undefined}
          onExport={exportCurrentPage}
          onSearch={setGlobalOrderSearch}
          activeStatusFilter={globalOrderStatus}
          onFilterStatus={(status) => {
            setGlobalOrderStatus(status);
            setActivePage("orders");
          }}
        />
        <div className="flex-1 overflow-hidden flex flex-col" style={{ background: "var(--background)" }}>
          <Suspense fallback={<LoadingView language={language} />}>
            {renderContent()}
          </Suspense>
        </div>
      </div>

      {showNewOrder && (
        <NewOrderModal
          onClose={() => setShowNewOrder(false)}
          onSubmit={(order) => {
            addOrder(order);
            setShowNewOrder(false);
            setActivePage("orders");
          }}
        />
      )}
    </div>
  );
}
