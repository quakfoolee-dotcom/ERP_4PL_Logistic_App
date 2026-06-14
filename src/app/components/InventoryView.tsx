import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { Search, AlertTriangle, Clock, CheckCircle2, Package, Box, Archive, TrendingUp, X, Truck } from "lucide-react";
import { useActionDialog } from "./ActionDialog";
import type { AppLanguage } from "../i18n";
import type { InventoryItem } from "../domain/orderToCashModels";
import type { AsnReceivingRecord } from "../domain/workflowReadiness";
import { useWorkflowSnapshot, workflowRepository } from "../repositories/workflowRepository";
import { useOrderToCashSnapshot } from "./BackboneTracePanel";

// Real FBA inventory currently stored at Brampton #25 / #10 warehouses
// Sourced from 2026 container dispatch sheet — containers with partial or full HOLD status
const inventoryItems = [
  {
    container: "DRYU9624130", warehouse: "#25 Whybank", arrived: "2026-03-25", cbm: 29.50,
    fbaShipment: "FBA19CD7DG1G", sku: "7NHM944M", desc: "Product A (换标 pending)", units: 300, pallets: "5P",
    destFC: "YYZ4", daysIn: 78, status: "HOLD — 换标中", zone: "Zone A", storageNote: "换标 CAD $0.50/张 — Apr 29 instruction"
  },
  {
    container: "DRYU9624130", warehouse: "#25 Whybank", arrived: "2026-03-25", cbm: 29.50,
    fbaShipment: "FBA19DKQZNB0", sku: "219AFZ7X", desc: "Product B (换标 done)", units: 600, pallets: "9P",
    destFC: "YYZ7", daysIn: 78, status: "待派送", zone: "Zone A", storageNote: "换标完成 — awaiting dispatch instruction May 20"
  },
  {
    container: "SMCU1207478", warehouse: "#25 Whybank", arrived: "2026-05-21", cbm: 53.00,
    fbaShipment: "FBA19BY3LDMZ", sku: "23OVN89H", desc: "Bulk Pallet SKU", units: 1100, pallets: "53P",
    destFC: "XYY1", daysIn: 22, status: "待派送", zone: "Zone B", storageNote: "Awaiting XYY1 delivery instruction"
  },
  {
    container: "SMCU1207478", warehouse: "#10", arrived: "2026-05-21", cbm: 19.00,
    fbaShipment: "FBA19B7H3M9X", sku: "8O8W2UAD", desc: "Mixed SKU Cartons", units: 203, pallets: "19P",
    destFC: "YOO1", daysIn: 22, status: "待派送", zone: "Zone B", storageNote: "Awaiting YOO1 delivery instruction"
  },
  {
    container: "CAAU9510220", warehouse: "#25 Whybank", arrived: "2026-05-27", cbm: 18.40,
    fbaShipment: "FBA199RMK90S+Multi", sku: "Multi-SKU (12 lines)", desc: "Mixed FBA Shipment", units: 1168, pallets: "22P",
    destFC: "Multiple FCs", daysIn: 16, status: "分货中", zone: "Zone C", storageNote: "Sorting in progress — partial dispatch started"
  },
  {
    container: "SMCU1129098", warehouse: "#25 Whybank", arrived: "2026-05-26", cbm: 32.80,
    fbaShipment: "FBA19BHBB8D6+Multi", sku: "Multi-SKU (11 lines)", desc: "Mixed FBA — Ahzhly / KKD lots", units: 1057, pallets: "28P",
    destFC: "Multiple FCs", daysIn: 17, status: "分货中", zone: "Zone C", storageNote: "Sorting in progress"
  },
  {
    container: "NYKU5151652", warehouse: "#10", arrived: "2026-05-04", cbm: 0,
    fbaShipment: "FBA1985MY2TR / M6049 / N186F", sku: "3 FBA Shipments", desc: "Large multi-line shipment", units: 2717, pallets: "—",
    destFC: "Multiple FCs", daysIn: 39, status: "待指令", zone: "Zone D", storageNote: "Awaiting dispatch instructions from seller"
  },
  {
    container: "OOLU6809875", warehouse: "#25 Whybank", arrived: "2026-05-27", cbm: 51.00,
    fbaShipment: "FBA199L5GB1G", sku: "4SYIK2OQ (HB5020)", desc: "HB5020 — 528 units", units: 528, pallets: "36P",
    destFC: "YYZ3 / YGK1", daysIn: 16, status: "已部分派送", zone: "Zone A", storageNote: "Jun 3: 10P KUTHALA, 26P KUTHALA; YGK1 13P dispatched"
  },
  {
    container: "CAIU9900448", warehouse: "#10", arrived: "2026-05-26", cbm: 0,
    fbaShipment: "34 SKU lines", sku: "SKU-1 to SKU-34", desc: "Multi-SKU small parcels", units: 853, pallets: "Multiple",
    destFC: "YYZ9 / YXU1", daysIn: 17, status: "分货中", zone: "Zone D", storageNote: "YYZ9 1P dispatched Jun 2; YXU1 1P pending"
  },
  {
    container: "JXLU4708699", warehouse: "#25 Whybank", arrived: "2026-05-25", cbm: 0,
    fbaShipment: "FBA1997ZZW99 (308277)", sku: "43EVVB3P", desc: "Bulk case pack", units: 877, pallets: "39P",
    destFC: "YYZ9", daysIn: 18, status: "已派送", zone: "Zone B", storageNote: "May 27: 26P YU; May 30: 13P AD — dispatched"
  },
];

type InventoryRow = typeof inventoryItems[number];

// Storage days breakdown for chart
const agingData = [
  { range: "0-7 days", count: 2, color: "#10B981" },
  { range: "8-14 days", count: 1, color: "#1C64F2" },
  { range: "15-30 days", count: 5, color: "#F59E0B" },
  { range: "31-60 days", count: 1, color: "#EF4444" },
  { range: "61+ days", count: 2, color: "#DC2626" },
];

// CBM by zone
const zoneData = [
  { zone: "Zone A (#25 Main)", cbm: 99.9, pallets: 80, color: "#1C64F2" },
  { zone: "Zone B (#25 Overflow)", cbm: 72.0, pallets: 80, color: "#0D9488" },
  { zone: "Zone C (#25 Sorting)", cbm: 51.8, pallets: 50, color: "#8B5CF6" },
  { zone: "Zone D (#10 Annex)", cbm: 32.0, pallets: 45, color: "#F59E0B" },
];

const statusStyle: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  "HOLD — 换标中":   { bg: "#FEE2E2", color: "#DC2626", icon: <AlertTriangle size={11} /> },
  "待派送":           { bg: "#FEF3C7", color: "#D97706", icon: <Clock size={11} /> },
  "分货中":           { bg: "#DBEAFE", color: "#1D4ED8", icon: <Package size={11} /> },
  "待指令":           { bg: "#F3E8FF", color: "#7C3AED", icon: <Clock size={11} /> },
  "已部分派送":       { bg: "#D1FAE5", color: "#059669", icon: <CheckCircle2 size={11} /> },
  "已派送":           { bg: "#D1FAE5", color: "#059669", icon: <CheckCircle2 size={11} /> },
  "Available":             { bg: "#D1FAE5", color: "#047857", icon: <CheckCircle2 size={11} /> },
};

function daysSince(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 0;
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function toInventoryRow(item: InventoryItem): InventoryRow {
  return {
    container: item.wmsInventoryId ?? item.warehouseReceiptId,
    warehouse: item.warehouse,
    arrived: item.createdDate,
    cbm: 0,
    fbaShipment: item.warehouseReceiptId,
    sku: item.sku,
    desc: item.productName,
    units: item.availableQuantity,
    pallets: item.onHandQuantity ? `${Math.max(1, Math.ceil(item.onHandQuantity / 40))}P` : "0P",
    destFC: "Warehouse Stock",
    daysIn: daysSince(item.createdDate),
    status: "Available",
    zone: item.storageLocation.includes("WB10") ? "Zone D" : item.storageLocation.includes("HOLD") ? "Zone A" : "Zone B",
    storageNote: `Recorded from WMS ${item.wmsInventoryId ?? item.id} at ${item.storageLocation}. Damaged: ${item.damagedQuantity}. Reserved: ${item.reservedQuantity}.`,
  };
}

function toAsnInventoryRow(asn: AsnReceivingRecord): InventoryRow {
  return {
    container: asn.container,
    warehouse: asn.warehouse,
    arrived: asn.recordedAt ?? asn.eta,
    cbm: 0,
    fbaShipment: asn.id,
    sku: `${asn.skuLines} SKU line${asn.skuLines === 1 ? "" : "s"}`,
    desc: `${asn.customer} received inventory`,
    units: Math.max(0, asn.receivedUnits),
    pallets: `${Math.max(1, Math.ceil(asn.receivedUnits / 40))}P`,
    destFC: "Warehouse Stock",
    daysIn: daysSince(asn.recordedAt ?? asn.eta),
    status: "Available",
    zone: asn.putawayLocation.includes("WB10") ? "Zone D" : asn.putawayLocation.includes("HOLD") ? "Zone A" : "Zone B",
    storageNote: `Recorded from ASN ${asn.id} at ${asn.putawayLocation}. Freight file ${asn.freightFileId}.`,
  };
}

function dispatchIdForInventoryRow(item: InventoryRow) {
  return `DSP-INV-${item.fbaShipment.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36).toUpperCase()}`;
}

function palletCount(item: InventoryRow) {
  const parsed = Number.parseInt(String(item.pallets), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Math.max(1, Math.ceil(item.units / 40));
}

function customerFromInventoryRow(item: InventoryRow) {
  const match = item.desc.match(/^(.+?) received inventory$/);
  return match?.[1] ?? "FBA Seller";
}

function dispatchDestination(item: InventoryRow) {
  return item.destFC === "Warehouse Stock" ? "Customer destination TBD" : item.destFC;
}

export function InventoryView({ language = "zh" }: { language?: AppLanguage }) {
  void language;
  const orderToCashSnapshot = useOrderToCashSnapshot();
  const workflowSnapshot = useWorkflowSnapshot();
  const { promptDialog, ActionDialog } = useActionDialog();
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("全部");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [selected, setSelected] = useState<InventoryRow | null>(null);
  const [items, setItems] = useState<InventoryRow[]>(inventoryItems);
  const wmsInventoryRows = useMemo(() => {
    const backboneRows = orderToCashSnapshot.inventoryItems.map(toInventoryRow);
    const backboneContainers = new Set(backboneRows.map((item) => item.container));
    const asnRows = workflowSnapshot.asns
      .filter((asn) => asn.inventoryStatus === "recorded" && !backboneContainers.has(asn.container))
      .map(toAsnInventoryRow);
    return [...asnRows, ...backboneRows];
  }, [orderToCashSnapshot.inventoryItems, workflowSnapshot.asns]);
  const combinedItems = useMemo(() => {
    const wmsKeys = new Set(wmsInventoryRows.map((item) => `${item.container}-${item.fbaShipment}`));
    return [...wmsInventoryRows, ...items.filter((item) => !wmsKeys.has(`${item.container}-${item.fbaShipment}`))];
  }, [items, wmsInventoryRows]);
  const totalUnitsLive = combinedItems.reduce((sum, item) => sum + item.units, 0);
  const totalCbmLive = combinedItems.reduce((sum, item) => sum + item.cbm, 0);
  const holdCountLive = combinedItems.filter((item) => item.status.startsWith("HOLD")).length;
  const pendingCountLive = combinedItems.filter((item) => item.status === "待派送" || item.status === "待指令").length;
  const avgDaysLive = combinedItems.length ? Math.round(combinedItems.reduce((sum, item) => sum + item.daysIn, 0) / combinedItems.length) : 0;

  function requestDispatch(item: InventoryRow) {
    const result = workflowRepository.requestInventoryDispatch({
      sourceId: item.fbaShipment,
      customer: customerFromInventoryRow(item),
      warehouse: item.warehouse,
      container: item.container,
      units: item.units,
      pallets: palletCount(item),
      destination: dispatchDestination(item),
      note: `Requested from Inventory for ${item.container} / ${item.fbaShipment}. ${item.storageNote}`,
    });
    setItems((previous) => previous.map((row) => row.container === item.container && row.fbaShipment === item.fbaShipment ? { ...row, status: "待派送" } : row));
    if (selected?.container === item.container && selected?.fbaShipment === item.fbaShipment) setSelected((previous) => previous ? { ...previous, status: "待派送" } : previous);
    toast[result.ok ? "success" : "error"](result.message, { description: result.ok ? `TMS dispatch ${dispatchIdForInventoryRow(item)} is ready for carrier assignment.` : undefined });
  }
  function flagHold(container: string) {
    setItems(p => p.map(i => i.container === container ? { ...i, status: "HOLD — 换标中" } : i));
    if (selected?.container === container) setSelected(p => p ? { ...p, status: "HOLD — 换标中" } : p);
    toast.warning(`${container} flagged as HOLD`);
  }
  function markSorting(container: string) {
    setItems(p => p.map(i => i.container === container ? { ...i, status: "分货中" } : i));
    if (selected?.container === container) setSelected(p => p ? { ...p, status: "分货中" } : p);
    toast.info(`${container} marked as sorting in progress`);
  }
  async function addStorageNote(item: InventoryRow) {
    const note = await promptDialog(`Add note for ${item.container}`);
    if (!note) return;
    setItems(p => p.map(i => i.container === item.container && i.fbaShipment === item.fbaShipment ? { ...i, storageNote: i.storageNote + ` | ${note}` } : i));
    setSelected(p => p ? { ...p, storageNote: p.storageNote + ` | ${note}` } : p);
    toast.success("Note saved", { description: `${item.container}: ${note}` });
  }

  const zones = ["全部", "Zone A", "Zone B", "Zone C", "Zone D"];
  const statuses = ["全部", "HOLD — 换标中", "待派送", "分货中", "待指令", "已部分派送", "已派送", "Available"];

  const filtered = combinedItems.filter(item => {
    const matchSearch = search === "" ||
      item.container.toLowerCase().includes(search.toLowerCase()) ||
      item.fbaShipment.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.destFC.toLowerCase().includes(search.toLowerCase());
    const matchZone = zoneFilter === "全部" || item.zone === zoneFilter;
    const matchStatus = statusFilter === "全部" || item.status === statusFilter;
    return matchSearch && matchZone && matchStatus;
  });
  const selectedDispatch = selected ? workflowSnapshot.dispatches.find((dispatch) => dispatch.id === dispatchIdForInventoryRow(selected)) : null;

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <ActionDialog />

      {/* KPI Row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {[
          { label: "在库总件数", labelEn: "Total Units In-Store", value: totalUnitsLive.toLocaleString(), color: "#1C64F2", icon: <Box size={16}/> },
          { label: "占用体积", labelEn: "Total CBM", value: `${totalCbmLive.toFixed(1)} m³`, color: "#0D9488", icon: <Archive size={16}/> },
          { label: "活跃柜子", labelEn: "Active Containers", value: `${combinedItems.length}`, color: "#8B5CF6", icon: <Package size={16}/> },
          { label: "HOLD / 待指令", labelEn: "On Hold / Awaiting", value: `${holdCountLive + pendingCountLive}`, color: "#F59E0B", icon: <Clock size={16}/> },
          { label: "库存周转率", labelEn: "Avg Days In Store", value: `${avgDaysLive}d`, color: "#10B981", icon: <TrendingUp size={16}/> },
        ].map((k, i) => (
          <div key={i} className="bg-card rounded-xl border p-4 flex items-start justify-between"
            style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div>
              <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{k.label}</div>
              <div style={{ fontSize: 9, color: "var(--muted-foreground)", opacity: 0.7 }}>{k.labelEn}</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: k.color, marginTop: 6 }}>{k.value}</div>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: k.color + "15", color: k.color }}>
              {k.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* Aging */}
        <div className="bg-card rounded-xl border p-4"
          style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="mb-3">
            <span className="text-sm" style={{ fontWeight: 600 }}>库龄分布</span>
            <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Storage Aging (# of containers)</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={agingData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="count" name="Containers" radius={[4, 4, 0, 0]}>
                {agingData.map((entry) => <Cell key={entry.range} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Zone breakdown */}
        <div className="bg-card rounded-xl border p-4"
          style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="mb-3">
            <span className="text-sm" style={{ fontWeight: 600 }}>仓区占用</span>
            <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Zone Utilization by CBM</span>
          </div>
          <div className="space-y-3">
            {zoneData.map((z, i) => {
              const maxCBM = Math.max(...zoneData.map(d => d.cbm));
              const pct = Math.round((z.cbm / maxCBM) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ fontWeight: 500 }}>{z.zone}</span>
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{z.pallets}P</span>
                      <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>{z.cbm.toFixed(1)} m³</span>
                    </div>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ background: "var(--muted)" }}>
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: `${pct}%`, background: z.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border px-4 py-3 flex items-center gap-3"
        style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search container, FBA shipment, SKU, FC..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs outline-none"
            style={{ borderColor: "var(--border)", background: "var(--input-background)" }} />
        </div>

        <div className="flex gap-1">
          {zones.map(z => (
            <button key={z} onClick={() => setZoneFilter(z)}
              className="px-2.5 py-1 rounded-lg text-xs transition-colors"
              style={{
                background: zoneFilter === z ? "var(--primary)" : "var(--muted)",
                color: zoneFilter === z ? "white" : "var(--muted-foreground)",
                fontWeight: zoneFilter === z ? 500 : 400,
              }}>{z}</button>
          ))}
        </div>

        <div className="flex gap-1 ml-2">
          {statuses.map(s => {
            const match = s;
            const active = statusFilter === "全部" ? s === "全部" : statusFilter === match;
            return (
              <button key={s} onClick={() => setStatusFilter(match)}
                className="px-2.5 py-1 rounded-lg text-xs transition-colors"
                style={{
                  background: active ? "var(--primary)" : "var(--muted)",
                  color: active ? "white" : "var(--muted-foreground)",
                  fontWeight: active ? 500 : 400,
                }}>{s}</button>
            );
          })}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-card rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <span className="text-sm" style={{ fontWeight: 600 }}>在库存货明细</span>
            <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>FBA Inventory In-Store — Brampton Hub</span>
          </div>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{filtered.length} records — click row for actions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                {["Container #", "Warehouse", "FBA Shipment", "SKU / Description", "Units", "CBM", "Pallets", "Dest. FC", "Days In", "Zone", "Status", "Notes"].map((h, i) => (
                  <th key={i} className="px-3 py-2.5 text-left whitespace-nowrap"
                    style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const st = statusStyle[item.status] ?? { bg: "var(--muted)", color: "var(--muted-foreground)", icon: null };
                const urgentAge = item.daysIn > 60;
                const isSel = selected?.container === item.container && selected?.fbaShipment === item.fbaShipment;
                return (
                  <tr key={i} onClick={() => setSelected(isSel ? null : item)}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    style={{ borderColor: "var(--border)", background: isSel ? "var(--secondary)" : item.status.startsWith("HOLD") ? "#FFF5F5" : "transparent" }}>
                    <td className="px-3 py-2.5">
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--primary)", fontWeight: 600 }}>{item.container}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{item.warehouse}</td>
                    <td className="px-3 py-2.5">
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--foreground)" }}>{item.fbaShipment.length > 18 ? item.fbaShipment.slice(0, 18) + "…" : item.fbaShipment}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div style={{ fontSize: 11, color: "var(--foreground)", fontWeight: 500 }}>{item.sku}</div>
                      <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{item.desc}</div>
                    </td>
                    <td className="px-3 py-2.5" style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "var(--foreground)" }}>
                      {item.units.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: "monospace" }}>
                      {item.cbm > 0 ? `${item.cbm}` : "—"}
                    </td>
                    <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>{item.pallets}</td>
                    <td className="px-3 py-2.5">
                      <span style={{ fontSize: 11, fontWeight: 500, color: "#1C64F2" }}>{item.destFC}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span style={{
                        fontSize: 12, fontFamily: "monospace", fontWeight: 600,
                        color: urgentAge ? "#DC2626" : item.daysIn > 30 ? "#D97706" : "#059669"
                      }}>
                        {item.daysIn}d
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 10 }}>
                        {item.zone}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full w-fit whitespace-nowrap"
                        style={{ background: st.bg, color: st.color, fontWeight: 500, fontSize: 10 }}>
                        {st.icon}{item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" style={{ fontSize: 10, color: "var(--muted-foreground)", maxWidth: 200 }}>
                      {item.storageNote}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Inline detail + action panel */}
          {selected && (
            <div style={{ borderTop: "2px solid var(--primary)", background: "var(--secondary)", padding: 16 }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)", fontSize: 13 }}>{selected.container}</span>
                  <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>{selected.fbaShipment}</span>
                  <div className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{selected.storageNote}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={15} /></button>
              </div>
              <div className="flex gap-3 text-xs mb-4 flex-wrap">
                {[["Units", selected.units.toLocaleString()], ["CBM", selected.cbm > 0 ? `${selected.cbm}` : "—"], ["Pallets", selected.pallets], ["Dest FC", selected.destFC], ["Days In", `${selected.daysIn}d`], ["Warehouse", selected.warehouse]].map(([k, v]) => (
                  <div key={k} className="px-3 py-1.5 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 9, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase" }}>{k}</div>
                    <div style={{ fontFamily: "monospace", fontWeight: 700, marginTop: 1 }}>{v}</div>
                  </div>
                ))}
              </div>
              {selectedDispatch && (
                <div className="mb-4 w-fit rounded-lg px-3 py-1.5 text-xs" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8" }}>
                  <span style={{ fontWeight: 800 }}>TMS Dispatch</span>
                  <span className="ml-2" style={{ fontFamily: "monospace", fontWeight: 800 }}>{selectedDispatch.id} · {selectedDispatch.status}</span>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {(selected.status === "待派送" || selected.status === "待指令" || selected.status === "Available") && (
                  <button onClick={() => requestDispatch(selected)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                    style={{ background: "var(--primary)", color: "white" }}>
                    <Truck size={12} /> Request Dispatch
                  </button>
                )}
                {selected.status === "分货中" && (
                  <button onClick={() => requestDispatch(selected)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                    style={{ background: "#10B981", color: "white" }}>
                    <CheckCircle2 size={12} /> Mark Sorting Done → Dispatch
                  </button>
                )}
                {!selected.status.startsWith("HOLD") && (
                  <button onClick={() => flagHold(selected.container)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                    style={{ background: "#FEF3C7", color: "#D97706", border: "1px solid #FDE68A" }}>
                    Flag HOLD
                  </button>
                )}
                {selected.status.startsWith("HOLD") && (
                  <button onClick={() => markSorting(selected.container)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                    style={{ background: "#DBEAFE", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
                    Clear HOLD → Start Sorting
                  </button>
                )}
                <button onClick={() => addStorageNote(selected)}
                  className="px-3 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors"
                  style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}>
                  + Add Note
                </button>
                <button onClick={() => toast.success("Storage fee calculated", { description: `${selected.container}: ${selected.daysIn} days × rate = CAD $${(selected.daysIn * 8).toFixed(0)}` })}
                  className="px-3 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors"
                  style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}>
                  Calc Storage Fee
                </button>
              </div>
            </div>
          )}
        </div>

        {/* HOLD alert footer */}
        {inventoryItems.some(i => i.status.startsWith("HOLD")) && (
          <div className="flex items-center gap-2 px-4 py-3 border-t"
            style={{ borderColor: "var(--border)", background: "#FFF5F5" }}>
            <AlertTriangle size={14} style={{ color: "#DC2626" }} />
            <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 500 }}>
              HOLD items detected — DRYU9624130 has {300} units pending re-label confirmation (换标 @ CAD $0.50/张). Action required before dispatch.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
