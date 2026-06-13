import { useState } from "react";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Legend
} from "recharts";
import type { AppLanguage } from "../i18n";

// Real-based CAD revenue (in $K) — GTA FBA Logistics operation
const trendByPeriod: Record<string, { month: string; revenue: number; orders: number }[]> = {
  "月度": [
    { month: "Jan", revenue: 38.4, orders: 162 },
    { month: "Feb", revenue: 42.6, orders: 178 },
    { month: "Mar", revenue: 58.8, orders: 214 },
    { month: "Apr", revenue: 62.4, orders: 228 },
    { month: "May", revenue: 56.7, orders: 201 },
    { month: "Jun", revenue: 49.2, orders: 186 },
  ],
  "季度": [
    { month: "Q3 2024", revenue: 98.4, orders: 412 },
    { month: "Q4 2024", revenue: 118.6, orders: 526 },
    { month: "Q1 2025", revenue: 112.2, orders: 490 },
    { month: "Q2 2025", revenue: 134.8, orders: 568 },
    { month: "Q3 2025", revenue: 142.6, orders: 602 },
    { month: "Q4 2025", revenue: 156.4, orders: 638 },
  ],
  "年度": [
    { month: "2022", revenue: 284, orders: 1240 },
    { month: "2023", revenue: 368, orders: 1680 },
    { month: "2024", revenue: 452, orders: 2028 },
    { month: "2025", revenue: 548, orders: 2408 },
    { month: "2026 YTD", revenue: 308, orders: 1169 },
  ],
};

const buRadar = [
  { subject: "Completion", FTL: 96, LTL: 92, FBA: 97 },
  { subject: "On-Time", FTL: 94, LTL: 89, FBA: 95 },
  { subject: "Client Sat.", FTL: 88, LTL: 85, FBA: 92 },
  { subject: "Cost Ctrl", FTL: 84, LTL: 78, FBA: 86 },
  { subject: "Exception", FTL: 96, LTL: 91, FBA: 98 },
  { subject: "Revenue ↑", FTL: 85, LTL: 80, FBA: 90 },
];

const routePerf = [
  { route: "Brampton → Scarborough (Daily)", orders: 264, revenue: "CAD $54.2K", onTime: "100%", margin: "24.8%" },
  { route: "Brampton → Ottawa YOW1/YOW3", orders: 48, revenue: "CAD $28.4K", onTime: "91.7%", margin: "38.5%" },
  { route: "Brampton → YYZ9 Amazon (Mississauga)", orders: 126, revenue: "CAD $24.8K", onTime: "96.8%", margin: "42.3%" },
  { route: "Brampton → YYZ7 Amazon (Concord)", orders: 84, revenue: "CAD $16.5K", onTime: "94.2%", margin: "39.1%" },
  { route: "Brampton → YHM1 Hamilton", orders: 38, revenue: "CAD $8.3K", onTime: "97.4%", margin: "44.6%" },
  { route: "Brampton → Montreal QC", orders: 18, revenue: "CAD $9.4K", onTime: "88.9%", margin: "45.2%" },
];

const customerRanking = [
  { rank: 1, customer: "AP-Straightship", revenue: "CAD $54.2K", orders: 264, growth: "+12.4%", tier: "铂金" },
  { rank: 2, customer: "TD-JW", revenue: "CAD $32.8K", orders: 145, growth: "+8.6%", tier: "金牌" },
  { rank: 3, customer: "AP-DB", revenue: "CAD $28.4K", orders: 48, growth: "+22.3%", tier: "金牌" },
  { rank: 4, customer: "ZCSU / FBA Containers", revenue: "CAD $18.9K", orders: 24, growth: "+41.2%", tier: "银牌" },
  { rank: 5, customer: "AP-LLL (Vaughan)", revenue: "CAD $15.6K", orders: 98, growth: "+5.8%", tier: "银牌" },
  { rank: 6, customer: "AP-PDN (Montreal)", revenue: "CAD $12.3K", orders: 28, growth: "+18.9%", tier: "银牌" },
];

const tierColors: Record<string, { bg: string; color: string }> = {
  "铂金": { bg: "#EDE9FE", color: "#7C3AED" },
  "金牌": { bg: "#FEF3C7", color: "#D97706" },
  "银牌": { bg: "#F1F5F9", color: "#64748B" },
};

export function AnalyticsView({ language = "zh" }: { language?: AppLanguage }) {
  void language;
  const [period, setPeriod] = useState("月度");
  const trendData = trendByPeriod[period];
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* Trend line */}
      <div className="bg-card rounded-xl border p-4"
        style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm" style={{ fontWeight: 600 }}>年度运营趋势</span>
            <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Annual Operations Trend — 2025</span>
          </div>
          <div className="flex gap-1">
            {["月度", "季度", "年度"].map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className="px-2.5 py-1 rounded text-xs transition-colors"
                style={{ background: period === p ? "var(--primary)" : "var(--muted)", color: period === p ? "white" : "var(--muted-foreground)" }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line key="line-revenue" type="monotone" dataKey="revenue" name="营收(万)" stroke="#1C64F2" strokeWidth={2.5} dot={false} />
            <Line key="line-orders" type="monotone" dataKey="orders" name="订单数" stroke="#10B981" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Charts row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* BU radar */}
        <div className="bg-card rounded-xl border p-4"
          style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="mb-2">
            <span className="text-sm" style={{ fontWeight: 600 }}>业务单元绩效雷达</span>
            <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>BU Performance Radar</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={buRadar}>
              <PolarGrid stroke="rgba(0,0,0,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#64748b" }} />
              <PolarRadiusAxis angle={90} domain={[70, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} />
              <Radar key="radar-ftl" name="FTL" dataKey="FTL" stroke="#1C64F2" fill="#1C64F2" fillOpacity={0.15} strokeWidth={2} />
              <Radar key="radar-ltl" name="LTL" dataKey="LTL" stroke="#0D9488" fill="#0D9488" fillOpacity={0.1} strokeWidth={2} />
              <Radar key="radar-fba" name="FBA" dataKey="FBA" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Route performance */}
        <div className="bg-card rounded-xl border p-4"
          style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="mb-3">
            <span className="text-sm" style={{ fontWeight: 600 }}>热门路线绩效</span>
            <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Top Route Performance</span>
          </div>
          <div className="space-y-2.5">
            {routePerf.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-secondary/60 transition-colors"
                style={{ background: i === 0 ? "var(--secondary)" : "transparent" }}
                onClick={() => toast.info(r.route, { description: `${r.orders} orders · ${r.revenue} · On-Time: ${r.onTime} · Margin: ${r.margin}` })}>
                <div className="w-5 h-5 rounded flex items-center justify-center text-xs"
                  style={{ background: i < 3 ? "#1C64F2" : "var(--muted)", color: i < 3 ? "white" : "var(--muted-foreground)", fontWeight: 700 }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs" style={{ fontWeight: 500 }}>{r.route}</div>
                  <div className="flex gap-2 mt-0.5">
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{r.orders}单</span>
                    <span style={{ fontSize: 10, color: "#10B981" }}>准时:{r.onTime}</span>
                    <span style={{ fontSize: 10, color: "#8B5CF6" }}>毛利:{r.margin}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", color: "#1D4ED8" }}>{r.revenue}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer ranking */}
      <div className="bg-card rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <span className="text-sm" style={{ fontWeight: 600 }}>客户价值排名</span>
            <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Customer Revenue Ranking</span>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
              {["排名", "客户名称", "累计营收", "订单数", "同比增长", "客户层级"].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left whitespace-nowrap"
                  style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customerRanking.map((c, i) => (
              <tr key={i} className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                style={{ borderColor: "var(--border)" }}
                onClick={() => toast.info(`${c.customer} — ${c.tier} Customer`, { description: `${c.orders} orders · ${c.revenue} · YoY Growth: ${c.growth}` })}>
                <td className="px-4 py-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    style={{ background: i === 0 ? "#FEF3C7" : i === 1 ? "#F1F5F9" : i === 2 ? "#FFF7ED" : "var(--muted)", color: i < 3 ? "#D97706" : "var(--muted-foreground)", fontWeight: 700 }}>
                    {c.rank}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-sm" style={{ fontWeight: 600 }}>{c.customer}</td>
                <td className="px-4 py-2.5" style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#1D4ED8" }}>{c.revenue}</td>
                <td className="px-4 py-2.5 text-sm" style={{ fontFamily: "monospace" }}>{c.orders}</td>
                <td className="px-4 py-2.5">
                  <span style={{ fontSize: 13, fontWeight: 600, color: c.growth.startsWith("+") ? "#059669" : "#DC2626", fontFamily: "monospace" }}>
                    {c.growth}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-xs"
                    style={{ background: tierColors[c.tier]?.bg, color: tierColors[c.tier]?.color, fontWeight: 600, fontSize: 11 }}>
                    {c.tier}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
