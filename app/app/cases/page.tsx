"use client";

/**
 * Cases — board + table. Phase 2 of the console redesign.
 * Board = kanban columns by stage (from cases.list stage_counts), CaseCard cells.
 * Table = dense rows composed from console primitives.
 * Composed entirely from @/components/console. Data via lib/api (EFs) only.
 * Redesign 2026-06 (SOS Connect System).
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import {
  ConsoleShell,
  AgentPanel,
  Surface,
  SectionLabel,
  StatusDot,
  Chip,
  Tag,
  Badge,
  Button,
  Skeleton,
  EmptyState,
  CaseCard,
  useDemoMode,
  resolveStage,
  stageLabel,
  stageTone,
  URGENCY_TONE,
  type DisasterOption,
  type AgentMessage,
  type AgentSuggestion,
  type CaseCardData,
  type CaseStage,
} from "@/components/console";

/* ------------------------------------------------------------------ */
/* Local narrow shapes for cases.list                                  */
/* ------------------------------------------------------------------ */
interface CaseRow {
  id: string;
  display_name?: string;
  name?: string;
  person_name?: string;
  urgency?: string;
  status?: string;
  stage?: string;
  category?: string;
  taxonomy_code?: string;
  county?: string;
  request_count?: number;
  resource_count?: number;
  match_count?: number;
  match_score?: number;
  score?: number;
  assigned_to?: string;
  owner?: string;
  updated_at?: string;
  created_at?: string;
}
interface CasesResponse {
  cases?: CaseRow[];
  total?: number;
  stage_counts?: Record<string, number>;
}
interface Disaster {
  id: string;
  name: string;
  day?: number;
}
type ViewMode = "board" | "table";

const STAGE_ORDER: CaseStage[] = [
  "pending",
  "active",
  "under_review",
  "approved",
  "matched",
  "in_progress",
  "fulfilled",
  "closed",
];

/* ------------------------------------------------------------------ */
/* Mapping helpers                                                     */
/* ------------------------------------------------------------------ */
function caseName(c: CaseRow): string {
  return c.display_name || c.name || c.person_name || "Unnamed";
}
function caseScore(c: CaseRow): number | undefined {
  const s = c.match_score ?? c.score;
  return typeof s === "number" ? s : undefined;
}
function toCardData(c: CaseRow): CaseCardData {
  return {
    id: c.id,
    name: caseName(c),
    urgency: c.urgency,
    stage: c.status || c.stage,
    category: c.category || c.taxonomy_code,
    county: c.county,
    requestCount: c.request_count,
    resourceCount: c.resource_count,
    matchCount: c.match_count,
    score: caseScore(c),
  };
}

/** Ordered column keys = stage_counts keys ∪ stages present in cards, in STAGE_ORDER. */
function columnKeys(cases: CaseRow[], counts: Record<string, number>): string[] {
  const present = new Set<string>(Object.keys(counts));
  for (const c of cases) present.add(resolveStage(c.status || c.stage));
  const ordered = STAGE_ORDER.filter((s) => present.has(s));
  const extras = [...present].filter((k) => !STAGE_ORDER.includes(k as CaseStage));
  return [...ordered, ...extras];
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function CasesPage() {
  const router = useRouter();
  const { orgId } = useAuthContext();
  const demo = useDemoMode();

  const [view, setView] = useState<ViewMode>("board");
  const [disasters, setDisasters] = useState<DisasterOption[]>([]);
  const [activeDisaster, setActiveDisaster] = useState<string | undefined>();
  const [data, setData] = useState<CasesResponse | null>(null);
  const [error, setError] = useState(false);

  // Disasters (context selector)
  useEffect(() => {
    let alive = true;
    api
      .crmDisastersList()
      .then((d: unknown) => {
        if (!alive) return;
        const raw = (d as { disasters?: Disaster[] })?.disasters ?? (Array.isArray(d) ? (d as Disaster[]) : []);
        const list: DisasterOption[] = raw.map((x) => ({ id: x.id, name: x.name, day: x.day }));
        setDisasters(list);
      })
      .catch(() => alive && setDisasters([]));
    return () => {
      alive = false;
    };
  }, []);

  // Cases
  useEffect(() => {
    if (!orgId) return;
    let alive = true;
    setData(null);
    setError(false);
    api
      .crmCasesList(orgId)
      .then((r: unknown) => {
        if (!alive) return;
        const res = (r || {}) as CasesResponse;
        setData({
          cases: res.cases || [],
          total: res.total ?? (res.cases || []).length,
          stage_counts: res.stage_counts || {},
        });
      })
      .catch(() => {
        if (!alive) return;
        setError(true);
        setData({ cases: [], total: 0, stage_counts: {} });
      });
    return () => {
      alive = false;
    };
  }, [orgId, activeDisaster, demo]);

  const cases = data?.cases ?? [];
  const counts = data?.stage_counts ?? {};
  const loading = data === null;

  const cols = useMemo(() => columnKeys(cases, counts), [cases, counts]);

  const cardsByStage = useMemo(() => {
    const map: Record<string, CaseRow[]> = {};
    for (const c of cases) {
      const k = resolveStage(c.status || c.stage);
      (map[k] ||= []).push(c);
    }
    return map;
  }, [cases]);

  const openCount = useMemo(
    () => cases.filter((c) => !["fulfilled", "closed"].includes(resolveStage(c.status || c.stage))).length,
    [cases],
  );

  const navCounts = useMemo(() => ({ cases: openCount }), [openCount]);

  const agentMessages: AgentMessage[] = useMemo(
    () => [
      {
        id: "m1",
        role: "agent",
        text: `${cases.length} active case${cases.length === 1 ? "" : "s"}${openCount ? `, ${openCount} still open` : ""}.`,
      },
      { id: "m2", role: "agent", text: "I can prioritize the unmatched ones or draft outreach." },
    ],
    [cases.length, openCount],
  );
  const agentSuggestions: AgentSuggestion[] = [
    { id: "match", label: "Run matching", tone: "matching", onSelect: () => router.push("/app/match") },
    { id: "map", label: "View on map", onSelect: () => router.push("/app/map") },
  ];

  const open = (id: string) => router.push(`/app/cases/${id}`);

  const subActions = (
    <div role="tablist" aria-label="View mode" style={{ display: "inline-flex", gap: 6 }}>
      <Button
        variant={view === "board" ? "primary" : "secondary"}
        size="sm"
        aria-pressed={view === "board"}
        onClick={() => setView("board")}
      >
        Board
      </Button>
      <Button
        variant={view === "table" ? "primary" : "secondary"}
        size="sm"
        aria-pressed={view === "table"}
        onClick={() => setView("table")}
      >
        Table
      </Button>
    </div>
  );

  return (
    <ConsoleShell
      navCounts={navCounts}
      disasters={disasters}
      activeDisasterId={activeDisaster}
      onSelectDisaster={setActiveDisaster}
      subActions={subActions}
      agent={
        <AgentPanel
          status={openCount ? `${openCount} open cases` : "All caught up"}
          statusTone={openCount ? "matching" : "active"}
          messages={agentMessages}
          suggestions={agentSuggestions}
          onSend={() => router.push("/app/match")}
        />
      }
    >
      {loading ? (
        <BoardSkeleton />
      ) : error && cases.length === 0 ? (
        <Surface variant="card" radius="xl">
          <EmptyState title="Couldn’t load cases" hint="The case service didn’t respond. Try again shortly." />
        </Surface>
      ) : cases.length === 0 ? (
        <Surface variant="card" radius="xl">
          <EmptyState title="No cases yet" hint="New intake will appear here as soon as it arrives." />
        </Surface>
      ) : view === "board" ? (
        <Board cols={cols} cardsByStage={cardsByStage} counts={counts} onOpen={open} />
      ) : (
        <Table cases={cases} onOpen={open} />
      )}

      <style>{`
        @media (max-width: 860px) {
          .cn-board { scroll-snap-type: x mandatory; }
          .cn-board-col { min-width: 78vw !important; scroll-snap-align: start; }
        }
      `}</style>
    </ConsoleShell>
  );
}

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */
function Board({
  cols,
  cardsByStage,
  counts,
  onOpen,
}: {
  cols: string[];
  cardsByStage: Record<string, CaseRow[]>;
  counts: Record<string, number>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="cn-board" style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, alignItems: "flex-start" }}>
      {cols.map((key) => {
        const items = cardsByStage[key] || [];
        const count = counts[key] ?? items.length;
        return (
          <section
            key={key}
            className="cn-board-col"
            aria-label={stageLabel(key)}
            style={{ flex: "0 0 300px", minWidth: 300, display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusDot tone={stageTone(key)} size={8} />
                <SectionLabel>{stageLabel(key)}</SectionLabel>
              </div>
              <Badge>{count}</Badge>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 60 }}>
              {items.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed var(--cn-border)",
                    borderRadius: 12,
                    padding: "20px 12px",
                    textAlign: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--cn-text-faint)",
                  }}
                >
                  Empty
                </div>
              ) : (
                items.map((c) => <CaseCard key={c.id} data={toCardData(c)} onOpen={onOpen} />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div style={{ display: "flex", gap: 14, overflow: "hidden" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ flex: "0 0 300px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 4px" }}>
            <Skeleton h={12} w={90} />
            <Skeleton h={14} w={22} />
          </div>
          {Array.from({ length: 3 }).map((__, j) => (
            <Surface key={j} variant="card" pad={3}>
              <Skeleton h={38} w={38} radius={11} />
              <div style={{ height: 8 }} />
              <Skeleton h={14} w="70%" />
              <div style={{ height: 6 }} />
              <Skeleton h={10} w="50%" />
            </Surface>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */
function fmtUpdated(c: CaseRow): string {
  const iso = c.updated_at || c.created_at;
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (Number.isNaN(days)) return "—";
  if (days <= 0) return "today";
  return `${days}d ago`;
}

function Table({ cases, onOpen }: { cases: CaseRow[]; onOpen: (id: string) => void }) {
  const head: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--cn-text-3)",
    textAlign: "left",
    padding: "10px 14px",
    borderBottom: "1px solid var(--cn-border)",
    whiteSpace: "nowrap",
  };
  const cell: React.CSSProperties = {
    padding: "11px 14px",
    borderBottom: "1px solid var(--cn-border)",
    fontFamily: "var(--font-sans)",
    fontSize: 13.5,
    color: "var(--cn-text-2)",
    verticalAlign: "middle",
  };
  return (
    <Surface variant="card" pad={0} radius="xl" style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              <th style={head}>Type</th>
              <th style={head}>Name / Category</th>
              <th style={head}>Stage</th>
              <th style={head}>Items</th>
              <th style={head}>Owner</th>
              <th style={head}>Updated</th>
              <th style={{ ...head, textAlign: "right" }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const stage = resolveStage(c.status || c.stage);
              const urgency = (c.urgency || "").toLowerCase();
              const score = caseScore(c);
              return (
                <tr
                  key={c.id}
                  tabIndex={0}
                  role="link"
                  aria-label={`Open case ${caseName(c)}`}
                  onClick={() => onOpen(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen(c.id);
                    }
                  }}
                  style={{ cursor: "pointer", outlineColor: "var(--ring)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cn-surface-3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={cell}>
                    <Tag type="case" />
                  </td>
                  <td style={cell}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {urgency && <StatusDot tone={URGENCY_TONE[urgency] || "neutral"} size={7} />}
                      <span style={{ color: "var(--cn-text)", fontWeight: 600 }}>{caseName(c)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--cn-text-3)", marginTop: 2 }}>
                      {[c.category || c.taxonomy_code, c.county].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </td>
                  <td style={cell}>
                    <Chip tone={stageTone(stage)}>{stageLabel(stage)}</Chip>
                  </td>
                  <td style={cell}>
                    <span style={{ display: "inline-flex", gap: 6 }}>
                      {c.request_count ? <Badge tone="coral">{c.request_count}</Badge> : null}
                      {c.resource_count ? <Badge tone="blue">{c.resource_count}</Badge> : null}
                      {!c.request_count && !c.resource_count ? <span style={{ color: "var(--cn-text-faint)" }}>—</span> : null}
                    </span>
                  </td>
                  <td style={cell}>{c.assigned_to || c.owner || "—"}</td>
                  <td style={{ ...cell, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cn-text-3)" }}>
                    {fmtUpdated(c)}
                  </td>
                  <td style={{ ...cell, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--cn-blue)" }}>
                    {typeof score === "number" ? Math.round(score) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}
