/**
 * ScoreBreakdown composite — "how the agent scored this".
 * Big 0–100 score + factor rows parsed from `match_reasoning`.
 * `match_reasoning` may be free text or JSON (an object of numeric factors,
 * or `{ factors: [...] }`, or `{ summary/text }`) — rendered gracefully either way.
 * Composed from primitives. Redesign 2026-06 (SOS Connect System).
 */
"use client";

import { SectionLabel } from "./primitives";

export interface ScoreFactor {
  label: string;
  /** 0–100 (rendered as a meter) when numeric; otherwise text only */
  value?: number;
  note?: string;
}

export interface ScoreBreakdownProps {
  /** overall match score, 0–100 */
  score?: number;
  /** raw reasoning — text or JSON (string or already-parsed object) */
  reasoning?: string | Record<string, unknown> | null;
  compact?: boolean;
}

/* Known numeric factor keys the match-engine emits. */
const FACTOR_LABELS: Record<string, string> = {
  category: "Category",
  taxonomy: "Category",
  distance: "Distance",
  proximity: "Distance",
  urgency: "Urgency",
  capacity: "Capacity",
  trust: "Trust",
  availability: "Availability",
};

function toFactors(reasoning: ScoreBreakdownProps["reasoning"]): {
  factors: ScoreFactor[];
  text?: string;
} {
  if (reasoning == null) return { factors: [] };

  let obj: Record<string, unknown> | null = null;
  let text: string | undefined;

  if (typeof reasoning === "string") {
    const trimmed = reasoning.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (parsed && typeof parsed === "object") obj = parsed as Record<string, unknown>;
      } catch {
        text = trimmed;
      }
    } else {
      text = trimmed;
    }
  } else if (typeof reasoning === "object") {
    obj = reasoning as Record<string, unknown>;
  }

  if (!obj) return { factors: [], text };

  // `{ factors: [{label,value,note}] }`
  const rawFactors = obj.factors;
  if (Array.isArray(rawFactors)) {
    const factors: ScoreFactor[] = rawFactors
      .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
      .map((f) => ({
        label: String(f.label ?? f.name ?? f.key ?? "Factor"),
        value: typeof f.value === "number" ? f.value : typeof f.score === "number" ? f.score : undefined,
        note: f.note != null ? String(f.note) : f.reason != null ? String(f.reason) : undefined,
      }));
    const summary = obj.summary ?? obj.text ?? obj.rationale;
    return { factors, text: summary != null ? String(summary) : undefined };
  }

  // Flat object of numeric factors, e.g. {category:0.8, distance:0.4, ...}
  const factors: ScoreFactor[] = [];
  let summary: string | undefined;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "number") {
      factors.push({ label: FACTOR_LABELS[k] ?? prettify(k), value: v <= 1 ? v * 100 : v });
    } else if (typeof v === "string" && (k === "summary" || k === "text" || k === "rationale" || k === "reason")) {
      summary = v;
    }
  }
  return { factors, text: summary };
}

function prettify(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ScoreBreakdown({ score, reasoning, compact }: ScoreBreakdownProps) {
  const { factors, text } = toFactors(reasoning);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 8 : 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: compact ? 28 : 40,
            lineHeight: 1,
            color: "var(--cn-text)",
          }}
        >
          {typeof score === "number" ? Math.round(score) : "—"}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--cn-text-3)",
          }}
        >
          / 100 Match
        </span>
      </div>

      {factors.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {factors.map((f, i) => (
            <div key={`${f.label}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--cn-text-3)",
                  }}
                >
                  {f.label}
                </span>
                {typeof f.value === "number" && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cn-text-2)" }}>
                    {Math.round(f.value)}
                  </span>
                )}
              </div>
              {typeof f.value === "number" && (
                <div
                  aria-hidden
                  style={{
                    height: 4,
                    borderRadius: 999,
                    background: "var(--cn-sunken)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(0, Math.min(100, f.value))}%`,
                      background: "var(--cn-blue)",
                    }}
                  />
                </div>
              )}
              {f.note && <span style={{ fontSize: 12, color: "var(--cn-text-3)" }}>{f.note}</span>}
            </div>
          ))}
        </div>
      )}

      {text && (
        <div>
          {!compact && <SectionLabel>Rationale</SectionLabel>}
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--cn-text-2)",
              margin: compact ? 0 : "6px 0 0",
            }}
          >
            {text}
          </p>
        </div>
      )}

      {factors.length === 0 && !text && (
        <p style={{ fontSize: 12.5, color: "var(--cn-text-3)", margin: 0 }}>
          No scoring detail available.
        </p>
      )}
    </div>
  );
}
