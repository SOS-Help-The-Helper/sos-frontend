"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Upload, X, ArrowUpDown, ArrowUp, ArrowDown, LayoutGrid, Table as TableIcon, UserPlus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState, useEffect } from "react";
import { CrmShell } from "@/components/crm-shell";
import { orgs as mockOrgs } from "@/lib/directory-data";
import { usePeople } from "@/lib/directory-store";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";

type TypeFilter = "people" | "orgs";
type ViewMode = "cards" | "table";

type Row = {
  kind: "person" | "org";
  id: string;
  name: string;
  subtitle: string;
  meta: string;
  href: string;
  // person-specific
  phone?: string;
  role?: string;
  location?: string;
  requestCount?: number;
  resourceCount?: number;
  sosId?: string | null;
  // org-specific
  orgType?: string;
  memberCount?: number;
  activeCases?: number;
};

type SortKey = "name" | "type";

// Default to Emergency RV for demo when no org context
const DEMO_ORG_ID = "9ad0f2ad-7789-47a8-bfba-0ae3382c86cc";

export default function DirectoryPage() {
  const searchParams = useSearchParams();
  const search = Object.fromEntries(searchParams);
  const { orgId: authOrgId } = useAuthContext();
  const orgId = authOrgId || DEMO_ORG_ID;
  const people = usePeople();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>((search.type as TypeFilter) === "orgs" ? "orgs" : "people");
  const [roleFilter, setRoleFilter] = useState("");
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
            subtitle: String(p.role ?? ""),
            meta: String(p.location ?? p.city ?? p.county ?? ""),
            href: `/app/directory/person/${p.id ?? p.person_id}`,
            phone: p.phone ?? "",
            role: p.role ?? "",
            location: p.location ?? p.city ?? p.county ?? "",
            requestCount: p.request_count ?? 0,
            resourceCount: p.resource_count ?? 0,
            sosId: p.sos_id ?? null,
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
            meta: `${o.member_count ?? 0} members · ${o.active_cases ?? 0} active`,
            href: `/app/directory/org/${o.id ?? o.org_id}`,
            orgType: o.type ?? o.org_type ?? "",
            memberCount: o.member_count ?? 0,
            activeCases: o.active_cases ?? 0,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const q = query.trim().toLowerCase();

  // Dynamic role options from data
  const roleOptions = useMemo(() => {
    const personSource = efPersons.length > 0 ? efPersons : people.map((p) => ({ role: p.role }));
    const seen = new Set<string>();
    for (const p of personSource) {
      if (p.role) seen.add(p.role);
    }
    return Array.from(seen).sort();
  }, [efPersons, people]);

  const rows = useMemo<Row[]>(() => {
    let out: Row[] = [];

    if (type === "people") {
      const personSource: Row[] = efPersons.length > 0
        ? efPersons
        : people.map((p) => ({
            kind: "person" as const,
            id: p.id,
            name: p.name,
            subtitle: p.role,
            meta: p.county,
            href: `/app/directory/person/${p.id}`,
            role: p.role,
            location: p.county,
          }));

      for (const p of personSource) {
        if (q && !p.name.toLowerCase().includes(q) && !p.subtitle.toLowerCase().includes(q)) continue;
        if (roleFilter && p.role !== roleFilter) continue;
        out.push(p);
      }
    }

    if (type === "orgs") {
      const orgSource: Row[] = efOrgs.length > 0
        ? efOrgs
        : mockOrgs.map((o) => ({
            kind: "org" as const,
            id: o.id,
            name: o.name,
            subtitle: o.type,
            meta: `${o.memberCount} members · ${o.activeCases} active`,
            href: `/app/directory/org/${o.id}`,
            orgType: o.type,
            memberCount: o.memberCount,
            activeCases: o.activeCases,
          }));

      for (const o of orgSource) {
        if (q && !o.name.toLowerCase().includes(q) && !o.subtitle.toLowerCase().includes(q)) continue;
        out.push(o);
      }
    }

    const dir = sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const v = (() => {
        switch (sortKey) {
          case "name": return a.name.localeCompare(b.name);
          case "type": return a.subtitle.localeCompare(b.subtitle);
        }
      })();
      return v * dir;
    });
    return out;
  }, [people, q, type, roleFilter, sortKey, sortDir, efPersons, efOrgs]);

  const counts = useMemo(() => ({
    people: efPersons.length > 0 ? efPersons.length : people.length,
    orgs: efOrgs.length > 0 ? efOrgs.length : mockOrgs.length,
  }), [efPersons.length, efOrgs.length, people.length]);

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
              People and organizations in your network.
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
          {(["people", "orgs"] as const).map((t) => {
            const active = type === t;
            const n = counts[t];
            const label = t === "people" ? "People" : "Organizations";
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`relative h-10 px-3 text-[13px] font-medium transition ${
                  active ? "text-white" : "text-white/55 hover:text-white/85"
                }`}
              >
                <span>{label}</span>
                <span className={`ml-1.5 font-mono text-[10px] ${active ? "text-[#89CFF0]" : "text-white/30"}`}>
                  {n}
                </span>
                {active && <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-[#89CFF0] rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Toolbar: search + role filter + view toggle */}
        <div className="px-4 md:px-6 py-2.5 flex items-center gap-2 border-b border-[var(--hairline)] bg-[var(--background)]">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" strokeWidth={2} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, role…"
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

          {type === "people" && (
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={`h-8 pl-2.5 pr-7 rounded-md text-[12px] font-medium appearance-none transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#89CFF0]/50 ${
                  roleFilter ? "bg-[#89CFF0]/15 text-[#89CFF0]" : "bg-white/6 text-white/65 hover:bg-white/10"
                }`}
              >
                <option value="">All roles</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
            </div>
          )}

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
              {type === "people" ? (
                <table className="w-full text-[13px] t-cols">
                  <thead className="bg-white/[0.02]">
                    <tr className="text-left">
                      <Th label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={onSort} />
                      <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider font-medium text-white/45 border-b border-[var(--hairline)] w-[130px]">Phone</th>
                      <Th label="Role" sortKey="type" current={sortKey} dir={sortDir} onSort={onSort} className="w-[120px]" />
                      <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider font-medium text-white/45 border-b border-[var(--hairline)]">Location</th>
                      <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider font-medium text-white/45 border-b border-[var(--hairline)] w-[90px]">Requests</th>
                      <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider font-medium text-white/45 border-b border-[var(--hairline)] w-[110px]">Case</th>
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
                    {rows.map((r) => <PersonRow key={r.id} row={r} />)}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-[13px] t-cols">
                  <thead className="bg-white/[0.02]">
                    <tr className="text-left">
                      <Th label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={onSort} />
                      <Th label="Type" sortKey="type" current={sortKey} dir={sortDir} onSort={onSort} className="w-[140px]" />
                      <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider font-medium text-white/45 border-b border-[var(--hairline)] w-[100px]">Members</th>
                      <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider font-medium text-white/45 border-b border-[var(--hairline)] w-[120px]">Active Cases</th>
                      <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider font-medium text-white/45 border-b border-[var(--hairline)]">Service Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-16 text-center">
                          <EmptyState query={query} />
                        </td>
                      </tr>
                    )}
                    {rows.map((r) => <OrgRow key={r.id} row={r} />)}
                  </tbody>
                </table>
              )}
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
  label, sortKey, current, dir, onSort, className = "",
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: "asc" | "desc";
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = current === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider font-medium text-white/45 border-b border-[var(--hairline)] ${className}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-white/80 transition ${active ? "text-white/80" : ""}`}
      >
        {label}
        <Icon size={11} strokeWidth={2} className={active ? "text-[#89CFF0]" : "text-white/30"} />
      </button>
    </th>
  );
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  recipient: { bg: "rgba(239,78,75,0.15)", text: "#EF4E4B" },
  volunteer: { bg: "rgba(137,207,240,0.15)", text: "#89CFF0" },
  donor: { bg: "rgba(52,211,153,0.15)", text: "#34D399" },
  receiving_services: { bg: "rgba(245,235,214,0.15)", text: "#F5EBCA" },
};

function RolePill({ role }: { role: string }) {
  const colors = ROLE_COLORS[role] || { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.6)" };
  return (
    <span
      className="inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium capitalize"
      style={{ background: colors.bg, color: colors.text }}
    >
      {role.replace(/_/g, " ")}
    </span>
  );
}

function PersonRow({ row }: { row: Row }) {
  const router = useRouter();
  const onNav = () => router.push(row.href);
  return (
    <tr className="border-b border-[var(--hairline)] last:border-0 hover:bg-white/[0.03] transition cursor-pointer" onClick={onNav}>
      <td className="px-4 py-2.5">
        <span className="font-medium text-white truncate">{row.name}</span>
      </td>
      <td className="px-4 py-2.5 text-white/60 text-[12.5px]">
        {row.phone || <span className="text-white/20">—</span>}
      </td>
      <td className="px-4 py-2.5">
        {row.role ? <RolePill role={row.role} /> : <span className="text-white/20">—</span>}
      </td>
      <td className="px-4 py-2.5 text-white/60 text-[12.5px] max-w-[200px] truncate">
        {row.location || <span className="text-white/20">—</span>}
      </td>
      <td className="px-4 py-2.5 font-mono tabular-nums text-[12px]">
        {(row.requestCount ?? 0) > 0 ? (
          <span className="text-[#89CFF0]">{row.requestCount}</span>
        ) : (
          <span className="text-white/20">0</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-[12.5px]">
        {row.sosId ? (
          <Link
            href={`/app/cases/${row.sosId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[#89CFF0] hover:underline"
          >
            View case
          </Link>
        ) : (
          <span className="text-white/20">—</span>
        )}
      </td>
    </tr>
  );
}

function OrgRow({ row }: { row: Row }) {
  const router = useRouter();
  const onNav = () => router.push(row.href);
  return (
    <tr className="border-b border-[var(--hairline)] last:border-0 hover:bg-white/[0.03] transition cursor-pointer" onClick={onNav}>
      <td className="px-4 py-2.5">
        <span className="font-medium text-white truncate">{row.name}</span>
      </td>
      <td className="px-4 py-2.5 text-white/65 text-[12.5px]">
        {row.orgType || <span className="text-white/20">—</span>}
      </td>
      <td className="px-4 py-2.5 font-mono tabular-nums text-white/55 text-[12px]">
        {row.memberCount ?? <span className="text-white/20">—</span>}
      </td>
      <td className="px-4 py-2.5 font-mono tabular-nums text-white/55 text-[12px]">
        {row.activeCases ?? <span className="text-white/20">—</span>}
      </td>
      <td className="px-4 py-2.5 text-white/30 text-[12.5px]">—</td>
    </tr>
  );
}

function CardItem({ row }: { row: Row }) {
  const router = useRouter();
  const isPerson = row.kind === "person";
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
          {!isPerson && (
            <p className="text-[11.5px] text-white/35 mt-1.5">
              {row.memberCount ?? 0} members · {row.activeCases ?? 0} active cases
            </p>
          )}
        </div>
        <div className="shrink-0">
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
            {isPerson ? "person" : "org"}
          </span>
        </div>
      </div>
    </button>
  );
}
