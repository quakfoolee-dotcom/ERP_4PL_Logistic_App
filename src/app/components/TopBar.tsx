import { Search, Bell, RefreshCw, Download, Plus, Filter, Calendar, Languages } from "lucide-react";
import { useState } from "react";
import { NotificationPanel } from "./NotificationPanel";
import type { AppLanguage } from "../i18n";

interface TopBarProps {
  title: string;
  titleEn: string;
  language: AppLanguage;
  onToggleLanguage: () => void;
  onAdd?: () => void;
  addLabel?: string;
  onSearch?: (q: string) => void;
  onExport?: () => void;
  activeStatusFilter?: string;
  onFilterStatus?: (status: string) => void;
}

const statusOptions = [
  { value: "全部", zh: "全部", en: "All" },
  { value: "运输中", zh: "运输中", en: "In Transit" },
  { value: "已完成", zh: "已完成", en: "Delivered" },
  { value: "待派送", zh: "待派送", en: "Pending" },
  { value: "异常", zh: "异常", en: "Exception" },
];

export function TopBar({ title, titleEn, language, onToggleLanguage, onAdd, addLabel, onSearch, onExport, activeStatusFilter = "全部", onFilterStatus }: TopBarProps) {
  const [searchVal, setSearchVal] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activePeriod, setActivePeriod] = useState("Apr 2026");

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }

  function handleSearch(v: string) {
    setSearchVal(v);
    onSearch?.(v);
  }

  function handleExport() {
    if (onExport) {
      onExport();
      return;
    }
    const csv = language === "en"
      ? "Order ID,Customer,Status,Amount\nWB-260408-CSGU6675337,CSGU6675337,In Transit,CAD $1,980\nWB-260405-ZCSU6522960,ZCSU6522960,Delivered,CAD $3,279"
      : "订单号,客户,状态,金额\nWB-260408-CSGU6675337,CSGU6675337,运输中,CAD $1,980\nWB-260405-ZCSU6522960,ZCSU6522960,已完成,CAD $3,279";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `export_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-3 px-6 py-3.5 bg-card border-b relative" style={{ borderColor: "var(--border)" }}>
      {/* Title */}
      <div className="mr-2">
        <div className="text-sm" style={{ fontWeight: 600, color: "var(--foreground)" }}>{title}</div>
        {titleEn && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{titleEn}</div>}
      </div>

      <div className="w-px h-8" style={{ background: "var(--border)" }} />

      {/* Period selector */}
      {["Apr 2026", "Mar 2026", "Nov 2025", "YTD 2026"].map(p => (
        <button key={p} onClick={() => setActivePeriod(p)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
          style={{
            background: activePeriod === p ? "var(--secondary)" : "transparent",
            color: activePeriod === p ? "var(--primary)" : "var(--muted-foreground)",
            fontWeight: activePeriod === p ? 500 : 400,
            border: activePeriod === p ? "1px solid var(--primary)30" : "1px solid transparent",
          }}>
          {p === "Apr 2026" && <Calendar size={11} />}
          {language === "en" ? p : ({ "Apr 2026": "2026年4月", "Mar 2026": "2026年3月", "Nov 2025": "2025年11月", "YTD 2026": "2026年至今" } as Record<string, string>)[p]}
        </button>
      ))}

      {/* Search */}
      <div className="flex-1 max-w-xs relative ml-1">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
        <input
          value={searchVal}
          onChange={e => handleSearch(e.target.value)}
          placeholder={language === "en" ? "Search orders, customers, drivers..." : "搜索订单、客户、司机..."}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs outline-none transition-all"
          style={{ borderColor: "var(--border)", background: "var(--input-background)", color: "var(--foreground)" }}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button onClick={onToggleLanguage}
          className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:bg-muted"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", fontWeight: 600 }}
          title={language === "en" ? "Switch to Chinese" : "Switch to English"}>
          <Languages size={13} />
          {language === "en" ? "Chinese" : "英语"}
        </button>
        <button onClick={handleRefresh}
          className="p-1.5 rounded-lg border transition-colors hover:bg-muted"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          title={language === "en" ? "Refresh data" : "刷新数据"}>
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>
        <button onClick={handleExport}
          className="p-1.5 rounded-lg border transition-colors hover:bg-muted"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          title={language === "en" ? "Export data" : "导出数据"}>
          <Download size={14} />
        </button>
        <div className="relative">
          <button onClick={() => setShowFilter((value) => !value)}
            className="p-1.5 rounded-lg border transition-colors hover:bg-muted"
            style={{ borderColor: activeStatusFilter !== "全部" ? "var(--primary)" : "var(--border)", color: activeStatusFilter !== "全部" ? "var(--primary)" : "var(--muted-foreground)" }}
            title={language === "en" ? "Filter" : "筛选"}>
            <Filter size={14} />
          </button>
          {showFilter && (
            <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border bg-card p-2 shadow-xl" style={{ borderColor: "var(--border)" }}>
              {statusOptions.map((status) => (
                <button key={status.value} onClick={() => { onFilterStatus?.(status.value); setShowFilter(false); }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-muted"
                  style={{ background: activeStatusFilter === status.value ? "var(--secondary)" : "transparent", color: activeStatusFilter === status.value ? "var(--primary)" : "var(--foreground)", fontWeight: activeStatusFilter === status.value ? 600 : 400 }}>
                  {language === "en" ? status.en : status.zh}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setShowNotif(v => !v)}
            className="relative p-1.5 rounded-lg border transition-colors hover:bg-muted"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            title={language === "en" ? "Notifications" : "通知"}>
            <Bell size={14} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
          </button>
          {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}
        </div>

        {onAdd && (
          <button onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:opacity-90"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontWeight: 500 }}>
            <Plus size={13} />
            {addLabel ?? (language === "en" ? "New Order" : "新建订单")}
          </button>
        )}
      </div>
    </div>
  );
}
