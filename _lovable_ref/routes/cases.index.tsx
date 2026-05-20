import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CrmShell } from "@/components/crm/CrmShell";
import { ManageTabs, PageHeader } from "@/components/crm/ManageTabs";
import { CountChip } from "@/components/crm/Pills";
import {
  cases as casesData,
  requests as requestsData,
  resources as resourcesData,
  reports as reportsData,
  orgs,
  BUCKETS,
  bucketOf,
  type RequestStatus,
  type Bucket,
} from "@/lib/prototype-data";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/cases/")({
  head: () => ({ meta: [{ title: "Cases — SOS Connect" }] }),
  component: CasesPage,
});

type TabKey = "cases" | "requests" | "resources" | "reports";

type Column = { id: string; label: string; accent: string };

type Card = {
  id: string;
  col: string;
  title: string;
  meta?: string;
  sub?: string;
  to: { route: string; params: Record<string, string> };
  urgency?: "critical" | "high" | "medium" | "low";
  status?: RequestStatus;
  orgColor?: string;
  orgName?: string;
  badge?: string;
};

// Stage definitions per tab
const CASE_COLS: Column[] = BUCKETS.map((b) => ({ id: b.id, label: b.label, accent: b.accent }));

const RESOURCE_COLS: Column[] = [
  { id: "available", label: "Available", accent: "#34D399" },
  { id: "matched", label: "Matched", accent: "#F5EBD6" },
  { id: "deployed", label: "Deployed", accent: "#89CFF0" },
];

const REPORT_COLS: Column[] = [
  { id: "Critical", label: "Critical", accent: "#EF4E4B" },
  { id: "Elevated", label: "Elevated", accent: "#F5EBD6" },
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
      to: { route: "/cases/$id", params: { id: c.umbrella ?? c.id } },
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
      to: { route: "/directory/request/$id", params: { id: r.id } },
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
    to: { route: "/directory/resource/$id", params: { id: r.id } },
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
    to: { route: "/directory/report/$id", params: { id: r.id } },
  }));
}

function CasesPage() {
  const [tab, setTab] = useState<TabKey>("cases");

  // Per-tab state so drag changes persist while switching tabs in-session
  const [caseCards, setCaseCards] = useState<Card[]>(() => buildCaseCards());
  const [requestCards, setRequestCards] = useState<Card[]>(() => buildRequestCards());
  const [resourceCards, setResourceCards] = useState<Card[]>(() => buildResourceCards());
  const [reportCards, setReportCards] = useState<Card[]>(() => buildReportCards());

  const { cards, setCards, columns, label } = useMemo(() => {
    switch (tab) {
      case "requests":
        return { cards: requestCards, setCards: setRequestCards, columns: CASE_COLS, label: "request" };
      case "resources":
        return { cards: resourceCards, setCards: setResourceCards, columns: RESOURCE_COLS, label: "resource" };
      case "reports":
        return { cards: reportCards, setCards: setReportCards, columns: REPORT_COLS, label: "report" };
      default:
        return { cards: caseCards, setCards: setCaseCards, columns: CASE_COLS, label: "case" };
    }
  }, [tab, caseCards, requestCards, resourceCards, reportCards]);

  const totalOpen = cards.filter((c) => c.col !== "resolved" && c.col !== "Resolved").length;

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const onDrop = (colId: string) => {
    if (!dragId) return;
    setCards((prev) => prev.map((c) => (c.id === dragId ? { ...c, col: colId } : c)));
    setDragId(null);
    setDragOverCol(null);
  };

  const TABS: { id: TabKey; label: string; count: number }[] = [
    { id: "cases", label: "Cases", count: caseCards.length },
    { id: "requests", label: "Requests", count: requestCards.length },
    { id: "resources", label: "Resources", count: resourceCards.length },
    { id: "reports", label: "Reports", count: reportCards.length },
  ];

  return (
    <CrmShell module="Cases">
      <ManageTabs />
      <PageHeader
        title="Cases"
        subtitle="Track every household request from intake through delivery. Drag a card across the pipeline to move it to its next stage."
        actions={
          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition">
            <Plus size={12} /> New {label}
          </button>
        }
      />

      {/* Tab strip */}
      <div className="px-4 md:px-6 pt-4 flex items-center gap-1 border-b border-[var(--hairline)] overflow-x-auto scrollbar-hide">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative h-9 px-3 inline-flex items-center gap-2 text-[12px] font-medium transition shrink-0 ${
                active ? "text-white" : "text-white/55 hover:text-white/85"
              }`}
            >
              {t.label}
              <span className={`font-mono text-[10px] tabular-nums ${active ? "text-white/55" : "text-white/35"}`}>{t.count}</span>
              {active && (
                <span className="absolute left-2 right-2 -bottom-px h-px bg-[#EF4E4B]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile: segmented stage selector + single-column list */}
      <MobileStageList
        cards={cards}
        columns={columns}
        tab={tab}
        onMove={(id, colId) => setCards((prev) => prev.map((c) => (c.id === id ? { ...c, col: colId } : c)))}
      />

      {/* Desktop: kanban with drag */}
      <div className="hidden md:block px-6 pt-6 pb-10">
        <div
          className="grid gap-3 overflow-x-auto snap-x md:snap-none"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(260px, 1fr))` }}
        >
          {columns.map((col) => {
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

function MobileStageList({
  cards, columns, tab, onMove,
}: {
  cards: Card[];
  columns: Column[];
  tab: TabKey;
  onMove: (id: string, colId: string) => void;
}) {
  const [stage, setStage] = useState<string>(columns[0]?.id ?? "");
  // Reset stage if columns change (tab switch)
  const validStage = columns.some((c) => c.id === stage) ? stage : columns[0]?.id ?? "";
  if (validStage !== stage) setStage(validStage);
  const items = cards.filter((c) => c.col === validStage);
  const active = columns.find((c) => c.id === validStage);

  return (
    <div className="md:hidden px-4 pt-4 pb-8">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
        {columns.map((col) => {
          const count = cards.filter((c) => c.col === col.id).length;
          const isActive = col.id === validStage;
          return (
            <button
              key={col.id}
              onClick={() => setStage(col.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium transition border ${
                isActive
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-transparent border-white/8 text-white/60"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.accent }} />
              {col.label}
              <span className="font-mono text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mt-2 mb-2">
        {active?.label} · {items.length}
      </p>
      <div className="space-y-2">
        {items.map((c) => (
          <MobileCard key={c.id} card={c} tab={tab} columns={columns} onMove={(colId) => onMove(c.id, colId)} />
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/8 py-10 text-center font-mono text-[10px] uppercase tracking-wider text-white/30">
            Nothing in {active?.label.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileCard({
  card, tab, columns, onMove,
}: { card: Card; tab: TabKey; columns: Column[]; onMove: (colId: string) => void }) {
  const [menu, setMenu] = useState(false);
  const urgencyTint =
    card.urgency === "critical" ? "#EF4E4B" :
    card.urgency === "high" ? "#F5EBD6" :
    card.urgency === "medium" ? "#89CFF0" :
    "rgba(245,235,214,0.45)";
  const meta = [card.meta, card.sub, card.orgName].filter(Boolean).join(" · ");
  return (
    <div className="rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] relative overflow-hidden">
      {card.urgency && (
        <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: urgencyTint }} />
      )}
      <Link
        to={card.to.route as "/cases/$id"}
        params={card.to.params as { id: string }}
        className="block p-3 pl-4 pr-10"
      >
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-[14px] font-medium leading-tight truncate">{card.title}</p>
          {card.badge && (
            <span className="font-mono text-[10px] text-white/45 tabular-nums shrink-0 ml-2">{card.badge}</span>
          )}
        </div>
        {meta && <p className="text-[12px] text-white/55 truncate">{meta}</p>}
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); setMenu(true); }}
        className="absolute top-2 right-2 w-8 h-8 rounded-md hover:bg-white/5 flex items-center justify-center text-white/55"
        aria-label="Move to…"
      >
        <span className="text-[18px] leading-none">⋯</span>
      </button>
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
          <div className="absolute top-10 right-2 z-50 w-48 rounded-lg bg-[#1a1a1a] border border-white/12 shadow-xl p-1.5">
            <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/45 px-2 py-1.5">Move {tab.slice(0, -1)} to…</p>
            {columns.map((col) => (
              <button
                key={col.id}
                onClick={() => { onMove(col.id); setMenu(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white/6 text-left transition"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.accent }} />
                <span className="text-[12.5px]">{col.label}</span>
                {col.id === card.col && <span className="ml-auto font-mono text-[9.5px] text-white/45">current</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DraggableCard({
  card,
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
  const urgencyTint =
    card.urgency === "critical" ? "#EF4E4B" :
    card.urgency === "high" ? "#F5EBD6" :
    card.urgency === "medium" ? "#89CFF0" :
    "rgba(245,235,214,0.45)";
  const meta = [card.meta, card.sub, card.orgName].filter(Boolean).join(" · ");
  return (
    <Link
      to={card.to.route as "/cases/$id"}
      params={card.to.params as { id: string }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        if (isDragging) e.preventDefault();
      }}
      className={`relative block rounded-xl p-3 pl-4 bg-white/4 hover:bg-white/7 border border-transparent hover:border-white/8 transition cursor-grab active:cursor-grabbing overflow-hidden ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {card.urgency && (
        <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: urgencyTint }} />
      )}
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <p className="text-[13px] font-medium leading-tight truncate">{card.title}</p>
        {card.badge && (
          <span className="font-mono text-[10px] text-white/45 tabular-nums shrink-0">{card.badge}</span>
        )}
      </div>
      {meta && <p className="text-[11.5px] text-white/55 truncate">{meta}</p>}
    </Link>
  );
}
