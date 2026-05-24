'use client';


import { useState, useEffect } from "react";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { bucketOf } from "@/lib/display-constants";
import { cases, orgs } from "@/lib/prototype-data";
import { Check, X, ArrowRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { toast } from "sonner";

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

function protoCases(): CaseItem[] {
  return cases
    .filter((c) => bucketOf(c.status) === "needs_attention")
    .map((c) => ({
      id: c.id,
      citizen: c.citizen,
      county: c.county,
      taxonomy: c.taxonomy as string[],
      urgency: c.urgency,
      umbrella: c.umbrella,
      opened: c.opened,
    }));
}

export default function MatchPage() {
  const { orgId } = useAuthContext();
  const fallback = protoCases();

  const [caseList, setCaseList] = useState<CaseItem[]>(fallback);
  const [activeId, setActive] = useState<string>(fallback[0]?.id ?? "");
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const activeCase = caseList.find((c) => c.id === activeId) ?? caseList[0];

  // 1. On mount: fetch open cases from EF; fallback to prototype list
  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await api.crmCasesList(orgId, { status: "active" }) as any;
        const raw: unknown[] = res?.data ?? res?.cases ?? [];
        if (raw.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          setActive(mapped[0]?.id ?? "");
        }
      } catch {
        // keep prototype fallback already in state
      }
    })();
  }, [orgId]);

  // 2. When active case changes: fetch candidates from EF; fallback to local scoring
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;

    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await api.efCall("match-engine", { mode: "propose", request_id: activeId }) as any;
        const raw: unknown[] = res?.candidates ?? [];
        if (!cancelled && raw.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setCandidates(raw.map((c: any, i: number) => ({
            id: c.org_id ?? c.id ?? String(i),
            name: c.org_name ?? c.name ?? "Unknown Org",
            score: c.score ?? 0,
            counties: Array.isArray(c.counties) ? c.counties.join(", ") : (c.service_area ?? ""),
            open: c.open_count ?? c.open ?? 0,
            color: CANDIDATE_COLORS[i % CANDIDATE_COLORS.length],
          })));
          return;
        }
      } catch {
        // fall through to local scoring
      }

      if (cancelled) return;

      // Local fallback: score prototype orgs against the active case
      const protoActive = cases.find((c) => c.id === activeId);
      if (protoActive) {
        const scored = orgs
          .map((o, i) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const serviceMatch = protoActive.taxonomy.some((t) => o.services.includes(t as any)) ? 60 : 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const countyMatch = o.counties.includes(protoActive.county as any) ? 30 : 0;
            const load = Math.max(0, 10 - o.open);
            return {
              id: o.id,
              name: o.name,
              score: serviceMatch + countyMatch + load,
              counties: o.counties.join(", "),
              open: o.open,
              color: o.color ?? CANDIDATE_COLORS[i % CANDIDATE_COLORS.length],
            };
          })
          .filter((c) => c.score > 0)
          .sort((a, b) => b.score - a.score);
        setCandidates(scored);
      } else {
        setCandidates([]);
      }
    })();

    return () => { cancelled = true; };
  }, [activeId]);

  // 3. Accept candidate
  async function handleAccept(candidateId: string) {
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    try {
      await api.crmCaseAction("approve_match", { match_id: candidateId, request_id: activeId });
      toast.success("Match approved");
    } catch {
      toast.error("Failed to approve match");
    }
  }

  // 4. Reject candidate
  async function handleReject(candidateId: string) {
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    try {
      await api.crmCaseAction("reject_match", { match_id: candidateId });
      toast.success("Candidate rejected");
    } catch {
      toast.error("Failed to reject candidate");
    }
  }

  if (!activeCase) return null;

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

          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Candidate orgs</p>
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

          <button className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-white/55 hover:text-white transition">
            More options <ArrowRight size={12} />
          </button>
        </section>
      </div>
    </CrmShell>
  );
}
