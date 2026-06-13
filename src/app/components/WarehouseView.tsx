import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Package, ArrowUpRight, ArrowDownRight, Warehouse, Scale, Copy, FileText, CheckCircle2, Unlock } from "lucide-react";
import { toast } from "sonner";
import type { AppLanguage } from "../i18n";
import { buildOperationsProjection } from "../domain/operationsProjection";
import { demoErpSeed } from "../mocks/erpSeed";

const operationsProjection = buildOperationsProjection(demoErpSeed);
const projectedHandlingFees = operationsProjection.handlingFees;
const projectedInventory = operationsProjection.inventory;
const projectedWeeklyActivity = operationsProjection.weeklyActivity;

// Real FBA container data from 2026 dispatch sheet (CAD)
const handlingFees = [
  { id: "ZCSU6522960", customer: "FBA Seller", fbaShipment: "FBA196F8XLQJ", type: "分货+二次打板", units: 1231, cbm: 65.48, pallets: "49P", dest: "YYZ9 Amazon", repalletize: "8P × CAD $8", total: "CAD $3,279", status: "已结算", arrived: "2026-03-31", dispatched: "2026-04-05" },
  { id: "CSGU6675337", customer: "FBA Seller", fbaShipment: "FBA196JLPMF8", type: "分货打板", units: 1940, cbm: 68.00, pallets: "38P", dest: "YYZ9 Amazon", repalletize: "—", total: "CAD $2,966", status: "已结算", arrived: "2026-04-07", dispatched: "2026-04-08" },
  { id: "BEAU6280647", customer: "FBA Seller", fbaShipment: "FBA197N70G67", type: "分货打板", units: 1402, cbm: 68.28, pallets: "36P", dest: "YHM1 Hamilton", repalletize: "—", total: "CAD $2,066", status: "已结算", arrived: "2026-04-22", dispatched: "2026-04-23" },
  { id: "HMMU7089094", customer: "FBA Seller", fbaShipment: "FBA198RW2CY1", type: "分货打板", units: 1032, cbm: 0, pallets: "46P", dest: "YYZ9 Amazon", repalletize: "—", total: "CAD $2,065", status: "待结算", arrived: "2026-04-27", dispatched: "2026-04-28" },
  { id: "HMMU4464340", customer: "FBA Seller", fbaShipment: "FBA198RTQ79W", type: "分货打板", units: 867, cbm: 0, pallets: "40P", dest: "YYZ9 Amazon", repalletize: "—", total: "CAD $2,018", status: "待结算", arrived: "2026-04-28", dispatched: "2026-04-29" },
  { id: "SMCU1046120", customer: "FBA Seller", fbaShipment: "Multi-Shipment", type: "分货+多仓派送", units: 1261, cbm: 19.25, pallets: "20P", dest: "YYZ4/YYZ7/YXU1/YOW1", repalletize: "—", total: "CAD $1,782", status: "已结算", arrived: "2026-03-02", dispatched: "2026-03-06" },
  { id: "CAIU4441789", customer: "FBA Seller", fbaShipment: "Multi-Shipment", type: "分货+多仓派送", units: 840, cbm: 11.35, pallets: "14P", dest: "YYZ4/YOO1/YOW3", repalletize: "—", total: "CAD $1,650", status: "已结算", arrived: "2026-03-06", dispatched: "2026-03-08" },
  { id: "DRYU9624130", customer: "FBA Seller (换标)", fbaShipment: "FBA19CD7DG1G+FBA19DKQZNB0", type: "换标+分货", units: 1200, cbm: 29.50, pallets: "17P", dest: "YYZ4 / YYZ7 HOLD", repalletize: "换标 CAD $0.50/张", total: "CAD $850", status: "待结算", arrived: "2026-03-25", dispatched: "HOLD" },
];

// Warehouse zones — Brampton area FBA prep hub
const inventory = [
  { zone: "Whybank #25 — Main Sort", capacity: 2000, used: 1480, containers: 12, status: "正常" },
  { zone: "Whybank #10 — Overflow", capacity: 1500, used: 980, containers: 8, status: "正常" },
  { zone: "Madill 233 — Walmart DC", capacity: 800, used: 620, containers: 4, status: "接近满载" },
  { zone: "Courtneypark 310 — NETT", capacity: 600, used: 210, containers: 2, status: "正常" },
  { zone: "CBWS — Airport Relay", capacity: 400, used: 380, containers: 3, status: "预警" },
];

// Weekly FBA container inbound/outbound (units)
const weeklyActivity = [
  { day: "Mon", inbound: 2840, outbound: 1960 },
  { day: "Tue", inbound: 3200, outbound: 2600 },
  { day: "Wed", inbound: 1800, outbound: 2200 },
  { day: "Thu", inbound: 2800, outbound: 2400 },
  { day: "Fri", inbound: 3600, outbound: 3100 },
  { day: "Sat", inbound: 1200, outbound: 900 },
  { day: "Sun", inbound: 0, outbound: 0 },
];

const statusColors: Record<string, { bg: string; color: string }> = {
  "正常": { bg: "#D1FAE5", color: "#059669" },
  "预警": { bg: "#FEE2E2", color: "#DC2626" },
  "接近满载": { bg: "#FEF3C7", color: "#D97706" },
  "已结算": { bg: "#D1FAE5", color: "#059669" },
  "待结算": { bg: "#FEF3C7", color: "#D97706" },
};

export function WarehouseView({ language = "zh" }: { language?: AppLanguage }) {
  void language;
  const [rows, setRows] = useState(projectedHandlingFees);
  const [selectedRow, setSelectedRow] = useState<typeof projectedHandlingFees[0] | null>(projectedHandlingFees[3] ?? null);

  function handleRowClick(row: typeof projectedHandlingFees[0]) {
    setSelectedRow(row);
  }

  function updateHandlingRow(id: string, patch: Partial<typeof projectedHandlingFees[0]>) {
    setRows(prev => {
      const next = prev.map(row => row.id === id ? { ...row, ...patch } : row);
      setSelectedRow(next.find(row => row.id === id) ?? null);
      return next;
    });
  }

  function settleHandling(row: typeof projectedHandlingFees[0]) {
    updateHandlingRow(row.id, { status: "已结算" });
    toast.success(`${row.id} settled`, { description: `${row.total} handling fee marked as settled.` });
  }

  function releaseHold(row: typeof projectedHandlingFees[0]) {
    updateHandlingRow(row.id, { dispatched: "Pending dispatch" });
    toast.success(`${row.id} released`, { description: "Dispatch status changed from HOLD to pending dispatch." });
  }

  function copyContainer(row: typeof projectedHandlingFees[0]) {
    void navigator.clipboard?.writeText(row.id);
    toast.success(`${row.id} copied`);
  }

  function exportWorkOrder(row: typeof projectedHandlingFees[0]) {
    const details = [
      `Container: ${row.id}`,
      `FBA Shipment: ${row.fbaShipment}`,
      `Operation: ${row.type}`,
      `Units: ${row.units.toLocaleString()}`,
      `CBM: ${row.cbm > 0 ? row.cbm : "-"}`,
      `Pallets: ${row.pallets}`,
      `Destination: ${row.dest}`,
      `Extra Charges: ${row.repalletize}`,
      `Total: ${row.total}`,
      `Status: ${row.status}`,
      `Arrived: ${row.arrived}`,
      `Dispatched: ${row.dispatched}`,
    ].join("\n");
    const blob = new Blob([details], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${row.id}_work_order.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${row.id} work order exported`);
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* KPI */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {[
          { label: "FBA处理费", labelEn: "Handling Revenue (CAD)", value: "CAD $16.7K", icon: <Package size={16} />, color: "#1C64F2" },
          { label: "入库件数", labelEn: "Inbound Units", value: "9,773 units", icon: <ArrowDownRight size={16} />, color: "#0D9488" },
          { label: "出库件数", labelEn: "Outbound Units", value: "8,572 units", icon: <ArrowUpRight size={16} />, color: "#8B5CF6" },
          { label: "仓储占用率", labelEn: "Utilization", value: "71.8%", icon: <Warehouse size={16} />, color: "#F59E0B" },
          { label: "活跃柜子", labelEn: "Active Containers", value: "8 containers", icon: <Scale size={16} />, color: "#10B981" },
        ].map((k, i) => (
          <div key={i} className="bg-card rounded-xl border p-4 flex items-start justify-between"
            style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div>
              <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{k.label}</div>
              <div style={{ fontSize: 9, color: "var(--muted-foreground)", opacity: 0.7 }}>{k.labelEn}</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: k.color, marginTop: 6 }}>{k.value}</div>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: k.color + "15", color: k.color }}>
              {k.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 340px" }}>
        <div className="space-y-4">
          {/* Container handling table */}
          <div className="bg-card rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <span className="text-sm" style={{ fontWeight: 600 }}>FBA 柜子操作明细</span>
                <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>FBA Container Handling — 2026 (CAD)</span>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                  {["Container #", "FBA Shipment", "Operation", "Units", "CBM", "Pallets", "Destination FC", "Extra Charges", "Total (CAD)", "Status", "Arrived", "Dispatched"].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left whitespace-nowrap"
                      style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30 cursor-pointer transition-colors select-none"
                    style={{ borderColor: "var(--border)", background: selectedRow?.id === row.id ? "var(--secondary)" : undefined }}
                    onClick={() => handleRowClick(row)}>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: "monospace", color: "var(--primary)", fontWeight: 600 }}>{row.id}</td>
                    <td className="px-3 py-2.5" style={{ fontSize: 10, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{row.fbaShipment.slice(0, 14)}{row.fbaShipment.length > 14 ? "…" : ""}</td>
                    <td className="px-3 py-2.5 text-xs">{row.type}</td>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: "monospace" }}>{row.units.toLocaleString()}</td>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: "monospace" }}>{row.cbm > 0 ? `${row.cbm}` : "—"}</td>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>{row.pallets}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ fontWeight: 500 }}>{row.dest}</td>
                    <td className="px-3 py-2.5" style={{ fontSize: 10, color: "#8B5CF6", fontFamily: "monospace" }}>{row.repalletize}</td>
                    <td className="px-3 py-2.5" style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "#1D4ED8" }}>{row.total}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs"
                        style={{ background: statusColors[row.status]?.bg, color: statusColors[row.status]?.color, fontWeight: 500, fontSize: 11 }}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{row.arrived}</td>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: "monospace", color: row.dispatched === "HOLD" ? "#DC2626" : "var(--muted-foreground)", fontWeight: row.dispatched === "HOLD" ? 700 : 400 }}>{row.dispatched}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Weekly activity chart */}
          <div className="bg-card rounded-xl border p-4"
            style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="mb-3">
              <span className="text-sm" style={{ fontWeight: 600 }}>本周FBA收发件趋势</span>
              <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Weekly FBA Inbound / Outbound (Units)</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={projectedWeeklyActivity} barSize={20} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="inbound" name="Inbound" fill="#1C64F2" radius={[3, 3, 0, 0]} />
                <Bar dataKey="outbound" name="Outbound" fill="#0D9488" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: warehouse zones */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-4"
            style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="mb-3">
              <span className="text-sm" style={{ fontWeight: 600 }}>仓库使用率</span>
              <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>GTA Warehouse Zone Utilization</div>
            </div>
            <div className="space-y-3">
              {projectedInventory.map((zone, i) => {
                const pct = Math.round((zone.used / zone.capacity) * 100);
                const colors = ["#1C64F2", "#0D9488", "#8B5CF6", "#F59E0B", "#EF4444"];
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-xs" style={{ fontWeight: 500 }}>{zone.zone}</span>
                        <span className="ml-2 px-1.5 py-0.5 rounded text-xs"
                          style={{ background: statusColors[zone.status]?.bg, color: statusColors[zone.status]?.color, fontSize: 10 }}>
                          {zone.status}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600 }}>{pct}%</span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ background: "var(--muted)" }}>
                      <div className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct > 90 ? "#EF4444" : pct > 75 ? "#F59E0B" : colors[i] }} />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{zone.used.toLocaleString()} / {zone.capacity.toLocaleString()} pallets</span>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{zone.containers} containers</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedRow && (
            <div className="bg-card rounded-xl border p-4 select-none"
              style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div className="flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--border)" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: "var(--primary)" }}>{selectedRow.id}</div>
                  <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{selectedRow.fbaShipment}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs whitespace-nowrap"
                  style={{ background: statusColors[selectedRow.status]?.bg, color: statusColors[selectedRow.status]?.color, fontWeight: 600, fontSize: 11 }}>
                  {selectedRow.status}
                </span>
              </div>

              <div className="space-y-2 py-3">
                {[
                  ["Operation", selectedRow.type],
                  ["Units", selectedRow.units.toLocaleString()],
                  ["CBM", selectedRow.cbm > 0 ? String(selectedRow.cbm) : "—"],
                  ["Pallets", selectedRow.pallets],
                  ["Destination", selectedRow.dest],
                  ["Extra Charges", selectedRow.repalletize],
                  ["Total", selectedRow.total],
                  ["Arrived", selectedRow.arrived],
                  ["Dispatched", selectedRow.dispatched],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 border-b py-1.5 text-xs" style={{ borderColor: "var(--border)" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
                    <span className="text-right" style={{ fontWeight: 600, fontFamily: value.startsWith("CAD") || label === "Units" || label === "CBM" ? "monospace" : "inherit" }}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {selectedRow.status === "待结算" && (
                  <button onClick={() => settleHandling(selectedRow)}
                    className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs hover:opacity-90 transition-opacity"
                    style={{ background: "var(--primary)", color: "white", fontWeight: 600 }}>
                    <CheckCircle2 size={13} /> Settle
                  </button>
                )}
                {selectedRow.dispatched === "HOLD" && (
                  <button onClick={() => releaseHold(selectedRow)}
                    className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs hover:opacity-90 transition-opacity"
                    style={{ background: "#DC2626", color: "white", fontWeight: 600 }}>
                    <Unlock size={13} /> Release
                  </button>
                )}
                <button onClick={() => copyContainer(selectedRow)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs hover:bg-muted transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", fontWeight: 600 }}>
                  <Copy size={13} /> Copy #
                </button>
                <button onClick={() => exportWorkOrder(selectedRow)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs hover:bg-muted transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", fontWeight: 600 }}>
                  <FileText size={13} /> Work Order
                </button>
              </div>
            </div>
          )}

          {/* Fee breakdown */}
          <div className="bg-card rounded-xl border p-4"
            style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="text-sm mb-3" style={{ fontWeight: 600 }}>FBA操作费构成 (CAD)</div>
            <div className="space-y-2">
              {[
                { label: "FBA 分货打板 Sorting/Palletizing", pct: 55, color: "#1C64F2", value: "CAD $9.2K" },
                { label: "派送运费 Last-Mile Delivery", pct: 30, color: "#0D9488", value: "CAD $5.0K" },
                { label: "换标贴标 Re-labeling (CAD $0.50/ea)", pct: 10, color: "#8B5CF6", value: "CAD $1.7K" },
                { label: "二次打板 Re-palletizing (CAD $8/P)", pct: 5, color: "#F59E0B", value: "CAD $0.8K" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: f.color }} />
                  <div className="flex-1 text-xs" style={{ color: "var(--foreground)" }}>{f.label}</div>
                  <div className="w-20 rounded-full h-1.5" style={{ background: "var(--muted)" }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${f.pct}%`, background: f.color }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600, minWidth: 58, textAlign: "right" }}>{f.value}</span>
                </div>
              ))}
            </div>

            {/* Service rate note */}
            <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="text-xs mb-1.5" style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>Special Services</div>
              <div className="text-xs space-y-1" style={{ color: "var(--muted-foreground)" }}>
                <div>• 二次打板 Re-palletize: <span style={{ fontWeight: 600, color: "var(--foreground)" }}>CAD $8/pallet</span></div>
                <div>• 换标 Re-label: <span style={{ fontWeight: 600, color: "var(--foreground)" }}>CAD $0.50/label</span></div>
                <div>• 二次理货 Re-sort: <span style={{ fontWeight: 600, color: "var(--foreground)" }}>CAD $0.30/box</span></div>
                <div>• 存板 Pallet storage: <span style={{ fontWeight: 600, color: "var(--foreground)" }}>CAD $8/pallet/time</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
