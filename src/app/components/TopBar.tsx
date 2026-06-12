import { Search, Bell, RefreshCw, Download, Plus, Filter, Calendar } from "lucide-react";
import { useState } from "react";
import { NotificationPanel } from "./NotificationPanel";

interface TopBarProps {
  title: string;
  titleEn: string;
  onAdd?: () => void;
  addLabel?: string;
  onSearch?: (q: string) => void;
  onExport?: () => void;
  activeStatusFilter?: string;
  onFilterStatus?: (status: string) => void;
}

export function TopBar({ title, titleEn, onAdd, addLabel = "新建订单", onSearch, onExport, activeStatusFilter = "全部", onFilterStatus }: TopBarProps) {
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
    const csv = "订单号,客户,状态,金额\nWB-260408-CSGU6675337,CSGU6675337,运输中,CAD $1,980\nWB-260405-ZCSU6522960,ZCSU6522960,已完成,CAD $3,279";
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
        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{titleEn}</div>
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
          {p}
        </button>
      ))}

      {/* Search */}
      <div className="flex-1 max-w-xs relative ml-1">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
        <input
          value={searchVal}
          onChange={e => handleSearch(e.target.value)}
          placeholder="搜索订单、客户、司机..."
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs outline-none transition-all"
          style={{ borderColor: "var(--border)", background: "var(--input-background)", color: "var(--foreground)" }}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button onClick={handleRefresh}
          className="p-1.5 rounded-lg border transition-colors hover:bg-muted"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          title="刷新数据">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>
        <button onClick={handleExport}
          className="p-1.5 rounded-lg border transition-colors hover:bg-muted"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          title="导出数据">
          <Download size={14} />
        </button>
        <div className="relative">
          <button onClick={() => setShowFilter((value) => !value)}
            className="p-1.5 rounded-lg border transition-colors hover:bg-muted"
            style={{ borderColor: activeStatusFilter !== "全部" ? "var(--primary)" : "var(--border)", color: activeStatusFilter !== "全部" ? "var(--primary)" : "var(--muted-foreground)" }}
            title="筛选">
            <Filter size={14} />
          </button>
          {showFilter && (
            <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border bg-card p-2 shadow-xl" style={{ borderColor: "var(--border)" }}>
              {["全部", "运输中", "已完成", "待派送", "异常"].map((status) => (
                <button key={status} onClick={() => { onFilterStatus?.(status); setShowFilter(false); }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-muted"
                  style={{ background: activeStatusFilter === status ? "var(--secondary)" : "transparent", color: activeStatusFilter === status ? "var(--primary)" : "var(--foreground)", fontWeight: activeStatusFilter === status ? 600 : 400 }}>
                  {status}
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
            title="通知">
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
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}
