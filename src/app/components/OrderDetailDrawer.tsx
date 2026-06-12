import { X, MapPin, Truck, User, FileText, CheckCircle2, Clock, AlertCircle, Phone, Package } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  customer: string;
  origin?: string;
  dest?: string;
  route?: string;
  driver: string;
  vehicle?: string;
  type?: string;
  weight?: string;
  status: string;
  amount: string;
  cost?: string;
  profit?: string;
  pod: string;
  eta?: string;
  date?: string;
  created?: string;
}

interface OrderDetailDrawerProps {
  order: Order;
  onClose: () => void;
  onEdit?: () => void;
  onUpdate?: (order: Order) => void;
}

const statusStyle: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  "已完成": { bg: "#D1FAE5", color: "#059669", icon: <CheckCircle2 size={13} /> },
  "运输中": { bg: "#DBEAFE", color: "#1D4ED8", icon: <Truck size={13} /> },
  "待派送": { bg: "#FEF3C7", color: "#D97706", icon: <Clock size={13} /> },
  "异常": { bg: "#FEE2E2", color: "#DC2626", icon: <AlertCircle size={13} /> },
};

interface TimelineStep {
  time: string;
  event: string;
  detail: string;
  done: boolean;
}

function orderDate(order: Order) {
  return order.created || order.date || order.eta || "—";
}

function hasSignedPod(order: Order) {
  return order.pod === "已签收" || order.pod.toLowerCase() === "signed";
}

function buildOrderTimeline(order: Order): TimelineStep[] {
  const created = orderDate(order);
  const eta = order.eta || created;
  const isPending = order.status === "待派送";
  const isInTransit = order.status === "运输中";
  const isCompleted = order.status === "已完成" || hasSignedPod(order);
  const isException = order.status === "异常";
  const isMoving = isInTransit || isCompleted || isException;
  const isDispatched = !isPending || isMoving;

  return [
    {
      time: created === "—" ? "—" : `${created} 09:12`,
      event: "订单创建",
      detail: `系统已创建订单 ${order.id}`,
      done: true,
    },
    {
      time: isDispatched ? `${created} 10:30` : "等待派车",
      event: isDispatched ? "已派车" : "待派车",
      detail: isDispatched ? `已分配司机 ${order.driver}${order.vehicle ? ` / ${order.vehicle}` : ""}` : "等待分配司机及车辆",
      done: isDispatched,
    },
    {
      time: isDispatched ? `${created} 14:00` : "等待装载",
      event: "货物装载",
      detail: isDispatched ? `${order.pallets || "—"} 托盘已装载，路线 ${order.origin || "—"} → ${order.dest || "—"}` : "派车后同步装载时间",
      done: isDispatched,
    },
    {
      time: isMoving ? `${created} —` : "未启程",
      event: isException ? "运输异常" : "运输中",
      detail: isException ? `异常状态：${order.pod}` : isMoving ? "车辆行驶途中，实时追踪" : "车辆尚未启程",
      done: isMoving,
    },
    {
      time: isCompleted ? eta : `预计 ${eta}`,
      event: isCompleted ? "已到达目的地" : "到达目的地",
      detail: isCompleted ? `客户签收确认POD：${order.pod}` : `等待客户签收确认POD：${order.pod}`,
      done: isCompleted,
    },
  ];
}

export function OrderDetailDrawer({ order, onClose, onEdit, onUpdate }: OrderDetailDrawerProps) {
  const st = statusStyle[order.status] || statusStyle["运输中"];
  const origin = order.origin || (order.route ? order.route.split(" → ")[0] : "—");
  const dest = order.dest || (order.route ? order.route.split(" → ")[1] : "—");
  const timeline = buildOrderTimeline(order);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-96 flex flex-col border-l overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)", boxShadow: "-8px 0 32px rgba(0,0,0,0.1)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "var(--primary)" }}>{order.id}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>订单详情 Order Detail</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted" style={{ color: "var(--muted-foreground)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Status banner */}
          <div className="mx-5 mt-4 p-3 rounded-xl flex items-center gap-3"
            style={{ background: st.color + "10", border: `1px solid ${st.color}30` }}>
            <div style={{ color: st.color }}>{st.icon}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: st.color }}>{order.status}</div>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                {order.status === "运输中" ? `预计到达 ${order.eta || "—"}` : `POD: ${order.pod}`}
              </div>
            </div>
          </div>

          {/* Route */}
          <div className="mx-5 mt-4 p-4 rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <div className="text-xs mb-3" style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>运输路线 Route</div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#1C64F2" }} />
                <div className="w-0.5 h-8" style={{ background: "var(--border)" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#10B981" }} />
              </div>
              <div className="flex flex-col justify-between" style={{ gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{origin}</div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>出发地 Origin</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{dest}</div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>目的地 Destination</div>
                </div>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="mx-5 mt-3 grid grid-cols-2 gap-2">
            {[
              { label: "客户", labelEn: "Customer", value: order.customer, icon: <User size={12} /> },
              { label: "司机", labelEn: "Driver", value: order.driver, icon: <User size={12} /> },
              { label: "车牌", labelEn: "Vehicle", value: order.vehicle || "—", icon: <Truck size={12} /> },
              { label: "运输类型", labelEn: "Type", value: order.type || "整车", icon: <Package size={12} /> },
              { label: "应收金额", labelEn: "Revenue", value: order.amount, icon: <FileText size={12} /> },
              { label: "运输成本", labelEn: "Cost", value: order.cost || "—", icon: <FileText size={12} /> },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-1 mb-1" style={{ color: "var(--muted-foreground)" }}>
                  {item.icon}
                  <span style={{ fontSize: 10 }}>{item.label}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, fontFamily: item.value?.startsWith("CAD") ? "monospace" : "inherit" }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="mx-5 mt-4 mb-4">
            <div className="text-xs mb-3" style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>物流轨迹 Timeline</div>
            <div className="space-y-0">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: t.done ? "#1C64F2" : "var(--muted)", border: `2px solid ${t.done ? "#1C64F2" : "var(--border)"}` }} />
                    {i < timeline.length - 1 && (
                      <div className="w-0.5 flex-1 min-h-4 my-1" style={{ background: t.done ? "#1C64F2" : "var(--border)" }} />
                    )}
                  </div>
                  <div className="pb-3">
                    <div style={{ fontSize: 12, fontWeight: 500, color: t.done ? "var(--foreground)" : "var(--muted-foreground)" }}>{t.event}</div>
                    <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{t.detail}</div>
                    <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontFamily: "monospace", marginTop: 2 }}>{t.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button onClick={onEdit} disabled={!onEdit} className="flex-1 py-2 rounded-lg border text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
            编辑订单
          </button>
          {order.status === "异常" && (
            <button onClick={() => {
              const updated = { ...order, status: "运输中", pod: "待确认" };
              onUpdate?.(updated);
              toast.success(`Exception reopened — ${order.id}`, { description: "Status changed to In Transit for follow-up." });
            }} className="flex-1 py-2 rounded-lg text-xs"
              style={{ background: "#EF4444", color: "white", fontWeight: 500 }}>
              处理异常
            </button>
          )}
          {order.status === "运输中" && (
            <button onClick={() => {
              const updated = { ...order, status: "已完成", pod: "已签收" };
              onUpdate?.(updated);
              toast.success(`Delivery confirmed — ${order.id}`, { description: "Order marked completed and POD signed." });
            }} className="flex-1 py-2 rounded-lg text-xs"
              style={{ background: "var(--primary)", color: "white", fontWeight: 500 }}>
              确认到达
            </button>
          )}
          {order.status === "待派送" && (
            <button onClick={() => {
              const updated = { ...order, status: "运输中" };
              onUpdate?.(updated);
              toast.success(`Dispatch Confirmed — ${order.id}`, { description: `Driver: ${order.driver} · Route: ${origin} → ${dest}` });
            }} className="flex-1 py-2 rounded-lg text-xs"
              style={{ background: "#10B981", color: "white", fontWeight: 500 }}>
              确认派车
            </button>
          )}
        </div>
      </div>
    </>
  );
}
