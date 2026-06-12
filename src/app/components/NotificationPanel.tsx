import { useState } from "react";
import { X, CheckCircle2, AlertTriangle, Info, Truck, FileText } from "lucide-react";
import { toast } from "sonner";

const notifications = [
  { id: 1, type: "error", icon: <AlertTriangle size={14} />, title: "订单异常告警", titleEn: "Order Exception", body: "WB-251103-DB-001 Concord → YOW1 POD争议，请立即处理", time: "5分钟前", read: false, color: "#EF4444" },
  { id: 2, type: "warning", icon: <FileText size={14} />, title: "发票逾期提醒", titleEn: "Invoice Overdue", body: "CSGU6675337 2026-0135 已逾期，金额 CAD $3,352", time: "23分钟前", read: false, color: "#F59E0B" },
  { id: 3, type: "info", icon: <Truck size={14} />, title: "车辆到达通知", titleEn: "Vehicle Arrived", body: "WB-260423-BEAU6280647 LH 已到达 YHM1，等待卸货", time: "1小时前", read: false, color: "#1C64F2" },
  { id: 4, type: "success", icon: <CheckCircle2 size={14} />, title: "结算完成", titleEn: "Settlement Done", body: "AF 4月结算 CAD $6,240 已完成", time: "2小时前", read: true, color: "#10B981" },
  { id: 5, type: "info", icon: <Info size={14} />, title: "报销待审核", titleEn: "Reimbursement Pending", body: "LF 申请报销等候费 CAD $180，请及时审核", time: "3小时前", read: true, color: "#8B5CF6" },
  { id: 6, type: "success", icon: <CheckCircle2 size={14} />, title: "POD已签收", titleEn: "POD Confirmed", body: "WB-260405-ZCSU6522960 POD已由 YYZ9 签收确认", time: "5小时前", read: true, color: "#10B981" },
];

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const [readIds, setReadIds] = useState<Set<number>>(
    new Set(notifications.filter(n => n.read).map(n => n.id))
  );

  function markRead(id: number) {
    setReadIds(prev => new Set(prev).add(id));
    const n = notifications.find(n => n.id === id);
    if (n && !readIds.has(id)) toast.success("Notification marked as read", { description: n.titleEn });
  }

  function markAllRead() {
    setReadIds(new Set(notifications.map(n => n.id)));
    toast.success("All notifications marked as read");
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <span className="text-sm" style={{ fontWeight: 600 }}>通知中心</span>
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs" style={{ background: "#EF4444", color: "white", fontSize: 10 }}>
              3
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted" style={{ color: "var(--muted-foreground)" }}>
            <X size={14} />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
          {notifications.map(n => {
            const isRead = readIds.has(n.id);
            return (
            <div key={n.id} onClick={() => markRead(n.id)} className="flex gap-3 px-4 py-3 border-b hover:bg-muted/40 cursor-pointer transition-colors"
              style={{ borderColor: "var(--border)", background: !isRead ? n.color + "06" : "transparent" }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: n.color + "15", color: n.color }}>
                {n.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs" style={{ fontWeight: 600, color: "var(--foreground)" }}>{n.title}</span>
                  {!isRead && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: n.color }} />}
                </div>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{n.body}</p>
                <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.7 }}>{n.time}</span>
              </div>
            </div>
          );
          })}
        </div>
        <div className="px-4 py-2.5 flex justify-between items-center" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={markAllRead} className="text-xs" style={{ color: "var(--primary)" }}>全部标为已读</button>
          <button onClick={() => { toast.info("All Notifications", { description: "Viewing full notification history — 6 recent items shown." }); onClose(); }} className="text-xs" style={{ color: "var(--muted-foreground)" }}>查看全部</button>
        </div>
      </div>
    </>
  );
}
