import { useState, type ReactNode } from "react";
import { ChevronRight, ChevronDown, Sparkles } from "lucide-react";
import type { MatchCandidate, MatchTimelineEvent } from "@/lib/prototype-data";

// -------- Shared palette --------

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

// -------- Shell --------

export function MatchCardShell({
  kindLabel,
  match,
  children,
}: {
  kindLabel: string;
  match: MatchCandidate;
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

// -------- Chain card (tile in the chain) --------

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
      <p
        className="text-[13.5px] font-medium leading-tight truncate"
        title={title}
      >
        {title}
      </p>
      {pills && pills.some(Boolean) && (
        <div className="flex flex-wrap gap-1">{pills.filter(Boolean)}</div>
      )}
      <dl className="space-y-1 mt-0.5">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline gap-2 text-[11.5px]"
          >
            <dt className="font-mono text-[9px] uppercase tracking-wider text-white/40 shrink-0 w-14">
              {r.label}
            </dt>
            <dd className="text-white/80 truncate flex items-center gap-1 min-w-0">
              {r.icon && (
                <span className="text-white/45 shrink-0">{r.icon}</span>
              )}
              <span className="truncate">{r.value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ChainArrow() {
  return (
    <div className="hidden md:flex items-center justify-center text-white/30">
      <ChevronRight size={16} />
    </div>
  );
}

// -------- Score breakdown panel --------

export function ScoreBreakdownPanel({
  match,
  extra,
}: {
  match: MatchCandidate;
  /** Optional extra section (e.g. transport score for 3-way). */
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
            {match.transportScore != null
              ? ` · transport ${match.transportScore}`
              : ""}
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
            <p className="text-[11.5px] text-white/55 italic mt-3">
              {match.rationale}
            </p>
          </div>
          {extra}
        </div>
      )}
    </div>
  );
}

// -------- Activity timeline --------

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
                    background: last
                      ? "rgba(52,211,153,0.18)"
                      : "rgba(137,207,240,0.18)",
                  }}
                >
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ background: color }}
                  />
                </span>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12.5px] text-white/85">{t.event}</p>
                  <span className="font-mono text-[10px] text-white/40 shrink-0">
                    {t.ts}
                  </span>
                </div>
                {t.actor && (
                  <p className="font-mono text-[10px] text-white/45 mt-0.5">
                    {t.actor}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// -------- Bar (used in score breakdown) --------

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
        <div
          className="h-full bg-[#89CFF0]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-mono text-[9px] uppercase tracking-wider text-white/40 mt-1 truncate">
        {label} {suffix ?? Math.round(v)}
      </p>
    </div>
  );
}
