"use client";

import type { ReactNode } from "react";
import type { RequestStatus, Urgency } from "@/lib/prototype-data";
import { STATUS_LABEL } from "@/lib/prototype-data";

const URGENCY_COLOR: Record<Urgency, { fg: string; bg: string; pulse?: boolean }> = {
  critical: { fg: "#EF4E4B", bg: "rgba(239,78,75,0.14)", pulse: true },
  high: { fg: "#F5EBD6", bg: "rgba(245,235,214,0.12)" },
  medium: { fg: "#89CFF0", bg: "rgba(137,207,240,0.12)" },
  low: { fg: "rgba(245,235,214,0.55)", bg: "rgba(245,235,214,0.06)" },
};

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const c = URGENCY_COLOR[urgency];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider ${c.pulse ? "animate-pulse" : ""}`}
      style={{ color: c.fg, background: c.bg }}
    >
      {urgency}
    </span>
  );
}

export function SubStatusPill({ status }: { status: RequestStatus }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider bg-white/6 text-white/55">
      {STATUS_LABEL[status]}
    </span>
  );
}

export function CountChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/8 text-[10px] font-mono tabular-nums text-white/70">
      {children}
    </span>
  );
}
