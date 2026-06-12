import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  label: string;
  labelEn?: string;
  value: string;
  sub?: string;
  trend?: number;
  trendLabel?: string;
  accent?: string;
  icon?: React.ReactNode;
}

export function KpiCard({ label, labelEn, value, sub, trend, trendLabel, accent = "#1C64F2", icon }: KpiCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <div className="bg-card rounded-xl border p-4 flex flex-col gap-3 transition-shadow hover:shadow-md"
      style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</div>
          {labelEn && <div style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.7 }}>{labelEn}</div>}
        </div>
        {icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: accent + "15", color: accent }}>
            {icon}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.1, fontFamily: "'JetBrains Mono', monospace" }}>
          {value}
        </div>
        {sub && (
          <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{sub}</div>
        )}
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-1 text-xs">
          {isPositive && <TrendingUp size={12} style={{ color: "#10B981" }} />}
          {isNegative && <TrendingDown size={12} style={{ color: "#EF4444" }} />}
          {!isPositive && !isNegative && <Minus size={12} style={{ color: "var(--muted-foreground)" }} />}
          <span style={{ color: isPositive ? "#10B981" : isNegative ? "#EF4444" : "var(--muted-foreground)", fontWeight: 500 }}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
          <span style={{ color: "var(--muted-foreground)" }}>{trendLabel || ""}</span>
        </div>
      )}
    </div>
  );
}
