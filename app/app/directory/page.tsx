"use client";

/**
 * Directory — network browse + discover. Phase 3 of the console redesign.
 * My network / Discover toggle · 4 KPI tiles · search + filter tabs ·
 * EntityCard list (MonogramTile + Tag + MomentumMeter + visibility + verified).
 * Composed entirely from @/components/console. Data via lib/api (EFs) only.
 * Redesign 2026-06 (SOS Connect System). Composed, not cobbled.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import {
  ConsoleShell,
  AgentPanel,
  Surface,
  Tabs,
  KpiStat,
  Button,
  Badge,
  Skeleton,
  EmptyState,
  EntityCard,
  useDemoMode,
  URGENCY_TONE,
  type DisasterOption,
  type AgentMessage,
  type AgentSuggestion,
  type EntityCardData,
  type EntityType,
  type StatusTone,
  type Visibility,
  type TabItem,
} from "@/components/console";

/* ------------------------------------------------------------------ */
/* Local narrow shapes (kept loose — EFs vary across orgs)             */
/* ------------------------------------------------------------------ */
interface RawEntity {
  id?: string;
  person_id?: string;
  org_id?: string;
  display_name?: string;
  name?: string;
  person_name?: string;
  contact_name?: string;
  title?: string;
  description?: string;
  // person
  role?: string;
  location?: string;
  city?: string;
  county?: string;
  state?: string;
  phone?: string;
  email?: string;
  request_count?: number;
  resource_count?: number;
  sos_id?: string | null;
  sos_score?: number;
  org_name?: string;
  // org
  type?: string;
  org_type?: string;
  member_count?: number;
  active_cases?: number;
  service_area?: string;
  coverage_area?: string;
  domain?: string;
  // request / resource
  category?: string;
  taxonomy_code?: string;
  urgency?: string;
  status?: string;
  capacity_available?: number;
  // verification / visibility (best-effort fields)
  verified?: boolean;
  is_verified?: boolean;
  verified_at?: string | null;
  visibility?: string;
  is_shared?: boolean;
  // search results may self-describe their kind
  kind?: string;
  entity_type?: string;
}
interface Disaster {
  id: string;
  name: string;
  day?: number;
}
type Mode = "network" | "discover";
type TabKey = "all" | "people" | "orgs" | "requests" | "resources";

/* ------------------------------------------------------------------ */
/* Mapping helpers — RawEntity → EntityCardData                        */
/* ------------------------------------------------------------------ */
function idOf(r: RawEntity): string {
  return String(r.id ?? r.person_id ?? r.org_id ?? "");
}
function nameOf(r: RawEntity): string {
  return String(r.display_name || r.name || r.person_name || r.contact_name || r.title || "Unnamed");
}
function joinParts(...parts: Array<string | undefined | null>): string | undefined {
  const out = parts.map((p) => (p || "").trim()).filter(Boolean);
  return out.length ? out.join(" · ") : undefined;
}
function isVerified(r: RawEntity): boolean {
  return Boolean(r.verified ?? r.is_verified ?? r.verified_at);
}
/** Best-effort visibility: explicit field wins; else org-affiliated entities read as Shared. */
function visibilityOf(r: RawEntity, affiliated: boolean): Visibility {
  if (r.visibility === "private" || r.visibility === "shared") return r.visibility;
  if (typeof r.is_shared === "boolean") return r.is_shared ? "shared" : "private";
  return affiliated ? "shared" : "private";
}
function momentum(level: 0 | 1 | 2 | 3, label: string): EntityCardData["momentum"] {
  return { level, label };
}

function mapPerson(r: RawEntity): EntityCardData {
  const activity = (r.request_count ?? 0) + (r.resource_count ?? 0);
  const chips: EntityCardData["chips"] = [];
  if (r.role) chips.push({ label: r.role });
  if (r.request_count) chips.push({ label: `${r.request_count} req`, tone: "new" });
  if (r.resource_count) chips.push({ label: `${r.resource_count} res`, tone: "reserved" });
  return {
    id: idOf(r),
    type: "person",
    name: nameOf(r),
    description: joinParts(r.role, r.location || r.city || r.county),
    verified: isVerified(r),
    visibility: visibilityOf(r, Boolean(r.org_name)),
    momentum: activity >= 3 ? momentum(3, "Rising") : activity >= 1 ? momentum(2, "Active") : momentum(1, "New"),
    chips,
  };
}
function mapOrg(r: RawEntity): EntityCardData {
  const chips: EntityCardData["chips"] = [];
  const orgType = r.type || r.org_type;
  if (orgType) chips.push({ label: orgType });
  if (r.member_count) chips.push({ label: `${r.member_count} members` });
  if (r.active_cases) chips.push({ label: `${r.active_cases} active`, tone: "matching" });
  const active = r.active_cases ?? 0;
  return {
    id: idOf(r),
    type: "org",
    name: nameOf(r),
    description: joinParts(orgType, r.service_area || r.coverage_area || r.county || r.state || r.domain),
    verified: isVerified(r),
    visibility: visibilityOf(r, true),
    momentum: active >= 3 ? momentum(3, "Rising") : active >= 1 ? momentum(2, "Active") : momentum(1, "New"),
    chips,
  };
}
function mapRequest(r: RawEntity): EntityCardData {
  const urgency = (r.urgency || "").toLowerCase();
  const chips: EntityCardData["chips"] = [];
  if (urgency) chips.push({ label: urgency, tone: URGENCY_TONE[urgency] || "neutral" });
  if (r.status) chips.push({ label: r.status });
  return {
    id: idOf(r),
    type: "request",
    name: nameOf(r),
    description: joinParts(r.category || r.taxonomy_code, r.county || r.city),
    verified: isVerified(r),
    visibility: visibilityOf(r, Boolean(r.org_id)),
    momentum: urgency === "critical" || urgency === "high" ? momentum(3, "Rising") : momentum(1, "New"),
    chips,
  };
}
function mapResource(r: RawEntity): EntityCardData {
  const chips: EntityCardData["chips"] = [];
  if (r.status) chips.push({ label: r.status, tone: "reserved" });
  const cat = r.category || r.taxonomy_code;
  if (cat) chips.push({ label: cat });
  const available = (r.capacity_available ?? 0) > 0;
  return {
    id: idOf(r),
    type: "resource",
    name: r.description ? String(r.description) : nameOf(r),
    description: joinParts(cat, r.city || r.county || r.state),
    verified: isVerified(r),
    visibility: visibilityOf(r, Boolean(r.org_id)),
    momentum: available ? momentum(2, "Available") : momentum(1, "New"),
    chips,
  };
}

/** Map an opaque search result onto a typed card by its self-described kind. */
function mapSearchResult(r: RawEntity): EntityCardData | null {
  const kind = (r.entity_type || r.kind || r.type || "").toLowerCase();
  if (kind.startsWith("person") || kind === "people") return mapPerson(r);
  if (kind.startsWith("org")) return mapOrg(r);
  if (kind.startsWith("request")) return mapRequest(r);
  if (kind.startsWith("resource")) return mapResource(r);
  // Unknown kind: render as a neutral person-style card so search stays useful.
  return r.id || r.person_id || r.org_id ? mapPerson(r) : null;
}

/* ------------------------------------------------------------------ */
/* Detail routes per entity type (all live under /app/directory/*)     */
/* ------------------------------------------------------------------ */
const DETAIL_ROUTE: Record<EntityType, string> = {
  person: "/app/directory/person",
  org: "/app/directory/org",
  request: "/app/directory/request",
  resource: "/app/directory/resource",
  case: "/app/cases",
  report: "/app/directory/report",
};

const TAB_TO_TYPE: Record<Exclude<TabKey, "all">, EntityType> = {
  people: "person",
  orgs: "org",
  requests: "request",
  resources: "resource",
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function DirectoryPage() {
  const router = useRouter();
  const { orgId } = useAuthContext();
  const demo = useDemoMode();

  const [disasters, setDisasters] = useState<DisasterOption[]>([]);
  const [activeDisaster, setActiveDisaster] = useState<string | undefined>();

  const [mode, setMode] = useState<Mode>("network");
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");

  // Network datasets (loaded once per org).
  const [people, setPeople] = useState<EntityCardData[] | null>(null);
  const [orgs, setOrgs] = useState<EntityCardData[] | null>(null);
  const [requests, setRequests] = useState<EntityCardData[] | null>(null);
  const [resources, setResources] = useState<EntityCardData[] | null>(null);
  const [totals, setTotals] = useState({ people: 0, orgs: 0, requests: 0, resources: 0 });
  const [networkError, setNetworkError] = useState(false);

  // Discover (search) state.
  const [searchResults, setSearchResults] = useState<EntityCardData[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  /* Disasters (context selector) */
  useEffect(() => {
    let alive = true;
    api
      .crmDisastersList()
      .then((d: unknown) => {
        if (!alive) return;
        const raw = (d as { disasters?: Disaster[] })?.disasters ?? (Array.isArray(d) ? (d as Disaster[]) : []);
        setDisasters(raw.map((x) => ({ id: x.id, name: x.name, day: x.day })));
      })
      .catch(() => alive && setDisasters([]));
    return () => {
      alive = false;
    };
  }, []);

  /* Network browse (people / orgs / requests / resources) */
  useEffect(() => {
    if (!orgId) return;
    let alive = true;
    setPeople(null);
    setOrgs(null);
    setRequests(null);
    setResources(null);
    setNetworkError(false);

    function arr(res: unknown, ...keys: string[]): RawEntity[] {
      const o = (res || {}) as Record<string, unknown>;
      for (const k of keys) if (Array.isArray(o[k])) return o[k] as RawEntity[];
      return Array.isArray(res) ? (res as RawEntity[]) : [];
    }
    function total(res: unknown, items: RawEntity[]): number {
      const t = (res as { total?: number })?.total;
      return typeof t === "number" ? t : items.length;
    }

    Promise.allSettled([
      api.crmBrowsePersons(orgId, { limit: 200 }),
      api.crmBrowseOrgs(orgId, { limit: 200 }),
      api.crmRequestsList(orgId),
      api.crmResourcesList(orgId),
    ]).then((settled) => {
      if (!alive) return;
      const [pRes, oRes, rqRes, rsRes] = settled.map((s) => (s.status === "fulfilled" ? s.value : null));
      if (settled.every((s) => s.status === "rejected")) setNetworkError(true);

      const pItems = arr(pRes, "persons", "people");
      const oItems = arr(oRes, "orgs", "organizations");
      const rqItems = arr(rqRes, "requests", "results", "cases");
      const rsItems = arr(rsRes, "resources", "results");

      setPeople(pItems.map(mapPerson));
      setOrgs(oItems.map(mapOrg));
      setRequests(rqItems.map(mapRequest));
      setResources(rsItems.map(mapResource));
      setTotals({
        people: total(pRes, pItems),
        orgs: total(oRes, oItems),
        requests: total(rqRes, rqItems),
        resources: total(rsRes, rsItems),
      });
    });

    return () => {
      alive = false;
    };
  }, [orgId, activeDisaster, demo]);

  /* Discover search (debounced) — only when in discover mode with a query */
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (mode !== "discover" || !orgId) return;
    const q = query.trim();
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q) {
      setSearchResults(null);
      setSearching(false);
      setSearchError(false);
      return;
    }
    let alive = true;
    setSearching(true);
    setSearchError(false);
    searchTimer.current = setTimeout(() => {
      api
        .crmSearch(q, orgId)
        .then((res: unknown) => {
          if (!alive) return;
          const o = (res || {}) as Record<string, unknown>;
          const raw: RawEntity[] = (["results", "matches", "items", "hits"] as const)
            .map((k) => o[k])
            .find((v) => Array.isArray(v)) as RawEntity[] | undefined ?? [];
          setSearchResults(raw.map(mapSearchResult).filter(Boolean) as EntityCardData[]);
        })
        .catch(() => alive && (setSearchError(true), setSearchResults([])))
        .finally(() => alive && setSearching(false));
    }, 300);
    return () => {
      alive = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [mode, query, orgId, demo]);

  const networkLoading = people === null || orgs === null || requests === null || resources === null;

  /* Network pool, filtered by tab + client-side query */
  const networkPool = useMemo<EntityCardData[]>(() => {
    const all = [...(people ?? []), ...(orgs ?? []), ...(requests ?? []), ...(resources ?? [])];
    const q = query.trim().toLowerCase();
    return all.filter((e) => {
      if (tab !== "all" && e.type !== TAB_TO_TYPE[tab]) return false;
      if (q && !`${e.name} ${e.description ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [people, orgs, requests, resources, tab, query]);

  /* Discover pool, filtered by tab */
  const discoverPool = useMemo<EntityCardData[]>(() => {
    const all = searchResults ?? [];
    return tab === "all" ? all : all.filter((e) => e.type === TAB_TO_TYPE[tab]);
  }, [searchResults, tab]);

  const tabItems: TabItem[] = useMemo(
    () => [
      { id: "all", label: "All", count: totals.people + totals.orgs + totals.requests + totals.resources },
      { id: "people", label: "People", count: totals.people },
      { id: "orgs", label: "Orgs", count: totals.orgs },
      { id: "requests", label: "Requests", count: totals.requests },
      { id: "resources", label: "Resources", count: totals.resources },
    ],
    [totals],
  );

  const networkCount = totals.people + totals.orgs + totals.requests + totals.resources;
  const navCounts = useMemo(() => ({ directory: totals.people }), [totals.people]);

  const agentMessages: AgentMessage[] = useMemo(
    () => [
      {
        id: "m1",
        role: "agent",
        text: `${networkCount} entities in your network — ${totals.people} people, ${totals.orgs} orgs.`,
      },
      { id: "m2", role: "agent", text: "I can find a vendor for an open request or tag someone to a case." },
    ],
    [networkCount, totals.people, totals.orgs],
  );
  const agentSuggestions: AgentSuggestion[] = [
    { id: "match", label: "Match open requests", tone: "matching", onSelect: () => router.push("/app/match") },
    { id: "discover", label: "Discover partners", onSelect: () => setMode("discover") },
  ];

  /* Card handlers */
  const openEntity = (e: EntityCardData) => router.push(`${DETAIL_ROUTE[e.type]}/${e.id}`);
  const actOnEntity = (e: EntityCardData) => {
    if (e.type === "request" || e.type === "resource") {
      // Match flow lives on the Match tab; deep-link by entity.
      router.push(`/app/match?${e.type}=${e.id}`);
    } else {
      // TODO(directory): wire "Tag to case" to a real EF verb when one exists
      // (no cases.tag_entity endpoint today — do not invent one). For now open
      // the entity so the operator can attach it from the detail view.
      router.push(`${DETAIL_ROUTE[e.type]}/${e.id}`);
    }
  };

  /* Sub-header: My network / Discover toggle */
  const subActions = (
    <div role="tablist" aria-label="Directory mode" style={{ display: "inline-flex", gap: 6 }}>
      <Button
        variant={mode === "network" ? "primary" : "secondary"}
        size="sm"
        aria-pressed={mode === "network"}
        onClick={() => setMode("network")}
      >
        My network {networkCount > 0 ? <Badge>{networkCount}</Badge> : null}
      </Button>
      <Button
        variant={mode === "discover" ? "primary" : "secondary"}
        size="sm"
        aria-pressed={mode === "discover"}
        onClick={() => setMode("discover")}
      >
        Discover {searchResults ? <Badge>{searchResults.length}</Badge> : null}
      </Button>
    </div>
  );

  /* Which list + state to render */
  const showList = mode === "network" ? networkPool : discoverPool;
  const listLoading = mode === "network" ? networkLoading : searching;

  return (
    <ConsoleShell
      navCounts={navCounts}
      disasters={disasters}
      activeDisasterId={activeDisaster}
      onSelectDisaster={setActiveDisaster}
      subActions={subActions}
      agent={
        <AgentPanel
          status={networkLoading ? "Loading network" : `${networkCount} in network`}
          statusTone="active"
          messages={agentMessages}
          suggestions={agentSuggestions}
          onSend={() => router.push("/app/match")}
        />
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1100, margin: "0 auto" }}>
        {/* KPI tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {networkLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Surface key={i} variant="card" pad={4}>
                <Skeleton h={11} w={64} />
                <div style={{ height: 12 }} />
                <Skeleton h={28} w={52} />
              </Surface>
            ))
          ) : (
            <>
              <KpiStat label="People" value={totals.people} accent="var(--cn-coral)" />
              <KpiStat label="Organizations" value={totals.orgs} />
              <KpiStat label="Requests" value={totals.requests} />
              <KpiStat label="Resources" value={totals.resources} />
            </>
          )}
        </div>

        {/* Search */}
        <Surface variant="card" pad={3} radius="xl">
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 42,
              padding: "0 14px",
              borderRadius: 12,
              background: "var(--cn-sunken)",
              border: "1px solid var(--cn-border)",
            }}
          >
            <Search size={16} aria-hidden style={{ color: "var(--cn-text-3)", flexShrink: 0 }} />
            <input
              type="search"
              inputMode="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === "discover"
                  ? "Search across the wider network…"
                  : "Filter people, orgs, requests, resources…"
              }
              aria-label="Search directory"
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--cn-text)",
                fontFamily: "var(--font-sans)",
                fontSize: 14.5,
              }}
            />
          </label>
        </Surface>

        {/* Filter tabs */}
        <Tabs items={tabItems} value={tab} onChange={(id) => setTab(id as TabKey)} />

        {/* Entity list */}
        {listLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Surface key={i} variant="card" pad={3}>
                <div style={{ display: "flex", gap: 12 }}>
                  <Skeleton h={42} w={42} radius={11} />
                  <div style={{ flex: 1 }}>
                    <Skeleton h={10} w={70} />
                    <div style={{ height: 8 }} />
                    <Skeleton h={15} w="55%" />
                    <div style={{ height: 8 }} />
                    <Skeleton h={11} w="40%" />
                  </div>
                </div>
              </Surface>
            ))}
          </div>
        ) : mode === "network" && networkError && networkCount === 0 ? (
          <Surface variant="card" radius="xl">
            <EmptyState title="Couldn’t load your network" hint="The directory service didn’t respond. Try again shortly." />
          </Surface>
        ) : mode === "discover" && searchError ? (
          <Surface variant="card" radius="xl">
            <EmptyState title="Search failed" hint="The search service didn’t respond. Try a different query." />
          </Surface>
        ) : mode === "discover" && !query.trim() ? (
          <Surface variant="card" radius="xl">
            <EmptyState
              title="Discover the wider network"
              hint="Search for people, organizations, requests, or resources beyond your own network."
            />
          </Surface>
        ) : showList.length === 0 ? (
          <Surface variant="card" radius="xl">
            <EmptyState
              title={query.trim() ? "No matches" : "Nothing here yet"}
              hint={
                query.trim()
                  ? "Try a different search or filter."
                  : "Entities will appear here as your network grows."
              }
            />
          </Surface>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {showList.map((e) => (
              <EntityCard key={`${e.type}:${e.id}`} data={e} onOpen={openEntity} onAction={actOnEntity} />
            ))}
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}
