/**
 * Console primitives — the ONLY place raw console styling lives.
 * Presentational, typed, accessible. Pages compose these; pages do not
 * write bespoke styled markup. Redesign 2026-06.
 *
 * All color/space comes from tokens (.console-theme in globals.css).
 */
"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import type { StatusTone, Tone, EntityType } from "./types";
import { initials, ENTITY_TONE } from "./types";

/* ----------------------------------------------------------------
 * Token helpers
 * ---------------------------------------------------------------- */
const TONE_COLOR: Record<Tone, string> = {
  coral: "var(--cn-coral)",
  blue: "var(--cn-blue)",
  green: "var(--cn-green)",
  amber: "var(--cn-amber)",
  neutral: "var(--cn-text-3)",
};

const STATUS_COLOR: Record<StatusTone, string> = {
  active: "var(--cn-status-active)",
  new: "var(--cn-status-new)",
  matching: "var(--cn-status-matching)",
  reserved: "var(--cn-status-reserved)",
  contacted: "var(--cn-status-contacted)",
  report: "var(--cn-status-report)",
  neutral: "var(--cn-text-3)",
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ----------------------------------------------------------------
 * Surface — panel / card / sunken container
 * ---------------------------------------------------------------- */
type SurfaceVariant = "panel" | "card" | "raised" | "sunken";
const SURFACE_BG: Record<SurfaceVariant, string> = {
  panel: "var(--cn-surface-1)",
  card: "var(--cn-surface-2)",
  raised: "var(--cn-surface-3)",
  sunken: "var(--cn-sunken)",
};
export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
  /** padding scale 0–6 (×4px) */
  pad?: 0 | 2 | 3 | 4 | 5 | 6;
  bordered?: boolean;
  radius?: "md" | "lg" | "xl";
}
const RADIUS = { md: "10px", lg: "14px", xl: "20px" } as const;
export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { variant = "card", pad = 4, bordered = true, radius = "lg", style, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={className}
      style={{
        background: SURFACE_BG[variant],
        border: bordered ? "1px solid var(--cn-border)" : "none",
        borderRadius: RADIUS[radius],
        padding: pad * 4,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
});

/* ----------------------------------------------------------------
 * Button — primary / secondary / ghost / icon
 * ---------------------------------------------------------------- */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "icon";
  size?: "sm" | "md";
  loading?: boolean;
  leading?: ReactNode;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, leading, disabled, style, children, ...rest },
  ref,
) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-sans)",
    fontWeight: 700,
    fontSize: size === "sm" ? 12.5 : 13.5,
    letterSpacing: "0.01em",
    height: size === "sm" ? 30 : 38,
    padding: variant === "icon" ? 0 : size === "sm" ? "0 12px" : "0 16px",
    width: variant === "icon" ? (size === "sm" ? 30 : 38) : undefined,
    borderRadius: variant === "icon" ? 9 : 10,
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled || loading ? 0.55 : 1,
    transition: "background .15s, border-color .15s, transform .05s",
    whiteSpace: "nowrap",
  };
  const skin: React.CSSProperties =
    variant === "primary"
      ? { background: "var(--cn-coral)", color: "#fff", border: "1px solid var(--cn-coral)" }
      : variant === "ghost"
        ? { background: "transparent", color: "var(--cn-text-2)", border: "1px solid transparent" }
        : { background: "transparent", color: "var(--cn-text-2)", border: "1px solid var(--cn-border-strong)" };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{ ...base, ...skin, ...style }}
      {...rest}
    >
      {loading ? <Spinner size={size === "sm" ? 12 : 14} /> : leading}
      {variant !== "icon" && children}
      {variant === "icon" && children}
    </button>
  );
});

/* ----------------------------------------------------------------
 * StatusDot
 * ---------------------------------------------------------------- */
export function StatusDot({ tone = "neutral", size = 8, pulse }: { tone?: StatusTone; size?: number; pulse?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: STATUS_COLOR[tone],
        boxShadow: pulse ? `0 0 0 3px color-mix(in srgb, ${STATUS_COLOR[tone]} 22%, transparent)` : undefined,
        flexShrink: 0,
      }}
    />
  );
}

/* ----------------------------------------------------------------
 * Chip — status chip (dot + label) / filter / tag
 * ---------------------------------------------------------------- */
export function Chip({
  tone = "neutral",
  dot = true,
  children,
  muted,
}: {
  tone?: StatusTone;
  dot?: boolean;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 600,
        color: muted ? "var(--cn-text-3)" : "var(--cn-text-2)",
        background: "color-mix(in srgb, var(--cn-surface-3) 70%, transparent)",
        border: "1px solid var(--cn-border)",
        borderRadius: 999,
        padding: "3px 9px",
        whiteSpace: "nowrap",
      }}
    >
      {dot && <StatusDot tone={tone} size={6} />}
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------
 * Tag — entity type label (mono, tracked)
 * ---------------------------------------------------------------- */
export function Tag({ type, verified }: { type: EntityType; verified?: boolean }) {
  const color = TONE_COLOR[ENTITY_TONE[type]];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color,
        }}
      >
        {type}
      </span>
      {verified && (
        <span
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "var(--cn-green)" }}
        >
          ✓ VERIFIED
        </span>
      )}
    </span>
  );
}

/* ----------------------------------------------------------------
 * Badge — count pill
 * ---------------------------------------------------------------- */
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 600,
        color: tone === "neutral" ? "var(--cn-text-3)" : "#fff",
        background: tone === "neutral" ? "var(--cn-surface-3)" : TONE_COLOR[tone],
        borderRadius: 999,
        padding: "1px 7px",
        minWidth: 18,
        textAlign: "center",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------
 * MonogramTile — square avatar with initials
 * ---------------------------------------------------------------- */
export function MonogramTile({
  name,
  type,
  size = 44,
}: {
  name: string;
  type?: EntityType;
  size?: number;
}) {
  const tone = type ? ENTITY_TONE[type] : "neutral";
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 11,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-mono)",
        fontSize: size * 0.34,
        fontWeight: 600,
        letterSpacing: "0.02em",
        color: tone === "neutral" ? "var(--cn-text-2)" : "#fff",
        background:
          tone === "neutral"
            ? "var(--cn-surface-3)"
            : `color-mix(in srgb, ${TONE_COLOR[tone]} 88%, #000)`,
        border: "1px solid var(--cn-border)",
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

/* ----------------------------------------------------------------
 * SectionLabel — uppercase tracked eyebrow
 * ---------------------------------------------------------------- */
export function SectionLabel({ children, tone }: { children: ReactNode; tone?: StatusTone }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--cn-text-3)",
      }}
    >
      {tone && <StatusDot tone={tone} size={6} />}
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------
 * Field — key/value row (mono label left, value right)
 * ---------------------------------------------------------------- */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(110px, 32%) 1fr",
        gap: 16,
        alignItems: "baseline",
        padding: "10px 0",
        borderBottom: "1px solid var(--cn-border)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--cn-text-3)",
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--cn-text)", lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
 * Spinner / Skeleton / EmptyState
 * ---------------------------------------------------------------- */
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{
        width: size,
        height: size,
        border: "2px solid var(--cn-border-strong)",
        borderTopColor: "var(--cn-coral)",
        borderRadius: "50%",
        display: "inline-block",
        animation: "cn-spin .7s linear infinite",
      }}
    />
  );
}

export function Skeleton({ h = 16, w = "100%", radius = 8 }: { h?: number; w?: number | string; radius?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        height: h,
        width: w,
        borderRadius: radius,
        background: "linear-gradient(90deg, var(--cn-surface-2), var(--cn-surface-3), var(--cn-surface-2))",
        backgroundSize: "200% 100%",
        animation: "cn-shimmer 1.3s ease-in-out infinite",
      }}
    />
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        color: "var(--cn-text-3)",
        gap: 8,
      }}
    >
      {icon && <div style={{ opacity: 0.5, marginBottom: 4 }}>{icon}</div>}
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--cn-text-2)" }}>{title}</div>
      {hint && <div style={{ fontSize: 13, maxWidth: 320 }}>{hint}</div>}
    </div>
  );
}

export { cx, TONE_COLOR, STATUS_COLOR };
