import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CitizenShell } from "@/components/citizen/CitizenShell";
import { programs } from "@/lib/prototype-data";
import { Check, X, Clock, MapPin, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/c/match")({
  head: () => ({ meta: [{ title: "SOS · Match" }] }),
  component: CitizenMatch,
});

function CitizenMatch() {
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<{ id: string; choice: "yes" | "no" }[]>([]);
  const current = programs[index];
  const done = index >= programs.length;

  function decide(choice: "yes" | "no") {
    if (!current) return;
    setDecisions((d) => [...d, { id: current.id, choice }]);
    setIndex((i) => i + 1);
  }

  function reset() {
    setIndex(0);
    setDecisions([]);
  }

  return (
    <CitizenShell title="Match programs">
      <div className="px-4 pt-6 max-w-md mx-auto">
        <p className="text-[12px] text-white/55 text-center mb-4">
          Swipe right to request help. Swipe left to skip.
        </p>

        {done ? (
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-8 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#34D399] mb-2">All done</p>
            <p className="text-[20px] font-semibold">
              {decisions.filter((d) => d.choice === "yes").length} requests submitted
            </p>
            <p className="text-[13px] text-white/55 mt-2">Check Manage for status.</p>
            <button onClick={reset} className="mt-6 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white/8 hover:bg-white/12 text-[12px] font-medium">
              <RotateCcw size={12} /> Start over
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden">
              <div className="h-32" style={{ background: `linear-gradient(135deg, ${current.color}55, ${current.color}11)` }}>
                <div className="h-full flex items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-semibold text-[18px]" style={{ background: `${current.color}40`, color: "#fff" }}>
                    {current.org.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                </div>
              </div>
              <div className="p-5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/50">{current.taxonomy}</p>
                <h2 className="text-[20px] font-semibold tracking-tight mt-1">{current.title}</h2>
                <p className="text-[14px] text-white/70 mt-2 leading-relaxed">{current.blurb}</p>

                <div className="mt-4 pt-4 border-t border-white/8 space-y-2 text-[12px] text-white/70">
                  <div className="flex items-center gap-2"><MapPin size={12} className="text-white/40" /> {current.org}</div>
                  <div className="flex items-center gap-2"><Clock size={12} className="text-white/40" /> Responds in {current.responseHrs}h</div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/40 mt-0.5">Eligibility</span>
                    <span className="flex-1 text-white/75">{current.eligibility}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 mt-6">
              <button onClick={() => decide("no")} className="w-16 h-16 rounded-full bg-white/8 hover:bg-white/12 flex items-center justify-center transition">
                <X size={26} className="text-white/75" />
              </button>
              <button onClick={() => decide("yes")} className="w-16 h-16 rounded-full bg-[#34D399] hover:bg-[#22b97f] flex items-center justify-center transition shadow-lg shadow-[#34D399]/30">
                <Check size={26} className="text-[#0F1E2B]" />
              </button>
            </div>

            <p className="text-center font-mono text-[10px] uppercase tracking-wider text-white/35 mt-4">
              {index + 1} of {programs.length}
            </p>
          </>
        )}
      </div>
    </CitizenShell>
  );
}
