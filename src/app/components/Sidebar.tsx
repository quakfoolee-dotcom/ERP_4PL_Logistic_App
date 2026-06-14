import { useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard, Truck, Users, FileText, Receipt, Package,
  Building2, BarChart3, Settings, ChevronDown, ChevronRight,
  Warehouse, CreditCard, ClipboardCheck, DollarSign, Globe
} from "lucide-react";
import type { AppLanguage } from "../i18n";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  labelEn: string;
  key: string;
  children?: { label: string; labelEn: string; key: string }[];
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={16} />, label: "控制台", labelEn: "Dashboard", key: "dashboard" },
  {
    icon: <Truck size={16} />, label: "运输管理", labelEn: "Transport Mgmt", key: "transport",
    children: [
      { label: "运输订单", labelEn: "Transport Orders", key: "orders" },
      { label: "TMS派车", labelEn: "TMS Dispatch", key: "tmsDispatch" },
      { label: "在途追踪", labelEn: "Live Tracking", key: "tracking" },
      { label: "POD管理", labelEn: "POD Management", key: "pod" },
      { label: "货运清关", labelEn: "Freight & Customs", key: "freight" },
    ]
  },
  {
    icon: <Users size={16} />, label: "司机管理", labelEn: "Driver Mgmt", key: "drivers",
    children: [
      { label: "司机档案", labelEn: "Driver Profiles", key: "profiles" },
      { label: "薪资结算", labelEn: "Payroll", key: "payroll" },
      { label: "报销管理", labelEn: "Reimbursements", key: "reimbursements" },
    ]
  },
  {
    icon: <Building2 size={16} />, label: "合作伙伴", labelEn: "Partners", key: "partners",
    children: [
      { label: "客户主数据", labelEn: "Customer Master", key: "customers" },
      { label: "报价管理", labelEn: "Quote Cards", key: "quotes" },
      { label: "结算对账", labelEn: "Reconciliation", key: "reconcile" },
    ]
  },
  {
    icon: <Warehouse size={16} />, label: "仓储管理", labelEn: "Warehouse", key: "warehouse",
    children: [
      { label: "WMS工作流", labelEn: "WMS Workflows", key: "wmsWorkflow" },
      { label: "操作费用", labelEn: "Handling Fees", key: "handling" },
      { label: "库存概览", labelEn: "Inventory", key: "inventory" },
    ]
  },
  {
    icon: <Receipt size={16} />, label: "财务管理", labelEn: "Finance", key: "finance",
    children: [
      { label: "财务中枢", labelEn: "Finance Hub", key: "financeHub" },
      { label: "应收发票", labelEn: "AR Invoices", key: "ar" },
      { label: "应付账款", labelEn: "AP Payables", key: "ap" },
      { label: "中转汇总", labelEn: "Transfer Summary", key: "transfer" },
    ]
  },
  { icon: <BarChart3 size={16} />, label: "业务分析", labelEn: "Analytics", key: "analytics" },
  {
    icon: <ClipboardCheck size={16} />, label: "合规审计", labelEn: "Compliance", key: "complianceGroup",
    children: [
      { label: "合规审计", labelEn: "Compliance Audit", key: "compliance" },
      { label: "需求覆盖", labelEn: "Requirements Coverage", key: "requirements" },
    ]
  },
  { icon: <Settings size={16} />, label: "系统设置", labelEn: "Settings", key: "settings" },
];

interface SidebarProps {
  activeKey: string;
  onSelect: (key: string) => void;
  language: AppLanguage;
}

export function Sidebar({ activeKey, onSelect, language }: SidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ transport: true, partners: true, warehouse: true, finance: true, complianceGroup: true });

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isActiveItem = (item: NavItem) => item.key === activeKey || Boolean(item.children?.some((child) => child.key === activeKey));

  return (
    <aside className="flex flex-col h-full" style={{ background: "var(--sidebar)", width: 220 }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Globe size={16} className="text-white" />
        </div>
        <div>
          <div className="text-white text-xs leading-none" style={{ fontWeight: 600 }}>{language === "en" ? "Fengtu Logistics Canada" : "枫途物流加拿大"}</div>
          <div className="text-xs leading-none mt-0.5" style={{ color: "var(--sidebar-foreground)", opacity: 0.6, fontSize: 10 }}>
            {language === "en" ? "GTA 4PL FBA Logistics" : "GTA 4PL FBA物流"}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map(item => (
          <div key={item.key}>
            <button
              onClick={() => {
                if (item.children) {
                  toggleExpand(item.key);
                  onSelect(item.children[0].key);
                }
                else onSelect(item.key);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 transition-colors duration-150 text-left group"
              style={{
                background: isActiveItem(item) && !item.children ? "var(--sidebar-accent)" : isActiveItem(item) ? "rgba(255,255,255,0.06)" : "transparent",
                color: isActiveItem(item) && !item.children ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
              }}
              onMouseEnter={e => {
                if (!isActiveItem(item))
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={e => {
                if (!isActiveItem(item))
                  (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <span style={{ opacity: 0.8 }}>{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs" style={{ fontWeight: 500, lineHeight: 1.3 }}>{language === "en" ? item.labelEn : item.label}</div>
              </div>
              {item.children && (
                <span style={{ opacity: 0.5 }}>
                  {expanded[item.key] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
              )}
            </button>
            {item.children && expanded[item.key] && (
              <div className="mb-1 ml-2">
                {item.children.map(child => (
                  <button
                    key={child.key}
                    onClick={() => onSelect(child.key)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md mb-0.5 transition-colors duration-150 text-left"
                    style={{
                      background: activeKey === child.key ? "var(--sidebar-primary)" : "transparent",
                      color: activeKey === child.key ? "var(--sidebar-primary-foreground)" : "var(--sidebar-foreground)",
                    }}
                    onMouseEnter={e => {
                      if (activeKey !== child.key)
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={e => {
                      if (activeKey !== child.key)
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <div className="w-1 h-1 rounded-full" style={{ background: activeKey === child.key ? "white" : "currentColor", opacity: 0.4 }} />
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{language === "en" ? child.labelEn : child.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer"
          style={{ background: "rgba(255,255,255,0.04)" }}
          onClick={() => toast.info("Ops Team — Brampton Hub Manager", { description: language === "en" ? "Role: Operations · Hub: Brampton, ON · Session active" : "角色：运营 · 仓库：Brampton, ON · 会话在线" })}>
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs" style={{ fontWeight: 600 }}>
            OP
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white truncate" style={{ fontWeight: 500 }}>{language === "en" ? "Ops Team" : "运营团队"}</div>
            <div style={{ fontSize: 10, color: "var(--sidebar-foreground)", opacity: 0.5 }}>{language === "en" ? "Brampton Hub Manager" : "Brampton仓库经理"}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
