"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { UrgencyBadge, SubStatusPill, CountChip } from "@/components/crm/pills";
import { BUCKETS, bucketOf, type RequestStatus, type Bucket } from "@/lib/display-constants";
import {
  cases as casesData,
  requests as requestsData,
  resources as resourcesData,
  reports as reportsData,
  orgs,
} from "@/lib/prototype-data";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { Plus, Link2, AlertTriangle } from "lucide-react";

type TabKey = "cases" | "requests" | "resources" | "reports";

type Column = { id: string; label: string; accent: string };

type Card = {
  id: string;
  col: string;
  title: string;
  meta?: string;
  sub?: string;
  href: string;
  urgency?: "critical" | "high" | "medium" | "low";
  status?: RequestStatus;
  orgColor?: string;
  orgName?: string;
  badge?: string;
};

// Stage definitions per tab
// Cases tab = SOS umbrellas (active / resolved / closed)
const CASE_COLS: Column[] = [
  { id: "active", label: "Active", accent: "#EF4E4B" },
  { id: "resolved", label: "Resolved", accent: "#34D399" },
  { id: "closed", label: "Closed", accent: "#9CA3AF" },
];
// Requests tab uses the full pipeline stages
const REQUEST_COLS: Column[] = BUCKETS.map((b) => ({ id: b.id, label: b.label, accent: b.accent }));

const RESOURCE_COLS: Column[] = [
  { id: "available", label: "Available", accent: "#34D399" },
  { id: "matched", label: "Matched", accent: "#89CFF0" },
  { id: "deployed", label: "Deployed", accent: "#89CFF0" },
];

const REPORT_COLS: Column[] = [
  { id: "Critical", label: "Critical", accent: "#EF4E4B" },
  { id: "Elevated", label: "Elevated", accent: "#89CFF0" },
  { id: "Routine", label: "Routine", accent: "#89CFF0" },
  { id: "Resolved", label: "Resolved", accent: "#34D399" },
];

function buildCaseCards(): Card[] {
  return casesData.map((c) => {
    const org = orgs.find((o) => o.id === c.org);
    return {
      id: c.id,
      col: bucketOf(c.status),
      title: c.citizen,
      meta: `${c.county} · ${c.taxonomy[0]}`,
      sub: `${c.daysOpen}d`,
      href: `/app/cases/${c.umbrella ?? c.id}`,
      urgency: c.urgency,
      status: c.status,
      orgColor: org?.color,
      orgName: org?.name,
      badge: c.matchCount > 0 ? `${c.matchCount}` : undefined,
    };
  });
}

function buildRequestCards(): Card[] {
  return requestsData.map((r) => {
    const c = casesData.find((x) => x.id === r.caseId);
    const org = c ? orgs.find((o) => o.id === c.org) : undefined;
    return {
      id: r.id,
      col: bucketOf(r.status),
      title: r.personName,
      meta: `${r.county} · ${r.taxonomy}`,
      sub: `${r.daysOpen}d`,
      href: `/app/directory/request/${r.id}`,
      urgency: r.urgency,
      status: r.status,
      orgColor: org?.color,
      orgName: org?.name,
    };
  });
}

function buildResourceCards(): Card[] {
  return resourcesData.map((r) => ({
    id: r.id,
    col: r.status,
    title: r.title,
    meta: r.location,
    sub: r.capacity,
    href: `/app/directory/resource/${r.id}`,
    orgColor: orgs.find((o) => o.id === r.org)?.color,
    orgName: orgs.find((o) => o.id === r.org)?.name,
  }));
}

function buildReportCards(): Card[] {
  return reportsData.map((r) => ({
    id: r.id,
    col: r.resolution ? "Resolved" : r.severity,
    title: r.taxonomy,
    meta: `${r.location}`,
    sub: `by ${r.reporterName}`,
    href: `/app/directory/report/${r.id}`,
  }));
}

// Map live API cases to Card shape
function liveToCards(items: any[]): Card[] {
  return items.map((c) => ({
    id: c.id ?? c.request_id ?? String(Math.random()),
    col: bucketOf(c.status),
    title: c.display_name ?? c.person_name ?? c.citizen ?? c.id,
    meta: [c.county, c.category ?? c.taxonomy_code].filter(Boolean).join(" · "),
    sub: c.days_open != null ? `${c.days_open}d` : undefined,
    href: `/app/cases/${c.umbrella_id ?? c.id}`,
    urgency: c.urgency,
    status: c.status,
  }));
}

// Map live API requests to Card shape
function liveRequestsToCards(items: any[]): Card[] {
  return items.map((r) => ({
    id: r.id,
    col: bucketOf(r.status),
    title: r.display_name ?? r.person_name ?? r.id,
    meta: [r.city ?? r.locations?.city, r.category ?? r.taxonomy_code].filter(Boolean).join(" · "),
    sub: r.created_at ? `${Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)}d` : undefined,
    href: `/app/directory/request/${r.id}`,
    urgency: r.urgency,
    status: r.status,
  }));
}

// Map live API resources to Card shape
function liveResourcesToCards(items: any[]): Card[] {
  return items.map((r) => ({
    id: r.id,
    col: r.status ?? "available",
    title: r.category ?? r.taxonomy_code ?? r.id,
    meta: r.locations?.city ?? r.city ?? undefined,
    sub: r.capacity_available != null ? `${r.capacity_available} avail` : undefined,
    href: `/app/directory/resource/${r.id}`,
  }));
}

function SkeletonColumn({ accent }: { accent: string }) {
  return (
    <div className="snap-start rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-3 animate-pulse">
      <div className="flex items-center gap-2 px-1.5 pb-3">
        <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
        <span className="h-2 w-16 bg-white/10 rounded" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl p-3 bg-white/4 border border-transparent space-y-2">
            <div className="h-2 w-24 bg-white/10 rounded" />
            <div className="h-3 w-32 bg-white/15 rounded" />
            <div className="h-2 w-20 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CasesPage() {
  const { orgId } = useAuthContext();
  const [tab, setTab] = useState<TabKey>("cases");

  // Live data from EFs (null = not yet loaded or EF failed → fall back to prototype)
  const [liveCases, setLiveCases] = useState<Card[] | null>(null);
  const [liveRequests, setLiveRequests] = useState<Card[] | null>(null);
  const [liveResources, setLiveResources] = useState<Card[] | null>(null);

  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingResources, setLoadingResources] = useState(true);

  // Per-tab kanban state (initialized from prototype, overwritten by live data)
  const [caseCards, setCaseCards] = useState<Card[]>(() => buildCaseCards());
  const [requestCards, setRequestCards] = useState<Card[]>(() => buildRequestCards());
  const [resourceCards, setResourceCards] = useState<Card[]>(() => buildResourceCards());
  const [reportCards, setReportCards] = useState<Card[]>(() => buildReportCards());

  // Fetch cases (SOS umbrellas) from EF
  useEffect(() => {
    api.crmSosesList({ limit: 200 })
      .then((data: any) => {
        const items: any[] = data?.cases ?? (Array.isArray(data) ? data : []);
        if (items.length > 0) {
          const cards: Card[] = items.map((s: any) => ({
            id: s.id,
            col: s.status === "resolved" ? "resolved" : s.status === "closed" ? "closed" : "active",
            title: s.person_name || s.persons?.display_name || "Unknown",
            meta: `${s.request_count || 0} requests · ${s.fulfilled_count || 0} fulfilled`,
            sub: s.days_open != null ? `${s.days_open}d` : undefined,
            to: { route: "/app/cases/$id", params: { id: s.id } },
          }));
          setLiveCases(cards);
          setCaseCards(cards);
        }
      })
      .catch((err) => { console.error("[cases] soses fetch failed:", err); })
      .finally(() => setLoadingCases(false));
  }, []);

  // Fetch requests from EF
  useEffect(() => {
    
    api.crmRequestsList(orgId || "")
      .then((data: any) => {
        const items: any[] = data?.requests ?? (Array.isArray(data) ? data : []);
        if (items.length > 0) {
          const cards = liveRequestsToCards(items);
          setLiveRequests(cards);
          setRequestCards(cards);
        }
      })
      .catch((err) => { console.error("[cases] soses fetch failed:", err); })
      .finally(() => setLoadingRequests(false));
  }, [orgId]);

  // Fetch resources from EF
  useEffect(() => {
    
    api.crmResourcesList(orgId || "")
      .then((data: any) => {
        const items: any[] = data?.resources ?? (Array.isArray(data) ? data : []);
        if (items.length > 0) {
          const cards = liveResourcesToCards(items);
          setLiveResources(cards);
          setResourceCards(cards);
        }
      })
      .catch((err) => { console.error("[cases] soses fetch failed:", err); })
      .finally(() => setLoadingResources(false));
  }, [orgId]);

  const { cards, setCards, columns, label, loading } = useMemo(() => {
    switch (tab) {
      case "requests":
        return { cards: requestCards, setCards: setRequestCards, columns: REQUEST_COLS, label: "request", loading: loadingRequests };
      case "resources":
        return { cards: resourceCards, setCards: setResourceCards, columns: RESOURCE_COLS, label: "resource", loading: loadingResources };
      case "reports":
        return { cards: reportCards, setCards: setReportCards, columns: REPORT_COLS, label: "report", loading: false };
      default:
        return { cards: caseCards, setCards: setCaseCards, columns: CASE_COLS, label: "case", loading: loadingCases };
    }
  }, [tab, caseCards, requestCards, resourceCards, reportCards, loadingCases, loadingRequests, loadingResources]);

  const totalOpen = cards.filter((c) => c.col !== "resolved" && c.col !== "Resolved").length;

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const onDrop = (colId: string) => {
    if (!dragId) return;
    const card = cards.find((c) => c.id === dragId);
    // Optimistic update
    setCards((prev) => prev.map((c) => (c.id === dragId ? { ...c, col: colId } : c)));
    setDragId(null);
    setDragOverCol(null);
    // API mutation (fire-and-forget, no rollback on error)
    if (card && (tab === "cases" || tab === "requests")) {
      api.crmCaseAction("transition_status", { request_id: card.id, new_status: colId }).catch((err) => { console.error("[cases] soses fetch failed:", err); });
    }
  };

  const TABS: { id: TabKey; label: string; count: number }[] = [
    { id: "cases", label: "Cases", count: caseCards.length },
    { id: "requests", label: "Requests", count: requestCards.length },
    { id: "resources", label: "Resources", count: resourceCards.length },
    { id: "reports", label: "Reports", count: reportCards.length },
  ];

  return (
    <CrmShell module="Cases">
      <PageHeader
        title="Cases"
        subtitle={`${totalOpen} open · ${cards.length} total ${label}s · drag to change stage`}
        actions={
          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition">
            <Plus size={12} /> New {label}
          </button>
        }
      />

      {/* Tab strip */}
      <div className="px-6 pt-4 flex items-center gap-1 border-b border-[var(--hairline)]">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative h-9 px-3 inline-flex items-center gap-2 text-[12px] font-medium transition ${
                active ? "text-white" : "text-white/55 hover:text-white/85"
              }`}
            >
              {t.label}
              <span className="font-mono text-[10px] text-white/40 tabular-nums">{t.count}</span>
              {active && (
                <span className="absolute left-2 right-2 -bottom-px h-px bg-[#EF4E4B]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-4 pb-4">
        <div
          className="grid gap-3 overflow-x-auto snap-x md:snap-none"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(260px, 1fr))` }}
        >
          {loading
            ? columns.map((col) => <SkeletonColumn key={col.id} accent={col.accent} />)
            : columns.map((col) => {
                const items = cards.filter((c) => c.col === col.id);
                const isOver = dragOverCol === col.id;
                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverCol !== col.id) setDragOverCol(col.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverCol === col.id) setDragOverCol(null);
                    }}
                    onDrop={() => onDrop(col.id)}
                    className={`snap-start rounded-2xl border p-3 transition ${
                      isOver
                        ? "bg-white/[0.06] border-white/20"
                        : "bg-[var(--surface-1)] border-[var(--hairline)]"
                    }`}
                  >
                    <div className="flex items-center justify-between px-1.5 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: col.accent }} />
                        <span className="font-mono text-[10px] uppercase tracking-wider text-white/75">
                          {col.label}
                        </span>
                      </div>
                      <CountChip>{items.length}</CountChip>
                    </div>

                    <div className="space-y-2 min-h-[80px]">
                      {items.map((c) => (
                        <DraggableCard
                          key={c.id}
                          card={c}
                          tab={tab}
                          onDragStart={() => setDragId(c.id)}
                          onDragEnd={() => {
                            setDragId(null);
                            setDragOverCol(null);
                          }}
                          isDragging={dragId === c.id}
                        />
                      ))}
                      {items.length === 0 && (
                        <div className="rounded-xl border border-dashed border-white/8 py-6 text-center font-mono text-[10px] uppercase tracking-wider text-white/30">
                          Drop here
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </CrmShell>
  );
}

function DraggableCard({
  card,
  tab,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  card: Card;
  tab: TabKey;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  return (
    <Link
      href={card.href}
      draggable
      onDragStart={(e) => {
        // Prevent ghost from being the full link drag-image quirks
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        // suppress click if a drag just happened
        if (isDragging) e.preventDefault();
      }}
      className={`block rounded-xl p-3 bg-white/4 hover:bg-white/7 border border-transparent hover:border-white/8 transition cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[10px] text-white/45">{card.id}</span>
        {card.urgency && <UrgencyBadge urgency={card.urgency} />}
        {tab === "reports" && !card.urgency && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[#EF4E4B]">
            <AlertTriangle size={10} />
          </span>
        )}
      </div>
      <p className="text-[13px] font-medium leading-tight">{card.title}</p>
      {card.meta && <p className="font-mono text-[10px] text-white/50 mt-1">{card.meta}</p>}
      <div className="flex items-center gap-1.5 mt-2">
        {card.status && <SubStatusPill status={card.status} />}
        {card.sub && (
          <span className="font-mono text-[10px] text-white/40 tabular-nums">{card.sub}</span>
        )}
        {card.badge && (
          <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-[#89CFF0]">
            <Link2 size={9} /> {card.badge}
          </span>
        )}
      </div>
      {card.orgName && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
          <span className="text-[11px]" style={{ color: card.orgColor }}>
            {card.orgName}
          </span>
        </div>
      )}
    </Link>
  );
}
