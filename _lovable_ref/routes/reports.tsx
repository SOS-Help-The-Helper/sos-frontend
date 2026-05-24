import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CrmShell } from "@/components/crm/CrmShell";
import { ManageTabs, PageHeader } from "@/components/crm/ManageTabs";
import { Sparkline } from "@/components/crm/Sparkline";
import { Donut } from "@/components/crm/Donut";
import { reports as reportsData, incidents, reportsHistory14d } from "@/lib/prototype-data";
import { useAllDashboards, pinReport, unpinReport } from "@/lib/dashboard-store";
import {
  FileText, Plus, Check, MapPin, Calendar,
  Download, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — SOS Connect" }] }),
  component: ReportsPage,
});

const SEVERITY_TONE: Record<string, string> = {
  Critical: "#EF4E4B",
  Elevated: "#4A5462",
  Routine: "#89CFF0",
};

const SEVERITIES = ["All", "Critical", "Elevated", "Routine"] as const;

function ReportsPage() {
  const [filter, setFilter] = useState<(typeof SEVERITIES)[number]>("All");
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const pinnedMap = useAllDashboards();

  const filtered = reportsData.filter((r) => filter === "All" || r.severity === filter);

  function toggle(incidentId: string, reportId: string, isPinned: boolean) {
    if (isPinned) {
      unpinReport(incidentId, reportId);
      toast.success("Removed from dashboard");
    } else {
      pinReport(incidentId, reportId);
      const incident = incidents.find((i) => i.id === incidentId);
      toast.success(`Added to ${incident?.name ?? "dashboard"}`);
    }
  }

  return (
    <CrmShell module="Reports">
      <ManageTabs />
      <PageHeader
        title="Reports"
        subtitle="Field reports from volunteers and partners."
        actions={
          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/8 hover:bg-white/12 text-[12px] font-medium transition">
            <Download size={12} /> Export
          </button>
        }
      />

      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Visual summary band */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5 flex items-center gap-5">
            <Donut
              size={110}
              thickness={12}
              centerLabel={String(reportsData.length)}
              centerSub="total"
              slices={(["Critical", "Elevated", "Routine"] as const).map((s) => ({
                label: s,
                value: reportsData.filter((r) => r.severity === s).length,
                color: SEVERITY_TONE[s],
              }))}
            />
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Severity mix</p>
              <ul className="space-y-1.5">
                {(["Critical", "Elevated", "Routine"] as const).map((s) => {
                  const n = reportsData.filter((r) => r.severity === s).length;
                  return (
                    <li key={s} className="flex items-center gap-2 text-[12px]">
                      <span className="w-2 h-2 rounded-full" style={{ background: SEVERITY_TONE[s] }} />
                      <span className="text-white/75">{s}</span>
                      <span className="ml-auto font-mono text-[11px] tabular-nums text-white/60">{n}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">Reports · last 14 days</p>
            <p className="text-[28px] font-semibold tabular-nums mt-1 leading-none">
              {reportsHistory14d.reduce((s, n) => s + n, 0)}
            </p>
            <p className="font-mono text-[10px] text-white/50 mt-1">
              {reportsHistory14d[reportsHistory14d.length - 1]} today
            </p>
            <div className="mt-3">
              <Sparkline values={reportsHistory14d} type="bar" stroke="#89CFF0" width={260} height={44} />
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">Verification</p>
            {(() => {
              const verified = reportsData.filter((r) => r.verifiedBy).length;
              const unverified = reportsData.length - verified;
              const pct = Math.round((verified / Math.max(1, reportsData.length)) * 100);
              return (
                <>
                  <p className="text-[28px] font-semibold tabular-nums mt-1 leading-none text-[#34D399]">{pct}%</p>
                  <p className="font-mono text-[10px] text-white/50 mt-1">
                    {verified} verified · {unverified} unverified
                  </p>
                  <div className="mt-4 flex h-2 rounded-full overflow-hidden bg-white/6">
                    <div className="bg-[#34D399]" style={{ width: `${pct}%` }} />
                    <div className="bg-white/15 flex-1" />
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`h-7 px-3 rounded-md text-[11.5px] font-medium transition ${
                filter === s
                  ? "bg-white/12 text-white"
                  : "bg-white/4 text-white/60 hover:bg-white/8 hover:text-white/85"
              }`}
            >
              {s}
            </button>
          ))}
          <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-white/40">
            {filtered.length} of {reportsData.length}
          </span>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((r) => {
            const sev = SEVERITY_TONE[r.severity];
            const pinnedTo = Object.entries(pinnedMap)
              .filter(([, ids]) => ids.includes(r.id))
              .map(([iid]) => iid);
            const picker = openPicker === r.id;

            return (
              <div
                key={r.id}
                className="group relative rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] hover:border-white/20 transition overflow-hidden flex flex-col"
              >
                <Link
                  to="/directory/report/$id"
                  params={{ id: r.id }}
                  className="block p-4 flex-1"
                  style={{ background: `linear-gradient(180deg, ${sev}14 0%, transparent 55%)` }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${sev}1A`, color: sev }}
                    >
                      <AlertTriangle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: `${sev}1A`, color: sev }}
                        >
                          {r.severity}
                        </span>
                        {r.verifiedBy ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[#34D399]">
                            <ShieldCheck size={10} /> verified
                          </span>
                        ) : (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
                            unverified
                          </span>
                        )}
                        {pinnedTo.length > 0 && (
                          <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#34D399]/15 text-[#34D399]">
                            on dashboard
                          </span>
                        )}
                        <span className="font-mono text-[9.5px] text-white/35 ml-auto">{r.id}</span>
                      </div>
                      <p className="text-[14px] font-semibold mt-1.5 group-hover:text-[#89CFF0] transition truncate">
                        {r.taxonomy}
                      </p>
                      <p className="text-[11.5px] text-white/55 mt-0.5 truncate">{r.disaster}</p>
                    </div>
                  </div>

                  {/* Tightened preview — 2 rows */}
                  <div className="mt-3 space-y-1.5 text-[12px] text-white/75">
                    <Row icon={MapPin}>{r.location} · {r.date}</Row>
                    <Row icon={Calendar}>
                      {r.corroborators} corroborator{r.corroborators === 1 ? "" : "s"}
                    </Row>
                  </div>
                </Link>

                {/* Footer actions */}
                <div className="px-4 pb-3 pt-1 flex items-center justify-between border-t border-white/8">
                  <Link
                    to="/directory/report/$id"
                    params={{ id: r.id }}
                    className="text-[11.5px] text-white/60 hover:text-white transition inline-flex items-center gap-1"
                  >
                    <FileText size={11} /> Open report
                  </Link>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setOpenPicker(picker ? null : r.id);
                      }}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-white/6 hover:bg-white/12 text-[11px] font-medium transition"
                    >
                      <Plus size={10} /> Add to dashboard
                    </button>
                    {picker && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenPicker(null)} />
                        <div className="absolute right-0 bottom-9 z-20 w-64 rounded-lg bg-white border border-[var(--sos-hairline)] shadow-xl p-1.5">
                          <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/45 px-2 py-1.5">
                            Pin to incident
                          </p>
                          {incidents.map((i) => {
                            const isPinned = pinnedMap[i.id]?.includes(r.id) ?? false;
                            return (
                              <button
                                key={i.id}
                                onClick={() => toggle(i.id, r.id, isPinned)}
                                className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white/6 text-left transition"
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${i.priority === "urgent" ? "bg-[#EF4E4B]" : "bg-[#89CFF0]"}`} />
                                <span className="flex-1 min-w-0">
                                  <span className="block text-[12px] truncate">{i.name}</span>
                                  <span className="block font-mono text-[9.5px] text-white/45">{i.id} · {i.county}</span>
                                </span>
                                {isPinned && <Check size={12} className="text-[#34D399]" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CrmShell>
  );
}

function Row({ icon: Icon, children, tone }: { icon: typeof MapPin; children: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon size={11} className="shrink-0" style={{ color: tone ?? "#9CA3AF" }} />
      <span className="truncate" style={tone ? { color: tone } : undefined}>{children}</span>
    </div>
  );
}
