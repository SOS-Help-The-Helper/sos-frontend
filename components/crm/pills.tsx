"use client";

import type { ReactNode } from "react";
import type { RequestStatus, Urgency } from "@/lib/display-constants";
import { STATUS_LABEL } from "@/lib/display-constants";

const URGENCY_COLOR: Record<Urgency, { fg: string; bg: string; pulse?: boolean }> = {
  critical: { fg: "#fff", bg: "#EF4E4B", pulse: true },
  high: { fg: "#92400E", bg: "#FDE68A" },
  medium: { fg: "#1E40AF", bg: "#BFDBFE" },
  low: { fg: "#374151", bg: "#E5E7EB" },
};

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const c = URGENCY_COLOR[urgency] ?? { fg: "#374151", bg: "#E5E7EB" };
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider ${c.pulse ? "animate-pulse" : ""}`}
      style={{ color: c.fg, background: c.bg }}
    >
      {urgency ?? "unknown"}
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
