import { useSyncExternalStore } from "react";
import { Clock3, FileText, GitBranch, Link2, RefreshCw } from "lucide-react";
import type { AppLanguage } from "../i18n";
import { pick } from "../i18n";
import type { BackboneTrace } from "../repositories/orderToCashAdapters";
import { orderToCashRepository } from "../repositories/orderToCashRepository";

interface BackboneTracePanelProps {
  language: AppLanguage;
  trace: BackboneTrace | null;
}

export function useOrderToCashSnapshot() {
  return useSyncExternalStore(
    orderToCashRepository.subscribe,
    orderToCashRepository.getLiveSnapshot,
    orderToCashRepository.getLiveSnapshot,
  );
}

export function BackboneTracePanel({ language, trace }: BackboneTracePanelProps) {
  if (!trace) {
    return (
      <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {pick(language, "No linked backbone record yet", "No linked backbone record yet")}
        </div>
      </div>
    );
  }

  const latestEvents = trace.timelineEvents.slice(0, 4);

  return (
    <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <div className="border-b px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs" style={{ color: "var(--muted-foreground)", fontWeight: 800 }}>{pick(language, "Backbone Trace", "Backbone Trace")}</div>
            <div className="mt-0.5 text-xs" style={{ color: "var(--foreground)", fontWeight: 800 }}>{trace.title}</div>
          </div>
          <span className="rounded-full px-2 py-1 text-xs" style={{ background: "#E0ECFF", color: "#1D4ED8", fontFamily: "monospace", fontWeight: 800 }}>
            {trace.status}
          </span>
        </div>
        <div className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
          {trace.ownerType} / <span style={{ fontFamily: "monospace" }}>{trace.ownerId}</span> / {trace.owner}
        </div>
      </div>

      <div className="space-y-3 p-3">
        {trace.note && <InfoLine label={pick(language, "Current Note", "Current Note")} value={trace.note} />}

        <MiniSection icon={<GitBranch size={13} />} title={pick(language, "Linked Records", "Linked Records")}>
          {trace.relatedRecords.length === 0 ? <EmptyText language={language} /> : (
            <div className="flex flex-wrap gap-1.5">
              {trace.relatedRecords.map((record) => (
                <span key={`${record.type}-${record.id}`} className="rounded-full px-2 py-1 text-xs" style={{ background: "var(--muted)", color: "var(--foreground)", fontFamily: "monospace" }}>
                  {record.type}: {record.id}
                </span>
              ))}
            </div>
          )}
        </MiniSection>

        <MiniSection icon={<Clock3 size={13} />} title={pick(language, "Timeline", "Timeline")}>
          {latestEvents.length === 0 ? <EmptyText language={language} /> : (
            <div className="space-y-2">
              {latestEvents.map((event) => (
                <div key={event.id} className="border-l-2 pl-2" style={{ borderColor: event.level === "error" ? "#EF4444" : event.level === "success" ? "#10B981" : "#1C64F2" }}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <strong>{event.title}</strong>
                    <span style={{ color: "var(--muted-foreground)", fontFamily: "monospace", whiteSpace: "nowrap" }}>{event.occurredAt}</span>
                  </div>
                  <div className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{event.stage} / {event.actor}</div>
                  <div className="mt-0.5 text-xs">{event.note}</div>
                </div>
              ))}
            </div>
          )}
        </MiniSection>

        <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <MiniSection icon={<FileText size={13} />} title={pick(language, "Documents", "Documents")}>
            {trace.documents.length === 0 ? <EmptyText language={language} /> : (
              <div className="space-y-1.5">
                {trace.documents.slice(0, 3).map((document) => <SmallRow key={document.id} primary={document.fileName} secondary={document.kind} />)}
              </div>
            )}
          </MiniSection>
          <MiniSection icon={<RefreshCw size={13} />} title={pick(language, "Integrations", "Integrations")}>
            {trace.integrationStatuses.length === 0 ? <EmptyText language={language} /> : (
              <div className="space-y-1.5">
                {trace.integrationStatuses.slice(0, 3).map((status) => <SmallRow key={status.id} primary={status.system} secondary={status.syncStatus} />)}
              </div>
            )}
          </MiniSection>
        </div>
      </div>
    </div>
  );
}

function MiniSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)", fontWeight: 800 }}>
        {icon}{title}
      </div>
      {children}
    </div>
  );
}

function SmallRow({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div className="rounded-md border px-2 py-1.5 text-xs" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
      <div className="truncate" style={{ fontWeight: 800 }}>{primary}</div>
      <div className="truncate" style={{ color: "var(--muted-foreground)", fontFamily: "monospace" }}>{secondary}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-2 py-1.5 text-xs" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
      <div className="mb-0.5 flex items-center gap-1.5" style={{ color: "var(--muted-foreground)", fontWeight: 800 }}><Link2 size={12} />{label}</div>
      <div>{value}</div>
    </div>
  );
}

function EmptyText({ language }: { language: AppLanguage }) {
  return <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{pick(language, "None", "None")}</div>;
}
