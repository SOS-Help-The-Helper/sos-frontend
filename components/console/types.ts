/**
 * Console design-system shared types.
 * Redesign 2026-06 (SOS Connect System). Composed, not cobbled.
 */

/** Entity types surfaced across the console. */
export type EntityType = "person" | "org" | "request" | "resource" | "case" | "report";

/** Status-dot semantics → mapped to --cn-status-* tokens. */
export type StatusTone =
  | "active"      // green
  | "new"         // coral
  | "matching"    // coral
  | "reserved"    // blue
  | "contacted"   // amber
  | "report"      // amber
  | "neutral";    // muted

/** Generic tone scale for badges/buttons/chips. */
export type Tone = "coral" | "blue" | "green" | "amber" | "neutral";

/** Pipeline stages (from cases.list stage_counts). */
export type CaseStage =
  | "pending"
  | "active"
  | "under_review"
  | "approved"
  | "matched"
  | "in_progress"
  | "fulfilled"
  | "closed";

/** Human labels + tone per stage for board columns. */
export const STAGE_META: Record<CaseStage, { label: string; tone: StatusTone }> = {
  pending:       { label: "New",          tone: "new" },
  active:        { label: "Active",       tone: "matching" },
  under_review:  { label: "Review",       tone: "contacted" },
  approved:      { label: "Approved",     tone: "reserved" },
  matched:       { label: "Matching",     tone: "matching" },
  in_progress:   { label: "In progress",  tone: "reserved" },
  fulfilled:     { label: "Fulfilled",    tone: "active" },
  closed:        { label: "Closed",       tone: "neutral" },
};

/** Urgency → status-dot tone (board urgency borders, chips). */
export const URGENCY_TONE: Record<string, StatusTone> = {
  critical: "new",
  high: "matching",
  medium: "contacted",
  low: "reserved",
};

/**
 * Best-effort resolve of an arbitrary status string onto a known CaseStage.
 * Used to bucket board cards when the EF emits aliases (open/new/resolved…).
 */
export function resolveStage(status?: string | null): CaseStage {
  const s = (status || "").toLowerCase().trim();
  if (s in STAGE_META) return s as CaseStage;
  const alias: Record<string, CaseStage> = {
    new: "pending",
    open: "active",
    review: "under_review",
    matching: "matched",
    resolved: "fulfilled",
    complete: "fulfilled",
    completed: "fulfilled",
    done: "closed",
  };
  return alias[s] ?? "active";
}

/** Human label for a stage key, falling back to a Title-cased raw key. */
export function stageLabel(key: string): string {
  if (key in STAGE_META) return STAGE_META[key as CaseStage].label;
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Tone for a stage key, falling back to neutral for unknown keys. */
export function stageTone(key: string): StatusTone {
  return key in STAGE_META ? STAGE_META[key as CaseStage].tone : "neutral";
}

export const ENTITY_TONE: Record<EntityType, Tone> = {
  person:   "neutral",
  org:      "neutral",
  request:  "coral",
  resource: "blue",
  case:     "coral",
  report:   "amber",
};

/** Initials helper for monogram tiles. */
export function initials(name: string, max = 2): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, max).map((p) => p[0]!.toUpperCase()).join("");
}
