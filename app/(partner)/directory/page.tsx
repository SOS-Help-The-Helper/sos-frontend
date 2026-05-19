"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Upload, X, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { people as protoPeople, orgs as protoOrgs } from "@/lib/directory-data";
import { volunteers as protoVolunteers } from "@/lib/prototype-data";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";

type TypeFilter = "all" | "people" | "orgs" | "volunteers";

const filterDefs = [
  { key: "county", label: "County", options: ["Buncombe", "Watauga", "Henderson", "Madison", "Yancey", "Mitchell", "Avery"] },
  { key: "skill", label: "Skill", options: ["First Aid", "Logistics", "Spanish", "Case Management", "Kitchen Ops"] },
  { key: "credential", label: "Credential", options: ["FEMA IS-100", "Wilderness First Aid", "CDL Class A", "Food Handler"] },
];

type Row = {
  kind: "person" | "org" | "volunteer";
  id: string;
  name: string;
  subtitle: string;
  meta: string;
  score?: number;
  badge?: string;
  href: string;
};

type SortKey = "name" | "type" | "org" | "county" | "score";

// ---------------------------------------------------------------------------
// Response mappers
// ---------------------------------------------------------------------------

function mapPersonsResponse(data: unknown): typeof protoPeople {
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: (r.id as string) ?? "",
    name: (r.name as string) ?? (r.display_name as string) ?? "Unknown",
    role: (r.role as string) ?? (r.job_title as string) ?? "",
    org: {
      id: (r.org_id as string) ?? "",
      name: (r.org_name as string) ?? (r.organization as string) ?? "",
    },
    county: (r.county as string) ?? "",
    skills: Array.isArray(r.skills)
      ? (r.skills as string[]).map((s) => ({ name: s }))
      : [],
    credentials: Array.isArray(r.credentials)
      ? (r.credentials as string[]).map((c) => ({ type: c }))
      : [],
    sosScore: Number(r.sos_score ?? r.sosScore ?? 0),
  }));
}

function mapOrgsResponse(data: unknown): typeof protoOrgs {
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: (r.id as string) ?? "",
    name: (r.name as string) ?? "",
    type: (r.type as string) ?? (r.org_type as string) ?? "",
    counties: Array.isArray(r.counties) ? (r.counties as string[]) : [],
    memberCount: Number(r.member_count ?? r.memberCount ?? 0),
    activeCases: Number(r.active_cases ?? r.activeCases ?? 0),
  }));
}

function extractList(res: unknown, keys: string[]): unknown[] {
  if (Array.isArray(res)) return res;
  const obj = res as Record<string, unknown>;
  for (const k of keys) {
    if (Array.isArray(obj?.[k])) return obj[k] as unknown[];
  }
  return [];
}

// ---------------------------------------------------------------------------

export default function DirectoryPage() {
  const { orgId } = useAuthContext();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [livePeople, setLivePeople] = useState(protoPeople);
  const [liveOrgs, setLiveOrgs] = useState(protoOrgs);
  const [searchRows, setSearchRows] = useState<Row[] | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load people + orgs on mount
  useEffect(() => {
    if (!orgId) return;
    api.crmBrowsePersons(orgId)
      .then((res) => {
        const items = mapPersonsResponse(extractList(res, ["persons", "people", "data", "results"]));
        if (items.length > 0) setLivePeople(items);
      })
      .catch(() => {});

    api.crmBrowseOrgs()
      .then((res) => {
        const items = mapOrgsResponse(extractList(res, ["orgs", "organizations", "data", "results"]));
        if (items.length > 0) setLiveOrgs(items);
      })
      .catch(() => {});
  }, [orgId]);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = query.trim();
    if (!q || !orgId) {
      setSearchRows(null);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      api.crmSearch(q, orgId)
        .then((res) => {
          const raw = extractList(res, ["results", "data", "hits"]);
          if (raw.length === 0) { setSearchRows(null); return; }
          const mapped: Row[] = (raw as Record<string, unknown>[]).map((r) => {
            const kind = (r.type as string) === "org" ? "org" : "person";
            return {
              kind,
              id: (r.id as string) ?? "",
              name: (r.name as string) ?? (r.display_name as string) ?? "Unknown",
              subtitle: (r.role as string) ?? (r.org_name as string) ?? (r.org_type as string) ?? "",
              meta: (r.county as string) ?? (r.location as string) ?? "",
              score: r.sos_score !== undefined ? Number(r.sos_score) : undefined,
              href: kind === "org" ? `/directory/org/${r.id}` : `/directory/person/${r.id}`,
            };
          });
          setSearchRows(mapped);
        })
        .catch(() => setSearchRows(null));
    }, 300);
  }, [query, orgId]);

  const q = query.trim().toLowerCase();

  const localRows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (type === "all" || type === "people") {
      for (const p of livePeople) {
        if (q && !p.name.toLowerCase().includes(q) && !p.org.name.toLowerCase().includes(q) && !p.role.toLowerCase().includes(q) && !p.skills.some((s) => s.name.toLowerCase().includes(q))) continue;
        if (filters.county && p.county !== filters.county) continue;
        if (filters.skill && !p.skills.some((s) => s.name.includes(filters.skill))) continue;
        if (filters.credential && !p.credentials.some((c) => c.type === filters.credential)) continue;
        out.push({
          kind: "person",
          id: p.id,
          name: p.name,
          subtitle: p.role,
          meta: `${p.org.name} · ${p.county}`,
          score: p.sosScore,
          href: `/directory/person/${p.id}`,
        });
      }
    }
    if (type === "all" || type === "orgs") {
      for (const o of liveOrgs) {
        if (q && !o.name.toLowerCase().includes(q) && !o.type.toLowerCase().includes(q)) continue;
        if (filters.county && !o.counties.includes(filters.county)) continue;
        out.push({
          kind: "org",
          id: o.id,
          name: o.name,
          subtitle: o.type,
          meta: `${o.memberCount} members · ${o.activeCases} active`,
          badge: `${o.activeCases} active`,
          href: `/directory/org/${o.id}`,
        });
      }
    }
    if (type === "all" || type === "volunteers") {
      for (const v of protoVolunteers) {
        if (q && !v.name.toLowerCase().includes(q) && !v.skills.some((s) => s.toLowerCase().includes(q))) continue;
        if (filters.skill && !v.skills.some((s) => s.includes(filters.skill))) continue;
        out.push({
          kind: "volunteer",
          id: v.id,
          name: v.name,
          subtitle: v.skills.join(", "),
          meta: `${v.hours}h · ${v.status}`,
          score: Math.min(99, 30 + v.hours / 2),
          href: "/directory",
        });
      }
    }
    const dir = sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const v = (() => {
        switch (sortKey) {
          case "name": return a.name.localeCompare(b.name);
          case "type": return a.kind.localeCompare(b.kind);
          case "org": return a.subtitle.localeCompare(b.subtitle);
          case "county": return a.meta.localeCompare(b.meta);
          case "score": return (a.score ?? 0) - (b.score ?? 0);
        }
      })();
      return v * dir;
    });
    return out;
  }, [q, type, filters, sortKey, sortDir, livePeople, liveOrgs]);

  // Use search results when available (non-empty query + EF returned results)
  const rows = searchRows ?? localRows;

  const activeFilterCount = Object.keys(filters).length;
  const counts = useMemo(() => ({
    people: livePeople.length,
    orgs: liveOrgs.length,
    volunteers: protoVolunteers.length,
  }), [livePeople, liveOrgs]);

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  return (
    <CrmShell module="Directory">
      <div className="min-h-screen text-white">
        {/* Page header */}
        <header className="px-6 pt-6 pb-3 flex items-end justify-between gap-4 border-b border-[var(--hairline)]">
          <div className="min-w-0">
            <h1 className="t-page">Directory</h1>
          </div>
          <Link
            href="/directory/import"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/8 hover:bg-white/12 text-[12px] font-medium transition"
          >
            <Upload size={13} strokeWidth={2} />
            Import
          </Link>
        </header>

        {/* Type tabs */}
        <div className="px-6 border-b border-[var(--hairline)] flex items-center gap-1">
          {(["all", "people", "orgs", "volunteers"] as const).map((t) => {
            const active = type === t;
            const n = t === "all" ? counts.people + counts.orgs + counts.volunteers : counts[t];
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`relative h-10 px-3 text-[13px] font-medium capitalize transition ${
                  active ? "text-white" : "text-white/55 hover:text-white/85"
                }`}
              >
                <span>{t}</span>
                <span className={`ml-1.5 font-mono text-[10px] ${active ? "text-[#89CFF0]" : "text-white/35"}`}>
                  {n}
                </span>
                {active && <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-[#89CFF0] rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Toolbar: search + filters */}
        <div className="px-6 py-2.5 flex items-center gap-2 border-b border-[var(--hairline)] bg-[var(--background)]">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" strokeWidth={2} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, role, org, skill…"
              className="w-full h-8 pl-9 pr-8 rounded-md bg-white/6 hover:bg-white/8 focus:bg-white/10 text-[13px] placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#89CFF0]/50 border-0 transition"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-white/10 flex items-center justify-center"
              >
                <X size={11} />
              </button>
            )}
          </div>
          <div className="h-5 w-px bg-white/8 mx-1" />
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === "__panel" ? null : "__panel")}
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium transition ${
                activeFilterCount > 0 || openFilter === "__panel"
                  ? "bg-[#89CFF0]/15 text-[#89CFF0]"
                  : "text-white/65 hover:text-white hover:bg-white/6"
              }`}
            >
              <SlidersHorizontal size={13} strokeWidth={2} />
              Filter
              {activeFilterCount > 0 && (
                <span className="font-mono text-[10px] tabular-nums px-1 rounded bg-[#89CFF0]/20">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {openFilter === "__panel" && (
              <div className="absolute top-full right-0 mt-1 z-40 w-72 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] shadow-2xl p-3 space-y-3">
                {filterDefs.map((f) => (
                  <div key={f.key}>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">{f.label}</p>
                    <div className="flex flex-wrap gap-1">
                      {f.options.map((o) => {
                        const on = filters[f.key] === o;
                        return (
                          <button
                            key={o}
                            onClick={() =>
                              setFilters((prev) => {
                                const n = { ...prev };
                                if (on) delete n[f.key];
                                else n[f.key] = o;
                                return n;
                              })
                            }
                            className={`h-6 px-2 rounded text-[11.5px] transition ${
                              on
                                ? "bg-[#89CFF0]/20 text-[#89CFF0]"
                                : "bg-white/5 text-white/70 hover:bg-white/10"
                            }`}
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setFilters({})}
                    className="w-full h-7 rounded text-[12px] text-[#EF4E4B] hover:bg-white/5 border-t border-[var(--hairline)] pt-2"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
            {rows.length} {rows.length === 1 ? "result" : "results"}
          </span>
        </div>

        <div className="px-6 pt-6 pb-10">
          <div className="rounded-2xl border border-[var(--hairline)] overflow-hidden bg-[var(--surface-1)]">
            <table className="w-full text-[13px] t-cols">
              <thead className="bg-white/[0.02]">
                <tr className="text-left">
                  <Th label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={onSort} />
                  <Th label="Type" sortKey="type" current={sortKey} dir={sortDir} onSort={onSort} className="w-[110px]" />
                  <Th label="Role / Org" sortKey="org" current={sortKey} dir={sortDir} onSort={onSort} />
                  <Th label="Detail" sortKey="county" current={sortKey} dir={sortDir} onSort={onSort} />
                  <Th label="Score" sortKey="score" current={sortKey} dir={sortDir} onSort={onSort} className="w-[90px] text-right" align="right" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-white/5 flex items-center justify-center mb-3">
                        <Search size={18} className="text-white/30" />
                      </div>
                      <p className="font-medium text-[14px]">No results</p>
                      <p className="text-[12px] text-white/45 mt-1">
                        {query ? `Nothing matched "${query}".` : "Try adjusting your filters."}
                      </p>
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <RowItem key={`${r.kind}-${r.id}`} row={r} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CrmShell>
  );
}

function Th({
  label, sortKey, current, dir, onSort, className = "", align = "left",
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: "asc" | "desc";
  onSort: (k: SortKey) => void; className?: string; align?: "left" | "right";
}) {
  const active = current === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider font-medium text-white/45 border-b border-[var(--hairline)] ${className}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-white/80 transition ${active ? "text-white/80" : ""} ${align === "right" ? "flex-row-reverse w-full justify-start" : ""}`}
      >
        {label}
        <Icon size={11} strokeWidth={2} className={active ? "text-[#89CFF0]" : "text-white/30"} />
      </button>
    </th>
  );
}

function RowItem({ row }: { row: Row }) {
  const router = useRouter();
  const onClick = () => {
    if (row.kind === "volunteer") return;
    router.push(row.href);
  };
  return (
    <tr
      onClick={onClick}
      className={`border-b border-[var(--hairline)] last:border-0 hover:bg-white/[0.03] transition ${row.kind === "volunteer" ? "" : "cursor-pointer"}`}
    >
      <td className="px-4 py-2.5">
        <span className="font-medium text-white truncate">{row.name}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
          row.kind === "person" ? "bg-[#89CFF0]/12 text-[#89CFF0]" :
          row.kind === "org" ? "bg-[#EF4E4B]/12 text-[#EF4E4B]" :
          "bg-[#34D399]/12 text-[#34D399]"
        }`}>
          {row.kind}
        </span>
      </td>
      <td className="px-4 py-2.5 text-white/80 truncate">{row.subtitle}</td>
      <td className="px-4 py-2.5 text-white/55 truncate">{row.meta}</td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
        {row.score !== undefined ? (
          <span className={
            row.score >= 75 ? "text-[#34D399]" :
            row.score >= 50 ? "text-[#89CFF0]" :
            "text-[#F5EBD6]"
          }>
            {Math.round(row.score)}
          </span>
        ) : row.badge ? (
          <span className="text-[11px] text-white/55">{row.badge}</span>
        ) : (
          <span className="text-white/25">—</span>
        )}
      </td>
    </tr>
  );
}
