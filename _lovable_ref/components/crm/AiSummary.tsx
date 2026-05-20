import { Sparkles, ChevronDown } from "lucide-react";
import { useState } from "react";

export function AiSummary({
  id,
  summary,
  tldr,
  defaultOpen = false,
}: {
  id: string;
  summary: string;
  tldr?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Derive a short preview if no tldr is provided
  const preview =
    tldr ??
    (summary.length > 110 ? summary.slice(0, 107).trimEnd() + "…" : summary);

  return (
    <div className="rounded-2xl border border-[#89CFF0]/20 bg-[var(--surface-1)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-white/[0.02] transition rounded-2xl"
      >
        <Sparkles size={13} className="text-[#89CFF0] shrink-0 mt-0.5" />
        <p className="flex-1 text-[12.5px] text-white/80 leading-snug">
          {open ? summary : preview}
        </p>
        <ChevronDown
          size={13}
          className={`text-white/35 shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}
