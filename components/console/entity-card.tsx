/**
 * EntityCard composite — the directory row/card for any network entity
 * (person / org / request / resource). Composed from primitives:
 * MonogramTile + Tag(type, verified) + serif title + description +
 * status Chips + MomentumMeter + a visibility Chip + a right-hand action
 * Button. Presentational + accessible: the card is a keyboard-operable
 * link; the action Button is a nested control (click does not bubble to open).
 * Redesign 2026-06 (SOS Connect System). Composed, not cobbled.
 */
"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { MonogramTile, Tag, Chip, Button } from "./primitives";
import { MomentumMeter } from "./data-viz";
import type { EntityType, StatusTone } from "./types";

export type Visibility = "private" | "shared";

export interface EntityChip {
  label: string;
  tone?: StatusTone;
}

export interface EntityMomentum {
  level: 0 | 1 | 2 | 3;
  label?: string;
}

/** Common shape every directory entity is mapped into for the card. */
export interface EntityCardData {
  id: string;
  type: EntityType;
  /** display name / title (serif) */
  name: string;
  /** secondary line (role · location, category · county, …) */
  description?: string;
  verified?: boolean;
  visibility?: Visibility;
  /** momentum scale + label (Rising / New / …) */
  momentum?: EntityMomentum;
  /** status / count chips */
  chips?: EntityChip[];
}

const VISIBILITY_TONE: Record<Visibility, StatusTone> = {
  private: "neutral",
  shared: "reserved",
};

const VISIBILITY_LABEL: Record<Visibility, string> = {
  private: "Private",
  shared: "Shared",
};

/** Action affordance by entity type (request/resource → Match; person/org → Tag to case). */
function actionFor(type: EntityType): { label: string; variant: "primary" | "secondary" } {
  return type === "request" || type === "resource"
    ? { label: "Match", variant: "primary" }
    : { label: "Tag to case", variant: "secondary" };
}

export function EntityCard({
  data,
  onOpen,
  onAction,
}: {
  data: EntityCardData;
  /** open the entity detail */
  onOpen?: (data: EntityCardData) => void;
  /** right-hand action (Match / Tag to case) */
  onAction?: (data: EntityCardData) => void;
}) {
  const action = actionFor(data.type);
  const open = () => onOpen?.(data);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };
  const onActionClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onAction?.(data);
  };

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`Open ${data.type} ${data.name}`}
      onClick={open}
      onKeyDown={onKey}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        width: "100%",
        background: "var(--cn-surface-2)",
        border: "1px solid var(--cn-border)",
        borderRadius: 12,
        padding: 12,
        cursor: "pointer",
        outlineColor: "var(--ring)",
        transition: "background .15s, border-color .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cn-surface-3)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--cn-surface-2)")}
    >
      <MonogramTile name={data.name} type={data.type} size={42} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <Tag type={data.type} verified={data.verified} />
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
        {data.description && (
          <div
            style={{
              fontSize: 12.5,
              color: "var(--cn-text-3)",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.description}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
          {data.chips?.map((c, i) => (
            <Chip key={`${c.label}-${i}`} tone={c.tone ?? "neutral"} dot={Boolean(c.tone)}>
              {c.label}
            </Chip>
          ))}
          {data.momentum && <MomentumMeter level={data.momentum.level} label={data.momentum.label} />}
          {data.visibility && (
            <Chip tone={VISIBILITY_TONE[data.visibility]}>{VISIBILITY_LABEL[data.visibility]}</Chip>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0, alignSelf: "center" }}>
        <Button variant={action.variant} size="sm" onClick={onActionClick}>
          {action.label}
        </Button>
      </div>
    </div>
  );
}
