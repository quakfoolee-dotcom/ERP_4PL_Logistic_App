import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import type { AppLanguage } from "../i18n";
import { buildOperationsProjection } from "../domain/operationsProjection";
import { demoErpSeed } from "../mocks/erpSeed";

const operationsProjection = buildOperationsProjection(demoErpSeed);
const projectedPayrollDrivers = operationsProjection.payrollDrivers;
const projectedReimbursements = operationsProjection.reimbursements;

// Real drivers from Nov 2025 transport log — CAD
const drivers = [
  { id: "DRV-AF", name: "AF", phone: "647-***-**21", vehicle: "大车 Freightliner", type: "Long-Haul FTL", orders: 52, distance: "8,420km", rating: 4.9, base: "CAD $4,680", bonus: "CAD $520", fuel: "CAD $780", other: "CAD $260", total: "CAD $6,240", status: "待结算", period: "2025-11" },
  { id: "DRV-AD", name: "AD (Straightship)", phone: "647-***-**88", vehicle: "小车 Transit Van", type: "Local Daily", orders: 88, distance: "2,840km", rating: 4.7, base: "CAD $4,950", bonus: "CAD $0", fuel: "CAD $0", other: "CAD $560", total: "CAD $5,510", status: "已结算", period: "2025-11" },
  { id: "DRV-LH", name: "LH", phone: "905-***-**44", vehicle: "大车 Kenworth", type: "FBA Delivery", orders: 38, distance: "5,640km", rating: 4.8, base: "CAD $3,840", bonus: "CAD $240", fuel: "CAD $290", other: "CAD $190", total: "CAD $4,560", status: "已结算", period: "2025-11" },
  { id: "DRV-LF", name: "LF", phone: "416-***-**67", vehicle: "大车 F-650", type: "FBA Delivery", orders: 31, distance: "4,280km", rating: 4.8, base: "CAD $3,100", bonus: "CAD $465", fuel: "CAD $155", other: "CAD $0", total: "CAD $3,720", status: "待结算", period: "2025-11" },
  { id: "DRV-WH", name: "WH (Jeff)", phone: "905-***-**92", vehicle: "小车 Transit Van", type: "Sysco / Warehouse", orders: 45, distance: "3,120km", rating: 4.9, base: "CAD $3,000", bonus: "CAD $375", fuel: "CAD $0", other: "CAD $0", total: "CAD $3,375", status: "已结算", period: "2025-11" },
];

const earningsData = projectedPayrollDrivers.map(d => ({
  name: d.name.split(" ")[0],
  "Base Pay": parseInt(d.base.replace(/[^0-9]/g, "")),
  "Bonus/Wait": parseInt(d.bonus.replace(/[^0-9]/g, "")),
  "Fuel/Other": parseInt(d.fuel.replace(/[^0-9]/g, "")) + parseInt(d.other.replace(/[^0-9]/g, "")),
}));

// Real reimbursements / wait-time claims from Nov 2025 run notes
const reimbursements = [
  { id: "EXP-2511-0095", driver: "AF", type: "Wait Time (7.5H)", amount: "CAD $137.50", route: "YYZ7 Concord (AP-QX)", date: "2025-11-07", status: "已批准", receipt: "Uploaded" },
  { id: "EXP-2511-0094", driver: "AD", type: "Cage Handling Fee", amount: "CAD $85.00", route: "Scarborough (Straightship)", date: "2025-11-10", status: "已批准", receipt: "Uploaded" },
  { id: "EXP-2511-0093", driver: "LH", type: "Wait Time (14H)", amount: "CAD $205.00", route: "Saint-Laurent QC (AP-PDN)", date: "2025-11-29", status: "待审核", receipt: "Uploaded" },
  { id: "EXP-2511-0092", driver: "AF", type: "Wait Time (14H overnight)", amount: "CAD $505.00", route: "Saint-Laurent QC (AP-LT)", date: "2025-11-24", status: "已批准", receipt: "Uploaded" },
  { id: "EXP-2511-0091", driver: "WH", type: "Tailgate Fee (尾板)", amount: "CAD $80.00", route: "Milton Sysco (WH-Jeff)", date: "2025-11-29", status: "待审核", receipt: "Uploaded" },
];

const statusStyle: Record<string, { bg: string; color: string }> = {
  "已结算": { bg: "#D1FAE5", color: "#059669" },
  "待结算": { bg: "#FEF3C7", color: "#D97706" },
  "异常": { bg: "#FEE2E2", color: "#DC2626" },
  "待审核": { bg: "#FEF3C7", color: "#D97706" },
  "已批准": { bg: "#D1FAE5", color: "#059669" },
  "已拒绝": { bg: "#FEE2E2", color: "#DC2626" },
};

export function DriverPayroll({ language = "zh" }: { language?: AppLanguage }) {
  void language;
  const [reimbursementStatus, setReimbursementStatus] = useState<Record<string, string>>({});
  const [driverStatuses, setDriverStatuses] = useState<Record<string, string>>({});

  function getReimbStatus(id: string, defaultStatus: string) {
    return reimbursementStatus[id] ?? defaultStatus;
  }

  function getDriverStatus(id: string, defaultStatus: string) {
    return driverStatuses[id] ?? defaultStatus;
  }

  function settleDriver(id: string) {
    setDriverStatuses(prev => ({ ...prev, [id]: "已结算" }));
  }

  function settleAll() {
    const updates: Record<string, string> = {};
    let count = 0;
    projectedPayrollDrivers.forEach(d => { if ((driverStatuses[d.id] ?? d.status) === "待结算") { updates[d.id] = "已结算"; count++; } });
    setDriverStatuses(prev => ({ ...prev, ...updates }));
    if (count > 0) toast.success(`Settled ${count} driver${count > 1 ? "s" : ""}`, { description: "All pending payroll marked as settled." });
    else toast.info("No pending drivers to settle");
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* KPI strip */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {[
          { label: "本月薪资总额 Total Payroll", value: "CAD $23,405", color: "#1C64F2" },
          { label: "Active Drivers", value: "5 drivers", color: "#0D9488" },
          { label: "待结算 Pending Settlement", value: "CAD $9,960", color: "#F59E0B" },
          { label: "待审报销 Pending Claims", value: "CAD $285", color: "#8B5CF6" },
        ].map((k, i) => (
          <div key={i} className="bg-card rounded-xl border p-4 flex items-center justify-between"
            style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div>
              <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{k.label}</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 340px" }}>
        <div className="space-y-4">
          {/* Payroll table */}
          <div className="bg-card rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <span className="text-sm" style={{ fontWeight: 600 }}>司机薪资明细</span>
                <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Driver Payroll — Nov 2025 (CAD)</span>
              </div>
              <button onClick={settleAll}
                className="text-xs px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                style={{ background: "var(--primary)", color: "white", fontWeight: 500 }}>
                Batch Settle All
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                  {["Driver", "Contact", "Vehicle / Route Type", "Runs", "Distance", "Rating", "Base Pay", "Wait/Bonus", "Fuel/Other", "Total", "Status"].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left whitespace-nowrap"
                      style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projectedPayrollDrivers.map((d, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => toast.info(`${d.name} — Payroll Detail`, { description: `${d.orders} runs · ${d.distance} · Total: ${d.total} · Status: ${getDriverStatus(d.id, d.status)}` })}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs" style={{ fontWeight: 700 }}>
                          {d.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs" style={{ fontWeight: 500 }}>{d.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "monospace" }}>{d.phone}</td>
                    <td className="px-3 py-2.5">
                      <div style={{ fontSize: 11 }}>{d.vehicle}</div>
                      <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{d.type}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ fontFamily: "monospace" }}>{d.orders}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ fontFamily: "monospace" }}>{d.distance}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5">
                        <Star size={11} fill="#F59E0B" color="#F59E0B" />
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#D97706" }}>{d.rating}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: "monospace" }}>{d.base}</td>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: "monospace", color: "#059669" }}>{d.bonus}</td>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: "monospace", color: "#D97706" }}>{d.fuel}</td>
                    <td className="px-3 py-2.5" style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>{d.total}</td>
                    <td className="px-3 py-2.5">
                      {getDriverStatus(d.id, d.status) === "待结算" ? (
                        <button onClick={(e) => { e.stopPropagation(); settleDriver(d.id); toast.success(`${d.name} settled`, { description: `${d.total} marked as settled` }); }}
                          className="px-2 py-0.5 rounded-full text-xs cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ background: statusStyle["待结算"]?.bg, color: statusStyle["待结算"]?.color, fontWeight: 500, fontSize: 11 }}>
                          Settle →
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs"
                          style={{ background: statusStyle[getDriverStatus(d.id, d.status)]?.bg, color: statusStyle[getDriverStatus(d.id, d.status)]?.color, fontWeight: 500, fontSize: 11 }}>
                          {getDriverStatus(d.id, d.status)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reimbursements */}
          <div className="bg-card rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <span className="text-sm" style={{ fontWeight: 600 }}>报销 / 附加费申请</span>
                <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Reimbursements & Wait-Time Claims (CAD)</span>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                  {["Claim ID", "Driver", "Type", "Amount (CAD)", "Route / Notes", "Date", "Receipt", "Status", "Action"].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left whitespace-nowrap"
                      style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projectedReimbursements.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => toast.info(`${r.id} — ${r.type}`, { description: `Driver: ${r.driver} · ${r.amount} · Route: ${r.route} · Status: ${getReimbStatus(r.id, r.status)}` })}>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: "monospace", color: "var(--primary)", fontWeight: 600 }}>{r.id}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ fontWeight: 500 }}>{r.driver}</td>
                    <td className="px-3 py-2.5 text-xs">{r.type}</td>
                    <td className="px-3 py-2.5" style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>{r.amount}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{r.route}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ fontFamily: "monospace", color: "var(--muted-foreground)" }}>{r.date}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs" style={{ color: "#059669" }}>{r.receipt}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs"
                        style={{ background: statusStyle[getReimbStatus(r.id, r.status)]?.bg, color: statusStyle[getReimbStatus(r.id, r.status)]?.color, fontWeight: 500, fontSize: 11 }}>
                        {getReimbStatus(r.id, r.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {getReimbStatus(r.id, r.status) === "待审核" && (
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setReimbursementStatus(prev => ({ ...prev, [r.id]: "已批准" })); toast.success(`${r.id} approved`, { description: `${r.amount} approved for ${r.driver}` }); }}
                            className="text-xs px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
                            style={{ background: "#D1FAE5", color: "#059669" }}>Approve</button>
                          <button onClick={(e) => { e.stopPropagation(); setReimbursementStatus(prev => ({ ...prev, [r.id]: "已拒绝" })); toast.error(`${r.id} rejected`, { description: `Reimbursement for ${r.driver} rejected` }); }}
                            className="text-xs px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
                            style={{ background: "#FEE2E2", color: "#DC2626" }}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-4"
            style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="mb-3">
              <span className="text-sm" style={{ fontWeight: 600 }}>薪资构成</span>
              <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Pay Breakdown (CAD $)</div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={earningsData} layout="vertical" barSize={14} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={50} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`CAD $${v.toLocaleString()}`, ""]} />
                <Bar dataKey="Base Pay" name="Base Pay" fill="#1C64F2" radius={[0, 2, 2, 0]} stackId="a" />
                <Bar dataKey="Bonus/Wait" name="Bonus/Wait" fill="#10B981" radius={[0, 2, 2, 0]} stackId="a" />
                <Bar dataKey="Fuel/Other" name="Fuel/Other" fill="#F59E0B" radius={[0, 2, 2, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl border p-4"
            style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="text-sm mb-3" style={{ fontWeight: 600 }}>结算状态 Settlement</div>
            <div className="space-y-2">
              {[
                { label: "已结算 Settled", count: 3, pct: 60, color: "#10B981" },
                { label: "待结算 Pending", count: 2, pct: 40, color: "#F59E0B" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <div className="flex-1 text-xs" style={{ color: "var(--foreground)" }}>{s.label}</div>
                  <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600 }}>{s.count} drivers</span>
                  <div className="w-24 rounded-full h-1.5" style={{ background: "var(--muted)" }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Rate card reference */}
            <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="text-xs mb-2" style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>Rate Card (Partner Quote)</div>
              {[
                { zone: "YYZ Series (Toronto)", rate: "CAD $35/P + wait" },
                { zone: "YOO1 / YHM1 (Hamilton/Oak)", rate: "CAD $40/P + wait" },
                { zone: "YXU1 / YGK1 (London/Kingston)", rate: "CAD $50/P + wait" },
                { zone: "YOW1 / YOW3 (Ottawa)", rate: "CAD $80/P (or $1,150/load)" },
                { zone: "Large truck within 50km", rate: "CAD $300 flat" },
                { zone: "Airport → CBWS (small/large)", rate: "CAD $200 / $300" },
              ].map((r, i) => (
                <div key={i} className="flex justify-between items-center py-1 border-b" style={{ borderColor: "var(--border)" }}>
                  <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{r.zone}</span>
                  <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 600, color: "var(--foreground)" }}>{r.rate}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
