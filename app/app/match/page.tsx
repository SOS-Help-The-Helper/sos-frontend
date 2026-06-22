"use client";

/**
 * Match — the match engine. Phase 4 of the console redesign.
 * Queue of requests needing matches → request detail → "how the agent scored
 * this" breakdown (reuses ScoreBreakdown) → candidate chain → commit/broadcast.
 * Composed entirely from @/components/console. Data via lib/api (EFs) only.
 * Redesign 2026-06 (SOS Connect System). Composed, not cobbled.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Radio, ListPlus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import {
  ConsoleShell,
  AgentPanel,
  Surface,
  SectionLabel,
  Field,
  Chip,
  Tag,
  Button,
  Skeleton,
  EmptyState,
  ScoreBreakdown,
  MatchQueueItem,
  CandidateRow,
  useDemoMode,
  URGENCY_TONE,
  type DisasterOption,
  type AgentMessage,
  type AgentSuggestion,
  type MatchQueueItemData,
  type CandidateRowData,
} from "@/components/console";

/* ------------------------------------------------------------------ */
/* Narrow shape for a row from api.crmMatchesList                      */
/* ------------------------------------------------------------------ */
interface MatchRecord {
  id: string;
  request_id: string;
  resource_id?: string | null;
  score?: number;
  reasoning?: string | Record<string, unknown> | null;
  status?: string | null;
  chain_id?: string | null;
  created_at?: string | null;
  request_person_name?: string | null;
  request_taxonomy?: string | null;
  request_county?: string | null;
  request_urgency?: string | null;
  resource_name?: string | null;
  resource_taxonomy?: string | null;
  org_name?: string | null;
}

/** A request grouped with its scored candidate chain. */
interface RequestGroup {
  requestId: string;
  name: string;
  taxonomy?: string | null;
  county?: string | null;
  urgency?: string | null;
  chainId?: string | null;
  candidates: MatchRecord[];
  topScore?: number;
}

interface Disaster {
  id: string;
  name: string;
  day?: number;
}

/* ------------------------------------------------------------------ */
/* Grouping                                                            */
/* ------------------------------------------------------------------ */
function groupByRequest(matches: MatchRecord[]): RequestGroup[] {
  const map = new Map<string, RequestGroup>();
  for (const m of matches) {
    let g = map.get(m.request_id);
    if (!g) {
      g = {
        requestId: m.request_id,
        name: m.request_person_name || "Unknown requester",
        taxonomy: m.request_taxonomy,
        county: m.request_county,
        urgency: m.request_urgency,
        chainId: m.chain_id,
        candidates: [],
      };
      map.set(m.request_id, g);
    }
    g.candidates.push(m);
  }
  const groups = [...map.values()];
  for (const g of groups) {
    g.candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    g.topScore = g.candidates[0]?.score;
  }
  // Highest-scoring requests first so the best matches surface at the top.
  groups.sort((a, b) => (b.topScore ?? 0) - (a.topScore ?? 0));
  return groups;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function MatchPage() {
  const router = useRouter();
  const { orgId } = useAuthContext();
  const demo = useDemoMode();

  const [disasters, setDisasters] = useState<DisasterOption[]>([]);
  const [activeDisaster, setActiveDisaster] = useState<string | undefined>();
  const [matches, setMatches] = useState<MatchRecord[] | null>(null);
  const [error, setError] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | undefined>();
  const [activeCandidateId, setActiveCandidateId] = useState<string | undefined>();
  /** transient notice for actions with no wired endpoint yet (see TODO below) */
  const [notice, setNotice] = useState<string | null>(null);

  // Disasters (context selector)
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

  // Matches
  useEffect(() => {
    if (!orgId) return;
    let alive = true;
    setMatches(null);
    setError(false);
    api
      .crmMatchesList(orgId)
      .then((r: unknown) => {
        if (!alive) return;
        const list = ((r as { matches?: MatchRecord[] })?.matches ?? []) as MatchRecord[];
        setMatches(list);
      })
      .catch(() => {
        if (!alive) return;
        setError(true);
        setMatches([]);
      });
    return () => {
      alive = false;
    };
  }, [orgId, activeDisaster, demo]);

  const groups = useMemo(() => groupByRequest(matches ?? []), [matches]);
  const loading = matches === null;

  // Keep an active request selected (default to the first / top of the queue).
  const activeGroup = useMemo(
    () => groups.find((g) => g.requestId === activeRequestId) ?? groups[0],
    [groups, activeRequestId],
  );
  const activeCandidate = useMemo(
    () => activeGroup?.candidates.find((c) => c.id === activeCandidateId) ?? activeGroup?.candidates[0],
    [activeGroup, activeCandidateId],
  );

  // Reset the candidate selection when the active request changes.
  useEffect(() => {
    setActiveCandidateId(undefined);
    setNotice(null);
  }, [activeGroup?.requestId]);

  const navCounts = useMemo(() => ({ match: groups.length }), [groups.length]);

  const agentMessages: AgentMessage[] = useMemo(() => {
    const n = groups.length;
    const top = activeGroup;
    return [
      {
        id: "m1",
        role: "agent",
        text: `${n} request${n === 1 ? "" : "s"} in the match queue${n ? `, ranked by best fit.` : "."}`,
      },
      top
        ? {
            id: "m2",
            role: "agent",
            text: `Top candidate for ${top.name} scores ${Math.round(top.topScore ?? 0)}. Review the chain before committing.`,
          }
        : { id: "m2", role: "agent", text: "Matches will appear here once the engine proposes candidates." },
    ];
  }, [groups.length, activeGroup]);

  const agentSuggestions: AgentSuggestion[] = [
    { id: "cases", label: "Open cases", onSelect: () => router.push("/app/cases") },
    { id: "map", label: "View on map", onSelect: () => router.push("/app/map") },
  ];

  /* ----------------------------------------------------------------
   * Actions.
   * NOTE: lib/api has no dedicated method to commit a *match record* by id
   * or to broadcast it to vendors — `crmMatchesList` is read-only and the
   * existing `crmCaseAction("approve_match"/"reject_match")` flow operates on
   * a request+org pair in the legacy workbench, not on these match ids.
   * Per the Phase 4 brief we do NOT invent endpoints; these are left as TODOs
   * and surface a clear in-UI notice until a method is added to lib/api.
   * ---------------------------------------------------------------- */
  function handleCommit() {
    // TODO(phase4): wire to a real commit endpoint when one exists in lib/api
    //   (e.g. api.crmMatchCommit(activeCandidate.id)). Do not invent it here.
    setNotice("Commit isn’t wired yet — no match-commit endpoint exists in lib/api.");
  }
  function handleBroadcast() {
    // TODO(phase4): wire to a real vendor-broadcast endpoint when one exists.
    setNotice("Broadcast isn’t wired yet — no vendor-broadcast endpoint exists in lib/api.");
  }
  function handleAddToQueue() {
    // TODO(phase4): wire to a real queue/propose endpoint when one exists.
    setNotice("Add to queue isn’t wired yet — no queue endpoint exists in lib/api.");
  }

  return (
    <ConsoleShell
      navCounts={navCounts}
      disasters={disasters}
      activeDisasterId={activeDisaster}
      onSelectDisaster={setActiveDisaster}
      agent={
        <AgentPanel
          status={groups.length ? `${groups.length} in queue` : "Queue clear"}
          statusTone={groups.length ? "matching" : "active"}
          messages={agentMessages}
          suggestions={agentSuggestions}
          onSend={() => router.push("/app/cases")}
        />
      }
    >
      {loading ? (
        <MatchSkeleton />
      ) : error && groups.length === 0 ? (
        <Surface variant="card" radius="xl">
          <EmptyState title="Couldn’t load matches" hint="The match service didn’t respond. Try again shortly." />
        </Surface>
      ) : groups.length === 0 ? (
        <Surface variant="card" radius="xl">
          <EmptyState
            title="No matches to review"
            hint="When the engine proposes candidates for open requests, they’ll queue here."
          />
        </Surface>
      ) : (
        <div className="cn-match-grid" style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
          {/* LEFT: queue */}
          <Surface variant="card" pad={0} radius="xl" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "16px 18px 10px", borderBottom: "1px solid var(--cn-border)" }}>
              <SectionLabel tone="matching">Match queue · {groups.length}</SectionLabel>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, maxHeight: "calc(100vh - 220px)", overflow: "auto" }}>
              {groups.map((g) => (
                <MatchQueueItem
                  key={g.requestId}
                  data={toQueueData(g)}
                  selected={g.requestId === activeGroup?.requestId}
                  onSelect={setActiveRequestId}
                />
              ))}
            </div>
          </Surface>

          {/* RIGHT: detail + score + chain + actions */}
          {activeGroup && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              {/* Request detail */}
              <Surface variant="card" radius="xl">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <Tag type="request" />
                  {activeGroup.chainId && (
                    <Chip tone="reserved" dot>
                      Chained
                    </Chip>
                  )}
                </div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "var(--cn-text)", marginTop: 6 }}>
                  {activeGroup.name}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Field label="Need">{fmtTaxonomy(activeGroup.taxonomy) || "—"}</Field>
                  <Field label="County">{activeGroup.county || "—"}</Field>
                  <Field label="Urgency">
                    <Chip tone={URGENCY_TONE[(activeGroup.urgency || "").toLowerCase()] || "neutral"}>
                      {activeGroup.urgency || "Unspecified"}
                    </Chip>
                  </Field>
                  <Field label="Candidates">{activeGroup.candidates.length}</Field>
                </div>
              </Surface>

              {/* How the agent scored this (selected candidate) */}
              <Surface variant="card" radius="xl">
                <SectionLabel tone="reserved">How the agent scored this</SectionLabel>
                <div style={{ height: 12 }} />
                <ScoreBreakdown score={activeCandidate?.score} reasoning={activeCandidate?.reasoning} />
              </Surface>

              {/* Candidate chain */}
              <Surface variant="card" radius="xl">
                <SectionLabel>Candidate chain</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  {activeGroup.candidates.map((c) => (
                    <CandidateRow
                      key={c.id}
                      data={toCandidateData(c)}
                      selected={c.id === activeCandidate?.id}
                      onSelect={setActiveCandidateId}
                    />
                  ))}
                </div>
              </Surface>

              {/* Actions */}
              <Surface variant="card" radius="xl">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <Button variant="primary" leading={<Send size={14} />} onClick={handleCommit} disabled={!activeCandidate}>
                    Commit match
                  </Button>
                  <Button variant="secondary" leading={<Radio size={14} />} onClick={handleBroadcast}>
                    Broadcast to vendors
                  </Button>
                  <Button variant="ghost" leading={<ListPlus size={14} />} onClick={handleAddToQueue}>
                    Add to queue
                  </Button>
                </div>
                {notice && (
                  <p role="status" style={{ marginTop: 12, fontSize: 12.5, color: "var(--cn-text-3)" }}>
                    {notice}
                  </p>
                )}
              </Surface>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .cn-match-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </ConsoleShell>
  );
}

/* ------------------------------------------------------------------ */
/* Mapping + format helpers                                            */
/* ------------------------------------------------------------------ */
function toQueueData(g: RequestGroup): MatchQueueItemData {
  return {
    requestId: g.requestId,
    name: g.name,
    taxonomy: fmtTaxonomy(g.taxonomy),
    county: g.county,
    urgency: g.urgency,
    candidateCount: g.candidates.length,
    topScore: g.topScore,
  };
}

function toCandidateData(m: MatchRecord): CandidateRowData {
  return {
    id: m.id,
    resourceName: m.resource_name || "Unnamed resource",
    orgName: m.org_name,
    taxonomy: fmtTaxonomy(m.resource_taxonomy),
    score: m.score ?? 0,
    status: m.status,
  };
}

function fmtTaxonomy(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  return code
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" — ");
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */
function MatchSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
      <Surface variant="card" pad={3} radius="xl">
        <Skeleton h={12} w={120} />
        <div style={{ height: 12 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} h={74} radius={12} />
          ))}
        </div>
      </Surface>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Surface variant="card" radius="xl">
          <Skeleton h={14} w={90} />
          <div style={{ height: 10 }} />
          <Skeleton h={28} w="60%" />
          <div style={{ height: 14 }} />
          <Skeleton h={120} />
        </Surface>
        <Surface variant="card" radius="xl">
          <Skeleton h={40} w={120} />
          <div style={{ height: 12 }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <Skeleton h={66} radius={12} />
            </div>
          ))}
        </Surface>
      </div>
    </div>
  );
}
