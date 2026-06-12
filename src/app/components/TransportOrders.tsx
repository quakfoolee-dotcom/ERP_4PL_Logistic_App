import { useState } from "react";
import { Search, Filter, Eye, Edit, MoreHorizontal, ChevronLeft, ChevronRight, Copy, Printer, UserPlus, X } from "lucide-react";
import { OrderDetailDrawer } from "./OrderDetailDrawer";
import { toast } from "sonner";
import type { TransportOrder } from "../data/transportOrders";
import { useActionDialog } from "./ActionDialog";

const statusStyle: Record<string, { bg: string; color: string }> = {
  "已完成": { bg: "#D1FAE5", color: "#059669" },
  "运输中": { bg: "#DBEAFE", color: "#1D4ED8" },
  "待派送": { bg: "#FEF3C7", color: "#D97706" },
  "异常": { bg: "#FEE2E2", color: "#DC2626" },
};

const typeColors: Record<string, string> = {
  "FTL": "#1C64F2",
  "LTL": "#0D9488",
};

const PAGE_SIZE = 6;

function moneyValue(value: string) {
  return Number(value.replace(/[^0-9.-]/g, "")) || 0;
}

function formatCAD(value: number) {
  return `CAD $${value.toLocaleString("en-CA")}`;
}

interface TransportOrdersProps {
  orders: TransportOrder[];
  onUpdateOrder: (order: TransportOrder) => void;
  onAddOrder: (order: TransportOrder) => void;
  externalSearch?: string;
  externalStatus?: string;
}

export function TransportOrders({ orders, onUpdateOrder, onAddOrder, externalSearch = "", externalStatus = "全部" }: TransportOrdersProps) {
  const { promptDialog, ActionDialog } = useActionDialog();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<TransportOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<TransportOrder | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advanced, setAdvanced] = useState({ from: "", to: "", type: "全部", minRevenue: "" });
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const effectiveStatus = statusFilter !== "全部" ? statusFilter : externalStatus;
  const effectiveSearch = `${search} ${externalSearch}`.trim().toLowerCase();

  const filtered = orders.filter(o =>
    (effectiveStatus === "全部" || o.status === effectiveStatus) &&
    (advanced.type === "全部" || o.type === advanced.type) &&
    (!advanced.from || o.created >= advanced.from) &&
    (!advanced.to || o.created <= advanced.to) &&
    (!advanced.minRevenue || moneyValue(o.amount) >= Number(advanced.minRevenue)) &&
    (effectiveSearch === "" ||
     o.id.toLowerCase().includes(effectiveSearch) ||
     o.customer.toLowerCase().includes(effectiveSearch) ||
     o.driver.toLowerCase().includes(effectiveSearch) ||
     o.dest.toLowerCase().includes(effectiveSearch))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(s: string) {
    setStatusFilter(s);
    setPage(1);
  }

  function saveOrder(order: TransportOrder) {
    const revenue = moneyValue(order.amount);
    const cost = moneyValue(order.cost);
    onUpdateOrder({ ...order, profit: formatCAD(revenue - cost) });
    setEditingOrder(null);
    setSelectedOrder((current) => current?.id === order.id ? { ...order, profit: formatCAD(revenue - cost) } : current);
    toast.success(`${order.id} updated`);
  }

  async function assignDriver(order: TransportOrder) {
    const driver = await promptDialog("Assign Driver", { message: `Current driver: ${order.driver}`, defaultValue: order.driver });
    if (!driver) return;
    onUpdateOrder({ ...order, driver });
    toast.success(`${order.id} assigned to ${driver}`);
  }

  function duplicateOrder(order: TransportOrder) {
    const copy = {
      ...order,
      id: `${order.id}-COPY-${Date.now().toString().slice(-4)}`,
      status: "待派送" as const,
      pod: "待确认",
      created: new Date().toISOString().slice(0, 10),
    };
    onAddOrder(copy);
    setPage(1);
    toast.success(`${order.id} duplicated`, { description: copy.id });
  }

  function copyOrderId(order: TransportOrder) {
    navigator.clipboard?.writeText(order.id).then(
      () => toast.success("Order ID copied", { description: order.id }),
      () => toast.error("Clipboard unavailable")
    );
  }

  function printBol(order: TransportOrder) {
    const doc = window.open("", "_blank", "width=720,height=860");
    if (!doc) {
      toast.error("Popup blocked", { description: "Allow popups to print the bill of lading." });
      return;
    }
    doc.document.write(`
      <html><head><title>${order.id} BOL</title><style>
        body{font-family:Arial,sans-serif;padding:32px;color:#0f172a}
        h1{font-size:22px;margin:0 0 16px} table{width:100%;border-collapse:collapse}
        td{border:1px solid #cbd5e1;padding:10px;font-size:13px} td:first-child{font-weight:700;background:#f8fafc;width:180px}
      </style></head><body>
        <h1>Bill of Lading</h1>
        <table>
          <tr><td>Order ID</td><td>${order.id}</td></tr>
          <tr><td>Customer</td><td>${order.customer}</td></tr>
          <tr><td>Route</td><td>${order.origin} → ${order.dest}</td></tr>
          <tr><td>Driver</td><td>${order.driver}</td></tr>
          <tr><td>Type / Pallets</td><td>${order.type} / ${order.pallets}</td></tr>
          <tr><td>ETA</td><td>${order.eta}</td></tr>
          <tr><td>Revenue</td><td>${order.amount}</td></tr>
        </table>
        <script>window.print()</script>
      </body></html>
    `);
    doc.document.close();
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <ActionDialog />
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onEdit={() => setEditingOrder(selectedOrder)}
          onUpdate={(order) => {
            onUpdateOrder(order as TransportOrder);
            setSelectedOrder(order as TransportOrder);
          }}
        />
      )}
      {editingOrder && <OrderEditModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={saveOrder} />}

      {/* Summary strip */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {[
          { label: "Total Orders (Apr 2026 + Nov 2025)", value: String(orders.length), color: "#1C64F2" },
          { label: "Delivered 已完成", value: String(orders.filter((order) => order.status === "已完成").length), color: "#10B981" },
          { label: "In Transit 运输中", value: String(orders.filter((order) => order.status === "运输中").length), color: "#1C64F2" },
          { label: "Exception 异常", value: String(orders.filter((order) => order.status === "异常").length), color: "#EF4444" },
        ].map((item, i) => (
          <div key={i} className="bg-card rounded-xl border p-3 flex items-center justify-between"
            style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{item.label}</span>
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: item.color }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border mb-4 px-4 py-3 flex items-center gap-3"
        style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by order ID, customer, driver, destination..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs outline-none"
            style={{ borderColor: "var(--border)", background: "var(--input-background)" }} />
        </div>
        <div className="flex gap-1">
          {["全部", "运输中", "已完成", "待派送", "异常"].map(s => (
            <button key={s} onClick={() => handleFilterChange(s)}
              className="px-3 py-1 rounded-lg text-xs transition-colors"
              style={{
                background: statusFilter === s ? "var(--primary)" : "var(--muted)",
                color: statusFilter === s ? "white" : "var(--muted-foreground)",
                fontWeight: statusFilter === s ? 500 : 400,
              }}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdvanced((value) => !value)} className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
          <Filter size={12} /> Advanced Filter
        </button>
      </div>
      {showAdvanced && (
        <div className="bg-card rounded-xl border mb-4 px-4 py-3 grid gap-3" style={{ borderColor: "var(--border)", gridTemplateColumns: "repeat(5, minmax(120px, 1fr))" }}>
          <FilterField label="Created From">
            <input type="date" value={advanced.from} onChange={(event) => { setAdvanced((current) => ({ ...current, from: event.target.value })); setPage(1); }} className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none" style={{ borderColor: "var(--border)", background: "var(--input-background)" }} />
          </FilterField>
          <FilterField label="Created To">
            <input type="date" value={advanced.to} onChange={(event) => { setAdvanced((current) => ({ ...current, to: event.target.value })); setPage(1); }} className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none" style={{ borderColor: "var(--border)", background: "var(--input-background)" }} />
          </FilterField>
          <FilterField label="Type">
            <select value={advanced.type} onChange={(event) => { setAdvanced((current) => ({ ...current, type: event.target.value })); setPage(1); }} className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none" style={{ borderColor: "var(--border)", background: "var(--input-background)" }}>
              {["全部", "FTL", "LTL"].map((type) => <option key={type}>{type}</option>)}
            </select>
          </FilterField>
          <FilterField label="Min Revenue">
            <input type="number" value={advanced.minRevenue} onChange={(event) => { setAdvanced((current) => ({ ...current, minRevenue: event.target.value })); setPage(1); }} placeholder="1000" className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none" style={{ borderColor: "var(--border)", background: "var(--input-background)" }} />
          </FilterField>
          <div className="flex items-end">
            <button onClick={() => { setAdvanced({ from: "", to: "", type: "全部", minRevenue: "" }); setSearch(""); setStatusFilter("全部"); setPage(1); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
              <X size={12} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
              {["Order ID", "Customer", "Origin → Destination", "Driver", "Type", "Pallets", "Status", "Revenue (CAD)", "Cost (CAD)", "Profit", "POD", "Date", "Actions"].map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-left whitespace-nowrap"
                  style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((order, i) => (
              <tr key={i} onClick={() => setSelectedOrder(order)}
                className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                style={{ borderColor: "var(--border)" }}>
                <td className="px-3 py-2.5">
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--primary)", fontWeight: 600 }}>{order.id}</span>
                </td>
                <td className="px-3 py-2.5 text-xs" style={{ fontWeight: 500 }}>{order.customer}</td>
                <td className="px-3 py-2.5">
                  <div style={{ fontSize: 11, color: "var(--foreground)" }}>{order.origin}</div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>→ {order.dest}</div>
                </td>
                <td className="px-3 py-2.5 text-xs" style={{ fontWeight: 500 }}>{order.driver}</td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded text-xs"
                    style={{ background: typeColors[order.type] + "15", color: typeColors[order.type], fontWeight: 500, fontSize: 11 }}>
                    {order.type}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs" style={{ fontFamily: "monospace", fontWeight: 600 }}>{order.pallets}</td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-xs"
                    style={{ background: statusStyle[order.status]?.bg, color: statusStyle[order.status]?.color, fontWeight: 500, fontSize: 11 }}>
                    {order.status}
                  </span>
                </td>
                <td className="px-3 py-2.5" style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", color: "#1D4ED8" }}>{order.amount}</td>
                <td className="px-3 py-2.5" style={{ fontSize: 12, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{order.cost}</td>
                <td className="px-3 py-2.5" style={{ fontSize: 12, fontFamily: "monospace", color: order.profit !== "—" ? "#059669" : "var(--muted-foreground)", fontWeight: order.profit !== "—" ? 600 : 400 }}>{order.profit}</td>
                <td className="px-3 py-2.5">
                  <span style={{ fontSize: 11, color: order.pod === "已签收" ? "#059669" : order.pod === "争议中" ? "#DC2626" : "var(--muted-foreground)" }}>
                    {order.pod}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "monospace" }}>{order.created}</td>
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelectedOrder(order)} className="p-1 rounded hover:bg-muted" style={{ color: "var(--primary)" }} title="View Detail"><Eye size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingOrder(order); }} className="p-1 rounded hover:bg-muted" style={{ color: "var(--muted-foreground)" }} title="Edit"><Edit size={13} /></button>
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setActionsFor(actionsFor === order.id ? null : order.id); }} className="p-1 rounded hover:bg-muted" style={{ color: "var(--muted-foreground)" }} title="More"><MoreHorizontal size={13} /></button>
                      {actionsFor === order.id && (
                        <div className="absolute right-0 top-6 z-20 w-44 rounded-lg border bg-card p-1 shadow-lg" style={{ borderColor: "var(--border)" }}>
                          <ActionButton icon={<Copy size={12} />} label="Copy ID" onClick={() => { copyOrderId(order); setActionsFor(null); }} />
                          <ActionButton icon={<UserPlus size={12} />} label="Assign Driver" onClick={() => { setActionsFor(null); assignDriver(order); }} />
                          <ActionButton icon={<MoreHorizontal size={12} />} label="Duplicate" onClick={() => { duplicateOrder(order); setActionsFor(null); }} />
                          <ActionButton icon={<Printer size={12} />} label="Print BOL" onClick={() => { printBol(order); setActionsFor(null); }} />
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-muted disabled:opacity-40"
              style={{ color: "var(--muted-foreground)" }}>
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className="w-7 h-7 rounded text-xs transition-colors"
                style={{ background: p === page ? "var(--primary)" : "transparent", color: p === page ? "white" : "var(--muted-foreground)", fontWeight: p === page ? 600 : 400 }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-muted disabled:opacity-40"
              style={{ color: "var(--muted-foreground)" }}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <div className="mb-1" style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600 }}>{label}</div>
      {children}
    </label>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted" style={{ color: "var(--foreground)" }}>
      {icon}
      {label}
    </button>
  );
}

function OrderEditModal({ order, onClose, onSave }: { order: TransportOrder; onClose: () => void; onSave: (order: TransportOrder) => void }) {
  const [draft, setDraft] = useState(order);
  const set = (key: keyof TransportOrder, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const revenue = moneyValue(draft.amount);
  const cost = moneyValue(draft.cost);
  const invalid = !draft.customer || !draft.origin || !draft.dest || !draft.driver || revenue <= 0 || cost < 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl border bg-card shadow-2xl" style={{ borderColor: "var(--border)" }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Edit Order</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{order.id}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted" style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
        </div>

        <div className="grid gap-3 px-5 py-4" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <EditField label="Customer" value={draft.customer} onChange={(value) => set("customer", value)} />
          <EditField label="Driver" value={draft.driver} onChange={(value) => set("driver", value)} />
          <EditField label="Origin" value={draft.origin} onChange={(value) => set("origin", value)} />
          <EditField label="Destination" value={draft.dest} onChange={(value) => set("dest", value)} />
          <EditField label="Pallets" value={draft.pallets} onChange={(value) => set("pallets", value)} />
          <label>
            <div className="mb-1 text-xs" style={{ color: "var(--muted-foreground)", fontWeight: 600 }}>Status</div>
            <select value={draft.status} onChange={(event) => set("status", event.target.value)} className="w-full rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: "var(--border)", background: "var(--input-background)" }}>
              {["待派送", "运输中", "已完成", "异常"].map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <EditField label="Revenue" value={draft.amount} onChange={(value) => set("amount", value)} />
          <EditField label="Cost" value={draft.cost} onChange={(value) => set("cost", value)} />
          <EditField label="POD" value={draft.pod} onChange={(value) => set("pod", value)} />
          <EditField label="ETA" value={draft.eta} onChange={(value) => set("eta", value)} type="date" />
        </div>

        <div className="flex items-center justify-between border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <span className="text-xs" style={{ color: invalid ? "#DC2626" : "var(--muted-foreground)" }}>
            {invalid ? "Customer, route, driver, and positive revenue are required." : `Calculated profit: ${formatCAD(revenue - cost)}`}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-xs hover:bg-muted" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>Cancel</button>
            <button onClick={() => !invalid && onSave(draft)} disabled={invalid} className="rounded-lg px-4 py-2 text-xs" style={{ background: "var(--primary)", color: "white", opacity: invalid ? 0.45 : 1, fontWeight: 600 }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label>
      <div className="mb-1 text-xs" style={{ color: "var(--muted-foreground)", fontWeight: 600 }}>{label}</div>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="w-full rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: "var(--border)", background: "var(--input-background)" }} />
    </label>
  );
}
