import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Filter, PlugZap, Search, Wrench } from "lucide-react";
import type { AppLanguage } from "../i18n";
import { pick } from "../i18n";
import { getRequirementCoverageProjection } from "../repositories/projections";
import type { CoverageStatus, RequirementModule } from "../domain/requirementsCoverage";

const statusMeta: Record<CoverageStatus, { color: string; bg: string; icon: React.ReactNode; zh: string; en: string }> = {
  implemented: { color: "#047857", bg: "#D1FAE5", icon: <CheckCircle2 size={12} />, zh: "已实现", en: "Implemented" },
  in_progress: { color: "#1D4ED8", bg: "#DBEAFE", icon: <Clock3 size={12} />, zh: "进行中", en: "In Progress" },
  scaffolded: { color: "#B45309", bg: "#FEF3C7", icon: <Wrench size={12} />, zh: "已搭建", en: "Scaffolded" },
  external_dependency: { color: "#6D28D9", bg: "#EDE9FE", icon: <PlugZap size={12} />, zh: "待集成", en: "External Dependency" },
};

const modules: Array<"All" | RequirementModule> = ["All", "ERP", "CRM", "Freight/Customs", "WMS", "TMS", "Accounting", "Integration", "Reporting"];

export function RequirementsCoverageView({ language = "zh" }: { language?: AppLanguage }) {
  const { requirements, summary } = getRequirementCoverageProjection();
  const [moduleFilter, setModuleFilter] = useState<"All" | RequirementModule>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return requirements.filter((item) => {
      const moduleOk = moduleFilter === "All" || item.module === moduleFilter;
      const queryOk = !needle || [item.id, item.title, item.appArea, item.nextAction].some((value) => value.toLowerCase().includes(needle));
      return moduleOk && queryOk;
    });
  }, [requirements, moduleFilter, query]);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        <Kpi label={pick(language, "需求总数", "Requirements")} value={String(summary.total)} color="#0F172A" />
        <Kpi label={pick(language, "覆盖率", "Coverage")} value={`${summary.coveragePct}%`} color="#1C64F2" />
        <Kpi label={pick(language, "已实现", "Implemented")} value={String(summary.implemented)} color="#047857" />
        <Kpi label={pick(language, "进行中/已搭建", "In Progress / Scaffolded")} value={String(summary.inProgress + summary.scaffolded)} color="#B45309" />
        <Kpi label={pick(language, "待外部集成", "External")} value={String(summary.external)} color="#6D28D9" />
      </div>

      <Panel
        title={pick(language, "系统需求覆盖矩阵", "System Requirements Coverage Matrix")}
        subtitle={pick(language, "来自软件系统需求表的可实施项、当前位置和下一步", "Implementable items from the software requirements workbook, mapped to the current app")}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--input-background)" }}>
            <Search size={14} style={{ color: "var(--muted-foreground)" }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={pick(language, "搜索需求、模块、下一步...", "Search requirements, modules, next steps...")}
              className="bg-transparent text-xs outline-none"
              style={{ width: 260, color: "var(--foreground)" }}
            />
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <Filter size={13} />
            {pick(language, "模块", "Module")}
          </div>
          {modules.map((module) => (
            <button
              key={module}
              onClick={() => setModuleFilter(module)}
              className="rounded-lg border px-3 py-2 text-xs transition-colors"
              style={{
                borderColor: moduleFilter === module ? "var(--primary)" : "var(--border)",
                background: moduleFilter === module ? "var(--primary)" : "var(--card)",
                color: moduleFilter === module ? "white" : "var(--foreground)",
                fontWeight: moduleFilter === module ? 700 : 500,
              }}
            >
              {module === "All" ? pick(language, "全部", "All") : module}
            </button>
          ))}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="w-full" style={{ minWidth: 1050 }}>
            <thead>
              <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                {[pick(language, "需求编号", "Req ID"), pick(language, "模块", "Module"), pick(language, "优先级", "Priority"), pick(language, "需求", "Requirement"), pick(language, "应用位置", "App Area"), pick(language, "状态", "Status"), pick(language, "下一步", "Next Action")].map((header) => (
                  <th key={header} className="px-3 py-2.5 text-left text-xs" style={{ color: "var(--muted-foreground)", fontWeight: 700 }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/30" style={{ borderColor: "var(--border)" }}>
                  <td className="px-3 py-3 text-xs" style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 800 }}>{item.id}</td>
                  <td className="px-3 py-3 text-xs">{item.module}</td>
                  <td className="px-3 py-3 text-xs">{item.priority} / {item.phase}</td>
                  <td className="px-3 py-3 text-xs" style={{ maxWidth: 280 }}>{item.title}</td>
                  <td className="px-3 py-3 text-xs" style={{ fontWeight: 700 }}>{item.appArea}</td>
                  <td className="px-3 py-3 text-xs"><StatusPill status={item.status} language={language} /></td>
                  <td className="px-3 py-3 text-xs" style={{ color: "var(--muted-foreground)", maxWidth: 320 }}>{item.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-4" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="mb-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</div>
      <div style={{ color, fontFamily: "monospace", fontSize: 24, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card" style={{ borderColor: "var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <div className="text-sm" style={{ fontWeight: 800 }}>{title}</div>
        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{subtitle}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatusPill({ status, language }: { status: CoverageStatus; language: AppLanguage }) {
  const meta = statusMeta[status];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1" style={{ background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 800 }}>
      {meta.icon}
      {pick(language, meta.zh, meta.en)}
    </span>
  );
}
