/**
 * Match composites — the queue row + candidate-chain row for the Match engine.
 * `MatchQueueItem`  : a selectable request awaiting matches (left queue).
 * `CandidateRow`    : a scored resource candidate in the chain (right detail).
 * Composed from primitives, token-only, keyboard-operable. Pages compose these;
 * pages do not write bespoke styled markup. Redesign 2026-06 (SOS Connect System).
 */
"use client";

import { MonogramTile, Tag, Chip, StatusDot } from "./primitives";
import { URGENCY_TONE } from "./types";

/* ------------------------------------------------------------------ */
/* MatchQueueItem — one request in the match queue                     */
/* ------------------------------------------------------------------ */
export interface MatchQueueItemData {
  /** request id (group key) */
  requestId: string;
  /** survivor / requester name */
  name: string;
  taxonomy?: string | null;
  county?: string | null;
  urgency?: string | null;
  /** number of scored candidates in the chain */
  candidateCount: number;
  /** best candidate score (0–100) */
  topScore?: number;
}

export function MatchQueueItem({
  data,
  selected = false,
  onSelect,
}: {
  data: MatchQueueItemData;
  selected?: boolean;
  onSelect?: (requestId: string) => void;
}) {
  const tone = URGENCY_TONE[(data.urgency || "").toLowerCase()] || "neutral";
  const sub = [data.taxonomy, data.county].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Match queue: ${data.name}`}
      onClick={() => onSelect?.(data.requestId)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: selected ? "var(--cn-surface-3)" : "var(--cn-surface-2)",
        border: "1px solid var(--cn-border)",
        borderLeft: `3px solid ${selected ? "var(--cn-coral)" : "var(--cn-border-strong)"}`,
        borderRadius: 12,
        padding: 11,
        cursor: "pointer",
        transition: "background .15s, border-color .15s",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = "var(--cn-surface-3)";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = "var(--cn-surface-2)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <StatusDot tone={tone} size={9} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Tag type="request" />
            {typeof data.topScore === "number" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--cn-blue)",
                }}
              >
                <StatusDot tone="reserved" size={6} />
                {Math.round(data.topScore)}
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 14,
              color: "var(--cn-text)",
              marginTop: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.name || "Unnamed"}
          </div>
          {sub && (
            <div
              style={{
                fontSize: 12,
                color: "var(--cn-text-3)",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 9 }}>
        <Chip tone="matching" dot={false}>
          {data.candidateCount} candidate{data.candidateCount === 1 ? "" : "s"}
        </Chip>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* CandidateRow — one scored resource in the candidate chain           */
/* ------------------------------------------------------------------ */
export interface CandidateRowData {
  /** match id */
  id: string;
  resourceName: string;
  orgName?: string | null;
  taxonomy?: string | null;
  /** 0–100 match score */
  score: number;
  /** match status (committed / proposed / …) */
  status?: string | null;
}

export function CandidateRow({
  data,
  selected = false,
  onSelect,
}: {
  data: CandidateRowData;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const pct = Math.max(0, Math.min(100, data.score));
  const committed = (data.status || "").toLowerCase() === "committed";
  const sub = [data.orgName, data.taxonomy].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Candidate ${data.resourceName}, score ${Math.round(data.score)}`}
      onClick={() => onSelect?.(data.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        textAlign: "left",
        background: selected ? "var(--cn-surface-3)" : "var(--cn-surface-2)",
        border: `1px solid ${selected ? "var(--cn-border-strong)" : "var(--cn-border)"}`,
        borderRadius: 12,
        padding: 11,
        cursor: "pointer",
        transition: "background .15s, border-color .15s",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = "var(--cn-surface-3)";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = "var(--cn-surface-2)";
      }}
    >
      <MonogramTile name={data.orgName || data.resourceName} type="resource" size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tag type="resource" />
          {committed && (
            <Chip tone="active" dot>
              Committed
            </Chip>
          )}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 13.5,
            color: "var(--cn-text)",
            marginTop: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.resourceName || "Unnamed resource"}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 12,
              color: "var(--cn-text-3)",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sub}
          </div>
        )}
        <div
          aria-hidden
          style={{ height: 4, borderRadius: 999, background: "var(--cn-sunken)", overflow: "hidden", marginTop: 7 }}
        >
          <div style={{ height: "100%", width: `${pct}%`, background: "var(--cn-blue)" }} />
        </div>
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--cn-blue)",
          flexShrink: 0,
          width: 34,
          textAlign: "right",
        }}
      >
        {Math.round(data.score)}
      </span>
    </button>
  );
}
