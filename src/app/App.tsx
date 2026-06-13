import { lazy, Suspense, useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { NewOrderModal } from "./components/NewOrderModal";
import { initialTransportOrders, type TransportOrder } from "./data/transportOrders";
import { installLanguageDomSanitizer, type AppLanguage } from "./i18n";

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

const pageConfig: Record<string, { title: string; titleEn: string; addLabel?: string; addLabelEn?: string }> = {
  dashboard: { title: "运营控制台", titleEn: "Operations Dashboard" },
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
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
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
  const [globalOrderStatus, setGlobalOrderStatus] = useState("全部");
  const [orders, setOrders] = useState<TransportOrder[]>(() => {
    try {
      const saved = window.localStorage.getItem("erp4pl.transportOrders");
      return saved ? JSON.parse(saved) : initialTransportOrders;
    } catch {
      return initialTransportOrders;
    }
  });

  const page = pageConfig[activePage] || pageConfig["dashboard"];

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
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transport_orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  function renderContent() {
    switch (activePage) {
      case "dashboard": return <Dashboard orders={orders} onNavigate={setActivePage} onUpdateOrder={updateOrder} language={language} />;
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
      case "quotes": return <PartnerQuotes language={language} />;
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
          addLabel={language === "en" ? page.addLabelEn : page.addLabel}
          onAdd={page.addLabel || page.addLabelEn ? () => activePage === "ar" ? sendFinanceCommand("newInvoice") : setShowNewOrder(true) : undefined}
          onExport={["ar", "ap", "transfer"].includes(activePage) ? () => sendFinanceCommand("export") : exportOrders}
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
