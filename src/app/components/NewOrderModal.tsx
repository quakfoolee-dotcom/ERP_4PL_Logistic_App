import { useMemo, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import type { TransportOrder } from "../data/transportOrders";

interface NewOrderModalProps {
  onClose: () => void;
  onSubmit: (order: TransportOrder) => void;
}

const customers = ["ZCSU6522960", "BEAU6280647", "CSGU6675337", "AP-LT", "AP-PDN", "TD-JW", "TD-JEFF", "AP-QX"];
const drivers = ["AF", "LH", "LF", "AD", "WH", "LH / AF"];
const locations = [
  "Brampton #25 (Whybank)",
  "Brampton #10",
  "YYZ9 Amazon FC",
  "YYZ4 Amazon FC - Vaughan",
  "YYZ7 Amazon FC - Concord",
  "YHM1 Hamilton Amazon",
  "YOW1 Ottawa Amazon",
  "YOO1 Oakville Amazon",
  "Saint-Laurent, QC",
];

export function NewOrderModal({ onClose, onSubmit }: NewOrderModalProps) {
  const [form, setForm] = useState({
    customer: "",
    origin: "Brampton #25 (Whybank)",
    dest: "",
    driver: "",
    type: "FTL" as TransportOrder["type"],
    pallets: "",
    amount: "",
    cost: "",
    eta: "2026-04-30",
    note: "",
  });
  const [step, setStep] = useState(1);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const palletsNumber = Number(form.pallets);
  const amountNumber = Number(form.amount);
  const costNumber = Number(form.cost || 0);

  const validation = useMemo(() => {
    if (!form.customer || !form.origin || !form.dest || !form.driver) return "Select customer, route, and driver.";
    if (form.origin === form.dest) return "Origin and destination must be different.";
    if (!Number.isFinite(palletsNumber) || palletsNumber <= 0) return "Pallets must be greater than 0.";
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return "Revenue must be greater than 0.";
    if (!Number.isFinite(costNumber) || costNumber < 0) return "Cost cannot be negative.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.eta)) return "ETA must use YYYY-MM-DD.";
    return "";
  }, [amountNumber, costNumber, form, palletsNumber]);

  const canNext = Boolean(form.customer && form.origin && form.dest && form.driver && form.origin !== form.dest);
  const canSubmit = !validation;

  function handleSubmit() {
    if (!canSubmit) return;
    const suffix = `${form.customer.replace(/[^A-Z0-9]/gi, "").slice(0, 5).toUpperCase()}${Date.now().toString().slice(-4)}`;
    const profit = amountNumber - costNumber;
    onSubmit({
      id: `WB-260430-${suffix}`,
      customer: form.customer,
      origin: form.origin,
      dest: `${form.dest} (${palletsNumber}P)`,
      driver: form.driver,
      vehicle: form.type === "FTL" ? "大车 FTL" : "小车 LTL",
      type: form.type,
      pallets: `${palletsNumber}P`,
      status: "待派送",
      amount: `CAD $${amountNumber.toLocaleString("en-CA")}`,
      cost: `CAD $${costNumber.toLocaleString("en-CA")}`,
      profit: `CAD $${profit.toLocaleString("en-CA")}`,
      pod: "待确认",
      eta: form.eta,
      created: "2026-04-30",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>新建运输订单</h2>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>New Transport Order · Brampton FBA</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted" style={{ color: "var(--muted-foreground)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-4 border-b px-6 py-3" style={{ borderColor: "var(--border)" }}>
          {[{ n: 1, label: "基本信息" }, { n: 2, label: "运输详情" }].map((item) => (
            <div key={item.n} className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full text-xs" style={{ background: step >= item.n ? "var(--primary)" : "var(--muted)", color: step >= item.n ? "white" : "var(--muted-foreground)", fontWeight: 600 }}>
                {item.n}
              </div>
              <span style={{ fontSize: 12, color: step >= item.n ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: step === item.n ? 600 : 400 }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4 px-6 py-5">
          {step === 1 ? (
            <>
              <Field label="客户名称 Customer" required>
                <Select value={form.customer} onChange={(value) => set("customer", value)} options={customers} placeholder="选择客户" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="起始地 Origin" required>
                  <Select value={form.origin} onChange={(value) => set("origin", value)} options={locations} placeholder="选择起点" />
                </Field>
                <Field label="目的地 Destination" required>
                  <Select value={form.dest} onChange={(value) => set("dest", value)} options={locations.filter((location) => location !== form.origin)} placeholder="选择终点" />
                </Field>
              </div>
              <Field label="分配司机 Assign Driver" required>
                <Select value={form.driver} onChange={(value) => set("driver", value)} options={drivers} placeholder="选择司机" />
              </Field>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {(["FTL", "LTL"] as const).map((type) => (
                  <button key={type} onClick={() => set("type", type)} className="rounded-lg border py-2 text-xs transition-all" style={{ borderColor: form.type === type ? "var(--primary)" : "var(--border)", background: form.type === type ? "var(--primary)10" : "transparent", color: form.type === type ? "var(--primary)" : "var(--muted-foreground)", fontWeight: form.type === type ? 600 : 400 }}>
                    {type}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="托盘 Pallets" required>
                  <Input value={form.pallets} onChange={(value) => set("pallets", value)} placeholder="36" type="number" />
                </Field>
                <Field label="收入 Revenue (CAD)" required>
                  <Input value={form.amount} onChange={(value) => set("amount", value)} placeholder="2066" type="number" />
                </Field>
                <Field label="成本 Cost (CAD)">
                  <Input value={form.cost} onChange={(value) => set("cost", value)} placeholder="400" type="number" />
                </Field>
              </div>
              <Field label="ETA" required>
                <Input value={form.eta} onChange={(value) => set("eta", value)} placeholder="2026-04-30" type="date" />
              </Field>
              <Field label="备注 Notes">
                <textarea value={form.note} onChange={(event) => set("note", event.target.value)} placeholder="Special handling notes..." rows={3} className="w-full resize-none rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: "var(--border)", background: "var(--input-background)" }} />
              </Field>
              {validation && <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "#F59E0B40", background: "#FEF3C7", color: "#92400E" }}>{validation}</div>}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: "var(--border)" }}>
          {step === 1 ? (
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-xs" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>取消</button>
          ) : (
            <button onClick={() => setStep(1)} className="rounded-lg border px-4 py-2 text-xs" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>← 上一步</button>
          )}
          {step === 1 ? (
            <button onClick={() => setStep(2)} disabled={!canNext} className="rounded-lg px-5 py-2 text-xs transition-opacity" style={{ background: "var(--primary)", color: "white", fontWeight: 500, opacity: canNext ? 1 : 0.4 }}>下一步 →</button>
          ) : (
            <button onClick={handleSubmit} disabled={!canSubmit} className="rounded-lg px-5 py-2 text-xs transition-opacity" style={{ background: "var(--primary)", color: "white", fontWeight: 500, opacity: canSubmit ? 1 : 0.4 }}>提交订单</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block" style={{ fontSize: 11, fontWeight: 500, color: "var(--foreground)" }}>
        {label} {required && <span style={{ color: "#EF4444" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return (
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} className="w-full rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: "var(--border)", background: "var(--input-background)" }} />
  );
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: string[]; placeholder: string }) {
  return (
    <div className="relative">
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full cursor-pointer appearance-none rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: "var(--border)", background: "var(--input-background)", color: value ? "var(--foreground)" : "var(--muted-foreground)" }}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
    </div>
  );
}
