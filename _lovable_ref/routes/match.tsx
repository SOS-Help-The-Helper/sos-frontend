import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CrmShell } from "@/components/crm/CrmShell";
import { PageHeader } from "@/components/crm/ManageTabs";
import {
  cases,
  orgs,
  people,
  bucketOf,
  availableResources,
  type AvailableResource,
  type Taxonomy,
  type Urgency,
} from "@/lib/prototype-data";
import {
  Check,
  X,
  Sparkles,
  ChevronDown,
  Clock,
  Users,
  MapPin,
  Activity,
  Package,
  Inbox,
} from "lucide-react";

export const Route = createFileRoute("/match")({
  head: () => ({ meta: [{ title: "Match — SOS Connect" }] }),
  component: MatchPage,
});

// ---------- Derived helpers (no data-file edits) ----------

const TAXONOMY_LABEL: Record<Taxonomy, string> = {
  "HOUSING.TEMPORARY": "Temporary housing",
  "HOUSING.REPAIR": "Home repair",
  "FOOD.PANTRY": "Food pantry",
  "FOOD.HOT_MEAL": "Hot meals",
  "CHILDCARE": "Childcare",
  "TRANSPORT": "Transport",
  "MEDICAL.SUPPLIES": "Medical supplies",
  "MENTAL_HEALTH": "Mental health",
};

const URGENCY_META: Record<Urgency, { dot: string; pill: string; label: string }> = {
  critical: { dot: "#EF4E4B", pill: "bg-[#EF4E4B]/15 text-[#EF4E4B]", label: "Urgent" },
  high: { dot: "#F5A524", pill: "bg-[#F5A524]/15 text-[#F5A524]", label: "High" },
  medium: { dot: "#89CFF0", pill: "bg-[#89CFF0]/15 text-[#89CFF0]", label: "Medium" },
  low: { dot: "#9CA3AF", pill: "bg-white/10 text-white/55", label: "Low" },
};

// Plausible household per case — derived deterministically from id.
function householdFor(id: string): { adults: number; kids: number; pets: number } {
  const seed = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    adults: 1 + (seed % 3),
    kids: seed % 4,
    pets: seed % 2,
  };
}

function householdSummary(id: string) {
  const h = householdFor(id);
  const parts = [`${h.adults} adult${h.adults === 1 ? "" : "s"}`];
  if (h.kids) parts.push(`${h.kids} kid${h.kids === 1 ? "" : "s"}`);
  if (h.pets) parts.push("pet");
  return parts.join(" · ");
}

function needSummary(taxonomy: Taxonomy[]): string {
  return taxonomy.map((t) => TAXONOMY_LABEL[t]).join(" + ");
}

function slaHoursLeft(daysOpen: number, urgency: Urgency): number {
  const target = urgency === "critical" ? 24 : urgency === "high" ? 48 : urgency === "medium" ? 96 : 168;
  return Math.max(0, target - daysOpen * 24);
}

function orgIntakeContact(orgId: string): string {
  const p = people.find((p) => p.org === orgId);
  return p?.name ?? "Intake desk";
}

function orgResponseHrs(orgId: string): number {
  const map: Record<string, number> = {
    "emergency-rv": 24,
    "blue-ridge": 72,
    "wnc-food": 4,
    "mountain-area-aid": 8,
  };
  return map[orgId] ?? 48;
}

// ---------- Scoring with breakdown ----------

type Fit = {
  serviceMatch: boolean;
  countyMatch: boolean;
  loadOk: boolean;
  fastEnough: boolean;
};

function scoreFor(activeCase: typeof cases[number], org: typeof orgs[number]): { score: number; fit: Fit; breakdown: { service: number; county: number; capacity: number; speed: number } } {
  const serviceMatch = activeCase.taxonomy.some((t) => org.services.includes(t));
  const countyMatch = org.counties.includes(activeCase.county);
  const loadOk = org.open < 8;
  const fastEnough = orgResponseHrs(org.id) <= slaHoursLeft(activeCase.daysOpen, activeCase.urgency);

  const breakdown = {
    service: serviceMatch ? 50 : 0,
    county: countyMatch ? 25 : 0,
    capacity: Math.max(0, 15 - org.open),
    speed: fastEnough ? 10 : 4,
  };
  const score = breakdown.service + breakdown.county + breakdown.capacity + breakdown.speed;
  return { score, fit: { serviceMatch, countyMatch, loadOk, fastEnough }, breakdown };
}

// ---------- Resource scoring ----------

function scoreResourceForCase(resource: AvailableResource, c: typeof cases[number]): {
  score: number;
  fit: { taxonomyMatch: boolean; countyMatch: boolean; urgencyMatch: boolean; petMatch: boolean };
  breakdown: { taxonomy: number; county: number; urgency: number; pet: number };
} {
  const taxonomyMatch = c.taxonomy.includes(resource.taxonomy);
  const countyMatch = c.county === resource.county;
  const urgencyMatch = c.urgency === "critical" || c.urgency === "high";
  const needsPet = householdFor(c.id).pets > 0;
  const petMatch = !needsPet || !!resource.petFriendly;
  const breakdown = {
    taxonomy: taxonomyMatch ? 55 : 0,
    county: countyMatch ? 25 : 8,
    urgency: urgencyMatch ? 12 : 6,
    pet: petMatch ? 8 : 0,
  };
  return {
    score: breakdown.taxonomy + breakdown.county + breakdown.urgency + breakdown.pet,
    fit: { taxonomyMatch, countyMatch, urgencyMatch, petMatch },
    breakdown,
  };
}

// ---------- Page ----------

type Mode = "requests" | "resources";
type SortKey = "urgency" | "age" | "matches";
const URGENCY_RANK: Record<Urgency, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function MatchPage() {
  const [mode, setMode] = useState<Mode>("requests");

  return (
    <CrmShell module="Match">
      <PageHeader
        title="Match"
        subtitle={
          mode === "requests"
            ? "Route open requests to the best-fit organization."
            : "Place available resources with the people who need them."
        }
      />

      {/* Mode toggle */}
      <div className="px-4 pt-4">
        <div className="inline-flex rounded-lg bg-white/[0.05] p-0.5">
          <ModeButton active={mode === "requests"} onClick={() => setMode("requests")} icon={<Inbox size={13} />} label="Requests" count={cases.filter((c) => bucketOf(c.status) === "needs_attention").length} />
          <ModeButton active={mode === "resources"} onClick={() => setMode("resources")} icon={<Package size={13} />} label="Resources" count={availableResources.length} />
        </div>
      </div>

      {mode === "requests" ? <RequestsView /> : <ResourcesView />}
    </CrmShell>
  );
}

function ModeButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium transition ${
        active ? "bg-white/12 text-white" : "text-white/55 hover:text-white/85"
      }`}
    >
      {icon}
      {label}
      <span className={`font-mono text-[10px] ${active ? "text-[#89CFF0]" : "text-white/35"}`}>{count}</span>
    </button>
  );
}

// ---------- Requests view (match request → org) ----------

function RequestsView() {
  const navigate = useNavigate();
  const openCases = useMemo(() => cases.filter((c) => bucketOf(c.status) === "needs_attention"), []);
  const [activeId, setActive] = useState(openCases[0]?.id);
  const [sortKey, setSortKey] = useState<SortKey>("urgency");
  const [countyFilter, setCountyFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);
  const [declined, setDeclined] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<string | null>(null);

  const sortedCases = useMemo(() => {
    let list = [...openCases];
    if (countyFilter !== "all") list = list.filter((c) => c.county === countyFilter);
    list.sort((a, b) => {
      if (sortKey === "urgency") return URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.daysOpen - b.daysOpen;
      if (sortKey === "age") return b.daysOpen - a.daysOpen;
      return b.matchCount - a.matchCount;
    });
    return list;
  }, [openCases, sortKey, countyFilter]);

  const active = openCases.find((c) => c.id === activeId) ?? sortedCases[0];

  const candidates = useMemo(() => {
    if (!active) return [];
    return orgs
      .map((o) => ({ org: o, ...scoreFor(active, o) }))
      .sort((a, b) => b.score - a.score);
  }, [active]);

  const visibleCandidates = showAll ? candidates : candidates.filter((c) => c.score >= 40);
  const counties = Array.from(new Set(openCases.map((c) => c.county)));

  if (!active) return <EmptyQueue />;

  const sla = slaHoursLeft(active.daysOpen, active.urgency);
  const assignee = active.assignedTo ? people.find((p) => p.id === active.assignedTo)?.name : null;
  const hh = householdFor(active.id);
  const urgencyMeta = URGENCY_META[active.urgency];

  function handleAccept(orgName: string) {
    const org = orgs.find((o) => o.name === orgName)!;
    setAccepted(orgName);
    toast.success(`Routed to ${orgName}`, { description: `${orgIntakeContact(org.id)} notified.` });
    const targetId = active!.parentCaseId ?? active!.id;
    setTimeout(() => {
      navigate({ to: "/cases/$id", params: { id: targetId }, search: { matchedOrg: org.id } });
    }, 350);
  }
  function handleDecline(orgId: string, reason: string) {
    setDeclined((prev) => ({ ...prev, [orgId]: reason }));
    toast(`Declined · ${reason}`);
  }

  return (
    <div className="px-4 pt-4 pb-4 grid lg:grid-cols-[340px_1fr] gap-4">
      <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-3 self-start">
        <div className="flex items-center justify-between px-2 pb-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">
            Open requests · {sortedCases.length}
          </p>
        </div>
        <div className="flex gap-1.5 px-2 pb-2.5">
          <Dropdown
            label={sortKey === "urgency" ? "Urgency" : sortKey === "age" ? "Oldest" : "Matches"}
            options={[
              { v: "urgency", l: "Urgency" },
              { v: "age", l: "Oldest" },
              { v: "matches", l: "Most matches" },
            ]}
            value={sortKey}
            onChange={(v) => setSortKey(v as SortKey)}
          />
          <Dropdown
            label={countyFilter === "all" ? "All counties" : countyFilter}
            options={[{ v: "all", l: "All counties" }, ...counties.map((c) => ({ v: c, l: c }))]}
            value={countyFilter}
            onChange={setCountyFilter}
          />
        </div>
        {sortedCases.length === 0 ? (
          <EmptyQueue compact />
        ) : (
          <div className="space-y-1">
            {sortedCases.map((c) => {
              const a = c.id === active.id;
              const um = URGENCY_META[c.urgency];
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`w-full text-left rounded-xl p-3 transition ${
                    a ? "bg-[#89CFF0]/10 ring-1 ring-[#89CFF0]/40" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: um.dot }} />
                      <span className="font-mono text-[10px] text-white/45">{c.id}</span>
                    </div>
                    <span className="font-mono text-[10px] text-white/40">{c.opened}</span>
                  </div>
                  <p className="text-[13px] font-medium leading-tight">{c.citizen}</p>
                  <p className="text-[12px] text-white/65 mt-0.5">{needSummary(c.taxonomy)}</p>
                  <p className="font-mono text-[10px] text-white/45 mt-1.5">
                    {c.county} · {householdSummary(c.id)} ·{" "}
                    <span className="text-[#89CFF0]">{c.matchCount} match{c.matchCount === 1 ? "" : "es"}</span>
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      <div className="space-y-4 min-w-0">
        <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-[10px] text-white/45">{active.id}</span>
                <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${urgencyMeta.pill}`}>
                  {urgencyMeta.label}
                </span>
                {active.parentCaseId && (
                  <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#89CFF0]/15 text-[#89CFF0]">
                    part of {active.parentCaseId}
                  </span>
                )}
              </div>
              <h2 className="text-[20px] font-semibold leading-tight">{active.citizen}</h2>
              <p className="text-[13px] text-white/75 mt-1">
                Needs <span className="text-white">{needSummary(active.taxonomy).toLowerCase()}</span> in {active.county}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FactChip icon={<Users size={10} />} label={`${hh.adults}A · ${hh.kids}K${hh.pets ? " · pet" : ""}`} />
            <FactChip icon={<Clock size={10} />} label={sla > 0 ? `${sla}h left` : "Past SLA"} />
            <FactChip icon={<Activity size={10} />} label={assignee ?? "Unassigned"} />
            <FactChip icon={<MapPin size={10} />} label={`From ${active.county}`} />
            {hh.pets > 0 && <FactChip label="Pet-friendly required" />}
            {active.taxonomy.includes("HOUSING.TEMPORARY") && <FactChip label="Est. stay ~2 wks" />}
            {active.taxonomy.includes("CHILDCARE") && <FactChip label={`Kids: ${hh.kids}`} />}
            <FactChip label={`Opened ${active.opened}`} />
          </div>
        </section>

        <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/55">
              Candidate orgs · {visibleCandidates.length}
            </p>
            <button className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#89CFF0]/15 text-[#89CFF0] text-[10.5px] font-mono uppercase tracking-wider hover:bg-[#89CFF0]/25 transition">
              <Sparkles size={11} /> AI re-score
            </button>
          </div>
          <div className="space-y-2">
            {visibleCandidates.map(({ org, score, fit, breakdown }) => (
              <CandidateRow
                key={org.id}
                org={org}
                score={score}
                fit={fit}
                breakdown={breakdown}
                contact={orgIntakeContact(org.id)}
                responseHrs={orgResponseHrs(org.id)}
                accepted={accepted === org.name}
                declined={declined[org.id]}
                onAccept={() => handleAccept(org.name)}
                onDecline={(reason) => handleDecline(org.id, reason)}
              />
            ))}
          </div>
          {candidates.length > visibleCandidates.length && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-white/55 hover:text-white transition"
            >
              Show {candidates.length - visibleCandidates.length} lower-fit org
              {candidates.length - visibleCandidates.length === 1 ? "" : "s"} <ChevronDown size={12} />
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------- Resources view (match resource → request) ----------

function ResourcesView() {
  const navigate = useNavigate();
  const [activeId, setActive] = useState(availableResources[0]?.id);
  const [taxonomyFilter, setTaxonomyFilter] = useState<string>("all");
  const [declined, setDeclined] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(
    () => availableResources.filter((r) => taxonomyFilter === "all" || r.taxonomy === taxonomyFilter),
    [taxonomyFilter],
  );
  const active = availableResources.find((r) => r.id === activeId) ?? filtered[0];

  const candidates = useMemo(() => {
    if (!active) return [];
    const openCases = cases.filter((c) => bucketOf(c.status) === "needs_attention" || bucketOf(c.status) === "active_work");
    return openCases
      .map((c) => ({ c, ...scoreResourceForCase(active, c) }))
      .sort((a, b) => b.score - a.score);
  }, [active]);

  const visibleCandidates = showAll ? candidates : candidates.filter((c) => c.score >= 60);
  const taxonomies = Array.from(new Set(availableResources.map((r) => r.taxonomy)));

  if (!active) {
    return (
      <div className="text-center text-white/55 py-24">
        <p className="text-[13px]">No available resources.</p>
        <p className="text-[11px] text-white/40 mt-1">Resources appear here once orgs offer capacity.</p>
      </div>
    );
  }

  function handleAccept(caseId: string, citizen: string) {
    setAccepted(caseId);
    toast.success(`${active!.title} routed to ${citizen}`, { description: `Owner ${active!.ownerName} notified.` });
    const targetId = cases.find((c) => c.id === caseId)?.parentCaseId ?? caseId;
    setTimeout(() => {
      navigate({ to: "/cases/$id", params: { id: targetId }, search: { matched: active!.id } });
    }, 350);
  }
  function handleDecline(caseId: string, reason: string) {
    setDeclined((prev) => ({ ...prev, [caseId]: reason }));
    toast(`Declined · ${reason}`);
  }

  return (
    <div className="px-4 pt-4 pb-4 grid lg:grid-cols-[340px_1fr] gap-4">
      <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-3 self-start">
        <div className="flex items-center justify-between px-2 pb-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">
            Available · {filtered.length}
          </p>
        </div>
        <div className="flex gap-1.5 px-2 pb-2.5">
          <Dropdown
            label={taxonomyFilter === "all" ? "All types" : TAXONOMY_LABEL[taxonomyFilter as Taxonomy]}
            options={[{ v: "all", l: "All types" }, ...taxonomies.map((t) => ({ v: t, l: TAXONOMY_LABEL[t] }))]}
            value={taxonomyFilter}
            onChange={setTaxonomyFilter}
          />
        </div>
        <div className="space-y-1">
          {filtered.map((r) => {
            const a = r.id === active.id;
            return (
              <button
                key={r.id}
                onClick={() => setActive(r.id)}
                className={`w-full text-left rounded-xl p-3 transition ${
                  a ? "bg-[#89CFF0]/10 ring-1 ring-[#89CFF0]/40" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] text-white/45">{r.id}</span>
                  <span className="font-mono text-[10px] text-[#34D399]">{r.available}</span>
                </div>
                <p className="text-[13px] font-medium leading-tight">{r.title}</p>
                <p className="text-[12px] text-white/65 mt-0.5">{TAXONOMY_LABEL[r.taxonomy]}</p>
                <p className="font-mono text-[10px] text-white/45 mt-1.5">
                  {r.county} · {r.ownerName}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="space-y-4 min-w-0">
        <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-[10px] text-white/45">{active.id}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#34D399]/15 text-[#34D399]">
                  Available
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/65">
                  {TAXONOMY_LABEL[active.taxonomy]}
                </span>
              </div>
              <h2 className="text-[20px] font-semibold leading-tight">{active.title}</h2>
              <p className="text-[13px] text-white/75 mt-1">
                Offered by <span className="text-white">{active.ownerName}</span> · {active.capacity}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FactChip icon={<MapPin size={10} />} label={active.location} />
            <FactChip icon={<Clock size={10} />} label={active.available} />
            <FactChip icon={<Package size={10} />} label={active.qty ? `${active.qty} units` : "1 unit"} />
            <FactChip icon={<MapPin size={10} />} label={`Serves ${active.county}`} />
            {active.petFriendly && <FactChip label="Pet-friendly" />}
            <FactChip label={`Type: ${TAXONOMY_LABEL[active.taxonomy]}`} />
          </div>
        </section>

        <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
          <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/55">
              Candidate requests · {visibleCandidates.length}
            </p>
            <button className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#89CFF0]/15 text-[#89CFF0] text-[10.5px] font-mono uppercase tracking-wider hover:bg-[#89CFF0]/25 transition">
              <Sparkles size={11} /> AI re-score
            </button>
          </div>
          <div className="space-y-2">
            {visibleCandidates.map(({ c, score, fit, breakdown }) => (
              <CaseCandidateRow
                key={c.id}
                c={c}
                score={score}
                fit={fit}
                breakdown={breakdown}
                accepted={accepted === c.id}
                declined={declined[c.id]}
                onAccept={() => handleAccept(c.id, c.citizen)}
                onDecline={(reason) => handleDecline(c.id, reason)}
              />
            ))}
          </div>
          {candidates.length > visibleCandidates.length && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-white/55 hover:text-white transition"
            >
              Show {candidates.length - visibleCandidates.length} lower-fit request
              {candidates.length - visibleCandidates.length === 1 ? "" : "s"} <ChevronDown size={12} />
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

function CaseCandidateRow({
  c,
  score,
  fit,
  breakdown,
  accepted,
  declined,
  onAccept,
  onDecline,
}: {
  c: typeof cases[number];
  score: number;
  fit: { taxonomyMatch: boolean; countyMatch: boolean; urgencyMatch: boolean; petMatch: boolean };
  breakdown: { taxonomy: number; county: number; urgency: number; pet: number };
  accepted: boolean;
  declined?: string;
  onAccept: () => void;
  onDecline: (reason: string) => void;
}) {
  const [declineOpen, setDeclineOpen] = useState(false);
  const um = URGENCY_META[c.urgency];
  const hh = householdFor(c.id);
  const accentColor = um.dot;

  const stateClass = accepted
    ? "ring-1 ring-[#34D399]/40 bg-[#34D399]/[0.06]"
    : declined
      ? "opacity-60"
      : "bg-white/[0.04] hover:bg-white/[0.07]";

  return (
    <div className={`rounded-xl p-4 transition ${stateClass}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accentColor}26` }}>
          <span className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-[14px] truncate">{c.citizen}</p>
            <span className="font-mono text-[10px] text-white/45">{c.id}</span>
            <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${um.pill}`}>
              {um.label}
            </span>
            {accepted && (
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#34D399]/20 text-[#34D399]">
                Routed
              </span>
            )}
            {declined && (
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/55">
                Declined · {declined}
              </span>
            )}
          </div>
          <p className="font-mono text-[10px] text-white/50 mt-0.5">
            {c.county} · {needSummary(c.taxonomy)} · {householdSummary(c.id)} · opened {c.opened}
          </p>
        </div>
        <div className="w-[140px] shrink-0">
          <div className="flex items-baseline justify-end gap-1">
            <span className="font-mono text-[20px] font-semibold tabular-nums" style={{ color: accentColor }}>{score}</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">fit</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, score)}%`, background: accentColor }} />
          </div>
        </div>
        {!accepted && !declined && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setDeclineOpen((v) => !v)}
              className="h-9 px-3 rounded-lg bg-white/8 hover:bg-white/15 text-white/70 text-[12px] transition inline-flex items-center gap-1.5"
            >
              <X size={13} /> Decline
            </button>
            <button
              onClick={onAccept}
              className="h-9 px-3 rounded-lg bg-[#34D399] hover:bg-[#22b97f] text-[#0F1E2B] text-[12px] font-medium transition inline-flex items-center gap-1.5"
            >
              <Check size={13} /> Accept & assign
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-3 pl-[56px]">
        <FitChip ok={fit.taxonomyMatch} label="Need type" hint={`Taxonomy match: ${breakdown.taxonomy}/55`} />
        <FitChip ok={fit.countyMatch} label="County" hint={`County match: ${breakdown.county}/25`} />
        <FitChip ok={fit.urgencyMatch} label="Urgency" hint={`Urgency boost: ${breakdown.urgency}/12`} />
        <FitChip ok={fit.petMatch} label={hh.pets ? "Pet OK" : "No pet"} hint={`Pet match: ${breakdown.pet}/8`} />
      </div>
      {declineOpen && !accepted && !declined && (
        <div className="mt-3 pl-[56px] flex flex-wrap gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/45 mr-1 self-center">Reason:</span>
          {["Out of area", "Already matched", "Not a fit", "Other"].map((r) => (
            <button
              key={r}
              onClick={() => {
                setDeclineOpen(false);
                onDecline(r);
              }}
              className="h-6 px-2 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-white/75 transition"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


// ---------- Sub-components ----------

function StatTile({
  icon,
  label,
  value,
  tone = "normal",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "normal" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger" ? "text-[#EF4E4B]" : tone === "warn" ? "text-[#F5A524]" : "text-white";
  return (
    <div className="rounded-xl bg-white/[0.04] border border-[var(--hairline)] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-white/45 mb-1">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-[13px] font-medium ${toneClass}`}>{value}</p>
    </div>
  );
}

function FactChip({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-white/[0.05] text-white/70 text-[11px]">
      {icon}
      {label}
    </span>
  );
}

function Dropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none h-7 pl-2 pr-6 rounded-md bg-[var(--sos-card-gray)] hover:bg-[#E5E7EB] text-[11px] text-[var(--sos-navy)] cursor-pointer transition focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v} className="bg-white text-[#0F1E2B]">
            {o.l}
          </option>
        ))}
      </select>
      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/45 pointer-events-none" />
    </div>
  );
}

function FitChip({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <span
      title={hint}
      className={`inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10.5px] font-mono ${
        ok ? "bg-[#34D399]/12 text-[#34D399]" : "bg-white/8 text-white/45"
      }`}
    >
      {ok ? "✓" : "○"} {label}
    </span>
  );
}

function CandidateRow({
  org,
  score,
  fit,
  breakdown,
  contact,
  responseHrs,
  accepted,
  declined,
  onAccept,
  onDecline,
}: {
  org: typeof orgs[number];
  score: number;
  fit: Fit;
  breakdown: { service: number; county: number; capacity: number; speed: number };
  contact: string;
  responseHrs: number;
  accepted: boolean;
  declined?: string;
  onAccept: () => void;
  onDecline: (reason: string) => void;
}) {
  const [declineOpen, setDeclineOpen] = useState(false);

  const stateClass = accepted
    ? "ring-1 ring-[#34D399]/40 bg-[#34D399]/[0.06]"
    : declined
      ? "opacity-60"
      : "bg-white/[0.04] hover:bg-white/[0.07]";

  return (
    <div className={`rounded-xl p-4 transition ${stateClass}`}>
      <div className="flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-[12px] shrink-0"
          style={{ background: `${org.color}26`, color: org.color }}
        >
          {org.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-[14px] truncate">{org.name}</p>
            {accepted && (
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#34D399]/20 text-[#34D399]">
                Routed
              </span>
            )}
            {declined && (
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/55">
                Declined · {declined}
              </span>
            )}
          </div>
          <p className="font-mono text-[10px] text-white/50 mt-0.5">
            {org.counties.join(", ")} · {org.open} open · ~{responseHrs}h response · {contact}
          </p>
        </div>

        {/* Score + bar */}
        <div className="w-[140px] shrink-0">
          <div className="flex items-baseline justify-end gap-1">
            <span className="font-mono text-[20px] font-semibold tabular-nums" style={{ color: org.color }}>
              {score}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">fit</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, score)}%`, background: org.color }}
            />
          </div>
        </div>

        {!accepted && !declined && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setDeclineOpen((v) => !v)}
              className="h-9 px-3 rounded-lg bg-white/8 hover:bg-white/15 text-white/70 text-[12px] transition inline-flex items-center gap-1.5"
            >
              <X size={13} /> Decline
            </button>
            <button
              onClick={onAccept}
              className="h-9 px-3 rounded-lg bg-[#34D399] hover:bg-[#22b97f] text-[#0F1E2B] text-[12px] font-medium transition inline-flex items-center gap-1.5"
            >
              <Check size={13} /> Accept & assign
            </button>
          </div>
        )}
      </div>

      {/* Fit chips */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3 pl-[56px]">
        <FitChip ok={fit.serviceMatch} label="Service" hint={`Service match: ${breakdown.service}/50`} />
        <FitChip ok={fit.countyMatch} label="County" hint={`County match: ${breakdown.county}/25`} />
        <FitChip ok={fit.loadOk} label="Capacity" hint={`Capacity score: ${breakdown.capacity}/15 (${org.open} open)`} />
        <FitChip ok={fit.fastEnough} label="Speed" hint={`Response ~${responseHrs}h (${breakdown.speed}/10)`} />
      </div>

      {declineOpen && !accepted && !declined && (
        <div className="mt-3 pl-[56px] flex flex-wrap gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/45 mr-1 self-center">Reason:</span>
          {["Out of area", "At capacity", "Not a fit", "Other"].map((r) => (
            <button
              key={r}
              onClick={() => {
                setDeclineOpen(false);
                onDecline(r);
              }}
              className="h-6 px-2 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-white/75 transition"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyQueue({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`text-center text-white/55 ${compact ? "py-10" : "py-24"}`}>
      <p className="text-[13px]">No open requests.</p>
      <p className="text-[11px] text-white/40 mt-1">Triage queue is clear.</p>
    </div>
  );
}

