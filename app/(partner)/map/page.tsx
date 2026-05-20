'use client';

import { useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { orgs, cases } from "@/lib/prototype-data";
import { Filter, Plus } from "lucide-react";

// Rough stylized "WNC" county blobs, hand-placed coords (svg viewBox 0 0 800 500)
const counties = [
  { name: "Buncombe", x: 360, y: 240, r: 72 },
  { name: "Henderson", x: 410, y: 320, r: 56 },
  { name: "Madison", x: 290, y: 170, r: 60 },
  { name: "McDowell", x: 500, y: 220, r: 60 },
  { name: "Burke", x: 590, y: 250, r: 56 },
  { name: "Catawba", x: 680, y: 280, r: 56 },
];

export default function MapPage() {
  const [activeCounty, setActive] = useState<string | null>("Buncombe");
  const countyCases = cases.filter((c) => activeCounty == null || c.county === activeCounty);

  return (
    <CrmShell module="Map">
      <PageHeader
        title="Map"
        subtitle="Western North Carolina · live"
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/8 hover:bg-white/12 text-[12px] font-medium transition">
              <Filter size={12} /> Filter
            </button>
            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition">
              <Plus size={12} /> Drop pin
            </button>
          </>
        }
      />

      <div className="px-6 pt-6 pb-6 grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden aspect-[16/10] relative">
          <svg viewBox="0 0 800 500" className="w-full h-full">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="800" height="500" fill="url(#grid)" />
            {counties.map((c) => {
              const active = c.name === activeCounty;
              return (
                <g key={c.name} onClick={() => setActive(c.name)} className="cursor-pointer">
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={c.r}
                    fill={active ? "rgba(137,207,240,0.18)" : "rgba(255,255,255,0.04)"}
                    stroke={active ? "#89CFF0" : "rgba(255,255,255,0.18)"}
                    strokeWidth={active ? 2 : 1}
                    className="transition-all"
                  />
                  <text x={c.x} y={c.y + 4} textAnchor="middle" fill={active ? "#fff" : "rgba(255,255,255,0.5)"} fontSize="11" fontFamily="JetBrains Mono" className="uppercase tracking-wider pointer-events-none">
                    {c.name}
                  </text>
                </g>
              );
            })}
            {/* Pins */}
            {cases.slice(0, 5).map((c, i) => {
              const co = counties.find((x) => x.name === c.county);
              if (!co) return null;
              const px = co.x + (i % 2 === 0 ? -18 : 22);
              const py = co.y - 18 - (i * 6) % 24;
              const color = c.urgency === "critical" ? "#EF4E4B" : "#F5EBD6";
              return (
                <g key={c.id}>
                  <circle cx={px} cy={py} r="6" fill={color} stroke="#0F1E2B" strokeWidth="2" />
                  <circle cx={px} cy={py} r="11" fill={color} opacity="0.25">
                    <animate attributeName="r" values="6;14;6" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}
          </svg>
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {["HOUSING", "FOOD", "MEDICAL", "CHILDCARE"].map((t) => (
              <button key={t} className="font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded-full bg-black/40 backdrop-blur text-white/70 hover:text-white">
                {t}
              </button>
            ))}
          </div>
        </div>

        <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-3">
            {activeCounty ?? "All counties"} · {countyCases.length} open
          </p>
          <div className="space-y-2">
            {countyCases.map((c) => {
              const org = orgs.find((o) => o.id === c.org);
              return (
                <div key={c.id} className="rounded-xl bg-white/5 hover:bg-white/8 p-3 transition cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-white/45">{c.id}</span>
                    <span className={`font-mono text-[9px] uppercase tracking-wider ${c.urgency === "critical" ? "text-[#EF4E4B]" : "text-[#F5EBD6]"}`}>
                      {c.urgency}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium">{c.citizen}</p>
                  <p className="font-mono text-[10px] text-white/50 mt-1">
                    {c.taxonomy.join(" · ")}
                  </p>
                  {org && <p className="text-[11px] text-white/45 mt-1.5" style={{ color: org.color }}>{org.name}</p>}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </CrmShell>
  );
}
