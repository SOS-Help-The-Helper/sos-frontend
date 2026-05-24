import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { CrmShell } from "@/components/crm/CrmShell";
import { PageHeader } from "@/components/crm/ManageTabs";
import {
  cases as casesData,
  requests as requestsData,
  resources as resourcesData,
  reports as reportsData,
  orgs,
  BUCKETS,
  bucketOf,
  type RequestStatus,
} from "@/lib/prototype-data";

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

const SOS_COLS: Column[] = [
  { id: "active", label: "Active", accent: "#EF4E4B" },
  { id: "resolved", label: "Resolved", accent: "#34D399" },
  { id: "closed", label: "Closed", accent: "#6B7280" },
];
const REQUEST_COLS: Column[] = BUCKETS.map((b) => ({ id: b.id, label: b.label, accent: b.accent }));
const RESOURCE_COLS: Column[] = [
  { id: "available", label: "Available", accent: "#34D399" },
  { id: "matched", label: "Matched", accent: "#89CFF0" },
  { id: "deployed", label: "Deployed", accent: "#0F1E2B" },
];
const REPORT_COLS: Column[] = [
  { id: "Critical", label: "Critical", accent: "#EF4E4B" },
  { id: "Elevated", label: "Elevated", accent: "#F59E0B" },
  { id: "Routine", label: "Routine", accent: "#89CFF0" },
  { id: "Resolved", label: "Resolved", accent: "#34D399" },
];

function sosStatusOf(s: RequestStatus): "active" | "resolved" | "closed" {
  if (s === "closed") return "closed";
  if (s === "fulfilled") return "resolved";
  return "active";
}

function buildCaseCards(): Card[] {
  return casesData.map((c) => {
    const org = orgs.find((o) => o.id === c.org);
    return {
      id: c.id, col: sosStatusOf(c.status), title: c.citizen,
      meta: `${c.county} · ${c.taxonomy[0]}`, sub: `${c.daysOpen}d`,
      to: { route: "/cases/$id", params: { id: c.parentCaseId ?? c.id } },
      urgency: c.urgency, status: c.status, orgColor: org?.color, orgName: org?.name,
      badge: c.matchCount > 0 ? `${c.matchCount}` : undefined,
    };
  });
}
function buildRequestCards(): Card[] {
  return requestsData.map((r) => {
    const c = casesData.find((x) => x.id === r.caseId);
    const org = c ? orgs.find((o) => o.id === c.org) : undefined;
    return {
      id: r.id, col: bucketOf(r.status), title: r.personName,
      meta: `${r.county} · ${r.taxonomy}`, sub: `${r.daysOpen}d`,
      to: { route: "/directory/request/$id", params: { id: r.id } },
      urgency: r.urgency, status: r.status, orgColor: org?.color, orgName: org?.name,
    };
  });
}
function buildResourceCards(): Card[] {
  return resourcesData.map((r) => ({
    id: r.id, col: r.status, title: r.title, meta: r.location, sub: r.capacity,
    to: { route: "/directory/resource/$id", params: { id: r.id } },
    orgColor: orgs.find((o) => o.id === r.org)?.color,
    orgName: orgs.find((o) => o.id === r.org)?.name,
  }));
}
function buildReportCards(): Card[] {
  return reportsData.map((r) => ({
    id: r.id, col: r.resolution ? "Resolved" : r.severity,
    title: r.taxonomy, meta: r.location, sub: `by ${r.reporterName}`,
    to: { route: "/directory/report/$id", params: { id: r.id } },
  }));
}

function CasesPage() {
  const [tab, setTab] = useState<TabKey>("cases");
  const [caseCards, setCaseCards] = useState<Card[]>(() => buildCaseCards());
  const [requestCards, setRequestCards] = useState<Card[]>(() => buildRequestCards());
  const [resourceCards, setResourceCards] = useState<Card[]>(() => buildResourceCards());
  const [reportCards, setReportCards] = useState<Card[]>(() => buildReportCards());

  const { cards, setCards, columns, label } = useMemo(() => {
    switch (tab) {
      case "requests": return { cards: requestCards, setCards: setRequestCards, columns: REQUEST_COLS, label: "request" };
      case "resources": return { cards: resourceCards, setCards: setResourceCards, columns: RESOURCE_COLS, label: "resource" };
      case "reports": return { cards: reportCards, setCards: setReportCards, columns: REPORT_COLS, label: "report" };
      default: return { cards: caseCards, setCards: setCaseCards, columns: SOS_COLS, label: "case" };
    }
  }, [tab, caseCards, requestCards, resourceCards, reportCards]);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const onDrop = (colId: string) => {
    if (!dragId) return;
    setCards((prev) => prev.map((c) => (c.id === dragId ? { ...c, col: colId } : c)));
    setDragId(null); setDragOverCol(null);
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
        eyebrow="Coordination"
        title="Cases"
        subtitle="Household requests, intake to delivery."
        actions={
          <>
            <button className="sos-btn-secondary">
              Actions <ChevronDown size={14} />
            </button>
            <button className="sos-btn-primary">
              <Plus size={14} /> New {label}
            </button>
          </>
        }
      />

      {/* Tab strip */}
      <div className="bg-[var(--sos-white)] border-b border-[var(--sos-hairline)]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  position: "relative",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: active ? 700 : 600,
                  color: active ? "var(--sos-navy)" : "var(--sos-muted)",
                  whiteSpace: "nowrap",
                }}
                className="inline-flex items-center gap-2 min-h-11 px-3 md:px-4"
              >
                {t.label}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: active ? "rgba(239,78,75,0.12)" : "var(--sos-card-gray)",
                    color: active ? "var(--sos-coral)" : "var(--sos-muted)",
                  }}
                >
                  {t.count}
                </span>
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      left: 8,
                      right: 8,
                      bottom: -1,
                      height: 3,
                      background: "var(--sos-coral)",
                      borderRadius: "3px 3px 0 0",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>


      {/* Kanban body */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-4 md:pt-6 pb-10 md:pb-12">
        <div
          className="grid gap-3 md:gap-4 grid-cols-1 md:[grid-template-columns:repeat(var(--cols),minmax(280px,1fr))] md:overflow-x-auto"
          style={{ ['--cols' as string]: String(columns.length) }}
        >

          {columns.map((col) => {
            const items = cards.filter((c) => c.col === col.id);
            const isOver = dragOverCol === col.id;
            return (
              <div
                key={col.id}
                onDragOver={(e) => { e.preventDefault(); if (dragOverCol !== col.id) setDragOverCol(col.id); }}
                onDragLeave={() => { if (dragOverCol === col.id) setDragOverCol(null); }}
                onDrop={() => onDrop(col.id)}
                style={{
                  background: isOver ? "rgba(137,207,240,0.15)" : "var(--sos-card-gray)",
                  border: `1px solid ${isOver ? "var(--sos-blue)" : "var(--sos-hairline)"}`,
                  borderRadius: 12,
                  padding: 12,
                  transition: "all 160ms ease",
                  minHeight: 200,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 6px 12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.accent }} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "var(--sos-navy)",
                      }}
                    >
                      {col.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sos-muted)" }}>
                    {items.length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((c) => (
                    <KanbanCard
                      key={c.id}
                      card={c}
                      onDragStart={() => setDragId(c.id)}
                      onDragEnd={() => { setDragId(null); setDragOverCol(null); }}
                      isDragging={dragId === c.id}
                    />
                  ))}
                  {items.length === 0 && (
                    <div
                      style={{
                        borderRadius: 8,
                        border: "1px dashed var(--sos-hairline)",
                        padding: "24px 12px",
                        textAlign: "center",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "var(--sos-muted)",
                      }}
                    >
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

function KanbanCard({
  card, onDragStart, onDragEnd, isDragging,
}: {
  card: Card;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const urgencyColor =
    card.urgency === "critical" ? "#EF4E4B" :
    card.urgency === "high" ? "#F59E0B" :
    card.urgency === "medium" ? "#89CFF0" :
    "var(--sos-hairline)";
  const meta = [card.meta, card.sub, card.orgName].filter(Boolean).join(" · ");
  return (
    <Link
      to={card.to.route as "/cases/$id"}
      params={card.to.params as { id: string }}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={(e) => { if (isDragging) e.preventDefault(); }}
      style={{
        position: "relative",
        display: "block",
        textDecoration: "none",
        background: "var(--sos-white)",
        borderRadius: 8,
        padding: "12px 14px 12px 16px",
        boxShadow: "0 1px 2px rgba(15,30,43,0.06), 0 4px 12px rgba(15,30,43,0.04)",
        border: "1px solid var(--sos-hairline)",
        color: "var(--sos-body)",
        cursor: "grab",
        opacity: isDragging ? 0.4 : 1,
        overflow: "hidden",
        transition: "box-shadow 120ms, border-color 120ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(15,30,43,0.10), 0 12px 24px rgba(15,30,43,0.06)";
        e.currentTarget.style.borderColor = "var(--sos-blue)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(15,30,43,0.06), 0 4px 12px rgba(15,30,43,0.04)";
        e.currentTarget.style.borderColor = "var(--sos-hairline)";
      }}
    >
      {card.urgency && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: urgencyColor,
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--sos-navy)",
            margin: 0,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {card.title}
        </p>
        {card.badge && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--sos-coral)",
              background: "rgba(239,78,75,0.12)",
              padding: "2px 6px",
              borderRadius: 999,
              flexShrink: 0,
            }}
          >
            {card.badge}
          </span>
        )}
      </div>
      {meta && (
        <p
          style={{
            fontSize: 12,
            color: "var(--sos-muted)",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {meta}
        </p>
      )}
    </Link>
  );
}
