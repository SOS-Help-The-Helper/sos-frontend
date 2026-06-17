"use client";

import { Sparkles } from "lucide-react";

export function AiSummary({ id, summary }: { id: string; summary: string }) {
  return (
    <div className="rounded-2xl border border-[#89CFF0]/25 bg-gradient-to-br from-[#89CFF0]/[0.08] via-[var(--surface-1)] to-[var(--surface-1)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#89CFF0]">
          <Sparkles size={11} /> AI summary
        </div>
        {id && (
          <span className="font-mono text-[10px] text-white/45 px-1.5 py-0.5 rounded bg-white/8" title={id}>
            {id.length > 10 ? `${id.slice(0, 8)}…` : id}
          </span>
        )}
      </div>
      <p className="text-[13px] text-white/85 leading-relaxed">{summary}</p>
    </div>
  );
}
