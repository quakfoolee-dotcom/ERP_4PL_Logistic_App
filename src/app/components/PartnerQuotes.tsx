import { useState } from "react";
import { Calculator, Clock, Truck, Download, Copy } from "lucide-react";
import { toast } from "sonner";

const rateCard = [
  { zone: "YYZ系列 Toronto", codes: "YYZ4 · YYZ7 · YYZ9", rate: 35, waitIncluded: true, minCharge: 35, notes: "<4P加$50 pickup" },
  { zone: "YOO1 Oakville", codes: "YOO1", rate: 40, waitIncluded: true, minCharge: 40, notes: "等待时间已含" },
  { zone: "YHM1 Hamilton", codes: "YHM1", rate: 40, waitIncluded: true, minCharge: 40, notes: "等待时间已含" },
  { zone: "YXU1 London", codes: "YXU1", rate: 50, waitIncluded: true, minCharge: 50, notes: "等待时间已含" },
  { zone: "YGK1 Kingston", codes: "YGK1", rate: 50, waitIncluded: true, minCharge: 50, notes: "等待时间已含" },
  { zone: "YOW Ottawa", codes: "YOW1 · YOW3", rate: 80, waitIncluded: true, minCharge: 80, notes: "或$1,150/整车" },
];

const ftlRates = [
  { desc: "大卡车 50km内 Large Truck <50km", rate: 300, type: "flat" },
  { desc: "Ottawa整车 Ottawa Full Load", rate: 1150, type: "flat", note: "Mark确认 2025-05-26" },
  { desc: "机场接货→CBWS 小车 Airport→CBWS Small", rate: 200, type: "flat" },
  { desc: "机场接货→CBWS 大车 Airport→CBWS Large", rate: 300, type: "flat" },
];

const rateHistory = [
  { date: "2025-05-26", zone: "YOW1/YOW3", change: "整车价确认 $1,150/load", by: "Mark" },
  { date: "2025-03-01", zone: "YXU1/YGK1", change: "更新至 $50/P (含等待)", by: "Admin" },
  { date: "2025-01-15", zone: "YYZ系列", change: "更新至 $35/P (含等待)", by: "Admin" },
  { date: "2024-11-01", zone: "All Zones", change: "初始费率录入系统", by: "System" },
];

const card = { background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
const thStyle: React.CSSProperties = { background: "var(--muted)", fontSize: 11, fontWeight: 600, padding: "6px 12px", textAlign: "left" as const, color: "var(--muted-foreground)", textTransform: "uppercase" as const };
const tdStyle: React.CSSProperties = { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--border)" };

export function PartnerQuotes() {
  const [zone, setZone] = useState(rateCard[0]);
  const [pallets, setPallets] = useState(20);
  const [savedQuotes, setSavedQuotes] = useState<{zone:string;pallets:number;cost:number;date:string}[]>([]);

  const calcBase = zone.rate * pallets;
  const smallPickupSurcharge = pallets < 4 ? 50 : 0;
  const ftlOttawa = zone.codes.includes("YOW") && pallets >= 14;
  const estimated = ftlOttawa ? 1150 : calcBase + smallPickupSurcharge;

  function saveQuote() {
    const q = { zone: zone.zone, pallets, cost: estimated, date: new Date().toLocaleDateString("en-CA") };
    setSavedQuotes(p => [q, ...p.slice(0, 4)]);
    toast.success(`Quote saved: ${zone.zone} · ${pallets}P · CAD $${estimated.toLocaleString()}`);
  }
  function copyQuote() {
    const text = `Quote: ${zone.zone} (${zone.codes})\nPallets: ${pallets}P\nEstimated Cost: CAD $${estimated.toLocaleString()}\n${ftlOttawa ? "FTL rate applied" : `Rate: $${zone.rate}/P${smallPickupSurcharge ? " + $50 pickup" : ""}`}\nGenerated: ${new Date().toLocaleDateString("en-CA")}`;
    navigator.clipboard.writeText(text).then(() => toast.success("Quote copied to clipboard"));
  }
  function exportRateCard() {
    const rows = ["Zone,FC Codes,Rate/P (CAD),Wait Included,Min Charge,Notes",
      ...rateCard.map(r => `"${r.zone}","${r.codes}",${r.rate},${r.waitIncluded?"Yes":"No"},${r.minCharge},"${r.notes}"`),
      "",'"Large truck <50km (flat)","—",300,N/A,300,""',
      '"Ottawa FTL load","YOW1 · YOW3",1150,Yes,1150,"Confirmed Mark 2025-05-26"',
      '"Airport→CBWS Small","—",200,N/A,200,""',
      '"Airport→CBWS Large","—",300,N/A,300,""',
    ].join("\n");
    const blob = new Blob([rows],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="rate_card.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Rate card exported");
  }

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--background)" }}>
      <div className="flex gap-4 mb-4">
        {/* Rate Card */}
        <div style={{ ...card, flex: 2, padding: 0, overflow: "hidden" }}>
          <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>费率表 Partner Rate Card</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>FBA Delivery — Per Pallet (CAD) · 含等待 Wait Included</div>
            </div>
            <button onClick={exportRateCard} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-90 transition-opacity" style={{ background: "var(--primary)", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}>
              <Download size={12} /> Export CSV
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["区域 Zone", "FC代码", "单价/板 Rate/P", "等待已含", "备注"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rateCard.map(r => (
                <tr key={r.zone} style={{ background: "var(--card)" }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.zone}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{r.codes}</td>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: "var(--primary)" }}>
                      ${r.rate}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>/P</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" as const }}>
                    <span style={{ color: r.waitIncluded ? "#047857" : "#b91c1c", fontWeight: 700 }}>{r.waitIncluded ? "✓" : "✗"}</span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11, color: "var(--muted-foreground)" }}>{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quote Calculator */}
        <div style={{ ...card, flex: 1, padding: 20 }}>
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={16} style={{ color: "var(--primary)" }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>估价计算器</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Quick Quote Calculator</div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>选择区域 Select Zone</label>
            <select value={zone.zone} onChange={e => setZone(rateCard.find(r => r.zone === e.target.value) || rateCard[0])}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 13 }}>
              {rateCard.map(r => <option key={r.zone} value={r.zone}>{r.zone}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
              板数 Pallets: <span style={{ fontFamily: "monospace", color: "var(--primary)" }}>{pallets}P</span>
            </label>
            <input type="range" min={1} max={53} value={pallets} onChange={e => setPallets(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--primary)" }} />
            <div className="flex justify-between" style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>
              <span>1P</span><span>53P</span>
            </div>
          </div>

          <div style={{ background: "var(--muted)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 6 }}>估算费用 Estimated Cost</div>
            <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 28, color: "var(--primary)" }}>
              ${estimated.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
              {ftlOttawa ? "整车价 FTL Rate · 更优惠" : `$${zone.rate} × ${pallets}P${smallPickupSurcharge ? " + $50 pickup" : ""}`}
            </div>
          </div>

          {pallets < 4 && (
            <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: 10, fontSize: 11, color: "#92400e" }}>
              少于4板加收 $50 pickup surcharge
            </div>
          )}
          {ftlOttawa && (
            <div style={{ background: "#dbeafe", border: "1px solid #bfdbfe", borderRadius: 8, padding: 10, fontSize: 11, color: "#1e40af", marginTop: 8 }}>
              Ottawa整车价 $1,150 更优惠 (vs ${zone.rate * pallets}/P)
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button onClick={saveQuote} className="flex-1 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity" style={{ background: "var(--primary)", color: "white", border: "none", cursor: "pointer" }}>
              Save Quote
            </button>
            <button onClick={copyQuote} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs hover:bg-muted transition-colors" style={{ border: "1px solid var(--border)", cursor: "pointer", color: "var(--foreground)" }}>
              <Copy size={12} /> Copy
            </button>
          </div>
          {savedQuotes.length > 0 && (
            <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 }}>Recent Quotes</div>
              {savedQuotes.map((q, i) => (
                <div key={i} className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid var(--border)", fontSize: 11 }}>
                  <span style={{ color: "var(--muted-foreground)" }}>{q.zone} · {q.pallets}P</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>CAD ${q.cost.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* FTL Rates */}
        <div style={{ ...card, flex: 1, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <Truck size={14} style={{ color: "var(--primary)" }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>整车特价 FTL Rates</div>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            {ftlRates.map(r => (
              <div key={r.desc} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 13, color: "var(--foreground)" }}>{r.desc}</div>
                  {r.note && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{r.note}</div>}
                </div>
                <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: "var(--primary)", whiteSpace: "nowrap" }}>${r.rate}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rate History */}
        <div style={{ ...card, flex: 1, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <Clock size={14} style={{ color: "var(--primary)" }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>费率历史 Rate History</div>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            {rateHistory.map((h, i) => (
              <div key={i} className="flex gap-3" style={{ marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted-foreground)" }}>{h.date}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginTop: 1 }}>{h.zone}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{h.change}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>by {h.by}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
