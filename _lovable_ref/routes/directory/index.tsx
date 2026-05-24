import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, Users, Building2, AlertTriangle, Package, ArrowRight, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { CrmShell } from "@/components/crm/CrmShell";
import { PageHeader } from "@/components/crm/ManageTabs";
import { orgs } from "@/lib/directory-data";
import { requests, resources } from "@/lib/prototype-data";
import {
  usePeople,
  scopeForOrg,
  CURRENT_ORG_ID,
  CONNECTED_ORG_IDS,
} from "@/lib/directory-store";

type TypeFilter = "all" | "people" | "orgs" | "volunteers";

export const Route = createFileRoute("/directory/")({
  validateSearch: (s: Record<string, unknown>): { type?: TypeFilter } => ({
    type: (["all", "people", "orgs", "volunteers"] as const).includes(s.type as TypeFilter)
      ? (s.type as TypeFilter)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Directory — SOS Connect" },
      {
        name: "description",
        content:
          "Search people, organizations, requests, and resources across your records and the shared partner network.",
      },
    ],
  }),
  component: DirectoryPage,
});

type Counts = { total: number; yours: number; network: number };

function DirectoryPage() {
  const navigate = useNavigate();
  const people = usePeople();
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const peopleCounts: Counts = { total: 0, yours: 0, network: 0 };
    for (const p of people) {
      peopleCounts.total++;
      if (scopeForOrg(p.org.id) === "yours") peopleCounts.yours++;
      else peopleCounts.network++;
    }
    const orgCounts: Counts = { total: orgs.length, yours: 0, network: 0 };
    for (const o of orgs) {
      if (o.id === CURRENT_ORG_ID) orgCounts.yours++;
      else orgCounts.network++;
    }
    const reqCounts: Counts = { total: requests.length, yours: 0, network: 0 };
    for (const r of requests) {
      const owner = people.find((p) => p.id === r.personId)?.org.id;
      if (owner === CURRENT_ORG_ID) reqCounts.yours++;
      else reqCounts.network++;
    }
    const resCounts: Counts = { total: resources.length, yours: 0, network: 0 };
    for (const r of resources) {
      if (r.org === CURRENT_ORG_ID) resCounts.yours++;
      else resCounts.network++;
    }
    return { people: peopleCounts, orgs: orgCounts, requests: reqCounts, resources: resCounts };
  }, [people]);

  const totalAll =
    counts.people.total + counts.orgs.total + counts.requests.total + counts.resources.total;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/directory", search: { type: "people" } });
  }

  return (
    <CrmShell module="Directory">
      <PageHeader
        title="Directory"
        subtitle="Search people, organizations, requests, and resources across your records and the partner network."
        actions={
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            Network live · {CONNECTED_ORG_IDS.size} partners · {totalAll.toLocaleString()} records
          </span>
        }
      />

      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Search */}
        <form onSubmit={submitSearch} className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search names, organizations, or needs (e.g. 'RV housing Georgia')"
            className="w-full h-11 pl-10 pr-24 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[13.5px] text-white placeholder:text-white/40 focus:outline-none focus:border-[#89CFF0]/50 transition"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition"
          >
            Search
          </button>
        </form>

        {/* Category grid */}
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45 mb-3">Browse by category</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <CategoryTile
              icon={<Users size={16} />}
              accent="#89CFF0"
              label="People"
              blurb="Volunteers, staff, and emergency contacts."
              counts={counts.people}
              onClick={() => navigate({ to: "/directory", search: { type: "people" } })}
            />
            <CategoryTile
              icon={<Building2 size={16} />}
              accent="#89CFF0"
              label="Organizations"
              blurb="Partner agencies and connected networks."
              counts={counts.orgs}
              onClick={() => navigate({ to: "/directory", search: { type: "orgs" } })}
            />
            <CategoryTile
              icon={<AlertTriangle size={16} />}
              accent="#EF4E4B"
              label="Requests"
              blurb="Open needs from survivors and partners."
              counts={counts.requests}
              onClick={() => navigate({ to: "/cases" })}
            />
            <CategoryTile
              icon={<Package size={16} />}
              accent="#89CFF0"
              label="Resources"
              blurb="Housing, supplies, transport, and skilled crews."
              counts={counts.resources}
              onClick={() => navigate({ to: "/inventory" })}
            />
          </div>
        </section>

        {/* Map CTA */}
        <button
          onClick={() => navigate({ to: "/map" })}
          className="w-full rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4 flex items-center justify-between hover:border-white/20 transition text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#89CFF0]/15 text-[#89CFF0] shrink-0">
              <MapPin size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium">See the network on the map</p>
              <p className="text-[12px] text-white/55 mt-0.5">Pin requests, resources, and partner orgs geographically.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[12px] text-[#EF4E4B] font-medium shrink-0">
            Open map <ArrowRight size={12} />
          </span>
        </button>
      </div>
    </CrmShell>
  );
}

function CategoryTile({
  icon, accent, label, blurb, counts, onClick,
}: {
  icon: React.ReactNode;
  accent: string;
  label: string;
  blurb: string;
  counts: Counts;
  onClick: () => void;
}) {
  const pct = counts.total > 0 ? Math.round((counts.yours / counts.total) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] hover:border-white/20 p-4 transition group"
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg"
          style={{ background: `${accent}26`, color: accent }}
        >
          {icon}
        </span>
        <div className="text-right">
          <p className="text-[22px] font-semibold tabular-nums leading-none">{counts.total.toLocaleString()}</p>
          <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/45 mt-1">Total</p>
        </div>
      </div>
      <p className="text-[14px] font-semibold">{label}</p>
      <p className="text-[12px] text-white/60 mt-0.5 leading-snug">{blurb}</p>
      <div className="mt-3 pt-3 border-t border-[var(--hairline)] space-y-1.5">
        <div className="flex items-center justify-between font-mono text-[10.5px]">
          <span className="text-white/45 uppercase tracking-wider">Yours</span>
          <span className="text-white tabular-nums">{counts.yours.toLocaleString()}</span>
        </div>
        <div className="h-1 rounded-full bg-white/8 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
        </div>
        <div className="flex items-center justify-between font-mono text-[10.5px]">
          <span className="text-white/45 uppercase tracking-wider">Network</span>
          <span className="tabular-nums" style={{ color: accent }}>{counts.network.toLocaleString()}</span>
        </div>
      </div>
      <span className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-[#EF4E4B] group-hover:gap-1.5 transition-all">
        Browse {label.toLowerCase()} <ArrowRight size={11} />
      </span>
    </button>
  );
}
