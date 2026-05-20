import type { ReactNode } from "react";
import { Check, Circle } from "lucide-react";

export type ScoreTier = {
  label: string;
  color: string; // hex
  min: number;
};

export type Factor = {
  key: string;
  label: string;
  earned: number;
  max: number;
  items?: { label: string; done: boolean }[];
};

const DEFAULT_TIERS: ScoreTier[] = [
  { label: "Champion", color: "#34D399", min: 80 },
  { label: "Resilient", color: "#89CFF0", min: 60 },
  { label: "Prepared", color: "#F5EBD6", min: 30 },
  { label: "Basic", color: "#94a3b8", min: 0 },
];

export function tierFor(score: number, tiers = DEFAULT_TIERS): ScoreTier {
  return tiers.find((t) => score >= t.min) ?? tiers[tiers.length - 1];
}

export function ScoreRing({
  score,
  max = 100,
  suffix = "",
  tierLabel,
  color,
  size = 132,
  caption,
}: {
  score: number;
  max?: number;
  suffix?: string;
  tierLabel?: string;
  color: string;
  size?: number;
  caption?: ReactNode;
}) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / max));
  const dash = c * pct;

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            style={{ transition: "stroke-dasharray 600ms ease, stroke 300ms" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-semibold tabular-nums leading-none" style={{ color }}>
            {Math.round(score)}
            {suffix && <span className="text-[14px] font-medium text-white/55 ml-0.5">{suffix}</span>}
          </span>
          {tierLabel && (
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] mt-1.5" style={{ color }}>
              {tierLabel}
            </span>
          )}
        </div>
      </div>
      {caption && <div className="text-[11.5px] text-white/45 text-center">{caption}</div>}
    </div>
  );
}

export function FactorBar({ factor, accent }: { factor: Factor; accent: string }) {
  const pct = Math.max(0, Math.min(1, factor.earned / factor.max));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12.5px] font-medium text-white/85">{factor.label}</span>
        <span className="font-mono text-[10.5px] tabular-nums text-white/55">
          {factor.earned}
          <span className="text-white/30">/{factor.max}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct * 100}%`, background: accent }}
        />
      </div>
      {factor.items && factor.items.length > 0 && (
        <ul className="mt-2 space-y-1">
          {factor.items.map((it) => (
            <li key={it.label} className="flex items-center gap-2 text-[12px]">
              {it.done ? (
                <Check size={11.5} className="shrink-0" style={{ color: accent }} />
              ) : (
                <Circle size={11.5} className="text-white/25 shrink-0" />
              )}
              <span className={it.done ? "text-white/75" : "text-white/40"}>{it.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ScoreCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint && <p className="text-[12px] text-white/55 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
