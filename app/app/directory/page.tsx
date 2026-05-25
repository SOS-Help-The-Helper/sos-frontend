"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Upload, X, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, LayoutGrid, Table as TableIcon, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState, useEffect } from "react";
import { CrmShell } from "@/components/crm-shell";
import { orgs as mockOrgs } from "@/lib/directory-data";
import {
  usePeople,
  scopeForOrg,
  canEdit,
  updatePerson,
  CURRENT_ORG_ID,
  CONNECTED_ORG_IDS,
  type Scope,
} from "@/lib/directory-store";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { StewardshipChip } from "@/components/directory/StewardshipChip";
import { EditableCell, EditableSelect } from "@/components/directory/EditableCell";

type TypeFilter = "all" | "people" | "orgs" | "volunteers";
type ScopeFilter = "all" | "yours" | "shared" | "public";
type ViewMode = "cards" | "table";

const HOUSING_OPTIONS = ["Stable", "Displaced", "At Risk"] as const;


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
  ownerOrgId: string;
  ownerOrgName: string;
  scope: Scope;
  editable: boolean;
  href: string;
  hrefParams?: Record<string, string>;
  // editable person fields (only meaningful when kind === "person")
  role?: string;
  county?: string;
  housingStatus?: string;
};

type SortKey = "name" | "type" | "org" | "county" | "score";

function orgName(id: string): string {
  return mockOrgs.find((o) => o.id === id)?.name ?? id;
}

export default function DirectoryPage() {
  const searchParams = useSearchParams();
  const search = Object.fromEntries(searchParams);
  const { orgId } = useAuthContext();
  const people = usePeople();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>(search.type ?? "all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [view, setView] = useState<ViewMode>("table");

  // Add person form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"Survivor" | "Volunteer" | "Staff">("Survivor");
  const [addLoading, setAddLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleAddPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) return;
    setAddLoading(true);
    try {
      await api.efCall("partner-write", { person_name: addName.trim(), phone: addPhone.trim(), email: addEmail.trim(), org_id: orgId, records: [] });
      toast.success("Person added");
      setShowAddForm(false);
      setAddName(""); setAddPhone(""); setAddEmail(""); setAddRole("Survivor");
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to add person");
    } finally {
      setAddLoading(false);
    }
  }

  // Real EF data
  const [efPersons, setEfPersons] = useState<Row[]>([]);
  const [efOrgs, setEfOrgs] = useState<Row[]>([]);

  useEffect(() => {
    if (!orgId) return;
    api.crmBrowsePersons(orgId, { limit: 100 })
      .then((res: any) => {
        const items: any[] = res?.persons ?? res?.people ?? (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          setEfPersons(items.map((p: any) => ({
            kind: "person" as const,
            id: String(p.id ?? p.person_id ?? ""),
            name: String(p.display_name ?? p.name ?? ""),
            subtitle: String(p.role ?? p.relationship ?? ""),
            meta: [p.org_name ?? "", p.city ?? p.county ?? ""].filter(Boolean).join(" · "),
            score: p.sos_score ?? undefined,
            ownerOrgId: orgId,
            ownerOrgName: "ERV",
            scope: "yours" as Scope,
            editable: false,
            href: `/app/directory/person/${p.id ?? p.person_id}`,
            role: p.role ?? "",
            county: p.city ?? p.county ?? "",
            housingStatus: p.housing_status ?? "",
          })));
        }
      })
      .catch(() => {});
  }, [orgId, refreshKey]);

  useEffect(() => {
    api.crmBrowseOrgs({ limit: 100 })
      .then((res: any) => {
        const items: any[] = res?.orgs ?? res?.organizations ?? (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          setEfOrgs(items.map((o: any) => ({
            kind: "org" as const,
            id: String(o.id ?? o.org_id ?? ""),
            name: String(o.name ?? ""),
            subtitle: String(o.type ?? o.org_type ?? ""),
            meta: `${o.member_count ?? 0} members`,
            badge: o.active_cases != null ? `${o.active_cases} active` : undefined,
            ownerOrgId: String(o.id ?? ""),
            ownerOrgName: String(o.name ?? ""),
            scope: "shared" as Scope,
            editable: false,
            href: `/app/directory/org/${o.id ?? o.org_id}`,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const q = query.trim().toLowerCase();

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    // Use EF persons if available, otherwise fall back to mock store
    const personSource: Row[] = efPersons.length > 0
      ? efPersons
      : people.map((p) => ({
          kind: "person" as const,
          id: p.id,
          name: p.name,
          subtitle: p.role,
          meta: `${p.org.name} · ${p.county}`,
          score: p.sosScore,
          ownerOrgId: p.org.id,
          ownerOrgName: p.org.name,
          scope: scopeForOrg(p.org.id),
          editable: canEdit(p.org.id),
          href: `/app/directory/person/${p.id}`,
          role: p.role,
          county: p.county,
          housingStatus: p.housingStatus,
        }));

    if (type === "all" || type === "people") {
      for (const p of personSource) {
        if (q && !p.name.toLowerCase().includes(q) && !p.subtitle.toLowerCase().includes(q)) continue;
        if (filters.county && p.county && p.county !== filters.county) continue;
        out.push(p);
      }
    }

    // Use EF orgs if available, otherwise fall back to mock directory data
    const orgSource: Row[] = efOrgs.length > 0
      ? efOrgs
      : mockOrgs.map((o) => ({
          kind: "org" as const,
          id: o.id,
          name: o.name,
          subtitle: o.type,
          meta: `${o.memberCount} members · ${o.activeCases} active`,
          badge: `${o.activeCases} active`,
          ownerOrgId: o.id,
          ownerOrgName: o.name,
          scope: scopeForOrg(o.id),
          editable: canEdit(o.id),
          href: `/app/directory/org/${o.id}`,
        }));

    if (type === "all" || type === "orgs") {
      for (const o of orgSource) {
        if (q && !o.name.toLowerCase().includes(q) && !o.subtitle.toLowerCase().includes(q)) continue;
        if (filters.county && !o.meta.includes(filters.county)) continue;
        out.push(o);
      }
    }
    // Volunteers tab: EF data or empty (no prototype)
    if (type === "all" || type === "volunteers") {
      // No volunteer EF yet — show empty; future: wire crmVolunteersAvailable
    }

    const scoped = scopeFilter === "all" ? out : out.filter((r) => r.scope === scopeFilter);

    const dir = sortDir === "asc" ? 1 : -1;
    scoped.sort((a, b) => {
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
    return scoped;
  }, [people, q, type, scopeFilter, filters, sortKey, sortDir]);

  const activeFilterCount = Object.keys(filters).length;
  const counts = useMemo(() => ({
    people: efPersons.length > 0 ? efPersons.length : people.length,
    orgs: efOrgs.length > 0 ? efOrgs.length : mockOrgs.length,
    volunteers: 0,
  }), [efPersons.length, efOrgs.length, people.length]);

  const scopeCounts = useMemo(() => {
    const c = { yours: 0, shared: 0, public: 0 };
    const pSrc = efPersons.length > 0 ? efPersons : people.map((p) => ({ scope: scopeForOrg(p.org.id) }));
    for (const p of pSrc) c[p.scope as "yours" | "shared" | "public"]++;
    const oSrc = efOrgs.length > 0 ? efOrgs : mockOrgs.map((o) => ({ scope: scopeForOrg(o.id) }));
    for (const o of oSrc) c[o.scope as "yours" | "shared" | "public"]++;
    return c;
  }, [efPersons, efOrgs, people]);

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  return (
    <CrmShell module="Directory">
      <div className="min-h-screen text-white">
        {/* Page header */}
        <header className="px-4 md:px-6 pt-5 md:pt-6 pb-3 flex items-end justify-between gap-4 border-b border-[var(--hairline)]">
          <div className="min-w-0">
            <h1 className="t-page">Directory</h1>
            <p className="text-[12.5px] text-white/55 mt-1 max-w-2xl">
              Your CRM and the shared network in one place. Records your org owns are editable inline; records from connected orgs ({CONNECTED_ORG_IDS.size}) are read-only.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium transition ${
                showAddForm ? "bg-[#89CFF0]/20 text-[#89CFF0]" : "bg-white/8 hover:bg-white/12"
              }`}
            >
              <UserPlus size={13} strokeWidth={2} />
              <span className="hidden sm:inline">Add person</span>
            </button>
            <Link
              href="/app/directory/import"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/8 hover:bg-white/12 text-[12px] font-medium transition"
            >
              <Upload size={13} strokeWidth={2} />
              <span className="hidden sm:inline">Import</span>
            </Link>
          </div>
        </header>

        {/* Type tabs */}
        <div className="px-4 md:px-6 border-b border-[var(--hairline)] flex items-center gap-1 overflow-x-auto scrollbar-hide">
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
                <span className={`ml-1.5 font-mono text-[10px] ${active ? "text-[#89CFF0]" : "text-white/30"}`}>
                  {n}
                </span>
                {active && <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-[#89CFF0] rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Scope segmented control */}
        <div className="px-4 md:px-6 py-2 flex items-center gap-2 border-b border-[var(--hairline)]">
          <div className="inline-flex rounded-md bg-white/[0.04] p-0.5">
            {(
              [
                ["all", "All connected", counts.people + counts.orgs + counts.volunteers],
                ["yours", "Your org", scopeCounts.yours],
                ["shared", "Shared", scopeCounts.shared],
                ["public", "Public", scopeCounts.public],
              ] as const
            ).map(([k, label, n]) => {
              const active = scopeFilter === k;
              return (
                <button
                  key={k}
                  onClick={() => setScopeFilter(k as ScopeFilter)}
                  className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11.5px] font-medium transition ${
                    active ? "bg-white/10 text-white" : "text-white/55 hover:text-white/85"
                  }`}
                >
                  {label}
                  <span className={`font-mono text-[10px] ${active ? "text-[#89CFF0]" : "text-white/35"}`}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar: search + filters + view toggle */}
        <div className="px-4 md:px-6 py-2.5 flex items-center gap-2 border-b border-[var(--hairline)] bg-[var(--background)]">
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
                  ? "bg-white/10 text-white"
                  : "text-white/65 hover:text-white hover:bg-white/6"
              }`}
            >
              <SlidersHorizontal size={13} strokeWidth={2} />
              Filter
              {activeFilterCount > 0 && (
                <span className="font-mono text-[10px] tabular-nums px-1 rounded bg-white/10">
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

          {/* View toggle */}
          <div className="hidden md:inline-flex rounded-md bg-white/[0.04] p-0.5">
            <button
              onClick={() => setView("table")}
              className={`inline-flex items-center gap-1 h-7 px-2 rounded text-[11.5px] font-medium transition ${
                view === "table" ? "bg-white/10 text-white" : "text-white/55 hover:text-white/85"
              }`}
              title="Table view"
            >
              <TableIcon size={12} /> Table
            </button>
            <button
              onClick={() => setView("cards")}
              className={`inline-flex items-center gap-1 h-7 px-2 rounded text-[11.5px] font-medium transition ${
                view === "cards" ? "bg-white/10 text-white" : "text-white/55 hover:text-white/85"
              }`}
              title="Card view"
            >
              <LayoutGrid size={12} /> Cards
            </button>
          </div>

          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40 ml-2">
            {rows.length} {rows.length === 1 ? "result" : "results"}
          </span>
        </div>

        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-10">
          {/* Add person inline form */}
          {showAddForm && (
            <form onSubmit={handleAddPerson} className="mb-4 rounded-xl border border-[#89CFF0]/30 bg-[#89CFF0]/5 p-4 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#89CFF0]/80">New person</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-white/50 mb-1">Name <span className="text-[#EF4E4B]">*</span></label>
                  <input
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Full name"
                    required
                    className="w-full h-8 px-3 rounded-md bg-white/8 hover:bg-white/10 focus:bg-white/12 text-[13px] placeholder:text-white/35 outline-none focus:ring-1 focus:ring-[#89CFF0]/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/50 mb-1">Phone</label>
                  <input
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                    type="tel"
                    className="w-full h-8 px-3 rounded-md bg-white/8 hover:bg-white/10 focus:bg-white/12 text-[13px] placeholder:text-white/35 outline-none focus:ring-1 focus:ring-[#89CFF0]/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/50 mb-1">Email</label>
                  <input
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="name@example.com"
                    type="email"
                    className="w-full h-8 px-3 rounded-md bg-white/8 hover:bg-white/10 focus:bg-white/12 text-[13px] placeholder:text-white/35 outline-none focus:ring-1 focus:ring-[#89CFF0]/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/50 mb-1">Role</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as typeof addRole)}
                    className="w-full h-8 px-3 rounded-md bg-white/8 hover:bg-white/10 focus:bg-white/12 text-[13px] outline-none focus:ring-1 focus:ring-[#89CFF0]/50 transition appearance-none"
                  >
                    <option value="Survivor">Survivor</option>
                    <option value="Volunteer">Volunteer</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={addLoading || !addName.trim()}
                  className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md bg-[#EF4E4B] hover:bg-[#d94340] disabled:opacity-50 text-white text-[12px] font-medium transition"
                >
                  {addLoading ? "Adding…" : "Add person"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="inline-flex items-center h-8 px-3 rounded-md text-[12px] text-white/60 hover:text-white hover:bg-white/6 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Mobile card list (always cards) */}
          <div className="md:hidden space-y-2">
            {rows.length === 0 ? (
              <EmptyState query={query} />
            ) : (
              rows.map((r) => <CardItem key={`${r.kind}-${r.id}`} row={r} />)
            )}
          </div>

          {/* Desktop: cards or table */}
          {view === "cards" ? (
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-3">
              {rows.length === 0 ? (
                <div className="col-span-full"><EmptyState query={query} /></div>
              ) : (
                rows.map((r) => <CardItem key={`${r.kind}-${r.id}`} row={r} />)
              )}
            </div>
          ) : (
            <div className="hidden md:block rounded-2xl border border-[var(--hairline)] overflow-hidden bg-[var(--surface-1)]">
              <table className="w-full text-[13px] t-cols">
                <thead className="bg-white/[0.02]">
                  <tr className="text-left">
                    <Th label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={onSort} />
                    <Th label="Type" sortKey="type" current={sortKey} dir={sortDir} onSort={onSort} className="w-[110px]" />
                    <Th label="Role" sortKey="org" current={sortKey} dir={sortDir} onSort={onSort} />
                    <Th label="County / Detail" sortKey="county" current={sortKey} dir={sortDir} onSort={onSort} />
                    <Th label="Source" sortKey="type" current={sortKey} dir={sortDir} onSort={onSort} className="w-[140px]" />
                    <Th label="Score" sortKey="score" current={sortKey} dir={sortDir} onSort={onSort} className="w-[90px] text-right" align="right" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <EmptyState query={query} />
                      </td>
                    </tr>
                  )}
                  {rows.map((r) => (
                    <RowItem key={`${r.kind}-${r.id}`} row={r} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </CrmShell>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] py-12 text-center">
      <div className="w-12 h-12 mx-auto rounded-xl bg-white/5 flex items-center justify-center mb-3">
        <Search size={18} className="text-white/30" />
      </div>
      <p className="font-medium text-[14px]">No results</p>
      <p className="text-[12px] text-white/45 mt-1">
        {query ? `Nothing matched "${query}".` : "Try adjusting your filters."}
      </p>
    </div>
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

function tierDot(score: number | undefined): string {
  if (score === undefined) return "transparent";
  if (score < 40) return "#EF4E4B";
  if (score >= 80) return "#89CFF0";
  return "rgba(245,235,214,0.55)";
}

function RowItem({ row }: { row: Row }) {
  const router = useRouter();
  const onNav = () => router.push(row.href);
  const isPerson = row.kind === "person";
  return (
    <tr className="border-b border-[var(--hairline)] last:border-0 hover:bg-white/[0.03] transition">
      <td className="px-4 py-2.5 cursor-pointer" onClick={onNav}>
        <span className="font-medium text-white truncate">{row.name}</span>
      </td>
      <td className="px-4 py-2.5 cursor-pointer" onClick={onNav}>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/55">
          {row.kind}
        </span>
      </td>
      <td className="px-4 py-2.5 text-white/85">
        {isPerson ? (
          <EditableCell
            value={row.role ?? ""}
            editable={row.editable}
            onCommit={(v) => updatePerson(row.id, "role", v, { kind: "user", label: "you" })}
          />
        ) : (
          <span className="text-white/75 truncate">{row.subtitle}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-white/70 text-[12.5px]">
        {isPerson ? (
          <div className="flex items-center gap-2">
            <EditableCell
              value={row.county ?? ""}
              editable={row.editable}
              onCommit={(v) => updatePerson(row.id, "county", v, { kind: "user", label: "you" })}
              className="text-[12.5px]"
            />
            <span className="text-white/25">·</span>
            <EditableSelect
              value={row.housingStatus ?? ""}
              editable={row.editable}
              onCommit={(v) => updatePerson(row.id, "housingStatus", v, { kind: "user", label: "you" })}
              options={HOUSING_OPTIONS}
              className="text-[12px]"
            />
          </div>
        ) : (
          <span className="truncate">{row.meta}</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <StewardshipChip ownerOrgId={row.ownerOrgId} ownerOrgName={row.ownerOrgName} />
      </td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums cursor-pointer" onClick={onNav}>
        {row.score !== undefined ? (
          <span className="inline-flex items-center gap-1.5 text-white/85">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: tierDot(row.score) }} />
            {Math.round(row.score)}
          </span>
        ) : row.badge ? (
          <span className="text-[11px] text-white/45">{row.badge}</span>
        ) : (
          <span className="text-white/20">–</span>
        )}
      </td>
    </tr>
  );
}

function CardItem({ row }: { row: Row }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(row.href)}
      className="w-full text-left rounded-xl border border-[var(--hairline)] bg-[var(--surface-1)] hover:bg-white/[0.03] transition px-3.5 py-3 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[14px] text-white truncate">{row.name}</p>
          <p className="text-[12px] text-white/55 truncate mt-0.5">
            {row.subtitle}
            {row.meta && <span className="text-white/35"> · {row.meta}</span>}
          </p>
          <div className="mt-2">
            <StewardshipChip ownerOrgId={row.ownerOrgId} ownerOrgName={row.ownerOrgName} />
          </div>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
            {row.kind}
          </span>
          {row.score !== undefined ? (
            <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-[15px] text-white/85">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: tierDot(row.score) }} />
              {Math.round(row.score)}
            </span>
          ) : row.badge ? (
            <span className="font-mono text-[10.5px] text-white/45">{row.badge}</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
