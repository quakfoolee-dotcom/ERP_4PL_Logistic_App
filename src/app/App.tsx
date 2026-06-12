import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./components/Dashboard";
import { TransportOrders } from "./components/TransportOrders";
import { FinanceView } from "./components/FinanceView";
import { DriverPayroll } from "./components/DriverPayroll";
import { WarehouseView } from "./components/WarehouseView";
import { AnalyticsView } from "./components/AnalyticsView";
import { InventoryView } from "./components/InventoryView";
import { NewOrderModal } from "./components/NewOrderModal";
import { LiveTracking } from "./components/LiveTracking";
import { PODManagement } from "./components/PODManagement";
import { DriverProfiles } from "./components/DriverProfiles";
import { PartnerQuotes } from "./components/PartnerQuotes";
import { ReconciliationView } from "./components/ReconciliationView";
import { ComplianceView } from "./components/ComplianceView";
import { SettingsView } from "./components/SettingsView";
import { initialTransportOrders, type TransportOrder } from "./data/transportOrders";

const pageConfig: Record<string, { title: string; titleEn: string; addLabel?: string }> = {
  dashboard: { title: "运营控制台", titleEn: "Operations Dashboard" },
  orders: { title: "运输订单", titleEn: "Transport Orders", addLabel: "新建订单" },
  tracking: { title: "在途追踪", titleEn: "Live Tracking" },
  pod: { title: "POD管理", titleEn: "POD Management" },
  profiles: { title: "司机档案", titleEn: "Driver Profiles", addLabel: "新增司机" },
  payroll: { title: "薪资结算", titleEn: "Driver Payroll" },
  reimbursements: { title: "报销管理", titleEn: "Reimbursements" },
  quotes: { title: "合作方报价", titleEn: "Partner Quotes" },
  reconcile: { title: "结算对账", titleEn: "Reconciliation" },
  handling: { title: "操作费管理", titleEn: "Handling Fees" },
  inventory: { title: "库存概览", titleEn: "Inventory Overview" },
  ar: { title: "应收发票", titleEn: "AR Invoices", addLabel: "新建发票" },
  ap: { title: "应付账款", titleEn: "AP Payables" },
  transfer: { title: "中转汇总", titleEn: "Transfer Summary" },
  analytics: { title: "业务分析", titleEn: "Analytics & BI" },
  compliance: { title: "合规审计", titleEn: "Compliance" },
  settings: { title: "系统设置", titleEn: "System Settings" },
};

function PlaceholderView({ title, titleEn }: { title: string; titleEn: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
        <div className="text-lg" style={{ fontWeight: 600, color: "var(--foreground)" }}>{title}</div>
        <div className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>{titleEn} — Coming Soon</div>
      </div>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [showNewOrder, setShowNewOrder] = useState(false);
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

  function renderContent() {
    switch (activePage) {
      case "dashboard": return <Dashboard orders={orders} onNavigate={setActivePage} />;
      case "orders": return <TransportOrders orders={orders} />;
      case "ar":
      case "ap":
      case "transfer": return <FinanceView />;
      case "payroll":
      case "reimbursements": return <DriverPayroll />;
      case "handling": return <WarehouseView />;
      case "inventory": return <InventoryView />;
      case "analytics": return <AnalyticsView />;
      case "tracking": return <LiveTracking />;
      case "pod": return <PODManagement />;
      case "profiles": return <DriverProfiles />;
      case "quotes": return <PartnerQuotes />;
      case "reconcile": return <ReconciliationView />;
      case "compliance": return <ComplianceView />;
      case "settings": return <SettingsView />;
      default: return <PlaceholderView title={page.title} titleEn={page.titleEn} />;
    }
  }

  return (
    <div className="erp-shell flex h-screen w-full overflow-hidden" style={{ background: "var(--background)", minWidth: 0 }}>
      <Sidebar activeKey={activePage} onSelect={setActivePage} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title={page.title}
          titleEn={page.titleEn}
          addLabel={page.addLabel}
          onAdd={page.addLabel ? () => setShowNewOrder(true) : undefined}
          onExport={exportOrders}
        />
        <div className="flex-1 overflow-hidden flex flex-col" style={{ background: "var(--background)" }}>
          {renderContent()}
        </div>
      </div>

      {showNewOrder && (
        <NewOrderModal
          onClose={() => setShowNewOrder(false)}
          onSubmit={(order) => {
            setOrders((prev) => [order, ...prev]);
            setShowNewOrder(false);
            setActivePage("orders");
          }}
        />
      )}
    </div>
  );
}
