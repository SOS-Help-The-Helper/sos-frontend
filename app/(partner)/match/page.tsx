'use client';

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { cases, orgs, bucketOf } from "@/lib/prototype-data";
import { Check, X, ArrowRight, Sparkles } from "lucide-react";

export default function MatchPage() {
  const openCases = cases.filter((c) => bucketOf(c.status) === "needs_attention");
  const [activeId, setActive] = useState(openCases[0].id);
  const active = openCases.find((c) => c.id === activeId)!;

  // Candidate orgs scored by service overlap + county overlap
  const candidates = orgs
    .map((o) => {
      const serviceMatch = active.taxonomy.some((t) => o.services.includes(t)) ? 60 : 0;
      const countyMatch = o.counties.includes(active.county) ? 30 : 0;
      const load = Math.max(0, 10 - o.open);
      return { org: o, score: serviceMatch + countyMatch + load };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return (
    <CrmShell module="Match">
      <PageHeader title="Match" subtitle="Request ↔ candidate orgs" />

      <div className="px-6 pt-6 pb-6 grid lg:grid-cols-[320px_1fr] gap-4">
        <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 px-2 py-1.5">Open requests · {openCases.length}</p>
          <div className="space-y-1">
            {openCases.map((c) => {
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
                <span className="font-mono text-[10px] text-white/45">{active.id}</span>
                {active.umbrella && (
                  <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F5EBD6]/15 text-[#F5EBD6]">
                    umbrella · {active.umbrella}
                  </span>
                )}
              </div>
              <h2 className="text-[20px] font-semibold">{active.citizen}</h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/50 mt-1">
                {active.county} · {active.taxonomy.join(" · ")} · opened {active.opened}
              </p>
            </div>
            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#89CFF0]/15 text-[#89CFF0] text-[11px] font-mono uppercase tracking-wider">
              <Sparkles size={11} /> ai score
            </button>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Candidate orgs</p>
          <div className="space-y-2">
            {candidates.map(({ org, score }) => (
              <div key={org.id} className="rounded-xl bg-white/5 hover:bg-white/8 p-4 flex items-center gap-4 transition">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-[12px]" style={{ background: `${org.color}26`, color: org.color }}>
                  {org.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[14px]">{org.name}</p>
                  <p className="font-mono text-[10px] text-white/50 mt-0.5">
                    covers {org.counties.join(", ")} · {org.open} open
                  </p>
                </div>
                <div className="text-right mr-2">
                  <p className="font-mono text-[20px] font-semibold tabular-nums" style={{ color: org.color }}>{score}</p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">score</p>
                </div>
                <button className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/55 transition">
                  <X size={15} />
                </button>
                <button className="w-9 h-9 rounded-full bg-[#34D399] hover:bg-[#22b97f] flex items-center justify-center text-[#0F1E2B] transition">
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
