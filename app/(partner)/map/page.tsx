'use client';

import { useState, useEffect } from "react";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { orgs, cases } from "@/lib/prototype-data";
import { Filter, Plus, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";

// Rough stylized "WNC" county blobs, hand-placed coords (svg viewBox 0 0 800 500)
const counties = [
  { name: "Buncombe", x: 360, y: 240, r: 72 },
  { name: "Henderson", x: 410, y: 320, r: 56 },
  { name: "Madison", x: 290, y: 170, r: 60 },
  { name: "McDowell", x: 500, y: 220, r: 60 },
  { name: "Burke", x: 590, y: 250, r: 56 },
  { name: "Catawba", x: 680, y: 280, r: 56 },
];

// SVG viewport bounds — map GeoJSON lng/lat to SVG coords
const SVG_W = 800;
const SVG_H = 500;
// Approximate bounding box for WNC area
const LNG_MIN = -84.5, LNG_MAX = -81.5;
const LAT_MIN = 35.0, LAT_MAX = 36.5;

function toSVG(lng: number, lat: number): [number, number] {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * SVG_W;
  const y = SVG_H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * SVG_H;
  return [x, y];
}

interface MapFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: number[] };
  properties: Record<string, unknown>;
}

interface LayeredFeatures {
  cases: MapFeature[];
  resources: MapFeature[];
  facilities: MapFeature[];
  events: MapFeature[];
}

function groupByLayer(features: MapFeature[]): LayeredFeatures {
  const result: LayeredFeatures = { cases: [], resources: [], facilities: [], events: [] };
  for (const f of features) {
    const layer = (f.properties.layer as string) ?? (f.properties.type as string) ?? '';
    if (layer === 'case' || layer === 'request') result.cases.push(f);
    else if (layer === 'resource') result.resources.push(f);
    else if (layer === 'facility') result.facilities.push(f);
    else if (layer === 'event') result.events.push(f);
  }
  return result;
}

export default function MapPage() {
  const { orgId } = useAuthContext();
  const [activeCounty, setActive] = useState<string | null>("Buncombe");
  const [layers, setLayers] = useState<LayeredFeatures | null>(null);

  useEffect(() => {
    if (!orgId) return;
    api.crmMapFeatures(orgId)
      .then((res: unknown) => {
        const data = res as { features?: MapFeature[] };
        const features = Array.isArray(data) ? (data as MapFeature[]) : (data?.features ?? []);
        if (features.length > 0) setLayers(groupByLayer(features));
      })
      .catch(() => {
        // fallback to prototype — leave layers null
      });
  }, [orgId]);

  const hasRealData = layers !== null;
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

            {hasRealData ? (
              <>
                {/* Cases: red (critical) or cream dots */}
                {layers.cases.map((f, i) => {
                  const [lng, lat] = f.geometry.coordinates;
                  const [px, py] = toSVG(lng, lat);
                  const urgency = f.properties.urgency as string;
                  const color = urgency === 'critical' ? '#EF4E4B' : '#F5EBD6';
                  return (
                    <g key={`case-${i}`}>
                      <circle cx={px} cy={py} r="6" fill={color} stroke="#0F1E2B" strokeWidth="2" />
                      <circle cx={px} cy={py} r="11" fill={color} opacity="0.25">
                        <animate attributeName="r" values="6;14;6" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                      </circle>
                    </g>
                  );
                })}

                {/* Resources: blue dots */}
                {layers.resources.map((f, i) => {
                  const [lng, lat] = f.geometry.coordinates;
                  const [px, py] = toSVG(lng, lat);
                  return (
                    <g key={`resource-${i}`}>
                      <circle cx={px} cy={py} r="6" fill="#4A9EE8" stroke="#0F1E2B" strokeWidth="2" />
                    </g>
                  );
                })}

                {/* Facilities: green squares */}
                {layers.facilities.map((f, i) => {
                  const [lng, lat] = f.geometry.coordinates;
                  const [px, py] = toSVG(lng, lat);
                  return (
                    <rect key={`facility-${i}`} x={px - 6} y={py - 6} width="12" height="12" fill="#4ADE80" stroke="#0F1E2B" strokeWidth="2" rx="2" />
                  );
                })}

                {/* Events: purple calendar icons (circle + cross) */}
                {layers.events.map((f, i) => {
                  const [lng, lat] = f.geometry.coordinates;
                  const [px, py] = toSVG(lng, lat);
                  return (
                    <g key={`event-${i}`}>
                      <circle cx={px} cy={py} r="8" fill="#A855F7" stroke="#0F1E2B" strokeWidth="2" />
                      {/* Calendar icon: simple grid lines */}
                      <rect x={px - 4} y={py - 4} width="8" height="8" fill="none" stroke="#fff" strokeWidth="1" rx="1" />
                      <line x1={px - 4} y1={py - 1} x2={px + 4} y2={py - 1} stroke="#fff" strokeWidth="1" />
                      <line x1={px - 2} y1={py - 4} x2={px - 2} y2={py - 2} stroke="#fff" strokeWidth="1" />
                      <line x1={px + 2} y1={py - 4} x2={px + 2} y2={py - 2} stroke="#fff" strokeWidth="1" />
                    </g>
                  );
                })}
              </>
            ) : (
              /* Prototype fallback pins */
              cases.slice(0, 5).map((c, i) => {
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
              })
            )}
          </svg>

          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {["HOUSING", "FOOD", "MEDICAL", "CHILDCARE"].map((t) => (
              <button key={t} className="font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded-full bg-black/40 backdrop-blur text-white/70 hover:text-white">
                {t}
              </button>
            ))}
          </div>

          {/* Legend */}
          {hasRealData && (
            <div className="absolute bottom-3 right-3 flex flex-col gap-1 bg-black/50 backdrop-blur rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4E4B] inline-block" />
                <span className="font-mono text-[9px] text-white/70">Cases</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4A9EE8] inline-block" />
                <span className="font-mono text-[9px] text-white/70">Resources</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#4ADE80] inline-block" />
                <span className="font-mono text-[9px] text-white/70">Facilities</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] inline-block" />
                <span className="font-mono text-[9px] text-white/70">Events</span>
              </div>
            </div>
          )}
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

            {hasRealData && layers.events.length > 0 && (
              <div className="mt-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#A855F7] mb-2">
                  Events · {layers.events.length}
                </p>
                {layers.events.map((f, i) => (
                  <div key={`event-side-${i}`} className="rounded-xl bg-white/5 hover:bg-white/8 p-3 transition cursor-pointer mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={10} className="text-[#A855F7]" />
                      <span className="font-mono text-[10px] text-white/45">{f.properties.event_type as string ?? 'event'}</span>
                    </div>
                    <p className="text-[13px] font-medium">{f.properties.title as string ?? f.properties.name as string ?? 'Untitled'}</p>
                    {f.properties.starts_at && (
                      <p className="font-mono text-[10px] text-white/50 mt-1">
                        {new Date(f.properties.starts_at as string).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </CrmShell>
  );
}
