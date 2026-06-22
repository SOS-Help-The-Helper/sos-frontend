/**
 * CaseCard composite — the board card for a case.
 * Composed from primitives (MonogramTile + Tag + Chip) with a colored
 * urgency left-border and a match-score chip. Presentational + accessible:
 * renders as a button so the whole card is keyboard-operable.
 * Redesign 2026-06 (SOS Connect System). Composed, not cobbled.
 */
"use client";

import { MonogramTile, Tag, Chip, StatusDot } from "./primitives";
import { URGENCY_TONE, stageLabel, stageTone } from "./types";
import { STATUS_COLOR } from "./primitives";

export interface CaseCardData {
  id: string;
  /** person/display name */
  name: string;
  urgency?: string;
  /** pipeline stage / status key */
  stage?: string;
  category?: string;
  county?: string;
  requestCount?: number;
  resourceCount?: number;
  matchCount?: number;
  /** match score (0–100) where present */
  score?: number;
}

export function CaseCard({
  data,
  onOpen,
  showStage = false,
}: {
  data: CaseCardData;
  onOpen?: (id: string) => void;
  /** show a stage chip (used in compact/single-column layouts) */
  showStage?: boolean;
}) {
  const urgency = (data.urgency || "").toLowerCase();
  const tone = URGENCY_TONE[urgency] || "neutral";
  const borderColor = STATUS_COLOR[tone];

  return (
    <button
      type="button"
      onClick={() => onOpen?.(data.id)}
      aria-label={`Open case ${data.name}`}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: "var(--cn-surface-2)",
        border: "1px solid var(--cn-border)",
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 12,
        padding: 12,
        cursor: "pointer",
        transition: "background .15s, border-color .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cn-surface-3)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--cn-surface-2)")}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <MonogramTile name={data.name} type="case" size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Tag type="case" />
            {typeof data.score === "number" && (
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
                {Math.round(data.score)}
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 16,
              color: "var(--cn-text)",
              marginTop: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.name || "Unnamed"}
          </div>
          {(data.category || data.county) && (
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
              {[data.category, data.county].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {showStage && data.stage && (
          <Chip tone={stageTone(data.stage)}>{stageLabel(data.stage)}</Chip>
        )}
        {data.requestCount ? (
          <Chip tone="new" dot={false}>
            {data.requestCount} req
          </Chip>
        ) : null}
        {data.resourceCount ? (
          <Chip tone="reserved" dot={false}>
            {data.resourceCount} res
          </Chip>
        ) : null}
        {data.matchCount ? (
          <Chip tone="matching" dot={false}>
            {data.matchCount} match
          </Chip>
        ) : null}
      </div>
    </button>
  );
}
