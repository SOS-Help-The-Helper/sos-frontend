import Link from "next/link";
import { Clock, Package, ShieldCheck, FileText, Layers, ChevronRight, Inbox } from "lucide-react";
import { StatusBadge } from "@/components/directory/Badges";
import type { HistoryEntry } from "@/lib/directory-data";

const ICONS = {
  request: { I: Package, color: "#EF4E4B" },
  resource: { I: ShieldCheck, color: "#89CFF0" },
  report: { I: FileText, color: "#F5EBD6" },
  case: { I: Layers, color: "#89CFF0" },
} as const;

export function Timeline({ entries, label }: { entries: HistoryEntry[]; label?: string }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-10 text-center text-white/55">
        <Inbox className="mx-auto mb-3 text-white/30" size={28} />
        <p className="text-[14px]">No timeline activity yet</p>
      </div>
    );
  }

  return (
    <div>
      {label && (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 px-1 mb-3">{label}</p>
      )}
      <ol className="relative ml-3 space-y-1.5 pl-6 border-l border-[var(--hairline)]">
        {entries.map((h) => {
          const { I, color } = ICONS[h.kind];
          const inner = (
            <div className="flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 -mx-1 group-hover:bg-white/[0.04] transition">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium leading-snug text-white">{h.title}</p>
                <p className="text-[12px] text-white/40 mt-0.5 flex items-center gap-1.5">
                  <Clock size={10} /> {h.date}
                  {h.link && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#89CFF0]">
                      · {h.link.caseId}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge tone={h.status.tone}>{h.status.label}</StatusBadge>
                {h.link && (
                  <ChevronRight size={14} className="text-white/25 group-hover:text-[#89CFF0] transition" />
                )}
              </div>
            </div>
          );

          return (
            <li key={h.id} className="relative group">
              <span
                className="absolute -left-[34px] top-3 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-[var(--background)]"
                style={{ background: `${color}22` }}
              >
                <I size={12} style={{ color }} />
              </span>
              {h.link ? (
                <Link href={`/cases/${h.link.caseId}`} className="block">
                  {inner}
                </Link>
              ) : (
                <div className="cursor-default">{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
