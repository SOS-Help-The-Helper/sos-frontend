import { Check } from "lucide-react";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/prototype-data";

export function PipelineStepper({
  current,
  stages = PIPELINE_STAGES,
}: {
  current: PipelineStage;
  stages?: { key: PipelineStage; label: string }[];
}) {
  // If current stage isn't in the provided stages list, treat as not-yet-started
  // (e.g. a pair pipeline showing a chain status like "driver_assigned").
  const currentIdx = stages.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1">
      {stages.map((s, i) => {
        const done = i < currentIdx;
        const isCurrent = i === currentIdx;
        const stateColor = done ? "#34D399" : isCurrent ? "#89CFF0" : "rgba(245,235,214,0.25)";
        const textColor = done || isCurrent ? "var(--sos-navy)" : "rgba(245,235,214,0.45)";
        return (
          <li key={s.key} className="flex items-center gap-1 shrink-0">
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full ${isCurrent ? "ring-2 ring-[#89CFF0]/30" : ""}`}
              style={{ background: done ? "rgba(52,211,153,0.18)" : isCurrent ? "rgba(137,207,240,0.18)" : "rgba(245,235,214,0.06)" }}
            >
              {done ? (
                <Check size={11} style={{ color: stateColor }} />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: stateColor }} />
              )}
            </span>
            <span
              className="font-mono text-[10px] uppercase tracking-wider whitespace-nowrap"
              style={{ color: textColor }}
            >
              {s.label}
            </span>
            {i < stages.length - 1 && (
              <span
                className="w-6 h-px mx-1"
                style={{ background: done ? "#34D399" : "rgba(245,235,214,0.15)" }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
