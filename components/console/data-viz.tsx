/**
 * Console data + nav primitives: Tabs, Pill, KpiStat, Sparkline,
 * MomentumMeter, Dropdown. Composed, accessible. Redesign 2026-06.
 */
"use client";

import {
  useId,
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { Badge, StatusDot } from "./primitives";
import type { StatusTone } from "./types";

/* ----------------------------------------------------------------
 * Sparkline — tiny SVG trend line (reduced-motion safe; static)
 * ---------------------------------------------------------------- */
export function Sparkline({
  data,
  w = 64,
  h = 22,
  stroke = "var(--cn-coral)",
}: {
  data: number[];
  w?: number;
  h?: number;
  stroke?: string;
}) {
  if (!data || data.length < 2) return <span style={{ display: "inline-block", width: w, height: h }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ----------------------------------------------------------------
 * KpiStat — value + label + delta + sparkline
 * ---------------------------------------------------------------- */
export function KpiStat({
  value,
  label,
  delta,
  trend,
  tone = "var(--cn-coral)",
  accent,
}: {
  value: ReactNode;
  label: string;
  delta?: number;
  trend?: number[];
  tone?: string;
  /** optional token color for a left accent bar + label tint (e.g. "var(--cn-coral)") */
  accent?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div
      style={{
        background: "var(--cn-surface-2)",
        border: "1px solid var(--cn-border)",
        borderLeft: accent ? `3px solid ${accent}` : undefined,
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: accent ?? "var(--cn-text-3)",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 30, lineHeight: 1, color: "var(--cn-text)" }}>{value}</span>
          {typeof delta === "number" && delta !== 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: up ? "var(--cn-green)" : "var(--cn-coral)" }}>
              {up ? "▲" : "▼"}
              {Math.abs(delta)}
            </span>
          )}
        </div>
        {trend && <Sparkline data={trend} stroke={tone} />}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
 * MomentumMeter — ●●● scale (Rising/New/etc)
 * ---------------------------------------------------------------- */
export function MomentumMeter({ level = 1, label }: { level?: 0 | 1 | 2 | 3; label?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ display: "inline-flex", gap: 2 }} aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: i < level ? "var(--cn-blue)" : "var(--cn-border-strong)",
            }}
          />
        ))}
      </span>
      {label && <span style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, fontWeight: 600, color: "var(--cn-text-3)" }}>{label}</span>}
    </span>
  );
}

/* ----------------------------------------------------------------
 * Pill — nav pill with optional counter (used by ConsoleNav)
 * ---------------------------------------------------------------- */
export function Pill({
  active,
  count,
  onClick,
  href,
  children,
}: {
  active?: boolean;
  count?: number;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}) {
  const inner = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 34,
        padding: "0 14px",
        borderRadius: 999,
        fontFamily: "var(--font-sans)",
        fontSize: 13.5,
        fontWeight: 700,
        color: active ? "#fff" : "var(--cn-text-2)",
        background: active ? "color-mix(in srgb, var(--cn-surface-3) 92%, #fff 0%)" : "transparent",
        border: active ? "1px solid var(--cn-border-strong)" : "1px solid transparent",
        cursor: "pointer",
        transition: "background .15s, color .15s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
      {typeof count === "number" && count > 0 && <Badge>{count}</Badge>}
    </span>
  );
  if (href) {
    return (
      <a href={href} style={{ textDecoration: "none" }} aria-current={active ? "page" : undefined}>
        {inner}
      </a>
    );
  }
  return (
    <button onClick={onClick} aria-pressed={active} style={{ background: "none", border: "none", padding: 0 }}>
      {inner}
    </button>
  );
}

/* ----------------------------------------------------------------
 * Tabs — underline tabs with counts, ARIA + keyboard
 * ---------------------------------------------------------------- */
export interface TabItem {
  id: string;
  label: string;
  count?: number;
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
}) {
  const baseId = useId();
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const idx = items.findIndex((t) => t.id === value);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = e.key === "ArrowRight" ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
      onChange(items[next]!.id);
    }
  }
  return (
    <div role="tablist" aria-label="Tabs" onKeyDown={onKey} style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--cn-border)" }}>
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            id={`${baseId}-${t.id}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "none",
              border: "none",
              borderBottom: `2px solid ${active ? "var(--cn-coral)" : "transparent"}`,
              padding: "10px 12px",
              marginBottom: -1,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 13.5,
              fontWeight: 700,
              color: active ? "var(--cn-text)" : "var(--cn-text-3)",
              transition: "color .15s, border-color .15s",
            }}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 && <Badge>{t.count}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------
 * Dropdown — accessible menu (Actions ▾, disaster selector)
 * ---------------------------------------------------------------- */
export interface DropdownItem {
  id: string;
  label: string;
  tone?: StatusTone;
  onSelect?: () => void;
}
export function Dropdown({
  trigger,
  items,
  align = "left",
}: {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            [align]: 0,
            minWidth: 200,
            background: "var(--cn-surface-1)",
            border: "1px solid var(--cn-border-strong)",
            borderRadius: 12,
            boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
            padding: 6,
            zIndex: 60,
          }}
        >
          {items.map((it) => (
            <button
              key={it.id}
              role="menuitem"
              onClick={() => {
                it.onSelect?.();
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                borderRadius: 8,
                padding: "9px 10px",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 13.5,
                fontWeight: 600,
                color: "var(--cn-text-2)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cn-surface-3)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              {it.tone && <StatusDot tone={it.tone} size={7} />}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
