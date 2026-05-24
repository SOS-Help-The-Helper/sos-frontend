import { createFileRoute, Link } from "@tanstack/react-router";
import { CrmShell } from "@/components/crm/CrmShell";
import { PageHeader } from "@/components/crm/ManageTabs";
import { Sparkline } from "@/components/crm/Sparkline";
import { incidents, cases, orgs, bucketOf } from "@/lib/prototype-data";
import { useAllDashboards } from "@/lib/dashboard-store";
import { AlertTriangle, Radio, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/command/")({
  head: () => ({ meta: [{ title: "Command — SOS Connect" }] }),
  component: CommandPage,
});

function CommandPage() {
  const pinnedMap = useAllDashboards();

  // Fleet-wide totals
  const totalOpen = cases.filter((c) => bucketOf(c.status) !== "resolved").length;
  const totalCritical = cases.filter((c) => c.urgency === "critical" || c.urgency === "high").length;
  const orgsEngaged = new Set(cases.map((c) => c.org)).size;

  return (
    <CrmShell module="Command">
      <PageHeader
        title="Command"
        subtitle="One dashboard per active disaster."
        actions={
          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition">
            <Radio size={12} /> Declare incident
          </button>
        }
      />
      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Fleet summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FleetTile label="Open cases" value={totalOpen} intent="neutral" />
          <FleetTile label="Critical / high" value={totalCritical} intent={totalCritical > 0 ? "danger" : "neutral"} />
          <FleetTile label="Orgs engaged" value={`${orgsEngaged}/${orgs.length}`} intent={orgsEngaged === orgs.length ? "success" : "neutral"} />
        </div>

        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">Active incidents · {incidents.length}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

            {incidents.map((i) => {
              const pinnedIds = pinnedMap[i.id] ?? [];
              const incidentCases = cases.slice(0, i.cases);
              const urgent = incidentCases.filter((c) => c.urgency === "critical" || c.urgency === "high").length;
              const orgsCount = new Set(incidentCases.map((c) => c.org)).size;
              const isUrgent = i.priority === "urgent";
              const tone = isUrgent ? "#EF4E4B" : "#89CFF0";

              return (
                <Link
                  key={i.id}
                  to="/command/$id"
                  params={{ id: i.id }}
                  className="group relative rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] hover:border-white/25 active:scale-[0.99] p-5 transition flex flex-col gap-4 overflow-hidden"
                  style={isUrgent ? { boxShadow: "0 0 0 1px rgba(239,78,75,0.25) inset" } : undefined}
                >
                  {isUrgent && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[#EF4E4B]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4E4B] animate-pulse" /> live
                    </span>
                  )}

                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${tone}1A`, color: tone }}
                    >
                      <AlertTriangle size={16} />
                    </div>
                    <div className="flex-1 min-w-0 pr-10">
                      <p className="font-medium truncate">{i.name}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-white/50 mt-0.5">
                        {i.id} · {i.county} · {i.status}
                      </p>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">Capacity</span>
                      <span className="font-mono text-[10.5px] tabular-nums text-white/70">{i.capacity}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${i.capacity}%`, background: tone }} />
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <Stat value={i.cases} label="Cases" />
                    <Stat value={pinnedIds.length} label="Reports" />
                    <Stat value={orgsCount} label="Orgs" />
                    <Stat value={urgent} label="Urgent" tone={urgent > 0 ? "#EF4E4B" : undefined} />
                  </div>

                  {/* Sparkline */}
                  <div className="flex items-end justify-between pt-2 border-t border-white/8">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">14d cases</p>
                      <p className="font-mono text-[10px] text-white/55 mt-0.5">{i.casesHistory[i.casesHistory.length - 1]} today</p>
                    </div>
                    <Sparkline values={i.casesHistory} stroke={tone} fill={tone} width={110} height={30} />
                    <ChevronRight size={14} className="text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition self-center" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>

    </CrmShell>
  );
}

function FleetTile({ label, value, intent = "neutral" }: { label: string; value: string | number; intent?: "neutral" | "danger" | "success" }) {
  const rail = intent === "danger" ? "#EF4E4B" : intent === "success" ? "#34D399" : "#89CFF0";
  const textColor = intent === "danger" ? "#EF4E4B" : "var(--sos-navy)";
  return (
    <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] px-5 py-4 flex items-center justify-between">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">{label}</p>
        <p className="text-[28px] font-semibold tabular-nums mt-1 leading-none" style={{ color: textColor }}>
          {value}
        </p>
      </div>
      <div className="w-2 h-12 rounded-full" style={{ background: rail, opacity: 0.4 }} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div>
      <p className="text-[18px] font-semibold tabular-nums leading-none" style={tone ? { color: tone } : undefined}>
        {value}
      </p>
      <p className="font-mono text-[9px] uppercase tracking-wider text-white/45 mt-1">{label}</p>
    </div>
  );
}
