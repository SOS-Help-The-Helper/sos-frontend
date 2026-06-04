'use client';

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import {
  Check, X, ArrowRight, Sparkles, Users, MapPin, Phone,
  ChevronDown, LayoutGrid, Crosshair, User, Package,
  Truck, UserCheck, AlertCircle, Search, Link2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  URGENCY_META,
  householdSummary,
  computeBreakdown,
  ScoreBar,
  FitChip,
  FactChip,
  ChainCard,
  ChainArrow,
  MatchCardShell,
  ScoreBreakdownPanel,
  URGENCY_PILL,
  type ScoreBreakdown,
  type HouseholdFields,
  type MatchEntry,
} from "@/components/match/match-primitives";
import { PipelineStepper } from "@/components/match/pipeline-stepper";

// ─── Types ──────────────────────────────────────────────────────────────────

type Mode = "board" | "match";

type MatchRecord = {
  id: string;
  request_id: string;
  resource_id: string | null;
  resource_org_id: string | null;
  score: number;
  status: string;
  reasoning: string | null;
  committed_by: string | null;
  created_at: string;
  chain_id?: string | null;
  transport_status?: string | null;
  // Joined
  request_person_name?: string;
  request_taxonomy?: string;
  request_county?: string;
  request_urgency?: string;
  resource_name?: string;
  resource_taxonomy?: string;
  org_name?: string;
};

type CaseItem = {
  id: string; citizen: string; county: string; taxonomy: string[];
  urgency: string; umbrella: string | null; opened: string;
  matchCount: number;
} & HouseholdFields;

type Candidate = {
  id: string; name: string; score: number; counties: string; open: number; color: string;
  contact?: string; responseHrs?: number;
  breakdown?: ScoreBreakdown;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const BOARD_COLS = [
  { id: "active",    label: "Active",    accent: "#89CFF0" },
  { id: "proposed",  label: "Proposed",  accent: "#F5A524" },
  { id: "committed", label: "Committed", accent: "#34D399" },
  { id: "completed", label: "Completed", accent: "#34D399" },
  { id: "declined",  label: "Declined",  accent: "#9CA3AF" },
];

const CANDIDATE_COLORS = ["#89CFF0", "#EF4E4B", "#F5EBD6", "#34D399"];
const DECLINE_REASONS = ["Out of area", "At capacity", "Not a fit", "Other"];

// ─── Match Board Mode ───────────────────────────────────────────────────────

function MatchBoard({ orgId }: { orgId: string }) {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mobileCol, setMobileCol] = useState(BOARD_COLS[0].id);

  function fetchMatches() {
    if (!orgId) return;
    setLoading(true);
    setError(false);
    api.crmMatchesList(orgId)
      .then((res: any) => {
        const raw = res?.matches ?? res?.data ?? (Array.isArray(res) ? res : []);
        setMatches(raw);
      })
      .catch(() => {
        setError(true);
        toast.error("Failed to load matches");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchMatches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const grouped = useMemo(() => {
    const map: Record<string, MatchRecord[]> = {};
    for (const col of BOARD_COLS) map[col.id] = [];
    for (const m of matches) {
      const status = m.status ?? "active";
      const col = map[status] ? status : "active";
      map[col].push(m);
    }
    // Sort each column newest first
    for (const col of Object.keys(map)) {
      map[col].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return map;
  }, [matches]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-white/40">
        <p>Failed to load matches.</p>
        <button onClick={() => fetchMatches()} className="text-sm text-white/60 underline">
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 pb-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${BOARD_COLS.length}, minmax(220px, 1fr))` }}>
        {BOARD_COLS.map(col => (
          <div key={col.id} className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-3 animate-pulse">
            <div className="h-6 rounded bg-white/5 mb-3" />
            <div className="space-y-2">
              <div className="h-16 rounded-xl bg-white/5" />
              <div className="h-16 rounded-xl bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const colContent = (col: typeof BOARD_COLS[0]) => {
    const items = grouped[col.id] || [];
    return (
      <div key={col.id} id={`match-col-${col.id}`} className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-3 self-start">
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: col.accent }} />
            <span className="font-mono text-xs uppercase tracking-wider text-white/55">{col.label}</span>
          </div>
          <span className="font-mono text-xs text-white/35">{items.length}</span>
        </div>
        <div className="space-y-2 max-h-[65vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-[11px] text-white/30 text-center py-6">No matches</p>
          ) : (
            items.map(m => <MatchBoardCard key={m.id} match={m} accent={col.accent} />)
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile: pill switcher + single-column view */}
      <div className="md:hidden">
        <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-2">
          {BOARD_COLS.map(col => (
            <button
              key={col.id}
              role="tab"
              aria-selected={mobileCol === col.id}
              aria-controls={`match-col-${col.id}`}
              onClick={() => setMobileCol(col.id)}
              className={`shrink-0 px-3 h-8 rounded-full text-xs font-medium border transition
                ${mobileCol === col.id
                  ? 'bg-white text-[#0F1E2B] border-white'
                  : 'bg-white/5 text-white/60 border-white/10'}`}
            >
              {col.label}
            </button>
          ))}
        </div>
        <div className="px-4 pb-4">
          {colContent(BOARD_COLS.find(c => c.id === mobileCol) ?? BOARD_COLS[0])}
        </div>
      </div>

      {/* Desktop: full 5-column board */}
      <div className="hidden md:block px-4 pt-4 pb-4 overflow-x-auto">
        <div className="grid gap-3 min-w-[1100px]" style={{ gridTemplateColumns: `repeat(${BOARD_COLS.length}, minmax(220px, 1fr))` }}>
          {BOARD_COLS.map(col => colContent(col))}
        </div>
      </div>
    </>
  );
}

function MatchBoardCard({ match: m, accent }: { match: MatchRecord; accent: string }) {
  const personName = m.request_person_name || "Unknown";
  const taxonomy = m.request_taxonomy || m.resource_taxonomy || "—";
  const county = m.request_county || "—";
  const urgency = m.request_urgency || "medium";
  const um = URGENCY_META[urgency] ?? URGENCY_META.medium;
  const resourceLabel = m.org_name || m.resource_name || "Unassigned";
  const daysAgo = m.created_at ? Math.floor((Date.now() - new Date(m.created_at).getTime()) / 86400000) : null;

  return (
    <Link
      href={`/app/directory/request/${m.request_id}`}
      className="block rounded-xl p-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition"
    >
      {/* Person + urgency */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: um.dot }} aria-hidden="true" />
          <span className="sr-only">{urgency}</span>
          <p className="text-[13px] font-medium truncate">{personName}</p>
        </div>
        {m.score > 0 && (
          <span className="font-mono text-[11px] font-semibold tabular-nums shrink-0" style={{ color: accent }}>
            {m.score}
          </span>
        )}
      </div>

      {/* Need */}
      <p className="font-mono text-xs text-white/55 truncate mb-1">
        {fmtTaxonomy(taxonomy)} · {county}
      </p>

      {/* Resource/org matched to */}
      <div className="flex items-center gap-1.5">
        <Package size={10} className="text-white/35 shrink-0" />
        <p className="font-mono text-xs text-white/45 truncate">{resourceLabel}</p>
      </div>

      {/* Chain indicator + footer */}
      <div className="flex items-center justify-between mt-1.5">
        {m.chain_id ? (
          <span className="inline-flex items-center gap-1 font-mono text-[9px] text-[#89CFF0] bg-[#89CFF0]/10 px-1.5 py-0.5 rounded">
            <Link2 size={9} />
            {m.transport_status ? m.transport_status.replace(/_/g, " ") : "chain"}
          </span>
        ) : <span />}
        {daysAgo != null && (
          <p className="font-mono text-[9px] text-white/30">{daysAgo}d ago</p>
        )}
      </div>
    </Link>
  );
}

// ─── Match Mode (split panel) ───────────────────────────────────────────────

function MatchWorkbench({ orgId }: { orgId: string }) {
  const [caseList, setCaseList] = useState<CaseItem[]>([]);
  const [activeId, setActive] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [countyFilter, setCountyFilter] = useState("all");
  const [acceptedCandidateId, setAcceptedCandidateId] = useState<string | null>(null);

  const counties = useMemo(
    () => Array.from(new Set(caseList.map((c) => c.county).filter(Boolean))),
    [caseList],
  );

  const filteredCases = useMemo(() => {
    let list = countyFilter === "all" ? caseList : caseList.filter((c) => c.county === countyFilter);
    // Sort: has matches first, then newest first
    list = [...list].sort((a, b) => {
      if (a.matchCount > 0 && b.matchCount === 0) return -1;
      if (b.matchCount > 0 && a.matchCount === 0) return 1;
      return new Date(b.opened).getTime() - new Date(a.opened).getTime();
    });
    return list;
  }, [caseList, countyFilter]);

  const activeCase = filteredCases.find((c) => c.id === activeId) ?? filteredCases[0];

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const res = await api.crmCasesList(orgId, { status: "active" }) as any;
        const raw: unknown[] = res?.cases ?? res?.data ?? [];
        const mapped: CaseItem[] = raw.map((r: any) => ({
          id: r.request_id ?? r.id,
          citizen: r.person_name ?? r.persons?.display_name ?? r.contact_name ?? "Unknown",
          county: r.county ?? r.location_text ?? "",
          taxonomy: Array.isArray(r.taxonomy) ? r.taxonomy : r.taxonomy ? [r.taxonomy] : r.taxonomy_code ? [r.taxonomy_code] : r.category ? [r.category] : [],
          urgency: r.urgency ?? "medium",
          umbrella: r.umbrella_id ?? r.soses?.id ?? null,
          opened: r.created_at ?? "",
          matchCount: r.match_count ?? 0,
          household_size: r.household_size,
          has_children: r.has_children,
          has_elderly: r.has_elderly,
          has_disabled: r.has_disabled,
          has_pets: r.has_pets,
        }));
        setCaseList(mapped);
        if (mapped.length > 0) setActive(mapped[0].id);
      } catch {}
      setLoading(false);
    })();
  }, [orgId]);

  useEffect(() => {
    setAcceptedCandidateId(null);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setCandidatesLoading(true);
    (async () => {
      try {
        const res = await api.efCall("match-engine", { mode: "propose", request_id: activeId }) as any;
        const raw: unknown[] = res?.candidates ?? [];
        if (!cancelled) {
          setCandidates(
            raw.map((c: any, i: number) => ({
              id: c.candidate_id ?? c.id ?? String(i),
              name: c.description ?? c.org_name ?? c.name ?? "Unknown",
              score: c.score ?? 0,
              counties: c.distance_miles != null ? `${Math.round(c.distance_miles)} mi away` : (Array.isArray(c.counties) ? c.counties.join(", ") : (c.service_area ?? "")),
              open: c.capacity ?? c.open_count ?? c.open ?? 0,
              color: CANDIDATE_COLORS[i % CANDIDATE_COLORS.length],
              contact: c.org_name ?? c.intake_contact ?? c.contact ?? undefined,
              responseHrs: c.response_hours ?? c.response_hrs ?? undefined,
              breakdown: c.score_breakdown?.score_breakdown ? {
                service: c.score_breakdown.score_breakdown.taxonomy === "exact" ? 50 : c.score_breakdown.score_breakdown.taxonomy === "airs_exact" ? 40 : 20,
                county: c.distance_miles != null ? Math.max(0, 25 - Math.round(c.distance_miles / 20)) : 0,
                capacity: (c.capacity ?? 0) > 0 ? 15 : 0,
                speed: 10,
              } : (c.breakdown ?? undefined),
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setCandidates([]);
          toast.error("Failed to fetch candidates");
        }
      } finally {
        if (!cancelled) setCandidatesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeId]);

  async function handleAccept(candidateId: string) {
    try {
      // candidateId is actually org_id from the candidate mapping
      await api.crmCaseAction("approve_match", { org_id: candidateId, request_id: activeId });
      toast.success("Match committed");
      setAcceptedCandidateId(candidateId);
    } catch {
      toast.error("Failed to approve match");
    }
  }

  async function handleReject(candidateId: string, reason: string) {
    try {
      // candidateId is actually org_id from the candidate mapping
      await api.crmCaseAction("reject_match", { org_id: candidateId, reason });
      toast(`Declined · ${reason}`);
    } catch {
      toast.error("Failed to reject candidate");
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 pb-4 grid lg:grid-cols-[340px_1fr] gap-4 animate-pulse">
        <div className="h-96 rounded-2xl bg-white/5" />
        <div className="h-96 rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (!activeCase) {
    return (
      <div className="px-6 pt-10 text-center text-white/50">
        <p className="text-[15px] font-medium">No open requests</p>
        <p className="text-[12px] text-white/40 mt-1">Requests will appear here when they need matching.</p>
      </div>
    );
  }

  const urgencyMeta = URGENCY_META[activeCase.urgency] ?? URGENCY_META.medium;
  const hhSummary = householdSummary(activeCase);

  return (
    <div className="px-4 pt-4 pb-4 grid lg:grid-cols-[320px_1fr] gap-4">
      {/* ── Sidebar list ─── */}
      <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-3 self-start">
        <p className="font-mono text-xs uppercase tracking-wider text-white/45 px-2 py-1.5">
          Open requests · {filteredCases.length}
        </p>

        {counties.length > 1 && (
          <div className="px-2 pb-2">
            <select
              value={countyFilter}
              onChange={(e) => setCountyFilter(e.target.value)}
              className="h-7 px-2 rounded-md bg-white/6 border border-white/10 text-[10.5px] text-white/70 w-full"
            >
              <option value="all">All counties</option>
              {counties.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {filteredCases.map((c) => {
            const a = c.id === activeId;
            const um = URGENCY_META[c.urgency] ?? URGENCY_META.medium;
            const hhStr = householdSummary(c);
            return (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`w-full text-left rounded-xl p-3 transition ${
                  a ? "bg-[#89CFF0]/10 ring-1 ring-[#89CFF0]/40" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: um.dot }} aria-hidden="true" />
                    <span className="sr-only">{um.label}</span>
                    <span className={`font-mono text-[9px] uppercase tracking-wider px-1 py-0.5 rounded ${um.pill}`}>
                      {um.label}
                    </span>
                  </div>
                  {c.matchCount > 0 && (
                    <span className="font-mono text-[9px] text-[#34D399] bg-[#34D399]/10 px-1.5 py-0.5 rounded">
                      {c.matchCount} match{c.matchCount > 1 ? "es" : ""}
                    </span>
                  )}
                </div>
                <p className="text-[13px] font-medium">{c.citizen}</p>
                <p className="font-mono text-xs text-white/50 mt-1">
                  {fmtTaxonomy(c.taxonomy[0]) || c.taxonomy[0] || "—"} · {c.county || "—"}
                </p>
                {hhStr && (
                  <p className="font-mono text-[9px] text-white/35 mt-0.5">
                    <Users size={9} className="inline mr-0.5" />{hhStr}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Active case + candidates ─── */}
      <div className="space-y-4 min-w-0">
        <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${urgencyMeta.pill}`}>
                  {urgencyMeta.label}
                </span>
                {activeCase.umbrella && (
                  <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F5EBD6]/15 text-[#F5EBD6]">
                    umbrella
                  </span>
                )}
                {activeCase.matchCount > 0 && (
                  <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#34D399]/15 text-[#34D399]">
                    {activeCase.matchCount} existing match{activeCase.matchCount > 1 ? "es" : ""}
                  </span>
                )}
              </div>
              <h2 className="text-[20px] font-semibold">{activeCase.citizen}</h2>
              <p className="text-[13px] text-white/75 mt-1">
                Needs <span className="text-white">{activeCase.taxonomy.map(t => fmtTaxonomy(t) || t).join(" + ").toLowerCase() || "—"}</span>
                {activeCase.county && <> in {activeCase.county}</>}
              </p>
            </div>
            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#89CFF0]/15 text-[#89CFF0] text-[11px] font-mono uppercase tracking-wider shrink-0">
              <Sparkles size={11} /> Score
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {hhSummary && <FactChip icon={<Users size={10} />} label={hhSummary} />}
            {activeCase.county && <FactChip icon={<MapPin size={10} />} label={activeCase.county} />}
            {activeCase.has_pets && <FactChip label="Pet-friendly needed" />}
          </div>
        </section>

        <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-3">
            Match candidates · {candidates.length}
          </p>

          {candidatesLoading ? (
            <div className="flex items-center justify-center py-12 text-white/40 text-sm">
              Loading candidates…
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-10 text-center text-white/40">
              <p className="text-[13px]">No candidates scored yet.</p>
              <p className="text-[11px] mt-1">Click &quot;Score&quot; to find matching resources.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map((candidate, i) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  activeCase={activeCase}
                  confirming={confirmingId === candidate.id}
                  onStartConfirm={() => setConfirmingId(candidate.id)}
                  onCancelConfirm={() => setConfirmingId(null)}
                  onAccept={() => handleAccept(candidate.id)}
                  onReject={(reason) => handleReject(candidate.id, reason)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Chain Preview (shown after a candidate is accepted) ─── */}
        {acceptedCandidateId && (() => {
          const accepted = candidates.find(c => c.id === acceptedCandidateId);
          return accepted ? (
            <MatchChainPreview activeCase={activeCase} candidate={accepted} />
          ) : null;
        })()}
      </div>
    </div>
  );
}

// ─── CandidateCard ──────────────────────────────────────────────────────────

function CandidateCard({
  candidate, activeCase, confirming, onStartConfirm, onCancelConfirm, onAccept, onReject,
}: {
  candidate: Candidate;
  activeCase: CaseItem;
  confirming: boolean;
  onStartConfirm: () => void;
  onCancelConfirm: () => void;
  onAccept: () => void;
  onReject: (reason: string) => void;
}) {
  const [state, setState] = useState<"idle" | "declined" | "accepted" | "decline_open">("idle");
  const [declineReason, setDeclineReason] = useState("");
  const { name, score, counties, open, color, contact, responseHrs } = candidate;

  const breakdown: ScoreBreakdown = candidate.breakdown ?? computeBreakdown(activeCase, candidate);

  const countyMatch = breakdown.county > 0;
  const serviceMatch = breakdown.service > 0;
  const loadOk = open < 8;
  const fastEnough = breakdown.speed >= 10;

  const stateClass =
    state === "accepted" ? "ring-1 ring-[#34D399]/40 bg-[#34D399]/[0.06]" :
    state === "declined" ? "opacity-60" :
    "bg-white/[0.04] hover:bg-white/[0.07]";

  function handleAccept() { setState("accepted"); onCancelConfirm(); onAccept(); }
  function handleDecline(reason: string) { setDeclineReason(reason); setState("declined"); onReject(reason); }

  return (
    <div className={`rounded-xl p-4 transition ${stateClass}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-[12px] shrink-0"
          style={{ background: `${color}26`, color }}>
          {(name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-[14px] truncate">{name}</p>
            {state === "accepted" && (
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#34D399]/20 text-[#34D399]">Routed</span>
            )}
            {state === "declined" && (
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/55">Declined · {declineReason}</span>
            )}
          </div>
          <p className="font-mono text-xs text-white/50 mt-0.5">
            {counties} · {open} open
            {responseHrs != null && responseHrs > 0 ? ` · ~${responseHrs}h response` : ""}
            {contact ? ` · ${contact}` : ""}
          </p>
        </div>
        <div className="w-[100px] shrink-0 text-right">
          <span className="font-mono text-[20px] font-semibold tabular-nums" style={{ color }}>{score}</span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/40 ml-1">fit</span>
          <div className="mt-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, score)}%`, background: color }} />
          </div>
        </div>
        {state === "idle" && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setState("decline_open")}
              className="h-11 px-3 rounded-lg bg-white/8 hover:bg-white/15 text-white/70 text-[12px] transition inline-flex items-center gap-1.5">
              <X size={13} /> Decline
            </button>
            <button onClick={onStartConfirm}
              className="h-11 px-3 rounded-lg bg-[#34D399] hover:bg-[#22b97f] text-[#0F1E2B] text-[12px] font-medium transition inline-flex items-center gap-1.5">
              <Check size={13} /> Accept
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 space-y-2.5">
        <ScoreBar breakdown={breakdown} color={color} score={score} />
        <div className="flex flex-wrap gap-1.5">
          <FitChip ok={serviceMatch} label="Service" hint={`Service: ${breakdown.service}/50`} />
          <FitChip ok={countyMatch} label="County" hint={`County: ${breakdown.county}/25`} />
          <FitChip ok={loadOk} label="Capacity" hint={`Capacity: ${breakdown.capacity}/15`} />
          <FitChip ok={fastEnough} label="Speed" hint={`Speed: ${breakdown.speed}/10`} />
        </div>
      </div>

      {state === "decline_open" && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="font-mono text-xs uppercase tracking-wider text-white/45 mr-1 self-center">Reason:</span>
          {DECLINE_REASONS.map((r) => (
            <button key={r} onClick={() => handleDecline(r)}
              className="h-6 px-2 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-white/75 transition">{r}</button>
          ))}
        </div>
      )}

      {confirming && state === "idle" && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-3 flex-wrap">
          <span className="text-[12px] text-white/70 flex-1">Confirm match?</span>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={onCancelConfirm}
              className="h-11 px-3 rounded-md bg-white/8 hover:bg-white/15 text-white/70 text-[11px] transition">Cancel</button>
            <button onClick={handleAccept}
              className="h-11 px-3 rounded-md bg-[#34D399] hover:bg-[#22b97f] text-[#0F1E2B] text-[11px] font-medium transition">Confirm match</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MatchChainPreview ──────────────────────────────────────────────────────

function MatchChainPreview({ activeCase, candidate }: { activeCase: CaseItem; candidate: Candidate }) {
  const bd = candidate.breakdown ?? computeBreakdown(activeCase, candidate);

  // Adapt ScoreBreakdown (service/county/capacity/speed) → MatchEntry.breakdown (category/distance/urgency/capacity/trust)
  const entryBreakdown = {
    category: Math.round((bd.service / 50) * 30),
    distance: bd.county,
    urgency: Math.round((bd.speed / 10) * 20),
    capacity: bd.capacity,
    trust: 0,
  };

  const matchEntry: MatchEntry = {
    id: (activeCase.id ?? "").slice(-8).toUpperCase(),
    title: `${activeCase.citizen} → ${candidate.name}`,
    blurb: `${fmtTaxonomy(activeCase.taxonomy[0]) || activeCase.taxonomy[0] || "—"} · ${activeCase.county || "—"}`,
    score: candidate.score,
    approved: true,
    breakdown: entryBreakdown,
    rationale: `Matched on service area, capacity, and response time.`,
  };

  const urgencyPill = URGENCY_PILL[activeCase.urgency] ?? "bg-white/8 text-white/55";

  return (
    <MatchCardShell kindLabel="Three-way match" match={matchEntry}>
      <PipelineStepper current="accepted" />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-3 md:gap-2 items-stretch">
        {/* Survivor */}
        <ChainCard
          icon={<Users size={13} className="text-[#89CFF0]" />}
          eyebrow="Survivor"
          title={activeCase.citizen}
          pills={[
            <span key="u" className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${urgencyPill}`}>
              {activeCase.urgency}
            </span>,
          ]}
          rows={[
            { label: "Household", value: householdSummary(activeCase) || "—" },
            { label: "Location", value: activeCase.county || "—", icon: <MapPin size={10} /> },
          ]}
        />
        <ChainArrow />

        {/* Resource (Org/Provider) */}
        <ChainCard
          icon={<Truck size={13} className="text-[#89CFF0]" />}
          eyebrow="Resource"
          title={candidate.name}
          pills={[
            <span key="s" className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#89CFF0]/15 text-[#89CFF0]">
              matched
            </span>,
          ]}
          rows={[
            { label: "Area", value: candidate.counties || "—" },
            { label: "Open", value: `${candidate.open} available` },
            ...(candidate.responseHrs ? [{ label: "Response", value: `~${candidate.responseHrs}h` }] : []),
          ]}
        />
        <ChainArrow />

        {/* Driver — awaiting */}
        <div className="rounded-xl border border-dashed border-[#F5A524]/40 bg-[#F5A524]/[0.04] p-3.5 flex flex-col gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <UserCheck size={13} className="text-[#F5A524]" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#F5A524]">Driver</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle size={12} className="text-[#F5A524]" />
            <p className="text-[12.5px] font-medium text-white/85">Awaiting Driver</p>
          </div>
          <p className="text-[11px] text-white/55 leading-snug">
            Match committed. Dispatch is sourcing a qualified driver within range.
          </p>
          <button className="mt-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-[#89CFF0]/15 text-[#89CFF0] text-[11px] font-medium hover:bg-[#89CFF0]/25 transition">
            <Search size={11} /> Find Driver
          </button>
        </div>
      </div>

      <ScoreBreakdownPanel match={matchEntry} />
    </MatchCardShell>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtTaxonomy(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  return code.split('.').map(p => p.charAt(0) + p.slice(1).toLowerCase()).join(' — ');
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MatchPage() {
  const { orgId } = useAuthContext();
  const [mode, setMode] = useState<Mode>("board");

  const modeToggle = (
    <div className="flex items-center gap-0.5 rounded-lg bg-white/6 p-0.5">
      <button
        onClick={() => setMode("board")}
        className={`h-7 px-2.5 rounded-md text-[11.5px] font-medium transition inline-flex items-center gap-1.5 ${
          mode === "board" ? "bg-white/12 text-white" : "text-white/55 hover:text-white"
        }`}
      >
        <LayoutGrid size={12} /> Board
      </button>
      <button
        onClick={() => setMode("match")}
        className={`h-7 px-2.5 rounded-md text-[11.5px] font-medium transition inline-flex items-center gap-1.5 ${
          mode === "match" ? "bg-white/12 text-white" : "text-white/55 hover:text-white"
        }`}
      >
        <Crosshair size={12} /> Match Mode
      </button>
    </div>
  );

  return (
    <CrmShell module="Match">
      <PageHeader
        title="Match"
        subtitle={mode === "board" ? "All matches by status." : "Score and assign matches."}
        actions={modeToggle}
      />
      {mode === "board"
        ? <MatchBoard orgId={orgId || ""} />
        : <MatchWorkbench orgId={orgId || ""} />
      }
    </CrmShell>
  );
}
