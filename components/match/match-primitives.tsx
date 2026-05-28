'use client';

import { useState, type ReactNode } from "react";
import { ChevronRight, ChevronDown, Sparkles } from "lucide-react";

// ─── Urgency palette ───────────────────────────────────────────────────────

export const URGENCY_META: Record<string, { dot: string; pill: string; label: string }> = {
  critical: { dot: "#EF4E4B", pill: "bg-[#EF4E4B]/15 text-[#EF4E4B]", label: "Urgent" },
  high:     { dot: "#F5A524", pill: "bg-[#F5A524]/15 text-[#F5A524]", label: "High" },
  medium:   { dot: "#89CFF0", pill: "bg-[#89CFF0]/15 text-[#89CFF0]", label: "Medium" },
  low:      { dot: "#9CA3AF", pill: "bg-white/10 text-white/55",       label: "Low" },
};

// ─── SLA ───────────────────────────────────────────────────────────────────

/** Hours left before SLA breach, based on urgency and ISO created_at timestamp. */
export function slaHoursLeft(createdAt: string, urgency: string): number {
  const target =
    urgency === "critical" ? 24 :
    urgency === "high"     ? 48 :
    urgency === "medium"   ? 96 : 168;
  const hoursOpen = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return Math.max(0, Math.round(target - hoursOpen));
}

// ─── Household summary ─────────────────────────────────────────────────────

export interface HouseholdFields {
  household_size?: number;
  has_children?: boolean;
  has_elderly?: boolean;
  has_disabled?: boolean;
  has_pets?: boolean;
}

/** Returns a short "2 people · kids · pets" summary string. */
export function householdSummary(req: HouseholdFields): string {
  const parts: string[] = [];
  if (req.household_size) parts.push(`${req.household_size} ${req.household_size === 1 ? "person" : "people"}`);
  if (req.has_children)   parts.push("kids");
  if (req.has_elderly)    parts.push("elderly");
  if (req.has_disabled)   parts.push("disabled");
  if (req.has_pets)       parts.push("pets");
  return parts.join(" · ");
}

// ─── Client-side score breakdown ───────────────────────────────────────────

export interface ScoreBreakdown {
  service: number;
  county: number;
  capacity: number;
  speed: number;
}

/**
 * Derives a score breakdown client-side when the API doesn't return one.
 * Uses county/capacity/speed from available data; derives `service` as remainder.
 */
export function computeBreakdown(
  activeCase: { county: string; urgency: string; opened: string },
  candidate: { counties: string; open: number; score: number },
): ScoreBreakdown {
  const countyMatch = candidate.counties
    .toLowerCase()
    .split(/[,\s]+/)
    .some((p) => p && activeCase.county.toLowerCase().includes(p));
  const county    = countyMatch ? 25 : 0;
  const capacity  = Math.max(0, Math.min(15, 15 - candidate.open));
  const sla       = slaHoursLeft(activeCase.opened, activeCase.urgency);
  const speed     = sla > 48 ? 10 : sla > 0 ? 6 : 4;
  const service   = Math.max(0, candidate.score - county - capacity - speed);
  return { service, county, capacity, speed };
}

// ─── ScoreBar ──────────────────────────────────────────────────────────────

/** 4-dimension horizontal bar breakdown for a candidate org. */
export function ScoreBar({
  breakdown,
  color,
  score,
}: {
  breakdown: ScoreBreakdown;
  color: string;
  score?: number;
}) {
  const dims = [
    { label: "Service",  value: breakdown.service,  max: 50 },
    { label: "County",   value: breakdown.county,   max: 25 },
    { label: "Capacity", value: breakdown.capacity, max: 15 },
    { label: "Speed",    value: breakdown.speed,    max: 10 },
  ];
  return (
    <div
      className="grid grid-cols-4 gap-2"
      aria-label={score != null ? `Score: ${score} out of 100` : undefined}
    >
      {dims.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[9px] text-white/40">{d.label}</span>
            <span className="font-mono text-[9px] tabular-nums text-white/55">
              {d.value}/{d.max}
            </span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (d.value / d.max) * 100)}%`, background: color }}
              role="meter"
              aria-valuenow={d.value}
              aria-valuemin={0}
              aria-valuemax={d.max}
              aria-label={`${d.label}: ${d.value} out of ${d.max}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FitChip ───────────────────────────────────────────────────────────────

/** ✓/○ indicator chip for a single scoring dimension. */
export function FitChip({
  ok,
  label,
  hint,
}: {
  ok: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <span
      title={hint}
      className={`inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10.5px] font-mono ${
        ok ? "bg-[#34D399]/12 text-[#34D399]" : "bg-white/8 text-white/45"
      }`}
    >
      {ok ? "✓" : "○"} {label}
    </span>
  );
}

// ─── FactChip ──────────────────────────────────────────────────────────────

/** Small info tag used in the active case header. */
export function FactChip({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-white/[0.05] text-white/70 text-[11px]">
      {icon}
      {label}
    </span>
  );
}

// ─── Status pill color maps ────────────────────────────────────────────────

export const URGENCY_PILL: Record<string, string> = {
  critical: "bg-[#EF4E4B]/15 text-[#EF4E4B]",
  high: "bg-[#F5A524]/15 text-[#F5A524]",
  medium: "bg-[#89CFF0]/15 text-[#89CFF0]",
  low: "bg-white/8 text-white/55",
};

export const RV_STATUS_PILL: Record<string, string> = {
  available: "bg-white/8 text-white/65",
  matched: "bg-[#89CFF0]/15 text-[#89CFF0]",
  deployed: "bg-[#34D399]/15 text-[#34D399]",
  in_transit: "bg-[#F5A524]/15 text-[#F5A524]",
  returned: "bg-white/8 text-white/65",
};

export const DRIVER_STATUS_PILL: Record<string, string> = {
  available: "bg-white/8 text-white/65",
  assigned: "bg-[#89CFF0]/15 text-[#89CFF0]",
  in_transit: "bg-[#F5A524]/15 text-[#F5A524]",
  delivered: "bg-[#34D399]/15 text-[#34D399]",
  off_duty: "bg-white/8 text-white/45",
};

export const RESOURCE_STATUS_PILL: Record<string, string> = {
  available: "bg-[#34D399]/15 text-[#34D399]",
  reserved: "bg-[#89CFF0]/15 text-[#89CFF0]",
  fulfilled: "bg-[#34D399]/15 text-[#34D399]",
  unavailable: "bg-white/8 text-white/55",
};

// ─── MatchEntry (shared shape for card components) ─────────────────────────

export interface MatchEntry {
  id: string;
  title: string;
  blurb: string;
  score: number;
  approved?: boolean;
  transportScore?: number;
  breakdown: {
    category: number;
    distance: number;
    urgency: number;
    capacity: number;
    trust: number;
  };
  rationale: string;
}

// ─── MatchCardShell ────────────────────────────────────────────────────────

export function MatchCardShell({
  kindLabel,
  match,
  children,
}: {
  kindLabel: string;
  match: MatchEntry;
  children: ReactNode;
}) {
  const accentColor = match.approved ? "#34D399" : "#89CFF0";
  return (
    <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={13} className="text-[#89CFF0]" />
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/55">
              {kindLabel} · {match.id}
            </p>
          </div>
          <p className="text-[13px] text-white/75 truncate">
            {match.title}{" "}
            <span className="text-white/45">— {match.blurb}</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p
            className="font-mono text-[22px] font-semibold tabular-nums"
            style={{ color: accentColor }}
          >
            {match.score}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">
            match score
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

// ─── ChainCard ─────────────────────────────────────────────────────────────

export function ChainCard({
  icon,
  eyebrow,
  title,
  pills,
  rows,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  pills?: (ReactNode | null)[];
  rows: { label: string; value: ReactNode; icon?: ReactNode }[];
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-app)] border border-[var(--hairline)] p-3.5 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/55">
          {eyebrow}
        </span>
      </div>
      <p className="text-[13.5px] font-medium leading-tight truncate" title={title}>
        {title}
      </p>
      {pills && pills.some(Boolean) && (
        <div className="flex flex-wrap gap-1">{pills.filter(Boolean)}</div>
      )}
      <dl className="space-y-1 mt-0.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline gap-2 text-[11.5px]">
            <dt className="font-mono text-[9px] uppercase tracking-wider text-white/40 shrink-0 w-14">
              {r.label}
            </dt>
            <dd className="text-white/80 truncate flex items-center gap-1 min-w-0">
              {r.icon && <span className="text-white/45 shrink-0">{r.icon}</span>}
              <span className="truncate">{r.value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ─── ChainArrow ────────────────────────────────────────────────────────────

export function ChainArrow() {
  return (
    <div className="hidden md:flex items-center justify-center text-white/30">
      <ChevronRight size={16} />
    </div>
  );
}

// ─── ScoreBreakdownPanel ───────────────────────────────────────────────────

export function ScoreBreakdownPanel({
  match,
  extra,
}: {
  match: MatchEntry;
  extra?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-[var(--surface-app)] border border-[var(--hairline)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition"
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/65">
          Score breakdown
        </span>
        <span className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-white/55">
            match {match.score}
            {match.transportScore != null ? ` · transport ${match.transportScore}` : ""}
          </span>
          {open ? (
            <ChevronDown size={13} className="text-white/45" />
          ) : (
            <ChevronRight size={13} className="text-white/45" />
          )}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-white/45 mb-2">
              Match score
            </p>
            <div className="grid grid-cols-5 gap-2">
              <Bar label="Category" v={match.breakdown.category} max={30} />
              <Bar label="Distance" v={match.breakdown.distance} max={25} />
              <Bar label="Urgency" v={match.breakdown.urgency} max={20} />
              <Bar label="Capacity" v={match.breakdown.capacity} max={15} />
              <Bar label="Trust" v={match.breakdown.trust} max={10} />
            </div>
            <p className="text-[11.5px] text-white/55 italic mt-3">{match.rationale}</p>
          </div>
          {extra}
        </div>
      )}
    </div>
  );
}

// ─── TimelinePanel ─────────────────────────────────────────────────────────

export interface MatchTimelineEvent {
  event: string;
  ts: string;
  actor?: string;
}

export function TimelinePanel({ events }: { events: MatchTimelineEvent[] }) {
  const [open, setOpen] = useState(true);
  if (!events || events.length === 0) return null;
  return (
    <div className="rounded-xl bg-[var(--surface-app)] border border-[var(--hairline)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition"
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/65">
          Activity timeline · {events.length}
        </span>
        {open ? (
          <ChevronDown size={13} className="text-white/45" />
        ) : (
          <ChevronRight size={13} className="text-white/45" />
        )}
      </button>
      {open && (
        <ol className="px-4 pb-4 pt-1 relative ml-2 space-y-3 border-l border-[var(--hairline)] pl-5">
          {events.map((t, i) => {
            const last = i === events.length - 1;
            const color = last ? "#34D399" : "#89CFF0";
            return (
              <li key={i} className="relative">
                <span
                  className="absolute -left-[26px] top-1 w-3 h-3 rounded-full ring-4 ring-[var(--surface-app)] flex items-center justify-center"
                  style={{
                    background: last ? "rgba(52,211,153,0.18)" : "rgba(137,207,240,0.18)",
                  }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ background: color }} />
                </span>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12.5px] text-white/85">{t.event}</p>
                  <span className="font-mono text-[10px] text-white/40 shrink-0">{t.ts}</span>
                </div>
                {t.actor && (
                  <p className="font-mono text-[10px] text-white/45 mt-0.5">{t.actor}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ─── Bar ───────────────────────────────────────────────────────────────────

export function Bar({
  label,
  v,
  max,
  suffix,
}: {
  label: string;
  v: number;
  max: number;
  suffix?: string;
}) {
  const pct = Math.min(100, Math.max(0, (v / max) * 100));
  return (
    <div>
      <div className="h-1 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full bg-[#89CFF0]" style={{ width: `${pct}%` }} />
      </div>
      <p className="font-mono text-[9px] uppercase tracking-wider text-white/40 mt-1 truncate">
        {label} {suffix ?? Math.round(v)}
      </p>
    </div>
  );
}
