'use client';

import { useState, useEffect, useRef } from "react";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { orgs, cases } from "@/lib/prototype-data";
import { Filter, Plus, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";

const LAYER_COLORS: Record<string, string> = {
  case: "#EF4E4B", resource: "#89CFF0", facility: "#4ADE80", event: "#A855F7",
};

const LAYERS = ["case", "resource", "facility", "event"] as const;

function MapboxEmbed({ orgId }: { orgId: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    let cancelled = false;

    // Inject Mapbox CSS
    if (!document.getElementById("mapbox-css")) {
      const link = document.createElement("link");
      link.id = "mapbox-css";
      link.rel = "stylesheet";
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css";
      document.head.appendChild(link);
    }

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !mapRef.current) return;
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-82.5, 35.5],
        zoom: 8,
      });
      mapInstance.current = map;

      map.on("load", async () => {
        try {
          const data = await api.crmMapFeatures(orgId);
          const features: any[] = (data as any)?.features ?? [];

          for (const layer of LAYERS) {
            const geojson = {
              type: "FeatureCollection" as const,
              features: features.filter((f: any) => f.properties?.layer === layer),
            };
            const srcId = `${layer}-source`;
            const color = LAYER_COLORS[layer];

            map.addSource(srcId, {
              type: "geojson",
              data: geojson,
              cluster: true,
              clusterMaxZoom: 14,
              clusterRadius: 50,
            });

            // Cluster circles — solid, no labels
            map.addLayer({
              id: `${layer}-clusters`,
              type: "circle",
              source: srcId,
              filter: ["has", "point_count"],
              paint: {
                "circle-color": color,
                "circle-opacity": 0.75,
                "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 10, 14, 50, 22, 200, 32],
                "circle-blur": 0.15,
              },
            });

            // Cluster glow ring
            map.addLayer({
              id: `${layer}-cluster-glow`,
              type: "circle",
              source: srcId,
              filter: ["has", "point_count"],
              paint: {
                "circle-color": color,
                "circle-opacity": 0.2,
                "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 10, 22, 50, 32, 200, 44],
              },
            });

            // Unclustered points
            map.addLayer({
              id: `${layer}-unclustered`,
              type: "circle",
              source: srcId,
              filter: ["!", ["has", "point_count"]],
              paint: {
                "circle-color": color,
                "circle-radius": 6,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#0F1E2B",
              },
            });

            // Unclustered glow
            map.addLayer({
              id: `${layer}-glow`,
              type: "circle",
              source: srcId,
              filter: ["!", ["has", "point_count"]],
              paint: {
                "circle-color": color,
                "circle-radius": 12,
                "circle-opacity": 0.2,
              },
            });

            // Click cluster → zoom in
            map.on("click", `${layer}-clusters`, (e: any) => {
              const features = map.queryRenderedFeatures(e.point, { layers: [`${layer}-clusters`] });
              const clusterId = features[0]?.properties?.cluster_id;
              if (!clusterId) return;
              (map.getSource(srcId) as any).getClusterExpansionZoom(clusterId, (_: any, zoom: number) => {
                map.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
              });
            });

            // Hover cursor
            map.on("mouseenter", `${layer}-clusters`, () => { map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", `${layer}-clusters`, () => { map.getCanvas().style.cursor = ""; });
            map.on("mouseenter", `${layer}-unclustered`, () => { map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", `${layer}-unclustered`, () => { map.getCanvas().style.cursor = ""; });
          }
        } catch (e) {
          console.warn("Map data load failed:", e);
        }
      });
    })();

    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [orgId]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}

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
          <MapboxEmbed orgId={orgId} />

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
