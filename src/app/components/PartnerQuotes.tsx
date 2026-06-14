import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Calculator, Clock, Truck, Download, Copy, Plus, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";
import type { AppLanguage } from "../i18n";
import { pick } from "../i18n";
import { orderToCashRepository } from "../repositories/orderToCashRepository";
import { getCustomerReadinessProjection } from "../repositories/projections";

type RateUnit = "pallet" | "load" | "stop" | "hour" | "shipment";
type RateStatus = "active" | "draft" | "inactive";

type RateCardItem = {
  id: string;
  nameZh: string;
  nameEn: string;
  serviceZh: string;
  serviceEn: string;
  zone: string;
  codes: string;
  unit: RateUnit;
  rate: number;
  minCharge: number;
  waitIncluded: boolean;
  taxable: boolean;
  status: RateStatus;
  notesZh: string;
  notesEn: string;
};

const initialRateItems: RateCardItem[] = [
  {
    id: "rate-yyz",
    nameZh: "YYZ系列派送",
    nameEn: "YYZ Delivery",
    serviceZh: "FBA派送",
    serviceEn: "FBA Delivery",
    zone: "YYZ Toronto",
    codes: "YYZ4 · YYZ7 · YYZ9",
    unit: "pallet",
    rate: 35,
    minCharge: 35,
    waitIncluded: true,
    taxable: true,
    status: "active",
    notesZh: "少于4板加收CAD $50 pickup",
    notesEn: "CAD $50 pickup surcharge under 4 pallets",
  },
  {
    id: "rate-yoo1",
    nameZh: "Oakville派送",
    nameEn: "Oakville Delivery",
    serviceZh: "FBA派送",
    serviceEn: "FBA Delivery",
    zone: "YOO1 Oakville",
    codes: "YOO1",
    unit: "pallet",
    rate: 40,
    minCharge: 40,
    waitIncluded: true,
    taxable: true,
    status: "active",
    notesZh: "等待时间已含",
    notesEn: "Wait time included",
  },
  {
    id: "rate-yhm1",
    nameZh: "Hamilton派送",
    nameEn: "Hamilton Delivery",
    serviceZh: "FBA派送",
    serviceEn: "FBA Delivery",
    zone: "YHM1 Hamilton",
    codes: "YHM1",
    unit: "pallet",
    rate: 40,
    minCharge: 40,
    waitIncluded: true,
    taxable: true,
    status: "active",
    notesZh: "等待时间已含",
    notesEn: "Wait time included",
  },
  {
    id: "rate-yxu1",
    nameZh: "London派送",
    nameEn: "London Delivery",
    serviceZh: "FBA派送",
    serviceEn: "FBA Delivery",
    zone: "YXU1 London",
    codes: "YXU1",
    unit: "pallet",
    rate: 50,
    minCharge: 50,
    waitIncluded: true,
    taxable: true,
    status: "active",
    notesZh: "等待时间已含",
    notesEn: "Wait time included",
  },
  {
    id: "rate-ygk1",
    nameZh: "Kingston派送",
    nameEn: "Kingston Delivery",
    serviceZh: "FBA派送",
    serviceEn: "FBA Delivery",
    zone: "YGK1 Kingston",
    codes: "YGK1",
    unit: "pallet",
    rate: 50,
    minCharge: 50,
    waitIncluded: true,
    taxable: true,
    status: "active",
    notesZh: "等待时间已含",
    notesEn: "Wait time included",
  },
  {
    id: "rate-yow",
    nameZh: "Ottawa派送",
    nameEn: "Ottawa Delivery",
    serviceZh: "FBA派送",
    serviceEn: "FBA Delivery",
    zone: "YOW Ottawa",
    codes: "YOW1 · YOW3",
    unit: "pallet",
    rate: 80,
    minCharge: 80,
    waitIncluded: true,
    taxable: true,
    status: "active",
    notesZh: "可选择CAD $1,150整车价",
    notesEn: "CAD $1,150 full-load option available",
  },
];

const ftlRates = [
  { descZh: "大卡车50km内", descEn: "Large truck under 50km", rate: 300, noteZh: "", noteEn: "" },
  { descZh: "Ottawa整车", descEn: "Ottawa Full Load", rate: 1150, noteZh: "Mark确认 2025-05-26", noteEn: "Confirmed by Mark on 2025-05-26" },
  { descZh: "机场接货至CBWS小车", descEn: "Airport to CBWS Small Truck", rate: 200, noteZh: "", noteEn: "" },
  { descZh: "机场接货至CBWS大车", descEn: "Airport to CBWS Large Truck", rate: 300, noteZh: "", noteEn: "" },
];

const initialRateHistory = [
  { date: "2025-05-26", zone: "YOW1/YOW3", changeZh: "整车价确认 CAD $1,150/load", changeEn: "Full-load rate confirmed at CAD $1,150/load", by: "Mark" },
  { date: "2025-03-01", zone: "YXU1/YGK1", changeZh: "更新至CAD $50/P，含等待", changeEn: "Updated to CAD $50/P with wait time included", by: "Admin" },
  { date: "2025-01-15", zone: "YYZ系列", changeZh: "更新至CAD $35/P，含等待", changeEn: "Updated to CAD $35/P with wait time included", by: "Admin" },
  { date: "2024-11-01", zone: "All Zones", changeZh: "初始费率录入系统", changeEn: "Initial rates entered into system", by: "System" },
];

const card: CSSProperties = { background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
const thStyle: CSSProperties = { background: "var(--muted)", fontSize: 11, fontWeight: 600, padding: "7px 10px", textAlign: "left", color: "var(--muted-foreground)", textTransform: "uppercase" };
const tdStyle: CSSProperties = { padding: "10px", fontSize: 13, borderBottom: "1px solid var(--border)", verticalAlign: "top" };
const fieldStyle: CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 13 };

function unitLabel(unit: RateUnit, language: AppLanguage) {
  const labels: Record<RateUnit, { zh: string; en: string }> = {
    pallet: { zh: "每板", en: "Per Pallet" },
    load: { zh: "每车", en: "Per Load" },
    stop: { zh: "每站", en: "Per Stop" },
    hour: { zh: "每小时", en: "Per Hour" },
    shipment: { zh: "每票", en: "Per Shipment" },
  };
  return pick(language, labels[unit].zh, labels[unit].en);
}

function statusLabel(status: RateStatus, language: AppLanguage) {
  const labels: Record<RateStatus, { zh: string; en: string }> = {
    active: { zh: "启用", en: "Active" },
    draft: { zh: "草稿", en: "Draft" },
    inactive: { zh: "停用", en: "Inactive" },
  };
  return pick(language, labels[status].zh, labels[status].en);
}

function statusStyle(status: RateStatus): CSSProperties {
  if (status === "active") return { background: "#d1fae5", color: "#047857" };
  if (status === "draft") return { background: "#fef3c7", color: "#b45309" };
  return { background: "#fee2e2", color: "#b91c1c" };
}

function escapeCsv(value: string | number | boolean) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function createBlankRateItem(): RateCardItem {
  return {
    id: `rate-${Date.now()}`,
    nameZh: "",
    nameEn: "",
    serviceZh: "FBA派送",
    serviceEn: "FBA Delivery",
    zone: "",
    codes: "",
    unit: "pallet",
    rate: 0,
    minCharge: 0,
    waitIncluded: true,
    taxable: true,
    status: "active",
    notesZh: "",
    notesEn: "",
  };
}

export function PartnerQuotes({ language = "zh", initialCustomerId }: { language?: AppLanguage; initialCustomerId?: string }) {
  const customerOptions = getCustomerReadinessProjection().customers;
  const preferredCustomer = customerOptions.find((customer) => customer.id === initialCustomerId) ?? customerOptions[0];
  const [rateItems, setRateItems] = useState<RateCardItem[]>(initialRateItems);
  const [rateHistory, setRateHistory] = useState(initialRateHistory);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preferredCustomer?.id ?? "");
  const [selectedRateId, setSelectedRateId] = useState(initialRateItems[0].id);
  const [pallets, setPallets] = useState(20);
  const [savedQuotes, setSavedQuotes] = useState<{ customer: string; zone: string; pallets: number; cost: number; date: string }[]>([]);
  const [editingItem, setEditingItem] = useState<RateCardItem | null>(null);
  const selectedCustomer = customerOptions.find((customer) => customer.id === selectedCustomerId) ?? preferredCustomer;

  const activePalletRates = useMemo(
    () => rateItems.filter((item) => item.status === "active" && item.unit === "pallet"),
    [rateItems],
  );
  const selectedRate = activePalletRates.find((item) => item.id === selectedRateId) ?? activePalletRates[0] ?? rateItems[0];
  const calcBase = (selectedRate?.rate ?? 0) * pallets;
  const smallPickupSurcharge = pallets < 4 ? 50 : 0;
  const ftlOttawa = Boolean(selectedRate?.codes.includes("YOW") && pallets >= 14);
  const estimated = ftlOttawa ? 1150 : calcBase + smallPickupSurcharge;

  function displayName(item: RateCardItem) {
    return pick(language, item.nameZh || item.nameEn, item.nameEn || item.nameZh);
  }

  function displayService(item: RateCardItem) {
    return pick(language, item.serviceZh || item.serviceEn, item.serviceEn || item.serviceZh);
  }

  function displayNotes(item: RateCardItem) {
    return pick(language, item.notesZh || item.notesEn || "-", item.notesEn || item.notesZh || "-");
  }

  function startAddItem() {
    setEditingItem(createBlankRateItem());
  }

  function startEditItem(item: RateCardItem) {
    setEditingItem({ ...item });
  }

  function updateEditingItem<K extends keyof RateCardItem>(key: K, value: RateCardItem[K]) {
    setEditingItem((current) => (current ? { ...current, [key]: value } : current));
  }

  function saveRateItem() {
    if (!editingItem) return;
    const normalized: RateCardItem = {
      ...editingItem,
      nameZh: editingItem.nameZh.trim() || editingItem.nameEn.trim(),
      nameEn: editingItem.nameEn.trim() || editingItem.nameZh.trim(),
      serviceZh: editingItem.serviceZh.trim() || editingItem.serviceEn.trim(),
      serviceEn: editingItem.serviceEn.trim() || editingItem.serviceZh.trim(),
      zone: editingItem.zone.trim(),
      codes: editingItem.codes.trim(),
      notesZh: editingItem.notesZh.trim(),
      notesEn: editingItem.notesEn.trim(),
      rate: Number(editingItem.rate),
      minCharge: Number(editingItem.minCharge),
    };
    if (!normalized.nameEn || !normalized.zone || !Number.isFinite(normalized.rate) || normalized.rate < 0 || !Number.isFinite(normalized.minCharge) || normalized.minCharge < 0) {
      toast.error(pick(language, "请输入项目名称、区域以及有效的非负费率。", "Enter an item name, zone, and valid non-negative rates."));
      return;
    }

    const exists = rateItems.some((item) => item.id === normalized.id);
    setRateItems((items) => (exists ? items.map((item) => (item.id === normalized.id ? normalized : item)) : [normalized, ...items]));
    setRateHistory((history) => [
      {
        date: new Date().toLocaleDateString("en-CA"),
        zone: normalized.zone,
        changeZh: exists ? `更新费率 ${normalized.nameZh}` : `新增费率 ${normalized.nameZh}`,
        changeEn: exists ? `Updated rate ${normalized.nameEn}` : `Added rate ${normalized.nameEn}`,
        by: "Ops",
      },
      ...history,
    ]);
    if (normalized.status === "active" && normalized.unit === "pallet") {
      setSelectedRateId(normalized.id);
    }
    setEditingItem(null);
    toast.success(pick(language, "费率项目已保存", "Rate item saved"));
  }

  function setItemStatus(item: RateCardItem, status: RateStatus) {
    const updated = { ...item, status };
    setRateItems((items) => items.map((current) => (current.id === item.id ? updated : current)));
    if (selectedRateId === item.id && status !== "active") {
      const next = activePalletRates.find((rate) => rate.id !== item.id);
      if (next) setSelectedRateId(next.id);
    }
    toast.success(pick(language, "状态已更新", "Status updated"));
  }

  function saveQuote() {
    if (!selectedRate || !selectedCustomer) return;
    const rateSheetVersion = `QUOTE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${selectedCustomer.name.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}`;
    orderToCashRepository.createCustomerQuotation({
      customerId: selectedCustomer.id,
      rateSheetVersion,
      quotedAmountCad: estimated,
      quoteNote: `${selectedRate.zone} - ${pallets}P - ${unitLabel(selectedRate.unit, language)} CAD $${selectedRate.rate}/unit`,
      owner: selectedCustomer.owner,
    });
    try {
      window.localStorage.setItem("erp4pl.rateCardCustomerId", selectedCustomer.id);
    } catch {
      // localStorage can be unavailable in restricted browser contexts.
    }
    const q = { customer: selectedCustomer.name, zone: selectedRate.zone, pallets, cost: estimated, date: new Date().toLocaleDateString("en-CA") };
    setSavedQuotes((previous) => [q, ...previous.slice(0, 4)]);
    toast.success(pick(language, `报价已保存：${selectedCustomer.name}`, `Quote saved for ${selectedCustomer.name}`));
  }

  function copyQuote() {
    if (!selectedRate) return;
    const text = [
      `Quote: ${selectedRate.zone} (${selectedRate.codes})`,
      `Pallets: ${pallets}P`,
      `Estimated Cost: CAD $${estimated.toLocaleString()}`,
      ftlOttawa ? "FTL rate applied" : `Rate: $${selectedRate.rate}/P${smallPickupSurcharge ? " + $50 pickup" : ""}`,
      `Generated: ${new Date().toLocaleDateString("en-CA")}`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => toast.success(pick(language, "报价已复制", "Quote copied to clipboard")));
  }

  function exportRateCard() {
    const rows = [
      ["Item", "Service", "Zone", "FC Codes", "Basis", "Rate CAD", "Minimum CAD", "Wait Included", "Taxable", "Status", "Notes"].map(escapeCsv).join(","),
      ...rateItems.map((item) => [
        displayName(item),
        displayService(item),
        item.zone,
        item.codes,
        unitLabel(item.unit, language),
        item.rate,
        item.minCharge,
        item.waitIncluded ? "Yes" : "No",
        item.taxable ? "Yes" : "No",
        statusLabel(item.status, language),
        displayNotes(item),
      ].map(escapeCsv).join(",")),
      "",
      ["Flat Rate", "Large truck under 50km", "GTA", "-", "Per Load", 300, 300, "N/A", "Yes", "Active", ""].map(escapeCsv).join(","),
      ["Flat Rate", "Ottawa Full Load", "YOW Ottawa", "YOW1 · YOW3", "Per Load", 1150, 1150, "Yes", "Yes", "Active", "Confirmed by Mark on 2025-05-26"].map(escapeCsv).join(","),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "partner_rate_card.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(pick(language, "费率表已导出", "Rate card exported"));
  }

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--background)" }}>
      <div className="flex gap-4 mb-4" style={{ alignItems: "stretch" }}>
        <div style={{ ...card, flex: 2, padding: 0, overflow: "hidden", minWidth: 0 }}>
          <div className="flex items-center justify-between gap-3" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>{pick(language, "合作方费率表", "Partner Rate Card")}</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                {pick(language, "按服务、计费单位、最低收费和状态管理费率", "Manage rates by service, charge basis, minimum charge, and status")}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={startAddItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-90 transition-opacity" style={{ background: "var(--primary)", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}>
                <Plus size={12} /> {pick(language, "新增项目", "Add Item")}
              </button>
              <button onClick={exportRateCard} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors" style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)", cursor: "pointer", fontWeight: 600 }}>
                <Download size={12} /> {pick(language, "导出CSV", "Export CSV")}
              </button>
            </div>
          </div>

          {editingItem && (
            <div style={{ padding: 14, borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                  {rateItems.some((item) => item.id === editingItem.id) ? pick(language, "编辑费率项目", "Edit Rate Item") : pick(language, "新增费率项目", "Add Rate Item")}
                </div>
                <button onClick={() => setEditingItem(null)} title={pick(language, "取消", "Cancel")} className="p-1 rounded hover:bg-background" style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)", cursor: "pointer" }}>
                  <X size={14} />
                </button>
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, minmax(130px, 1fr))" }}>
                <EditField label={pick(language, "英文项目名称", "English Item Name")}>
                  <input value={editingItem.nameEn} onChange={(event) => updateEditingItem("nameEn", event.target.value)} style={fieldStyle} placeholder="FBA delivery" />
                </EditField>
                <EditField label={pick(language, "中文项目名称", "Chinese Item Name")}>
                  <input value={editingItem.nameZh} onChange={(event) => updateEditingItem("nameZh", event.target.value)} style={fieldStyle} placeholder="FBA派送" />
                </EditField>
                <EditField label={pick(language, "英文服务", "English Service")}>
                  <input value={editingItem.serviceEn} onChange={(event) => updateEditingItem("serviceEn", event.target.value)} style={fieldStyle} />
                </EditField>
                <EditField label={pick(language, "中文服务", "Chinese Service")}>
                  <input value={editingItem.serviceZh} onChange={(event) => updateEditingItem("serviceZh", event.target.value)} style={fieldStyle} />
                </EditField>
                <EditField label={pick(language, "区域", "Zone")}>
                  <input value={editingItem.zone} onChange={(event) => updateEditingItem("zone", event.target.value)} style={fieldStyle} placeholder="YYZ Toronto" />
                </EditField>
                <EditField label={pick(language, "FC代码", "FC Codes")}>
                  <input value={editingItem.codes} onChange={(event) => updateEditingItem("codes", event.target.value)} style={fieldStyle} placeholder="YYZ4 · YYZ7" />
                </EditField>
                <EditField label={pick(language, "计费单位", "Charge Basis")}>
                  <select value={editingItem.unit} onChange={(event) => updateEditingItem("unit", event.target.value as RateUnit)} style={fieldStyle}>
                    {(["pallet", "load", "stop", "hour", "shipment"] as RateUnit[]).map((unit) => <option key={unit} value={unit}>{unitLabel(unit, language)}</option>)}
                  </select>
                </EditField>
                <EditField label={pick(language, "状态", "Status")}>
                  <select value={editingItem.status} onChange={(event) => updateEditingItem("status", event.target.value as RateStatus)} style={fieldStyle}>
                    {(["active", "draft", "inactive"] as RateStatus[]).map((status) => <option key={status} value={status}>{statusLabel(status, language)}</option>)}
                  </select>
                </EditField>
                <EditField label={pick(language, "费率CAD", "Rate CAD")}>
                  <input type="number" min={0} value={editingItem.rate} onChange={(event) => updateEditingItem("rate", Number(event.target.value))} style={fieldStyle} />
                </EditField>
                <EditField label={pick(language, "最低收费CAD", "Minimum CAD")}>
                  <input type="number" min={0} value={editingItem.minCharge} onChange={(event) => updateEditingItem("minCharge", Number(event.target.value))} style={fieldStyle} />
                </EditField>
                <EditField label={pick(language, "等待时间", "Wait Time")}>
                  <label className="flex items-center gap-2" style={{ height: 36, fontSize: 12, color: "var(--foreground)" }}>
                    <input type="checkbox" checked={editingItem.waitIncluded} onChange={(event) => updateEditingItem("waitIncluded", event.target.checked)} />
                    {pick(language, "包含", "Included")}
                  </label>
                </EditField>
                <EditField label={pick(language, "税费", "Tax")}>
                  <label className="flex items-center gap-2" style={{ height: 36, fontSize: 12, color: "var(--foreground)" }}>
                    <input type="checkbox" checked={editingItem.taxable} onChange={(event) => updateEditingItem("taxable", event.target.checked)} />
                    {pick(language, "应税", "Taxable")}
                  </label>
                </EditField>
                <EditField label={pick(language, "英文备注", "English Notes")} wide>
                  <textarea value={editingItem.notesEn} onChange={(event) => updateEditingItem("notesEn", event.target.value)} style={{ ...fieldStyle, minHeight: 64, resize: "vertical" }} />
                </EditField>
                <EditField label={pick(language, "中文备注", "Chinese Notes")} wide>
                  <textarea value={editingItem.notesZh} onChange={(event) => updateEditingItem("notesZh", event.target.value)} style={{ ...fieldStyle, minHeight: 64, resize: "vertical" }} />
                </EditField>
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setEditingItem(null)} className="px-3 py-2 rounded-lg text-xs hover:bg-background transition-colors" style={{ border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)", cursor: "pointer" }}>
                  {pick(language, "取消", "Cancel")}
                </button>
                <button onClick={saveRateItem} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs hover:opacity-90 transition-opacity" style={{ border: "none", background: "var(--primary)", color: "white", cursor: "pointer", fontWeight: 700 }}>
                  <Save size={12} /> {pick(language, "保存项目", "Save Item")}
                </button>
              </div>
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  {(language === "en"
                    ? ["Item", "Service", "Zone / Codes", "Basis", "Rate", "Minimum", "Includes", "Status", "Notes"]
                    : ["项目", "服务", "区域/代码", "单位", "费率", "最低收费", "包含", "状态", "备注"]
                  ).map((header) => <th key={header} style={thStyle}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {rateItems.map((item) => (
                  <tr key={item.id} style={{ background: item.status === "inactive" ? "var(--muted)" : "var(--card)", opacity: item.status === "inactive" ? 0.72 : 1 }}>
                    <td style={{ ...tdStyle, minWidth: 126 }}>
                      <div className="flex items-start justify-between gap-2">
                        <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{displayName(item)}</span>
                        <button
                          onClick={() => startEditItem(item)}
                          title={pick(language, "编辑", "Edit")}
                          className="inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                          style={{ border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted-foreground)", cursor: "pointer", width: 26, height: 24, flexShrink: 0 }}
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </td>
                    <td style={tdStyle}>{displayService(item)}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: "var(--foreground)" }}>{item.zone}</div>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted-foreground)" }}>{item.codes || "-"}</div>
                    </td>
                    <td style={tdStyle}>{unitLabel(item.unit, language)}</td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--primary)" }}>CAD ${item.rate.toLocaleString()}</span>
                    </td>
                    <td style={tdStyle}>CAD ${item.minCharge.toLocaleString()}</td>
                    <td style={tdStyle}>
                      <div>{item.waitIncluded ? pick(language, "等待", "Wait") : "-"}</div>
                      <div>{item.taxable ? pick(language, "应税", "Taxable") : pick(language, "免税", "Non-tax")}</div>
                    </td>
                    <td style={tdStyle}>
                      <select value={item.status} onChange={(event) => setItemStatus(item, event.target.value as RateStatus)} style={{ ...fieldStyle, width: 108, padding: "5px 8px", fontSize: 12, ...statusStyle(item.status), border: "none", fontWeight: 700 }}>
                        {(["active", "draft", "inactive"] as RateStatus[]).map((status) => <option key={status} value={status}>{statusLabel(status, language)}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, color: "var(--muted-foreground)", maxWidth: 220 }}>{displayNotes(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...card, flex: 1, padding: 20, minWidth: 320 }}>
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={16} style={{ color: "var(--primary)" }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>{pick(language, "估价计算器", "Quick Quote Calculator")}</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{pick(language, "使用启用的每板费率", "Uses active per-pallet rates")}</div>
            </div>
          </div>

          <div style={{ marginBottom: 14, border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--muted)" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>{pick(language, "报价客户", "Quote Customer")}</label>
            <select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} style={{ ...fieldStyle, background: "var(--card)" }}>
              {customerOptions.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name} - {customer.stage}</option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>
              {selectedCustomer
                ? pick(language, `当前报价会回写到 ${selectedCustomer.name} 的客户流程。`, `Quote will update ${selectedCustomer.name}'s customer workflow.`)
                : pick(language, "请先在客户主数据中创建客户。", "Create a customer in Customer Master first.")}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>{pick(language, "选择区域", "Select Zone")}</label>
            <select value={selectedRate?.id ?? ""} onChange={(event) => setSelectedRateId(event.target.value)} style={fieldStyle}>
              {activePalletRates.map((item) => <option key={item.id} value={item.id}>{item.zone} · CAD ${item.rate}/P</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
              {pick(language, "板数", "Pallets")}: <span style={{ fontFamily: "monospace", color: "var(--primary)" }}>{pallets}P</span>
            </label>
            <input type="range" min={1} max={53} value={pallets} onChange={(event) => setPallets(Number(event.target.value))} style={{ width: "100%", accentColor: "var(--primary)" }} />
            <div className="flex justify-between" style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>
              <span>1P</span><span>53P</span>
            </div>
          </div>

          <div style={{ background: "var(--muted)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 6 }}>{pick(language, "估算费用", "Estimated Cost")}</div>
            <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 28, color: "var(--primary)" }}>CAD ${estimated.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
              {ftlOttawa ? pick(language, "整车价已应用", "FTL rate applied") : `CAD $${selectedRate?.rate ?? 0} x ${pallets}P${smallPickupSurcharge ? " + CAD $50 pickup" : ""}`}
            </div>
          </div>

          {pallets < 4 && (
            <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: 10, fontSize: 11, color: "#92400e" }}>
              {pick(language, "少于4板加收CAD $50 pickup", "CAD $50 pickup surcharge under 4 pallets")}
            </div>
          )}
          {ftlOttawa && (
            <div style={{ background: "#dbeafe", border: "1px solid #bfdbfe", borderRadius: 8, padding: 10, fontSize: 11, color: "#1e40af", marginTop: 8 }}>
              {pick(language, `Ottawa整车价CAD $1,150更优惠，对比CAD $${calcBase}/P`, `Ottawa FTL CAD $1,150 is better than CAD $${calcBase}/P`)}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button onClick={saveQuote} className="flex-1 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity" style={{ background: "var(--primary)", color: "white", border: "none", cursor: "pointer" }}>
              {pick(language, "保存报价", "Save Quote")}
            </button>
            <button onClick={copyQuote} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs hover:bg-muted transition-colors" style={{ border: "1px solid var(--border)", cursor: "pointer", color: "var(--foreground)" }}>
              <Copy size={12} /> {pick(language, "复制", "Copy")}
            </button>
          </div>

          {savedQuotes.length > 0 && (
            <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 }}>{pick(language, "最近报价", "Recent Quotes")}</div>
              {savedQuotes.map((quote, index) => (
                <div key={`${quote.customer}-${quote.zone}-${index}`} className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid var(--border)", fontSize: 11 }}>
                  <span style={{ color: "var(--muted-foreground)" }}>{quote.zone} · {quote.pallets}P</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>CAD ${quote.cost.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <div style={{ ...card, flex: 1, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <Truck size={14} style={{ color: "var(--primary)" }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>{pick(language, "整车特价", "FTL Rates")}</div>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            {ftlRates.map((rate) => (
              <div key={rate.descEn} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 13, color: "var(--foreground)" }}>{pick(language, rate.descZh, rate.descEn)}</div>
                  {(language === "en" ? rate.noteEn : rate.noteZh) && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{pick(language, rate.noteZh, rate.noteEn)}</div>}
                </div>
                <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: "var(--primary)", whiteSpace: "nowrap" }}>CAD ${rate.rate}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, flex: 1, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <Clock size={14} style={{ color: "var(--primary)" }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>{pick(language, "费率历史", "Rate History")}</div>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            {rateHistory.map((history, index) => (
              <div key={`${history.date}-${history.zone}-${index}`} className="flex gap-3" style={{ marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted-foreground)" }}>{history.date}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginTop: 1 }}>{history.zone}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{pick(language, history.changeZh, history.changeEn)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>by {history.by}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditField({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label style={{ gridColumn: wide ? "span 2" : undefined }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 5 }}>{label}</div>
      {children}
    </label>
  );
}
