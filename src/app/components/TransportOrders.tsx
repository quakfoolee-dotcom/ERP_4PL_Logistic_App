import { useState } from "react";
import { Search, Filter, Eye, Edit, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { OrderDetailDrawer } from "./OrderDetailDrawer";
import { toast } from "sonner";
import type { TransportOrder } from "../data/transportOrders";

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

export function TransportOrders({ orders }: { orders: TransportOrder[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<TransportOrder | null>(null);

  const filtered = orders.filter(o =>
    (statusFilter === "全部" || o.status === statusFilter) &&
    (o.id.toLowerCase().includes(search.toLowerCase()) ||
     o.customer.toLowerCase().includes(search.toLowerCase()) ||
     o.driver.toLowerCase().includes(search.toLowerCase()) ||
     o.dest.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(s: string) {
    setStatusFilter(s);
    setPage(1);
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      {selectedOrder && (
        <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

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
        <button onClick={() => toast.info("Advanced Filter", { description: "Filter by date range, customer, driver, route, or amount. Coming soon — use the status chips and search for now." })} className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
          <Filter size={12} /> Advanced Filter
        </button>
      </div>

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
                    <button onClick={(e) => { e.stopPropagation(); toast.info(`Edit Order ${order.id}`, { description: `${order.customer} · ${order.amount} · Driver: ${order.driver}` }); }} className="p-1 rounded hover:bg-muted" style={{ color: "var(--muted-foreground)" }} title="Edit"><Edit size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); toast.info(`More Actions — ${order.id}`, { description: `Copy ID · Duplicate · Assign Driver · Print Bill of Lading` }); }} className="p-1 rounded hover:bg-muted" style={{ color: "var(--muted-foreground)" }} title="More"><MoreHorizontal size={13} /></button>
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
