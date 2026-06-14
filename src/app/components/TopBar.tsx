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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelEn(date: Date) {
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function monthLabelZh(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function operationalPeriods() {
  const today = new Date();
  const etaMonth = addDays(today, 18);
  const months = [etaMonth, today, addMonths(today, -1)]
    .filter((date, index, all) => all.findIndex((item) => monthKey(item) === monthKey(date)) === index)
    .map((date) => ({ key: monthKey(date), en: monthLabelEn(date), zh: monthLabelZh(date) }));
  return [...months, { key: `YTD ${today.getFullYear()}`, en: `YTD ${today.getFullYear()}`, zh: `${today.getFullYear()}年至今` }];
}

export function TopBar({ title, titleEn, language, onToggleLanguage, onAdd, addLabel, onSearch, onExport, activeStatusFilter = "全部", onFilterStatus }: TopBarProps) {
  const [searchVal, setSearchVal] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const periods = operationalPeriods();
  const [activePeriod, setActivePeriod] = useState(periods[0].key);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }

  function handleSearch(value: string) {
    setSearchVal(value);
    onSearch?.(value);
  }

  function handleExport() {
    if (onExport) {
      onExport();
      return;
    }
    const csv = language === "en"
      ? "Order ID,Customer,Status,Amount\nWB-260701-SAMPLE,Sample Customer,Pending,CAD $2,000"
      : "订单号,客户,状态,金额\nWB-260701-SAMPLE,示例客户,待派送,CAD $2,000";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-3 px-6 py-3.5 bg-card border-b relative" style={{ borderColor: "var(--border)" }}>
      <div className="mr-2">
        <div className="text-sm" style={{ fontWeight: 600, color: "var(--foreground)" }}>{title}</div>
        {titleEn && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{titleEn}</div>}
      </div>

      <div className="w-px h-8" style={{ background: "var(--border)" }} />

      {periods.map((period, index) => (
        <button
          key={period.key}
          onClick={() => setActivePeriod(period.key)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
          style={{
            background: activePeriod === period.key ? "var(--secondary)" : "transparent",
            color: activePeriod === period.key ? "var(--primary)" : "var(--muted-foreground)",
            fontWeight: activePeriod === period.key ? 500 : 400,
            border: activePeriod === period.key ? "1px solid var(--primary)30" : "1px solid transparent",
          }}
        >
          {index === 0 && <Calendar size={11} />}
          {language === "en" ? period.en : period.zh}
        </button>
      ))}

      <div className="flex-1 max-w-xs relative ml-1">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
        <input
          value={searchVal}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder={language === "en" ? "Search orders, customers, drivers..." : "搜索订单、客户、司机..."}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs outline-none transition-all"
          style={{ borderColor: "var(--border)", background: "var(--input-background)", color: "var(--foreground)" }}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onToggleLanguage}
          className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:bg-muted"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", fontWeight: 600 }}
          title={language === "en" ? "Switch to Chinese" : "切换到英文"}
        >
          <Languages size={13} />
          {language === "en" ? "Chinese" : "English"}
        </button>
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-lg border transition-colors hover:bg-muted"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          title={language === "en" ? "Refresh data" : "刷新数据"}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>
        <button
          onClick={handleExport}
          className="p-1.5 rounded-lg border transition-colors hover:bg-muted"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          title={language === "en" ? "Export data" : "导出数据"}
        >
          <Download size={14} />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowFilter((value) => !value)}
            className="p-1.5 rounded-lg border transition-colors hover:bg-muted"
            style={{ borderColor: activeStatusFilter !== "全部" ? "var(--primary)" : "var(--border)", color: activeStatusFilter !== "全部" ? "var(--primary)" : "var(--muted-foreground)" }}
            title={language === "en" ? "Filter" : "筛选"}
          >
            <Filter size={14} />
          </button>
          {showFilter && (
            <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border bg-card p-2 shadow-xl" style={{ borderColor: "var(--border)" }}>
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  onClick={() => { onFilterStatus?.(status.value); setShowFilter(false); }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-muted"
                  style={{ background: activeStatusFilter === status.value ? "var(--secondary)" : "transparent", color: activeStatusFilter === status.value ? "var(--primary)" : "var(--foreground)", fontWeight: activeStatusFilter === status.value ? 600 : 400 }}
                >
                  {language === "en" ? status.en : status.zh}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotif((value) => !value)}
            className="relative p-1.5 rounded-lg border transition-colors hover:bg-muted"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            title={language === "en" ? "Notifications" : "通知"}
          >
            <Bell size={14} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
          </button>
          {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}
        </div>

        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:opacity-90"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontWeight: 500 }}
          >
            <Plus size={13} />
            {addLabel ?? (language === "en" ? "New Order" : "新建订单")}
          </button>
        )}
      </div>
    </div>
  );
}
