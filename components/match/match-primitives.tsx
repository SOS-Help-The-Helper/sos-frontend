'use client';

import type { ReactNode } from "react";

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
}: {
  breakdown: ScoreBreakdown;
  color: string;
}) {
  const dims = [
    { label: "Service",  value: breakdown.service,  max: 50 },
    { label: "County",   value: breakdown.county,   max: 25 },
    { label: "Capacity", value: breakdown.capacity, max: 15 },
    { label: "Speed",    value: breakdown.speed,    max: 10 },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
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
