import type { ReactNode } from "react";

export function StatusBadge({ tone, children }: { tone: "green" | "blue" | "yellow" | "red" | "neutral"; children: ReactNode }) {
  const map: Record<string, string> = {
    green: "bg-[#34D399]/12 text-[#34D399]",
    blue: "bg-[#89CFF0]/12 text-[#89CFF0]",
    yellow: "bg-[#EF4E4B]/12 text-[#EF4E4B]",
    red: "bg-[#EF4E4B]/12 text-[#EF4E4B]",
    neutral: "bg-white/6 text-white/70",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full tracking-tight ${map[tone]}`}>
      {children}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? "#34D399" : score >= 50 ? "#89CFF0" : "#EF4E4B";
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold tracking-tight"
      style={{ background: `${color}1A`, color }}
    >
      {score}
    </div>
  );
}
