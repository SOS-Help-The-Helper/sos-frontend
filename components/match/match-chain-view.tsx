"use client";

import { useState } from "react";
import { Users, MapPin, Truck, UserCheck, ChevronRight, ChevronDown, Sparkles, Clock, Award, Search, AlertCircle } from "lucide-react";
import { PipelineStepper } from "./pipeline-stepper";
import type { ReactNode } from "react";

export type MatchChainData = {
  id: string;
  title: string;
  blurb: string;
  score: number;
  pipelineStatus: string;
  survivor: { name: string; urgency: string; householdSize: number; county: string; state: string };
  rv: { year: number; make: string; model: string; status: string; condition: string; vinLast5: string; sleeps: number };
  driver?: { name: string; status: string; hasClassA: boolean; towVehicle: string; towCapacityLbs: number; availabilityHours: string } | null;
  breakdown: { category: number; distance: number; urgency: number; capacity: number; trust: number };
  transportScore?: number;
  rationale?: string;
  timeline?: { event: string; ts: string; actor?: string }[];
};

const URGENCY_PILL: Record<string, string> = { critical: "bg-[#EF4E4B]/15 text-[#EF4E4B]", high: "bg-[#F5A524]/15 text-[#F5A524]", medium: "bg-[#89CFF0]/15 text-[#89CFF0]", low: "bg-white/8 text-white/55" };
const RV_STATUS_PILL: Record<string, string> = { available: "bg-white/8 text-white/65", matched: "bg-[#89CFF0]/15 text-[#89CFF0]", deployed: "bg-[#34D399]/15 text-[#34D399]", in_transit: "bg-[#F5A524]/15 text-[#F5A524]" };
const DRIVER_STATUS_PILL: Record<string, string> = { available: "bg-white/8 text-white/65", assigned: "bg-[#89CFF0]/15 text-[#89CFF0]", in_transit: "bg-[#F5A524]/15 text-[#F5A524]", delivered: "bg-[#34D399]/15 text-[#34D399]" };

export function MatchChainView({ match }: { match: MatchChainData }) {
  const [showScore, setShowScore] = useState(false);
  const { survivor, rv, driver } = match;

  return (
    <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={13} className="text-[#89CFF0]" />
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/55">Three-way match · {match.id}</p>
          </div>
          <p className="text-[13px] text-white/75">{match.title} <span className="text-white/45">— {match.blurb}</span></p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-[22px] font-semibold tabular-nums text-[#34D399]">{match.score}</p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">match score</p>
        </div>
      </div>

      <PipelineStepper current={match.pipelineStatus} />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-3 md:gap-2 items-stretch">
        <ChainCard icon={<Users size={13} className="text-[#89CFF0]" />} eyebrow="Survivor" title={survivor.name}
          pills={[<span key="u" className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${URGENCY_PILL[survivor.urgency] ?? ""}`}>{survivor.urgency}</span>]}
          rows={[{ label: "Household", value: `${survivor.householdSize} people` }, { label: "Location", value: `${survivor.county}, ${survivor.state}`, icon: <MapPin size={10} /> }]}
        />
        <Arrow />
        <ChainCard icon={<Truck size={13} className="text-[#89CFF0]" />} eyebrow="RV" title={`${rv.year} ${rv.make} ${rv.model}`}
          pills={[
            <span key="s" className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${RV_STATUS_PILL[rv.status] ?? "bg-white/8 text-white/65"}`}>{(rv.status ?? "").replace(/_/g, " ")}</span>,
            <span key="c" className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/8 text-white/65">{rv.condition}</span>,
          ]}
          rows={[{ label: "VIN", value: <span className="font-mono">····{rv.vinLast5}</span> }, { label: "Sleeps", value: `${rv.sleeps}` }]}
        />
        <Arrow />
        {driver ? (
          <ChainCard icon={<UserCheck size={13} className="text-[#89CFF0]" />} eyebrow="Driver" title={driver.name}
            pills={[
              <span key="s" className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${DRIVER_STATUS_PILL[driver.status] ?? "bg-white/8 text-white/65"}`}>{(driver.status ?? "").replace(/_/g, " ")}</span>,
              driver.hasClassA ? <span key="cdl" className="inline-flex items-center gap-0.5 font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#34D399]/12 text-[#34D399]"><Award size={9} /> Class A</span> : null,
            ]}
            rows={[{ label: "Tow", value: driver.towVehicle }, { label: "Capacity", value: `${(driver.towCapacityLbs ?? 0).toLocaleString()} lbs` }, { label: "Hours", value: driver.availabilityHours, icon: <Clock size={10} /> }]}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-[#F5A524]/40 bg-[#F5A524]/[0.04] p-3.5 flex flex-col gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5"><UserCheck size={13} className="text-[#F5A524]" /><span className="font-mono text-[9px] uppercase tracking-wider text-[#F5A524]">Driver</span></div>
            <div className="flex items-center gap-1.5"><AlertCircle size={12} className="text-[#F5A524]" /><p className="text-[12.5px] font-medium text-white/85">Awaiting Driver</p></div>
            <p className="text-[11px] text-white/55 leading-snug">RV accepted. Dispatch is sourcing a qualified driver.</p>
            <button className="mt-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-[#89CFF0]/15 text-[#89CFF0] text-[11px] font-medium hover:bg-[#89CFF0]/25 transition"><Search size={11} /> Find Driver</button>
          </div>
        )}
      </div>

      {/* Score breakdown toggle */}
      <div className="rounded-xl bg-white/[0.02] border border-[var(--hairline)] overflow-hidden">
        <button onClick={() => setShowScore(!showScore)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/65">Score breakdown</span>
          <span className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-white/55">match {match.score}{match.transportScore != null ? ` · transport ${match.transportScore}` : ""}</span>
            {showScore ? <ChevronDown size={13} className="text-white/45" /> : <ChevronRight size={13} className="text-white/45" />}
          </span>
        </button>
        {showScore && (
          <div className="px-4 pb-4 pt-1 space-y-3">
            <p className="font-mono text-[9px] uppercase tracking-wider text-white/45 mb-2">Match score (survivor ↔ RV)</p>
            <div className="grid grid-cols-5 gap-2">
              {[{ l: "Category", v: match.breakdown.category, m: 30 }, { l: "Distance", v: match.breakdown.distance, m: 25 }, { l: "Urgency", v: match.breakdown.urgency, m: 20 }, { l: "Capacity", v: match.breakdown.capacity, m: 15 }, { l: "Trust", v: match.breakdown.trust, m: 10 }].map(b => (
                <div key={b.l}>
                  <div className="h-1 rounded-full bg-white/8 overflow-hidden"><div className="h-full bg-[#89CFF0]" style={{ width: `${Math.min(100, (b.v / b.m) * 100)}%` }} /></div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-white/40 mt-1">{b.l} {Math.round(b.v)}</p>
                </div>
              ))}
            </div>
            {match.rationale && <p className="text-[11.5px] text-white/55 italic mt-2">{match.rationale}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

function ChainCard({ icon, eyebrow, title, pills, rows }: { icon: ReactNode; eyebrow: string; title: string; pills?: (ReactNode | null)[]; rows: { label: string; value: ReactNode; icon?: ReactNode }[] }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-[var(--hairline)] p-3.5 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-1.5">{icon}<span className="font-mono text-[9px] uppercase tracking-wider text-white/55">{eyebrow}</span></div>
      <p className="text-[13.5px] font-medium leading-tight truncate" title={title}>{title}</p>
      {pills && pills.some(Boolean) && <div className="flex flex-wrap gap-1">{pills.filter(Boolean)}</div>}
      <dl className="space-y-1 mt-0.5">
        {rows.map(r => (
          <div key={r.label} className="flex items-baseline gap-2 text-[11.5px]">
            <dt className="font-mono text-[9px] uppercase tracking-wider text-white/40 shrink-0 w-14">{r.label}</dt>
            <dd className="text-white/80 truncate flex items-center gap-1 min-w-0">{r.icon && <span className="text-white/45 shrink-0">{r.icon}</span>}<span className="truncate">{r.value}</span></dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Arrow() {
  return <div className="hidden md:flex items-center justify-center text-white/30"><ChevronRight size={16} /></div>;
}
