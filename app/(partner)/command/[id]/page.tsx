"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CrmShell } from "@/components/crm-shell";
import { DetailTopBar } from "@/components/crm/detail-shell";
import { incidents, reports as reportsData, cases, orgs, kpis } from "@/lib/prototype-data";
import { useDashboard, unpinReport } from "@/lib/dashboard-store";
import { AlertTriangle, FileText, X, Plus, MapPin, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";

const SEVERITY_TONE: Record<string, string> = {
  Critical: "#EF4E4B",
  Elevated: "#F5EBD6",
  Routine: "#89CFF0",
};

export default function IncidentDashboard() {
  const params = useParams();
  const id = params.id as string;
  const incident = incidents.find((i) => i.id === id);
  const pinnedIds = useDashboard(id);

  if (!incident) {
    return (
      <CrmShell module="Command">
        <DetailTopBar backTo="/command" backLabel="Command" />
        <div className="px-6 py-10 text-white/60">Incident not found.</div>
      </CrmShell>
    );
  }

  const pinned = pinnedIds
    .map((rid) => reportsData.find((r) => r.id === rid))
    .filter(Boolean) as typeof reportsData;

  const incidentCases = cases.slice(0, incident.cases);
  const orgsInvolved = new Set(incidentCases.map((c) => c.org)).size;
  const isUrgent = incident.priority === "urgent";

  function handleUnpin(reportId: string) {
    unpinReport(id, reportId);
    toast.success("Removed from dashboard");
  }

  return (
    <CrmShell module="Command">
      <DetailTopBar backTo="/command" backLabel="Command" />
      <main className="max-w-[1100px] mx-auto px-6 py-7 space-y-5">
        {/* Header */}
        <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isUrgent
                  ? "bg-[#EF4E4B]/15 text-[#EF4E4B]"
                  : "bg-[#F5EBD6]/15 text-[#F5EBD6]"
              }`}
            >
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">
                {incident.id} · {incident.status}
              </p>
              <h1 className="text-[22px] font-semibold mt-0.5">{incident.name}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Chip icon={MapPin}>{incident.county} County</Chip>
                <Chip icon={Calendar}>Declared {incident.declared}</Chip>
                <Chip icon={User}>Lead: {incident.lead}</Chip>
              </div>
            </div>
          </div>
        </div>

        {/* Incident KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Cases" value={incidentCases.length} tone="#89CFF0" />
          <Tile label="Orgs engaged" value={orgsInvolved} tone="#F5EBD6" />
          <Tile label="Reports pinned" value={pinnedIds.length} tone="#34D399" />
          <Tile
            label="Priority"
            value={incident.priority}
            tone={isUrgent ? "#EF4E4B" : "#F5EBD6"}
          />
        </div>

        {/* Trend KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4"
            >
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">
                {k.label}
              </p>
              <p className="text-[22px] font-semibold tabular-nums mt-1">{k.value}</p>
              <p className="font-mono text-[10px] text-[#34D399] mt-1">{k.delta}</p>
            </div>
          ))}
        </div>

        {/* Pinned reports + orgs */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-3">
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">
                Pinned reports
              </p>
              <Link
                href="/reports"
                className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-white/6 hover:bg-white/12 text-[11px] transition"
              >
                <Plus size={11} /> Add from library
              </Link>
            </div>
            {pinned.length === 0 ? (
              <div className="text-center py-10 text-white/40 text-[12.5px]">
                No reports pinned. Open{" "}
                <Link href="/reports" className="text-[#89CFF0] hover:underline">
                  Reports
                </Link>{" "}
                and click &ldquo;Add to dashboard&rdquo;.
              </div>
            ) : (
              <ul className="space-y-2">
                {pinned.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/4 hover:bg-white/6 transition group"
                  >
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                      style={{
                        background: `${SEVERITY_TONE[r.severity]}1A`,
                        color: SEVERITY_TONE[r.severity],
                      }}
                    >
                      <FileText size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/directory/report/${r.id}`}
                          className="text-[12.5px] font-medium hover:text-[#89CFF0] transition truncate"
                        >
                          {r.taxonomy}
                        </Link>
                        <span
                          className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            background: `${SEVERITY_TONE[r.severity]}1A`,
                            color: SEVERITY_TONE[r.severity],
                          }}
                        >
                          {r.severity}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-white/60 mt-0.5 truncate">
                        {r.location} · {r.date}
                      </p>
                      <p className="text-[11px] text-white/45 mt-0.5">
                        {r.reporterName} · {r.corroborators} corroborator
                        {r.corroborators === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnpin(r.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/8 text-white/55 hover:text-white transition"
                      aria-label="Unpin"
                    >
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-4">
              Org load
            </p>
            <div className="space-y-3">
              {orgs.map((o) => (
                <div key={o.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: o.color }}
                    />
                    <span className="text-[12px] truncate">{o.name}</span>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-white/65">
                    {o.open} open
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </CrmShell>
  );
}

function Chip({ icon: Icon, children }: { icon: typeof MapPin; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-white/70">
      <Icon size={11} className="text-white/40" />
      {children}
    </span>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p
        className="text-[24px] font-semibold tabular-nums mt-1 capitalize"
        style={{ color: tone }}
      >
        {value}
      </p>
    </div>
  );
}
