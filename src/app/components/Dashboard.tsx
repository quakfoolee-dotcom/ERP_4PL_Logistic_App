import { KpiCard } from "./KpiCard";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Truck, DollarSign, FileText, AlertTriangle, CheckCircle2, MapPin, Star
} from "lucide-react";
import { useState } from "react";
import { OrderDetailDrawer } from "./OrderDetailDrawer";
import { OrderEditModal } from "./TransportOrders";
import type { TransportOrder } from "../data/transportOrders";
import { toast } from "sonner";
import { orderStatusLabel, pick, podLabel, type AppLanguage } from "../i18n";

// Monthly revenue (CAD $K) — Brampton 4PL FBA ops Jan–Jun 2026
const revenueData = [
  { month: "Jan", revenue: 38.4, cost: 26.8, profit: 11.6 },
  { month: "Feb", revenue: 42.6, cost: 29.4, profit: 13.2 },
  { month: "Mar", revenue: 58.8, cost: 39.6, profit: 19.2 },
  { month: "Apr", revenue: 62.4, cost: 42.1, profit: 20.3 },
  { month: "May", revenue: 56.7, cost: 38.2, profit: 18.5 },
  { month: "Jun", revenue: 49.2, cost: 32.8, profit: 16.4 },
];

const orderStatusData = [
  { zh: "已完成", en: "Delivered", value: 142, color: "#10B981" },
  { zh: "运输中", en: "In Transit", value: 28, color: "#1C64F2" },
  { zh: "待派送", en: "Pending", value: 9, color: "#F59E0B" },
  { zh: "异常", en: "Exception", value: 7, color: "#EF4444" },
];

const buPerformance = [
  { bu: "AP-Straightship", orders: 88, revenue: 54.2, completion: 100.0 },
  { bu: "TD-JW", orders: 45, revenue: 32.8, completion: 97.8 },
  { bu: "AP-DB", orders: 12, revenue: 18.4, completion: 91.7 },
  { bu: "AP-LLL", orders: 38, revenue: 12.8, completion: 94.7 },
  { bu: "TD-JEFF (Sysco)", orders: 45, revenue: 8.4, completion: 98.5 },
];

const recentOrders = [
  { id: "WB-260405-ZCSU", customer: "ZCSU6522960", route: "Brampton #25 → YYZ9 Amazon (49P)", driver: "LH / AF", status: "已完成", amount: "CAD $3,279", pod: "已签收", date: "2026-04-05" },
  { id: "WB-260423-BEAU", customer: "BEAU6280647", route: "Brampton #10 → YHM1 Hamilton (36P)", driver: "LH", status: "已完成", amount: "CAD $2,066", pod: "已签收", date: "2026-04-23" },
  { id: "WB-260408-CSGU", customer: "CSGU6675337", route: "Brampton #10 → YYZ9 Amazon (38P)", driver: "LH", status: "运输中", amount: "CAD $1,980", pod: "待确认", date: "2026-04-08" },
  { id: "WB-251124-LT", customer: "AP-LT", route: "Brampton #25 → Saint-Laurent QC (21P)", driver: "AF", status: "已完成", amount: "CAD $2,320", pod: "已签收", date: "2025-11-24" },
  { id: "WB-251119-JEFF", customer: "TD-JEFF", route: "Brampton #25 → Mississauga Walmart (27P)", driver: "LH", status: "已完成", amount: "CAD $2,095", pod: "已签收", date: "2025-11-19" },
  { id: "WB-251118-PDN", customer: "AP-PDN", route: "Brampton → Markham → Saint-Laurent (23P)", driver: "AF", status: "已完成", amount: "CAD $1,500", pod: "已签收", date: "2025-11-18" },
  { id: "WB-251103-DB", customer: "AP-DB", route: "Brampton #25 → Concord / YOW1 Ottawa (22P)", driver: "AF", status: "异常", amount: "CAD $1,300", pod: "争议中", date: "2025-11-03" },
];

const topDrivers = [
  { name: "AF", orders: 52, rating: 4.9, earnings: "CAD $6,240", completion: "98.1%" },
  { name: "AD (Straightship)", orders: 88, rating: 4.7, earnings: "CAD $5,510", completion: "100%" },
  { name: "LH", orders: 38, rating: 4.8, earnings: "CAD $4,560", completion: "97.4%" },
  { name: "WH (Jeff)", orders: 45, rating: 4.9, earnings: "CAD $3,375", completion: "100%" },
  { name: "LF", orders: 31, rating: 4.8, earnings: "CAD $3,720", completion: "96.8%" },
];

const weeklyOrders = [
  { day: "Mon", orders: 28 }, { day: "Tue", orders: 35 }, { day: "Wed", orders: 31 },
  { day: "Thu", orders: 42 }, { day: "Fri", orders: 38 }, { day: "Sat", orders: 15 }, { day: "Sun", orders: 8 },
];

const statusStyle: Record<string, { bg: string; color: string }> = {
  "已完成": { bg: "#D1FAE5", color: "#059669" },
  "运输中": { bg: "#DBEAFE", color: "#1D4ED8" },
  "待派送": { bg: "#FEF3C7", color: "#D97706" },
  "异常": { bg: "#FEE2E2", color: "#DC2626" },
};

function SectionHeader({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <span className="text-sm" style={{ fontWeight: 600, color: "var(--foreground)" }}>{label}</span>
      </div>
      {action && (
        <button onClick={onAction} className="text-xs hover:underline" style={{ color: "var(--primary)" }}>{action}</button>
      )}
    </div>
  );
}

interface DashboardProps {
  orders: TransportOrder[];
  onNavigate?: (page: string) => void;
  onUpdateOrder?: (order: TransportOrder) => void;
  language: AppLanguage;
}

function moneyValue(value: string) {
  return Number(value.replace(/[^0-9.-]/g, "")) || 0;
}

function formatCAD(value: number) {
  return `CAD $${value.toLocaleString("en-CA")}`;
}

export function Dashboard({ orders, onNavigate, onUpdateOrder, language }: DashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<TransportOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<TransportOrder | null>(null);
  const recentTransportOrders = orders.slice(0, 7);

  function saveOrder(order: TransportOrder) {
    const revenue = moneyValue(order.amount);
    const cost = moneyValue(order.cost);
    const updated = { ...order, profit: formatCAD(revenue - cost) };
    onUpdateOrder?.(updated);
    setSelectedOrder((current) => current?.id === order.id ? updated : current);
    setEditingOrder(null);
    toast.success(`${order.id} updated`);
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onEdit={() => setEditingOrder(selectedOrder)}
          onUpdate={(order) => {
            onUpdateOrder?.(order as TransportOrder);
            setSelectedOrder(order as TransportOrder);
          }}
          language={language}
        />
      )}
      {editingOrder && <OrderEditModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={saveOrder} language={language} />}

      {/* KPI Row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
        <KpiCard label={pick(language, "月营收", "Monthly Revenue")} value="CAD $58.8K" sub={pick(language, "2026年3月", "Mar 2026")} trend={8.4} trendLabel={pick(language, "较上月", "vs last month")} accent="#1C64F2"
          icon={<DollarSign size={16} />} />
        <KpiCard label={pick(language, "运输订单", "Transport Orders")} value={String(orders.length)} sub={pick(language, "2026年4月 + 2025年11月", "Apr 2026 + Nov 2025")} trend={12.1} trendLabel={pick(language, "较上月", "vs last month")} accent="#0D9488"
          icon={<Truck size={16} />} />
        <KpiCard label={pick(language, "完成率", "Completion Rate")} value="94.1%" sub={pick(language, "已完成/POD", "Delivered/POD")} trend={1.2} trendLabel={pick(language, "较上月", "vs last month")} accent="#10B981"
          icon={<CheckCircle2 size={16} />} />
        <KpiCard label={pick(language, "活跃司机", "Active Drivers")} value="5" sub="AF/LH/AD/LF/WH" accent="#8B5CF6"
          icon={<MapPin size={16} />} />
        <KpiCard label={pick(language, "待开发票", "Pending Invoices")} value="CAD $18.5K" sub={pick(language, "4张发票", "4 invoices")} trend={-3.2} trendLabel={pick(language, "较上月", "vs last month")} accent="#F59E0B"
          icon={<FileText size={16} />} />
        <KpiCard label={pick(language, "拒收/异常", "Rejected/Exception")} value="7" sub={pick(language, "需跟进", "Needs follow-up")} trend={-15.4} trendLabel={pick(language, "较上月", "vs last month")} accent="#EF4444"
          icon={<AlertTriangle size={16} />} />
      </div>

      {/* Main charts row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr 300px" }}>
        <div className="bg-card rounded-xl border p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <SectionHeader label={pick(language, "收入成本趋势", "Revenue & Cost (CAD $K)")} action={pick(language, "详情 →", "Details →")} onAction={() => onNavigate?.("analytics")} />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1C64F2" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1C64F2" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} formatter={(v: number) => [`CAD $${v}K`, ""]} />
              <Area key="area-revenue" type="monotone" dataKey="revenue" name={pick(language, "收入（千加元）", "Revenue ($K)")} stroke="#1C64F2" fill="url(#revenue)" strokeWidth={2} />
              <Area key="area-profit" type="monotone" dataKey="profit" name={pick(language, "毛利（千加元）", "Gross Profit ($K)")} stroke="#10B981" fill="url(#profit)" strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <SectionHeader label={pick(language, "本周订单量", "Weekly Order Volume")} />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyOrders} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Bar key="bar-orders" dataKey="orders" name={pick(language, "订单", "Orders")} fill="#1C64F2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <SectionHeader label={pick(language, "订单状态", "Order Status")} />
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                  paddingAngle={2} dataKey="value">
                  {orderStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-1.5 mt-1">
              {orderStatusData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>{pick(language, item.zh, item.en)}</span>
                  </div>
                  <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 300px" }}>
        <div className="bg-card rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div>
              <span className="text-sm" style={{ fontWeight: 600 }}>{pick(language, "最新运输订单", "Recent Transport Orders")}</span>
            </div>
            <button onClick={() => onNavigate?.("orders")} className="text-xs hover:underline" style={{ color: "var(--primary)" }}>{pick(language, "查看全部 →", "View All →")}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                  {(language === "en" ? ["Order ID", "Customer", "Route", "Driver", "Status", "Amount (CAD)", "POD", "Date"] : ["订单号", "客户", "路线", "司机", "状态", "金额(CAD)", "POD", "日期"]).map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left" style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTransportOrders.map((order, i) => (
                  <tr key={i} onClick={() => setSelectedOrder(order)}
                    className="border-b transition-colors hover:bg-muted/40 cursor-pointer"
                    style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-2.5">
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--primary)", fontWeight: 500 }}>{order.id}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "var(--foreground)", fontWeight: 500 }}>{order.customer}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "var(--muted-foreground)", maxWidth: 200 }}>{order.origin} → {order.dest}</td>
                    <td className="px-3 py-2.5 text-xs">{order.driver}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs"
                        style={{ background: statusStyle[order.status]?.bg, color: statusStyle[order.status]?.color, fontWeight: 500, fontSize: 11 }}>
                        {orderStatusLabel(order.status, language)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: "#1D4ED8" }}>{order.amount}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs" style={{ color: order.pod === "已签收" ? "#059669" : order.pod === "争议中" ? "#DC2626" : "var(--muted-foreground)" }}>
                        {podLabel(order.pod, language)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{order.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          {/* Client Performance */}
          <div className="bg-card rounded-xl border p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <SectionHeader label={pick(language, "客户排名", "Client Performance")} action={pick(language, "分析 →", "Analyze →")} onAction={() => onNavigate?.("analytics")} />
            <div className="space-y-2.5">
              {buPerformance.map((bu, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-xs"
                    style={{ background: i < 3 ? "#1C64F2" : "var(--muted)", color: i < 3 ? "white" : "var(--muted-foreground)", fontWeight: 600, fontSize: 10 }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs" style={{ fontWeight: 500 }}>{bu.bu}</span>
                      <span className="text-xs" style={{ fontFamily: "monospace", color: "var(--muted-foreground)" }}>{bu.completion}%</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ background: "var(--muted)" }}>
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${bu.completion}%`, background: i === 0 ? "#1C64F2" : i === 1 ? "#0D9488" : i === 2 ? "#8B5CF6" : "#F59E0B" }} />
                    </div>
                  </div>
                  <div className="text-xs text-right" style={{ color: "var(--muted-foreground)", minWidth: 56, fontFamily: "monospace" }}>
                    ${bu.revenue}K
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Drivers */}
          <div className="bg-card rounded-xl border p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <SectionHeader label={pick(language, "司机绩效榜", "Top Drivers")} />
            <div className="space-y-2.5">
              {topDrivers.map((d, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    style={{ background: i === 0 ? "#FEF3C7" : "var(--muted)", color: i === 0 ? "#D97706" : "var(--muted-foreground)", fontWeight: 700 }}>
                    {d.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs" style={{ fontWeight: 500 }}>{d.name}</span>
                      <div className="flex items-center gap-0.5">
                        <Star size={10} fill="#F59E0B" color="#F59E0B" />
                        <span style={{ fontSize: 10, color: "#D97706" }}>{d.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{d.orders} {pick(language, "趟", "runs")}</span>
                      <span style={{ fontSize: 10, color: "#059669" }}>{d.completion}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", color: "var(--foreground)" }}>{d.earnings}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
