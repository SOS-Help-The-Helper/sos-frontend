'use client';

import { useState, useEffect, useMemo } from "react";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { Check, X, ArrowRight, Sparkles, Clock, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { toast } from "sonner";

type Mode = "requests" | "resources";

type CaseItem = {
  id: string; citizen: string; county: string; taxonomy: string[];
  urgency: string; umbrella: string | null; opened: string;
  household_size?: number; has_children?: boolean; has_pets?: boolean;
};

type Candidate = {
  id: string; name: string; score: number; counties: string; open: number; color: string;
  breakdown?: { service: number; county: number; capacity: number; speed: number };
};

type ResourceItem = {
  id: string; title: string; taxonomy: string; county: string;
  available: string; ownerName: string; status: string;
};

const CANDIDATE_COLORS = ["#89CFF0", "#EF4E4B", "#F5EBD6", "#34D399"];

function slaHoursLeft(createdAt: string, urgency: string): number {
  const target = urgency === "critical" ? 24 : urgency === "high" ? 48 : urgency === "medium" ? 96 : 168;
  const hoursOpen = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return Math.max(0, Math.round(target - hoursOpen));
}

export default function MatchPage() {
  const { orgId } = useAuthContext();
  const [mode, setMode] = useState<Mode>("requests");
  const [caseList, setCaseList] = useState<CaseItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [activeId, setActive] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [countyFilter, setCountyFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"urgency" | "age">("urgency");

  const counties = useMemo(() => Array.from(new Set(caseList.map(c => c.county).filter(Boolean))), [caseList]);

  const filteredCases = useMemo(() => {
    let list = countyFilter === "all" ? caseList : caseList.filter(c => c.county === countyFilter);
    if (sortKey === "age") list = [...list].sort((a, b) => new Date(a.opened).getTime() - new Date(b.opened).getTime());
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
          id: r.request_id ?? r.id, citizen: r.person_name ?? r.citizen ?? "Unknown",
          county: r.county ?? "", taxonomy: Array.isArray(r.taxonomy) ? r.taxonomy : (r.taxonomy ? [r.taxonomy] : []),
          urgency: r.urgency ?? "medium", umbrella: r.umbrella_id ?? null, opened: r.created_at ?? "",
          household_size: r.household_size, has_children: r.has_children, has_pets: r.has_pets,
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
        setResources(Array.isArray(raw) ? raw.map((r: any) => ({
          id: r.id, title: r.title ?? r.description ?? r.id,
          taxonomy: r.taxonomy_code ?? r.taxonomy ?? "", county: r.county ?? "",
          available: r.capacity_available ?? "1", ownerName: r.owner_name ?? "", status: r.status ?? "available",
        })) : []);
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
          setCandidates(raw.map((c: any, i: number) => ({
            id: c.org_id ?? c.id ?? String(i), name: c.org_name ?? c.name ?? "Unknown",
            score: c.score ?? 0, counties: Array.isArray(c.counties) ? c.counties.join(", ") : (c.service_area ?? ""),
            open: c.open_count ?? c.open ?? 0, color: CANDIDATE_COLORS[i % CANDIDATE_COLORS.length],
            breakdown: c.breakdown ?? undefined,
          })));
        }
      } catch { if (!cancelled) setCandidates([]); }
    })();
    return () => { cancelled = true; };
  }, [activeId]);

  async function handleAccept(candidateId: string) {
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    try {
      await api.crmCaseAction("approve_match", { match_id: candidateId, request_id: activeId });
      toast.success("Match approved");
    } catch { toast.error("Failed to approve match"); }
  }

  async function handleReject(candidateId: string) {
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    try {
      await api.crmCaseAction("reject_match", { match_id: candidateId });
      toast.success("Candidate rejected");
    } catch { toast.error("Failed to reject candidate"); }
  }

  const modeToggle = (
    <div className="flex items-center gap-0.5 rounded-lg bg-white/6 p-0.5">
      <button onClick={() => setMode("requests")} className={`h-7 px-2.5 rounded-md text-[11.5px] font-medium transition ${mode === "requests" ? "bg-white/12 text-white" : "text-white/55 hover:text-white"}`}>Requests</button>
      <button onClick={() => setMode("resources")} className={`h-7 px-2.5 rounded-md text-[11.5px] font-medium transition ${mode === "resources" ? "bg-white/12 text-white" : "text-white/55 hover:text-white"}`}>Resources</button>
    </div>
  );

  if (loading) {
    return (
      <CrmShell module="Match">
        <PageHeader title="Match" subtitle="Loading…" actions={modeToggle} />
        <div className="px-6 pt-6 animate-pulse"><div className="h-64 rounded-2xl bg-white/5" /></div>
      </CrmShell>
    );
  }

  // ============ RESOURCES MODE ============
  if (mode === "resources") {
    const activeResource = resources.find(r => r.id === activeId) ?? resources[0];
    return (
      <CrmShell module="Match">
        <PageHeader title="Match" subtitle="Match available resources to open needs." actions={modeToggle} />
        {resources.length === 0 ? (
          <div className="px-6 pt-10 text-center text-white/50">
            <p className="text-[15px] font-medium">No available resources</p>
            <p className="text-[12px] text-white/40 mt-1">Resources appear here once they&apos;re marked available.</p>
          </div>
        ) : (
          <div className="px-4 pt-4 pb-4 grid lg:grid-cols-[340px_1fr] gap-4">
            <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-3 self-start">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 px-2 py-1.5">Available · {resources.length}</p>
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {resources.map(r => {
                  const a = r.id === activeResource?.id;
                  return (
                    <button key={r.id} onClick={() => setActive(r.id)} className={`w-full text-left rounded-xl p-3 transition ${a ? "bg-[#89CFF0]/10 ring-1 ring-[#89CFF0]/40" : "hover:bg-white/5"}`}>
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
                  <p className="font-mono text-[10px] text-white/50 mb-4">{activeResource.taxonomy} · {activeResource.county} · Owner: {activeResource.ownerName}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Best matching cases</p>
                  <p className="text-[12px] text-white/45 py-8 text-center">Resource-to-case scoring coming soon. Use Requests mode for now.</p>
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

  // ============ REQUESTS MODE ============
  if (!activeCase) {
    return (
      <CrmShell module="Match">
        <PageHeader title="Match" subtitle="Ranked orgs for each open request." actions={modeToggle} />
        <div className="px-6 pt-10 text-center text-white/50">
          <p className="text-[15px] font-medium">No open requests</p>
          <p className="text-[12px] text-white/40 mt-1">Requests will appear here when they need matching.</p>
        </div>
      </CrmShell>
    );
  }

  const sla = slaHoursLeft(activeCase.opened, activeCase.urgency);

  return (
    <CrmShell module="Match">
      <PageHeader title="Match" subtitle="Ranked orgs for each open request." actions={modeToggle} />

      <div className="px-4 pt-4 pb-4 grid lg:grid-cols-[320px_1fr] gap-4">
        <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 px-2 py-1.5">Open requests · {filteredCases.length}</p>

          {/* Filters */}
          <div className="flex gap-1.5 px-2 pb-2">
            <select value={countyFilter} onChange={e => setCountyFilter(e.target.value)} className="h-7 px-2 rounded-md bg-white/6 border border-white/10 text-[10.5px] text-white/70">
              <option value="all">All counties</option>
              {counties.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as typeof sortKey)} className="h-7 px-2 rounded-md bg-white/6 border border-white/10 text-[10.5px] text-white/70">
              <option value="urgency">By urgency</option>
              <option value="age">By age</option>
            </select>
          </div>

          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {filteredCases.map((c) => {
              const a = c.id === activeId;
              const caseSla = slaHoursLeft(c.opened, c.urgency);
              return (
                <button key={c.id} onClick={() => setActive(c.id)} className={`w-full text-left rounded-xl p-3 transition ${a ? "bg-[#89CFF0]/10 ring-1 ring-[#89CFF0]/40" : "hover:bg-white/5"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-white/45">{c.id.slice(0, 8)}</span>
                    <div className="flex items-center gap-1.5">
                      {c.urgency === "critical" && <span className="font-mono text-[9px] uppercase tracking-wider text-[#EF4E4B]">urgent</span>}
                      <span className={`font-mono text-[9px] ${caseSla > 0 ? "text-white/40" : "text-[#EF4E4B]"}`}>
                        <Clock size={9} className="inline mr-0.5" />{caseSla > 0 ? `${caseSla}h` : "SLA"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[13px] font-medium">{c.citizen}</p>
                  <p className="font-mono text-[10px] text-white/50 mt-1">{c.county} · {c.taxonomy[0]}</p>
                  {(c.household_size || c.has_children || c.has_pets) && (
                    <p className="font-mono text-[9px] text-white/35 mt-0.5">
                      <Users size={9} className="inline mr-0.5" />
                      {c.household_size ?? "?"} people
                      {c.has_children && " · kids"}
                      {c.has_pets && " · pets"}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-[10px] text-white/45">{activeCase.id.slice(0, 8)}</span>
                {activeCase.umbrella && (
                  <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F5EBD6]/15 text-[#F5EBD6]">umbrella</span>
                )}
                <span className={`font-mono text-[9px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${sla > 0 ? "bg-white/5 text-white/50" : "bg-[#EF4E4B]/15 text-[#EF4E4B]"}`}>
                  <Clock size={9} />{sla > 0 ? `${sla}h remaining` : "Past SLA"}
                </span>
              </div>
              <h2 className="text-[20px] font-semibold">{activeCase.citizen}</h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/50 mt-1">
                {activeCase.county} · {activeCase.taxonomy.join(" · ")}
                {activeCase.household_size && ` · ${activeCase.household_size} people`}
                {activeCase.has_children && " · kids"}{activeCase.has_pets && " · pets"}
              </p>
            </div>
            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#89CFF0]/15 text-[#89CFF0] text-[11px] font-mono uppercase tracking-wider">
              <Sparkles size={11} /> ai score
            </button>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Candidate orgs · {candidates.length}</p>
          {candidates.length === 0 ? (
            <div className="py-10 text-center text-white/40">
              <p className="text-[13px]">No candidates scored yet.</p>
              <p className="text-[11px] mt-1">Click &quot;AI Score&quot; to find matching organizations.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map(({ id, name, score, counties, open, color, breakdown }) => (
                <div key={id} className="rounded-xl bg-white/5 hover:bg-white/8 p-4 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-[12px]" style={{ background: `${color}26`, color }}>
                      {name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[14px]">{name}</p>
                      <p className="font-mono text-[10px] text-white/50 mt-0.5">covers {counties} · {open} open</p>
                    </div>
                    <div className="text-right mr-2">
                      <p className="font-mono text-[20px] font-semibold tabular-nums" style={{ color }}>{score}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">score</p>
                    </div>
                    <button onClick={() => handleReject(id)} className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/55 transition"><X size={15} /></button>
                    <button onClick={() => handleAccept(id)} className="w-9 h-9 rounded-full bg-[#34D399] hover:bg-[#22b97f] flex items-center justify-center text-[#0F1E2B] transition"><Check size={15} /></button>
                  </div>
                  {/* Scoring breakdown */}
                  {breakdown && (
                    <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-4 gap-2">
                      {[
                        { label: "Service", value: breakdown.service, max: 50 },
                        { label: "County", value: breakdown.county, max: 25 },
                        { label: "Capacity", value: breakdown.capacity, max: 15 },
                        { label: "Speed", value: breakdown.speed, max: 10 },
                      ].map(f => (
                        <div key={f.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[9px] text-white/40">{f.label}</span>
                            <span className="font-mono text-[9px] tabular-nums text-white/60">{f.value}/{f.max}</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(f.value / f.max) * 100}%`, background: color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-white/55 hover:text-white transition">
            More options <ArrowRight size={12} />
          </button>
        </section>
      </div>
    </CrmShell>
  );
}
