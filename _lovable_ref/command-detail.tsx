import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CrmShell } from "@/components/crm/CrmShell";
import { DetailTopBar, DetailNotFound, StatusPill } from "@/components/crm/DetailShell";
import { Sparkline } from "@/components/crm/Sparkline";
import { Donut } from "@/components/crm/Donut";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import {
  incidents, reports as reportsData, cases, orgs,
  people, inventory, BUCKETS, bucketOf, STATUS_LABEL,
  availableResources,
  type Taxonomy,
} from "@/lib/prototype-data";
import { useDashboard, unpinReport } from "@/lib/dashboard-store";
import {
  AlertTriangle, FileText, X, Plus, MapPin, Calendar, User,
  Radio, Download, Megaphone, Truck, ShieldCheck, Phone, ArrowRight,
  Package, ChevronRight, Activity, ChevronDown, TrendingUp, TrendingDown,
  Home, Utensils, HeartPulse, Baby, Bus, LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/command/$id")({
  head: () => ({ meta: [{ title: "Incident dashboard — SOS Connect" }] }),
  component: IncidentDashboard,
});

const SEV_TONE: Record<string, string> = {
  Critical: "#EF4E4B",
  Elevated: "#89CFF0",
  Routine: "#89CFF0",
};
const URG_TONE: Record<string, string> = {
  critical: "#EF4E4B",
  high: "#EF4E4B",
  medium: "#89CFF0",
  low: "#34D399",
};

type CategoryId = "housing" | "food" | "health" | "childcare" | "transport";
const CATEGORIES: {
  id: CategoryId;
  label: string;
  icon: typeof Home;
  tone: string;
  taxonomies: Taxonomy[];
}[] = [
  { id: "housing",   label: "Housing",   icon: Home,       tone: "#89CFF0", taxonomies: ["HOUSING.TEMPORARY", "HOUSING.REPAIR"] },
  { id: "food",      label: "Food",      icon: Utensils,   tone: "#89CFF0", taxonomies: ["FOOD.PANTRY", "FOOD.HOT_MEAL"] },
  { id: "health",    label: "Health",    icon: HeartPulse, tone: "#EF4E4B", taxonomies: ["MEDICAL.SUPPLIES", "MENTAL_HEALTH"] },
  { id: "childcare", label: "Childcare", icon: Baby,       tone: "#34D399", taxonomies: ["CHILDCARE"] },
  { id: "transport", label: "Transport", icon: Bus,        tone: "#A78BFA", taxonomies: ["TRANSPORT"] },
];

function IncidentDashboard() {
  const { id } = Route.useParams();
  useScrollToTop(id);
  const [showMore, setShowMore] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryId | "all">("all");
  const incident = incidents.find((i) => i.id === id);
  const pinnedIds = useDashboard(id);

  if (!incident) {
    return (
      <DetailNotFound module="Command" backTo="/command" backLabel="Command" entity="Incident" />
    );
  }

  const pinned = pinnedIds
    .map((rid) => reportsData.find((r) => r.id === rid))
    .filter(Boolean) as typeof reportsData;

  const incidentCases = cases.slice(0, incident.cases);
  const orgsInvolved = Array.from(new Set(incidentCases.map((c) => c.org)));
  const isUrgent = incident.priority === "urgent";
  const lowInventory = inventory.filter((i) => i.qty < i.threshold).slice(0, 4);
  const incidentLead = people.find((p) => p.name === incident.lead) ?? people[0];

  // Per-category request + resource counts (always computed from full set)
  const categoryStats = CATEGORIES.map((cat) => {
    const requests = incidentCases.filter((c) =>
      c.taxonomy.some((t) => cat.taxonomies.includes(t)),
    ).length;
    const resources = availableResources.filter((r) =>
      cat.taxonomies.includes(r.taxonomy),
    ).length;
    return { ...cat, requests, resources };
  });
  const maxBar = Math.max(1, ...categoryStats.flatMap((s) => [s.requests, s.resources]));

  // Apply category filter to downstream visualizations
  const activeCategory = CATEGORIES.find((c) => c.id === categoryFilter);
  const scopedCases = activeCategory
    ? incidentCases.filter((c) => c.taxonomy.some((t) => activeCategory.taxonomies.includes(t)))
    : incidentCases;

  const critical = scopedCases.filter((c) => c.urgency === "critical" || c.urgency === "high");

  // Bucket distribution (scoped)
  const bucketCounts = BUCKETS.map((b) => ({
    ...b,
    count: scopedCases.filter((c) => bucketOf(c.status) === b.id).length,
  }));
  const totalCases = scopedCases.length || 1;

  function handleUnpin(reportId: string) {
    unpinReport(id, reportId);
    toast.success("Removed from dashboard");
  }

  function fireAction(label: string) {
    toast.success(label);
  }

  return (
    <CrmShell module="Command">
      <DetailTopBar
        backTo="/command"
        backLabel="Command"
        crumbs={[{ label: "Incidents", to: "/command" }, { label: incident.name }]}
      />
      <main className="max-w-[1240px] mx-auto px-4 py-4 md:py-6 space-y-5">
        {/* ============ Command header ============ */}
        <div
          className="rounded-2xl border p-5 relative overflow-hidden"
          style={{
            background: isUrgent
              ? "linear-gradient(135deg, rgba(239,78,75,0.10), rgba(20,20,20,0.4))"
              : "var(--surface-1)",
            borderColor: isUrgent ? "rgba(239,78,75,0.35)" : "var(--hairline)",
          }}
        >
          {isUrgent && (
            <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#EF4E4B]/20 text-[#EF4E4B] text-[10px] font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4E4B] animate-pulse" />
              Live · Urgent
            </div>
          )}
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${isUrgent ? "bg-[#EF4E4B]/15 text-[#EF4E4B]" : "bg-[#89CFF0]/15 text-[#89CFF0]"}`}>
              <AlertTriangle size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">
                {incident.id} · {incident.status}
              </p>
              <h1 className="text-[24px] font-semibold mt-0.5 leading-tight">{incident.name}</h1>
              <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                <Chip icon={MapPin}>{incident.county} County</Chip>
                <Chip icon={Calendar}>Declared {incident.declared}</Chip>
                <Chip icon={User}>
                  Lead:{" "}
                  <Link
                    to="/directory/person/$id"
                    params={{ id: incidentLead.id }}
                    className="text-white/85 hover:text-[#89CFF0] transition"
                  >
                    {incident.lead}
                  </Link>
                </Chip>
              </div>
            </div>
          </div>

          {/* Action rail */}
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            <ActionBtn primary onClick={() => fireAction("Sitrep brief generated")}>
              <Megaphone size={12} /> Brief team
            </ActionBtn>
            <ActionBtn onClick={() => fireAction("Mobilization dispatched")}>
              <Truck size={12} /> Mobilize resources
            </ActionBtn>
            <ActionBtn onClick={() => fireAction("Escalated to state EOC")}>
              <Radio size={12} /> Escalate to EOC
            </ActionBtn>
            <ActionBtn onClick={() => fireAction("Sitrep PDF downloaded")}>
              <Download size={12} /> Export sitrep
            </ActionBtn>
            <a
              href={`tel:+1-828-555-0911`}
              className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/6 hover:bg-white/12 text-[12px] font-medium transition"
            >
              <Phone size={12} /> Hotline
            </a>
          </div>
        </div>

        {/* ============ Now strip ============ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <NowTile
            label="Open cases"
            value={incidentCases.length}
            tone="#89CFF0"
            spark={incident.casesHistory}
            sub={`${orgsInvolved.length} of ${orgs.length} orgs engaged`}
          />
          <NowTile
            label="Critical / high"
            value={critical.length}
            tone="#EF4E4B"
            delta={incident.criticalDelta}
            sub="vs yesterday"
          />
          <NowTile
            label="Avg match"
            value={`${incident.avgMatchHours}h`}
            tone="#34D399"
            spark={incident.avgMatchHistory}
            sub="time to first match"
            invertSpark
          />
        </div>

        {/* ============ Needs & resources by category ============ */}
        <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">
                Needs &amp; resources
              </p>
              <p className="text-[13px] font-medium mt-0.5">
                Open requests vs offered resources by core government need
              </p>
            </div>
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white/4">
              <CategoryChip
                active={categoryFilter === "all"}
                onClick={() => setCategoryFilter("all")}
                icon={LayoutGrid}
                label="All"
                tone="#89CFF0"
              />
              {CATEGORIES.map((c) => (
                <CategoryChip
                  key={c.id}
                  active={categoryFilter === c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  icon={c.icon}
                  label={c.label}
                  tone={c.tone}
                />
              ))}
            </div>
          </div>
          <ul className="space-y-3">
            {categoryStats
              .filter((s) => categoryFilter === "all" || s.id === categoryFilter)
              .map((s) => {
                const Icon = s.icon;
                const reqPct = (s.requests / maxBar) * 100;
                const resPct = (s.resources / maxBar) * 100;
                const gap = s.requests - s.resources;
                return (
                  <li key={s.id} className="grid grid-cols-[140px_1fr_auto] gap-3 items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: `${s.tone}1A`, color: s.tone }}
                      >
                        <Icon size={13} />
                      </span>
                      <span className="text-[12.5px] truncate">{s.label}</span>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <BarRow label="Requests" count={s.requests} pct={reqPct} tone={s.tone} solid />
                      <BarRow label="Resources" count={s.resources} pct={resPct} tone={s.tone} />
                    </div>
                    <span
                      className="font-mono text-[10.5px] tabular-nums shrink-0 px-1.5 py-0.5 rounded"
                      style={{
                        color: gap > 0 ? "#EF4E4B" : gap < 0 ? "#34D399" : "#9CA3AF",
                        background: gap > 0 ? "rgba(239,78,75,0.10)" : gap < 0 ? "rgba(52,211,153,0.10)" : "transparent",
                      }}
                      title={gap > 0 ? "Unmet demand" : gap < 0 ? "Surplus capacity" : "Balanced"}
                    >
                      {gap > 0 ? `+${gap} gap` : gap < 0 ? `${Math.abs(gap)} extra` : "—"}
                    </span>
                  </li>
                );
              })}
          </ul>
          {categoryFilter !== "all" && (
            <p className="font-mono text-[10px] text-white/45 mt-4">
              Filtering case posture &amp; critical list by <span className="text-white/75">{activeCategory?.label}</span>.{" "}
              <button onClick={() => setCategoryFilter("all")} className="text-[#89CFF0] hover:underline">
                Clear
              </button>
            </p>
          )}
        </div>

        {/* ============ Case posture (donut) ============ */}
        <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">Case posture</p>
              <p className="text-[13px] font-medium mt-0.5">Where cases sit right now</p>
            </div>
            <Link to="/cases" className="text-[11px] text-white/55 hover:text-white inline-flex items-center gap-1">
              Open queue <ArrowRight size={11} />
            </Link>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <Donut
              size={150}
              thickness={16}
              centerLabel={String(scopedCases.length)}
              centerSub="cases"
              slices={bucketCounts.map((b) => ({ label: b.label, value: b.count, color: b.accent }))}
            />
            <div className="flex-1 min-w-[200px] grid grid-cols-2 gap-3">
              {bucketCounts.map((b) => {
                const pct = Math.round((b.count / totalCases) * 100);
                return (
                  <Link
                    key={b.id}
                    to="/cases"
                    className="flex items-center gap-2 p-2 -mx-2 rounded-lg hover:bg-white/4 transition group"
                  >
                    <span className="w-2 h-8 rounded-full shrink-0" style={{ background: b.accent }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] truncate group-hover:text-white transition">{b.label}</p>
                      <p className="font-mono text-[10px] text-white/45">
                        <span className="text-white/75 tabular-nums">{b.count}</span> · {pct}%
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>


        {/* ============ Two-column: critical cases | live signal ============ */}
        <div className="grid lg:grid-cols-2 gap-3">
          {/* Critical cases needing attention */}
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#EF4E4B]">Needs attention</p>
                <p className="text-[13px] font-medium mt-0.5">Critical & high-urgency cases</p>
              </div>
              <span className="font-mono text-[11px] text-white/45">{critical.length}</span>
            </div>
            {critical.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-[12.5px]">All cases nominal.</div>
            ) : (
              <ul className="space-y-2">
                {critical.slice(0, 3).map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/cases/$id"
                      params={{ id: c.id }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/4 hover:bg-white/8 transition group"
                    >
                      <span
                        className="w-1 h-10 rounded-full shrink-0"
                        style={{ background: URG_TONE[c.urgency] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] text-white/45">{c.id}</span>
                          <span
                            className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: `${URG_TONE[c.urgency]}1A`, color: URG_TONE[c.urgency] }}
                          >
                            {c.urgency}
                          </span>
                          <span className="font-mono text-[9.5px] text-white/40">{STATUS_LABEL[c.status]}</span>
                        </div>
                        <p className="text-[12.5px] mt-0.5 truncate">
                          {c.citizen} · {c.taxonomy.join(", ")}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-white/25 group-hover:text-white/70 transition" />
                    </Link>
                  </li>
                ))}
                {critical.length > 3 && (
                  <Link
                    to="/cases"
                    className="block text-center py-2 text-[11px] text-white/55 hover:text-white transition"
                  >
                    View all {critical.length} →
                  </Link>
                )}
              </ul>
            )}
          </div>


          {/* Live signal — pinned reports */}
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 inline-flex items-center gap-1.5">
                  <Activity size={10} /> Live signal
                </p>
                <p className="text-[13px] font-medium mt-0.5">Pinned reports</p>
              </div>
              <Link
                to="/reports"
                className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-white/6 hover:bg-white/12 text-[11px] transition"
              >
                <Plus size={11} /> Add
              </Link>
            </div>
            {pinned.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-[12.5px]">
                No reports pinned. Open{" "}
                <Link to="/reports" className="text-[#89CFF0] hover:underline">
                  Reports
                </Link>{" "}
                and click "Add to dashboard".
              </div>
            ) : (
              <ul className="space-y-2">
                {pinned.slice(0, 3).map((r) => (
                  <li key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/4 hover:bg-white/6 transition group">
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `${SEV_TONE[r.severity]}1A`, color: SEV_TONE[r.severity] }}
                    >
                      <FileText size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to="/directory/report/$id"
                          params={{ id: r.id }}
                          className="text-[12.5px] font-medium hover:text-[#89CFF0] transition truncate"
                        >
                          {r.taxonomy}
                        </Link>
                        <span
                          className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: `${SEV_TONE[r.severity]}1A`, color: SEV_TONE[r.severity] }}
                        >
                          {r.severity}
                        </span>
                        {r.verifiedBy && (
                          <span className="inline-flex items-center gap-1 font-mono text-[9px] text-[#34D399]">
                            <ShieldCheck size={9} /> verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-white/60 mt-0.5 truncate">
                        {r.location} · {r.date}
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
                {pinned.length > 3 && (
                  <Link to="/reports" className="block text-center py-2 text-[11px] text-white/55 hover:text-white transition">
                    View all {pinned.length} →
                  </Link>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* ============ Disclosure toggle for the lower zone ============ */}
        <button
          onClick={() => setShowMore((v) => !v)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/4 hover:bg-white/8 text-[12px] text-white/75 transition"
        >
          <ChevronDown size={14} className={`transition-transform ${showMore ? "rotate-180" : ""}`} />
          {showMore ? "Hide" : "Show"} org load, resources & contacts
        </button>

        {showMore && (
          <div className="grid lg:grid-cols-3 gap-3">
          {/* Org load */}
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-4">Org load</p>
            <div className="space-y-3">
              {orgs.map((o) => {
                const cap = Math.min(100, Math.round((o.open / Math.max(1, o.people)) * 100));
                return (
                  <Link
                    key={o.id}
                    to="/directory/org/$id"
                    params={{ id: o.id }}
                    className="block group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.color }} />
                        <span className="text-[12px] truncate group-hover:text-[#89CFF0] transition">{o.name}</span>
                      </div>
                      <span className="font-mono text-[10.5px] tabular-nums text-white/65 shrink-0">
                        {o.open}/{o.people}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-white/6 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${cap}%`, background: o.color, opacity: 0.7 }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Resource posture */}
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#EF4E4B] inline-flex items-center gap-1.5">
                <Package size={10} /> Below threshold
              </p>
              <Link to="/inventory" className="text-[11px] text-white/55 hover:text-white inline-flex items-center gap-1">
                All <ArrowRight size={11} />
              </Link>
            </div>
            {lowInventory.length === 0 ? (
              <div className="text-center py-6 text-white/40 text-[12.5px]">Stock levels nominal.</div>
            ) : (
              <ul className="space-y-2.5">
                {lowInventory.map((i) => {
                  const o = orgs.find((x) => x.id === i.org);
                  const pct = Math.min(100, Math.round((i.qty / i.threshold) * 100));
                  return (
                    <li key={i.id}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[12px] truncate">{i.item}</p>
                        <span className="font-mono text-[10.5px] text-[#EF4E4B] tabular-nums">
                          {i.qty}/{i.threshold}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-white/6 overflow-hidden">
                        <div className="h-full rounded-full bg-[#EF4E4B]" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="font-mono text-[9.5px] text-white/40 mt-1">
                        {o?.name ?? i.org} · {i.location}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Key contacts */}
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-4">Key contacts</p>
            <ul className="space-y-2">
              {people.slice(0, 5).map((p) => {
                const o = orgs.find((x) => x.id === p.org);
                return (
                  <li key={p.id}>
                    <Link
                      to="/directory/person/$id"
                      params={{ id: p.id }}
                      className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-white/4 transition group"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
                        style={{ background: `${o?.color ?? "#89CFF0"}26`, color: o?.color ?? "#89CFF0" }}
                      >
                        {p.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] truncate group-hover:text-[#89CFF0] transition">{p.name}</p>
                        <p className="font-mono text-[9.5px] text-white/45 truncate">
                          {p.role} · {o?.name ?? p.org}
                        </p>
                      </div>
                      <Phone size={12} className="text-white/30 group-hover:text-white/70 transition" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        )}
      </main>
    </CrmShell>
  );
}

function Chip({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-white/70">
      <Icon size={11} className="text-white/40" />
      {children}
    </span>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="text-[24px] font-semibold tabular-nums mt-1 capitalize" style={{ color: tone }}>
        {value}
      </p>
      {sub && <p className="font-mono text-[10px] text-white/50 mt-0.5">{sub}</p>}
    </div>
  );
}

function ActionBtn({
  children, onClick, primary,
}: { children: React.ReactNode; onClick?: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition ${
        primary
          ? "bg-[#EF4E4B] hover:bg-[#d94340] text-white"
          : "bg-white/8 hover:bg-white/14 text-white/90"
      }`}
    >
      {children}
    </button>
  );
}

function NowTile({
  label, value, tone, sub, spark, delta, invertSpark,
}: {
  label: string;
  value: string | number;
  tone: string;
  sub?: string;
  spark?: number[];
  delta?: number;
  invertSpark?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">{label}</p>
          <p className="text-[32px] font-semibold tabular-nums mt-1 leading-none" style={{ color: tone }}>
            {value}
          </p>
          {sub && (
            <p className="font-mono text-[10px] text-white/50 mt-2 inline-flex items-center gap-1">
              {typeof delta === "number" && delta !== 0 && (
                delta > 0 ? (
                  <TrendingUp size={10} className="text-[#EF4E4B]" />
                ) : (
                  <TrendingDown size={10} className="text-[#34D399]" />
                )
              )}
              {typeof delta === "number" && delta !== 0 && (
                <span className={delta > 0 ? "text-[#EF4E4B]" : "text-[#34D399]"}>
                  {delta > 0 ? "+" : ""}{delta}{" "}
                </span>
              )}
              {sub}
            </p>
          )}
        </div>
        {spark && (
          <Sparkline
            values={invertSpark ? [...spark].reverse() : spark}
            stroke={tone}
            fill={tone}
            width={90}
            height={36}
          />
        )}
      </div>
    </div>
  );
}

function CategoryChip({
  active, onClick, icon: Icon, label, tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Home;
  label: string;
  tone: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-medium transition ${
        active ? "bg-white/12 text-white" : "text-white/60 hover:text-white hover:bg-white/6"
      }`}
      style={active ? { boxShadow: `inset 0 0 0 1px ${tone}55` } : undefined}
    >
      <Icon size={12} style={{ color: active ? tone : undefined }} />
      {label}
    </button>
  );
}

function BarRow({
  label, count, pct, tone, solid,
}: { label: string; count: number; pct: number; tone: string; solid?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45 w-16 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(count > 0 ? 4 : 0, pct)}%`,
            background: tone,
            opacity: solid ? 0.95 : 0.45,
          }}
        />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-white/80 w-6 text-right shrink-0">
        {count}
      </span>
    </div>
  );
}
