'use client';

import { useState, useEffect, useMemo } from "react";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { Check, X, ArrowRight, Sparkles, Clock, Users, MapPin, Phone, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  URGENCY_META,
  slaHoursLeft,
  householdSummary,
  computeBreakdown,
  ScoreBar,
  FitChip,
  FactChip,
  type ScoreBreakdown,
  type HouseholdFields,
} from "@/components/match/match-primitives";

type Mode = "requests" | "resources";

type CaseItem = {
  id: string; citizen: string; county: string; taxonomy: string[];
  urgency: string; umbrella: string | null; opened: string;
} & HouseholdFields;

type Candidate = {
  id: string; name: string; score: number; counties: string; open: number; color: string;
  contact?: string; responseHrs?: number;
  breakdown?: ScoreBreakdown;
};

type ResourceItem = {
  id: string; title: string; taxonomy: string; county: string;
  available: string; ownerName: string; status: string;
};

const CANDIDATE_COLORS = ["#89CFF0", "#EF4E4B", "#F5EBD6", "#34D399"];

const DECLINE_REASONS = ["Out of area", "At capacity", "Not a fit", "Other"];

// ─── CandidateCard ──────────────────────────────────────────────────────────

function CandidateCard({
  candidate,
  activeCase,
  confirming,
  onStartConfirm,
  onCancelConfirm,
  onAccept,
  onReject,
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

  const { id, name, score, counties, open, color, contact, responseHrs } = candidate;

  const breakdown: ScoreBreakdown =
    candidate.breakdown ?? computeBreakdown(activeCase, candidate);

  const countyMatch = breakdown.county > 0;
  const serviceMatch = breakdown.service > 0;
  const loadOk = open < 8;
  const fastEnough = breakdown.speed >= 10;

  const stateClass =
    state === "accepted"
      ? "ring-1 ring-[#34D399]/40 bg-[#34D399]/[0.06]"
      : state === "declined"
        ? "opacity-60"
        : "bg-white/[0.04] hover:bg-white/[0.07]";

  function handleAccept() {
    setState("accepted");
    onCancelConfirm();
    onAccept();
  }

  function handleDecline(reason: string) {
    setDeclineReason(reason);
    setState("declined");
    onReject(reason);
  }

  return (
    <div className={`rounded-xl p-4 transition ${stateClass}`}>
      {/* Main row */}
      <div className="flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-[12px] shrink-0"
          style={{ background: `${color}26`, color }}
        >
          {name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-[14px] truncate">{name}</p>
            {state === "accepted" && (
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#34D399]/20 text-[#34D399]">
                Routed
              </span>
            )}
            {state === "declined" && (
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/55">
                Declined · {declineReason}
              </span>
            )}
          </div>
          <p className="font-mono text-[10px] text-white/50 mt-0.5">
            {counties} · {open} open
            {responseHrs != null && responseHrs > 0 ? ` · ~${responseHrs}h response` : ""}
            {contact ? ` · ${contact}` : ""}
          </p>
        </div>

        {/* Score */}
        <div className="w-[120px] shrink-0">
          <div className="flex items-baseline justify-end gap-1">
            <span className="font-mono text-[20px] font-semibold tabular-nums" style={{ color }}>
              {score}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">fit</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, score)}%`, background: color }}
            />
          </div>
        </div>

        {/* Actions */}
        {state === "idle" && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setState("decline_open")}
              className="h-9 px-3 rounded-lg bg-white/8 hover:bg-white/15 text-white/70 text-[12px] transition inline-flex items-center gap-1.5"
            >
              <X size={13} /> Decline
            </button>
            <button
              onClick={onStartConfirm}
              className="h-9 px-3 rounded-lg bg-[#34D399] hover:bg-[#22b97f] text-[#0F1E2B] text-[12px] font-medium transition inline-flex items-center gap-1.5"
            >
              <Check size={13} /> Accept
            </button>
          </div>
        )}
        {state === "decline_open" && (
          <button
            onClick={() => setState("idle")}
            className="h-9 px-3 rounded-lg bg-white/8 hover:bg-white/15 text-white/70 text-[12px] transition inline-flex items-center gap-1.5 shrink-0"
          >
            <ChevronDown size={13} /> Cancel
          </button>
        )}
      </div>

      {/* Score breakdown */}
      <div className="mt-3 pt-3 border-t border-white/5 space-y-2.5">
        <ScoreBar breakdown={breakdown} color={color} />
        <div className="flex flex-wrap gap-1.5">
          <FitChip ok={serviceMatch} label="Service" hint={`Service match: ${breakdown.service}/50`} />
          <FitChip ok={countyMatch}  label="County"  hint={`County match: ${breakdown.county}/25`} />
          <FitChip ok={loadOk}       label="Capacity" hint={`Capacity: ${breakdown.capacity}/15 (${open} open)`} />
          <FitChip ok={fastEnough}   label="Speed"   hint={`Response speed: ${breakdown.speed}/10`} />
        </div>
      </div>

      {/* Decline reason picker */}
      {state === "decline_open" && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/45 mr-1 self-center">
            Reason:
          </span>
          {DECLINE_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => handleDecline(r)}
              className="h-6 px-2 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-white/75 transition"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Match confirmation */}
      {confirming && state === "idle" && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-3 flex-wrap">
          <span className="text-[12px] text-white/70 flex-1">Confirm match?</span>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={onCancelConfirm}
              className="h-7 px-2.5 rounded-md bg-white/8 hover:bg-white/15 text-white/70 text-[11px] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              className="h-7 px-2.5 rounded-md bg-[#34D399] hover:bg-[#22b97f] text-[#0F1E2B] text-[11px] font-medium transition"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MatchPage() {
  const { orgId } = useAuthContext();
  const [mode, setMode] = useState<Mode>("requests");
  const [caseList, setCaseList] = useState<CaseItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [activeId, setActive] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [countyFilter, setCountyFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"urgency" | "age">("urgency");

  const counties = useMemo(
    () => Array.from(new Set(caseList.map((c) => c.county).filter(Boolean))),
    [caseList],
  );

  const filteredCases = useMemo(() => {
    let list = countyFilter === "all" ? caseList : caseList.filter((c) => c.county === countyFilter);
    if (sortKey === "age")
      list = [...list].sort((a, b) => new Date(a.opened).getTime() - new Date(b.opened).getTime());
    return list;
  }, [caseList, countyFilter, sortKey]);

  const activeCase = filteredCases.find((c) => c.id === activeId) ?? filteredCases[0];

  // Load requests
  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const res = await api.crmCasesList(orgId, { status: "active" }) as any;
        const raw: unknown[] = res?.data ?? res?.cases ?? [];
        const mapped: CaseItem[] = raw.map((r: any) => ({
          id: r.request_id ?? r.id,
          citizen: r.person_name ?? r.citizen ?? "Unknown",
          county: r.county ?? "",
          taxonomy: Array.isArray(r.taxonomy) ? r.taxonomy : (r.taxonomy ? [r.taxonomy] : []),
          urgency: r.urgency ?? "medium",
          umbrella: r.umbrella_id ?? null,
          opened: r.created_at ?? "",
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

  // Load resources for resources mode
  useEffect(() => {
    if (mode !== "resources" || !orgId) return;
    api.crmResourcesList(orgId, { status: "available" })
      .then((res: any) => {
        const raw = res?.resources ?? res?.data ?? [];
        setResources(
          Array.isArray(raw)
            ? raw.map((r: any) => ({
                id: r.id,
                title: r.title ?? r.description ?? r.id,
                taxonomy: r.taxonomy_code ?? r.taxonomy ?? "",
                county: r.county ?? "",
                available: r.capacity_available ?? "1",
                ownerName: r.owner_name ?? "",
                status: r.status ?? "available",
              }))
            : [],
        );
      })
      .catch(() => {});
  }, [mode, orgId]);

  // Load candidates for active item
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.efCall("match-engine", { mode: "propose", request_id: activeId }) as any;
        const raw: unknown[] = res?.candidates ?? [];
        if (!cancelled) {
          setCandidates(
            raw.map((c: any, i: number) => ({
              id: c.org_id ?? c.id ?? String(i),
              name: c.org_name ?? c.name ?? "Unknown",
              score: c.score ?? 0,
              counties: Array.isArray(c.counties) ? c.counties.join(", ") : (c.service_area ?? ""),
              open: c.open_count ?? c.open ?? 0,
              color: CANDIDATE_COLORS[i % CANDIDATE_COLORS.length],
              contact: c.intake_contact ?? c.contact ?? undefined,
              responseHrs: c.response_hours ?? c.response_hrs ?? undefined,
              breakdown: c.breakdown ?? undefined,
            })),
          );
        }
      } catch {
        if (!cancelled) setCandidates([]);
      }
    })();
    return () => { cancelled = true; };
  }, [activeId]);

  async function handleAccept(candidateId: string) {
    try {
      await api.crmCaseAction("approve_match", { match_id: candidateId, request_id: activeId });
      toast.success("Match committed");
    } catch {
      toast.error("Failed to approve match");
    }
  }

  async function handleReject(candidateId: string, reason: string) {
    try {
      await api.crmCaseAction("reject_match", { match_id: candidateId, reason });
      toast(`Declined · ${reason}`);
    } catch {
      toast.error("Failed to reject candidate");
    }
  }

  const modeToggle = (
    <div className="flex items-center gap-0.5 rounded-lg bg-white/6 p-0.5">
      <button
        onClick={() => setMode("requests")}
        className={`h-7 px-2.5 rounded-md text-[11.5px] font-medium transition ${
          mode === "requests" ? "bg-white/12 text-white" : "text-white/55 hover:text-white"
        }`}
      >
        Requests
      </button>
      <button
        onClick={() => setMode("resources")}
        className={`h-7 px-2.5 rounded-md text-[11.5px] font-medium transition ${
          mode === "resources" ? "bg-white/12 text-white" : "text-white/55 hover:text-white"
        }`}
      >
        Resources
      </button>
    </div>
  );

  if (loading) {
    return (
      <CrmShell module="Match">
        <PageHeader title="Match" subtitle="Loading…" actions={modeToggle} />
        <div className="px-6 pt-6 animate-pulse">
          <div className="h-64 rounded-2xl bg-white/5" />
        </div>
      </CrmShell>
    );
  }

  // ── Resources mode ──────────────────────────────────────────────────────

  if (mode === "resources") {
    const activeResource = resources.find((r) => r.id === activeId) ?? resources[0];
    return (
      <CrmShell module="Match">
        <PageHeader title="Match" subtitle="Match available resources to open needs." actions={modeToggle} />
        {resources.length === 0 ? (
          <div className="px-6 pt-10 text-center text-white/50">
            <p className="text-[15px] font-medium">No available resources</p>
            <p className="text-[12px] text-white/40 mt-1">
              Resources appear here once they&apos;re marked available.
            </p>
          </div>
        ) : (
          <div className="px-4 pt-4 pb-4 grid lg:grid-cols-[340px_1fr] gap-4">
            <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-3 self-start">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 px-2 py-1.5">
                Available · {resources.length}
              </p>
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {resources.map((r) => {
                  const a = r.id === activeResource?.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActive(r.id)}
                      className={`w-full text-left rounded-xl p-3 transition ${
                        a ? "bg-[#89CFF0]/10 ring-1 ring-[#89CFF0]/40" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] text-white/45">{r.id.slice(0, 8)}</span>
                        <span className="font-mono text-[10px] text-[#34D399]">{r.available} avail</span>
                      </div>
                      <p className="text-[13px] font-medium leading-tight">{r.title}</p>
                      <p className="text-[12px] text-white/65 mt-0.5">{r.taxonomy}</p>
                    </button>
                  );
                })}
              </div>
            </aside>
            <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
              {activeResource ? (
                <>
                  <h2 className="text-[20px] font-semibold mb-1">{activeResource.title}</h2>
                  <p className="font-mono text-[10px] text-white/50 mb-4">
                    {activeResource.taxonomy} · {activeResource.county} · Owner: {activeResource.ownerName}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">
                    Best matching cases
                  </p>
                  <p className="text-[12px] text-white/45 py-8 text-center">
                    Resource-to-case scoring coming soon. Use Requests mode for now.
                  </p>
                </>
              ) : (
                <p className="text-white/40 py-10 text-center">Select a resource to see matching cases.</p>
              )}
            </section>
          </div>
        )}
      </CrmShell>
    );
  }

  // ── Requests mode — empty state ─────────────────────────────────────────

  if (!activeCase) {
    return (
      <CrmShell module="Match">
        <PageHeader title="Match" subtitle="Ranked orgs for each open request." actions={modeToggle} />
        <div className="px-6 pt-10 text-center text-white/50">
          <p className="text-[15px] font-medium">No open requests</p>
          <p className="text-[12px] text-white/40 mt-1">
            Requests will appear here when they need matching.
          </p>
        </div>
      </CrmShell>
    );
  }

  // ── Requests mode ───────────────────────────────────────────────────────

  const sla = slaHoursLeft(activeCase.opened, activeCase.urgency);
  const urgencyMeta = URGENCY_META[activeCase.urgency] ?? URGENCY_META.medium;
  const hhSummary = householdSummary(activeCase);

  return (
    <CrmShell module="Match">
      <PageHeader title="Match" subtitle="Ranked orgs for each open request." actions={modeToggle} />

      <div className="px-4 pt-4 pb-4 grid lg:grid-cols-[320px_1fr] gap-4">
        {/* ── Sidebar list ─────────────────────────────────────────────── */}
        <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 px-2 py-1.5">
            Open requests · {filteredCases.length}
          </p>

          {/* Filters */}
          <div className="flex gap-1.5 px-2 pb-2">
            <select
              value={countyFilter}
              onChange={(e) => setCountyFilter(e.target.value)}
              className="h-7 px-2 rounded-md bg-white/6 border border-white/10 text-[10.5px] text-white/70"
            >
              <option value="all">All counties</option>
              {counties.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className="h-7 px-2 rounded-md bg-white/6 border border-white/10 text-[10.5px] text-white/70"
            >
              <option value="urgency">By urgency</option>
              <option value="age">By age</option>
            </select>
          </div>

          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {filteredCases.map((c) => {
              const a = c.id === activeId;
              const caseSla = slaHoursLeft(c.opened, c.urgency);
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
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: um.dot }} />
                      <span className="font-mono text-[10px] text-white/45">{c.id.slice(0, 8)}</span>
                    </div>
                    <span
                      className={`font-mono text-[9px] ${
                        caseSla > 0 ? "text-white/40" : "text-[#EF4E4B]"
                      }`}
                    >
                      <Clock size={9} className="inline mr-0.5" />
                      {caseSla > 0 ? `${caseSla}h` : "SLA!"}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium">{c.citizen}</p>
                  <p className="font-mono text-[10px] text-white/50 mt-1">
                    {c.county} · {c.taxonomy[0]}
                  </p>
                  {hhStr && (
                    <p className="font-mono text-[9px] text-white/35 mt-0.5">
                      <Users size={9} className="inline mr-0.5" />
                      {hhStr}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="space-y-4 min-w-0">
          {/* ── Active case header ────────────────────────────────────── */}
          <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-[10px] text-white/45">{activeCase.id.slice(0, 8)}</span>
                  <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${urgencyMeta.pill}`}>
                    {urgencyMeta.label}
                  </span>
                  {activeCase.umbrella && (
                    <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F5EBD6]/15 text-[#F5EBD6]">
                      umbrella
                    </span>
                  )}
                </div>
                <h2 className="text-[20px] font-semibold">{activeCase.citizen}</h2>
                <p className="text-[13px] text-white/75 mt-1">
                  Needs{" "}
                  <span className="text-white">{activeCase.taxonomy.join(" + ").toLowerCase()}</span>
                  {activeCase.county && (
                    <> in {activeCase.county}</>
                  )}
                </p>
              </div>
              <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#89CFF0]/15 text-[#89CFF0] text-[11px] font-mono uppercase tracking-wider shrink-0">
                <Sparkles size={11} /> AI score
              </button>
            </div>

            {/* Fact chips */}
            <div className="flex flex-wrap gap-1.5">
              {hhSummary && (
                <FactChip icon={<Users size={10} />} label={hhSummary} />
              )}
              <FactChip
                icon={<Clock size={10} />}
                label={sla > 0 ? `${sla}h left` : "Past SLA"}
              />
              {activeCase.county && (
                <FactChip icon={<MapPin size={10} />} label={activeCase.county} />
              )}
              {activeCase.has_pets && <FactChip label="Pet-friendly needed" />}
            </div>
          </section>

          {/* ── Candidate orgs ────────────────────────────────────────── */}
          <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-3">
              Candidate orgs · {candidates.length}
            </p>

            {candidates.length === 0 ? (
              <div className="py-10 text-center text-white/40">
                <p className="text-[13px]">No candidates scored yet.</p>
                <p className="text-[11px] mt-1">
                  Click &quot;AI Score&quot; to find matching organizations.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {candidates.map((candidate) => (
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

            <button className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-white/55 hover:text-white transition">
              More options <ArrowRight size={12} />
            </button>
          </section>
        </div>
      </div>
    </CrmShell>
  );
}
