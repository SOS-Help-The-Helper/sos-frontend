'use client';

import { useState, useEffect, useMemo } from "react";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { Check, X, ArrowRight, Sparkles, Clock, Users, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { toast } from "sonner";

type Mode = "requests" | "resources";

function slaHoursLeft(createdAt: string, urgency: string): number {
  const target = urgency === "critical" ? 24 : urgency === "high" ? 48 : urgency === "medium" ? 96 : 168;
  const hoursOpen = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return Math.max(0, Math.round(target - hoursOpen));
}

type CaseItem = {
  id: string;
  citizen: string;
  county: string;
  taxonomy: string[];
  urgency: string;
  umbrella: string | null;
  opened: string;
};

type Candidate = {
  id: string;
  name: string;
  score: number;
  counties: string;
  open: number;
  color: string;
};

const CANDIDATE_COLORS = ["#89CFF0", "#EF4E4B", "#F5EBD6", "#34D399"];

export default function MatchPage() {
  const { orgId } = useAuthContext();
  const [mode, setMode] = useState<Mode>("requests");
  const [caseList, setCaseList] = useState<CaseItem[]>([]);
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

  useEffect(() => {
    
    (async () => {
      try {
        const res = await api.crmCasesList(orgId || "", { status: "active" }) as any;
        const raw: unknown[] = res?.data ?? res?.cases ?? [];
        const mapped: CaseItem[] = raw.map((r: any) => ({
          id: r.request_id ?? r.id,
          citizen: r.person_name ?? r.citizen ?? "Unknown",
          county: r.county ?? r.location_county ?? "",
          taxonomy: Array.isArray(r.taxonomy) ? r.taxonomy : (r.taxonomy ? [r.taxonomy] : []),
          urgency: r.urgency ?? "medium",
          umbrella: r.umbrella_id ?? null,
          opened: r.created_at ?? r.opened ?? "",
        }));
        setCaseList(mapped);
        if (mapped.length > 0) setActive(mapped[0].id);
      } catch {
        // API failed — show empty state
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.efCall("match-engine", { mode: "propose", request_id: activeId }) as any;
        const raw: unknown[] = res?.candidates ?? [];
        if (!cancelled) {
          setCandidates(raw.map((c: any, i: number) => ({
            id: c.org_id ?? c.id ?? String(i),
            name: c.org_name ?? c.name ?? "Unknown Org",
            score: c.score ?? 0,
            counties: Array.isArray(c.counties) ? c.counties.join(", ") : (c.service_area ?? ""),
            open: c.open_count ?? c.open ?? 0,
            color: CANDIDATE_COLORS[i % CANDIDATE_COLORS.length],
          })));
        }
      } catch {
        if (!cancelled) setCandidates([]);
      }
    })();
    return () => { cancelled = true; };
  }, [activeId]);

  async function handleAccept(candidateId: string) {
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    try {
      await api.crmCaseAction("approve_match", { match_id: candidateId, request_id: activeId });
      toast.success("Match approved");
    } catch {
      toast.error("Failed to approve match");
    }
  }

  async function handleReject(candidateId: string) {
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    try {
      await api.crmCaseAction("reject_match", { match_id: candidateId });
      toast.success("Candidate rejected");
    } catch {
      toast.error("Failed to reject candidate");
    }
  }

  if (loading) {
    return (
      <CrmShell module="Match">
        <PageHeader title="Match" subtitle="Ranked orgs for each open request." />
        <div className="px-6 pt-6 space-y-4 animate-pulse">
          <div className="h-64 rounded-2xl bg-white/5" />
        </div>
      </CrmShell>
    );
  }

  if (!activeCase) {
    return (
      <CrmShell module="Match">
        <PageHeader title="Match" subtitle="Ranked orgs for each open request." />
        <div className="px-6 pt-10 text-center text-white/50">
          <p className="text-[15px] font-medium">No open requests</p>
          <p className="text-[12px] text-white/40 mt-1">Requests will appear here when they need matching.</p>
        </div>
      </CrmShell>
    );
  }

  return (
    <CrmShell module="Match">
      <PageHeader title="Match" subtitle="Ranked orgs for each open request." />

      <div className="px-6 pt-6 pb-6 grid lg:grid-cols-[320px_1fr] gap-4">
        <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 px-2 py-1.5">Open requests · {caseList.length}</p>
          <div className="space-y-1">
            {caseList.map((c) => {
              const a = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`w-full text-left rounded-xl p-3 transition ${a ? "bg-[#89CFF0]/10 ring-1 ring-[#89CFF0]/40" : "hover:bg-white/5"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-white/45">{c.id}</span>
                    {c.urgency === "critical" && <span className="font-mono text-[9px] uppercase tracking-wider text-[#EF4E4B]">urgent</span>}
                  </div>
                  <p className="text-[13px] font-medium">{c.citizen}</p>
                  <p className="font-mono text-[10px] text-white/50 mt-1">{c.county} · {c.taxonomy[0]}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] text-white/45">{activeCase.id}</span>
                {activeCase.umbrella && (
                  <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F5EBD6]/15 text-[#F5EBD6]">
                    umbrella · {activeCase.umbrella}
                  </span>
                )}
              </div>
              <h2 className="text-[20px] font-semibold">{activeCase.citizen}</h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/50 mt-1">
                {activeCase.county} · {activeCase.taxonomy.join(" · ")}{activeCase.opened ? ` · opened ${activeCase.opened}` : ""}
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
              <p className="text-[11px] mt-1">Click "AI Score" to find matching organizations.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map(({ id, name, score, counties, open, color }) => (
                <div key={id} className="rounded-xl bg-white/5 hover:bg-white/8 p-4 flex items-center gap-4 transition">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-[12px]" style={{ background: `${color}26`, color }}>
                    {name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[14px]">{name}</p>
                    <p className="font-mono text-[10px] text-white/50 mt-0.5">
                      covers {counties} · {open} open
                    </p>
                  </div>
                  <div className="text-right mr-2">
                    <p className="font-mono text-[20px] font-semibold tabular-nums" style={{ color }}>{score}</p>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">score</p>
                  </div>
                  <button
                    onClick={() => handleReject(id)}
                    className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/55 transition"
                  >
                    <X size={15} />
                  </button>
                  <button
                    onClick={() => handleAccept(id)}
                    className="w-9 h-9 rounded-full bg-[#34D399] hover:bg-[#22b97f] flex items-center justify-center text-[#0F1E2B] transition"
                  >
                    <Check size={15} />
                  </button>
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
