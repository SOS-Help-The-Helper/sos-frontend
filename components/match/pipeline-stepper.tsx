import { Check } from "lucide-react";

export type PipelineStage = "proposed" | "accepted" | "driver_assigned" | "in_transit" | "delivered" | "confirmed";

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: "proposed", label: "Proposed" },
  { key: "accepted", label: "Accepted" },
  { key: "driver_assigned", label: "Driver" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
  { key: "confirmed", label: "Confirmed" },
];

export function PipelineStepper({ current }: { current: string }) {
  const currentIdx = STAGES.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1">
      {STAGES.map((s, i) => {
        const done = i < currentIdx;
        const isCurrent = i === currentIdx;
        const stateColor = done ? "#34D399" : isCurrent ? "#89CFF0" : "rgba(255,255,255,0.15)";
        return (
          <li key={s.key} className="flex items-center gap-1 shrink-0">
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full ${isCurrent ? "ring-2 ring-[#89CFF0]/30" : ""}`}
              style={{ background: done ? "rgba(52,211,153,0.18)" : isCurrent ? "rgba(137,207,240,0.18)" : "rgba(255,255,255,0.04)" }}
            >
              {done ? (
                <Check size={11} style={{ color: stateColor }} />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: stateColor }} />
              )}
            </span>
            <span className={`font-mono text-[10px] uppercase tracking-wider whitespace-nowrap ${done || isCurrent ? "text-white/80" : "text-white/30"}`}>
              {s.label}
            </span>
            {i < STAGES.length - 1 && (
              <span className="w-6 h-px mx-1" style={{ background: done ? "#34D399" : "rgba(255,255,255,0.1)" }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
