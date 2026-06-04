'use client';

import { useState, useEffect, useRef } from "react";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
const cases: any[] = [];
import { Filter, Plus, Calendar, Layers } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { MapPinCard, type PinLayer, type MapPin } from "@/components/map/map-pin-card";

const LAYER_COLORS: Record<string, string> = {
  case: "#EF4E4B", resource: "#89CFF0", facility: "#4ADE80", event: "#A855F7",
};

const LAYERS = ["case", "resource", "facility", "event"] as const;

const WNC_COUNTY_CENTROIDS: Record<string, [number, number]> = {
  buncombe:     [-82.55, 35.55],
  henderson:    [-82.47, 35.33],
  madison:      [-82.73, 35.84],
  mcdowell:     [-82.03, 35.69],
  burke:        [-81.72, 35.76],
  catawba:      [-81.38, 35.66],
  haywood:      [-83.00, 35.55],
  transylvania: [-82.83, 35.20],
  yancey:       [-82.33, 35.90],
  mitchell:     [-82.17, 36.00],
  avery:        [-81.90, 36.05],
  watauga:      [-81.70, 36.20],
  caldwell:     [-81.57, 35.97],
  rutherford:   [-81.87, 35.40],
  polk:         [-82.07, 35.30],
  cherokee:     [-83.92, 35.12],
  graham:       [-83.83, 35.35],
  swain:        [-83.50, 35.49],
  jackson:      [-83.13, 35.30],
  macon:        [-83.42, 35.16],
  clay:         [-83.76, 35.05],
};

interface SelectedPin {
  pin: MapPin;
  x: number;
  y: number;
}

function hrefForPin(layer: PinLayer, id: string): string {
  if (layer === 'case') return `/app/cases/${id}`;
  if (layer === 'resource') return `/app/directory/resource/${id}`;
  if (layer === 'facility') return `/app/inventory#${id}`;
  return `/app/calendar#${id}`;
}

function MapboxEmbed({
  orgId,
  onPinSelect,
  onPinClear,
  featuresData,
  onMapReady,
}: {
  orgId: string;
  onPinSelect: (s: SelectedPin) => void;
  onPinClear: () => void;
  featuresData?: MapFeature[];
  onMapReady?: (map: any) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const onPinSelectRef = useRef(onPinSelect);
  onPinSelectRef.current = onPinSelect;
  const onPinClearRef = useRef(onPinClear);
  onPinClearRef.current = onPinClear;

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
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      mapInstance.current = map;

      map.on("load", async () => {
        try {
          // Use prop data instead of fetching again
          const features: any[] = featuresData ?? [];

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

            // Heatmap layer (hidden by default)
            map.addLayer({
              id: `${layer}-heatmap`,
              type: 'heatmap',
              source: srcId,
              layout: { visibility: 'none' },
              paint: {
                'heatmap-weight': ['interpolate', ['linear'], ['coalesce', ['get', 'point_count'], 1], 0, 0.6, 20, 1],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 6, 0.7, 12, 2.2],
                'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'transparent', 0.2, '#1a3850', 0.4, '#89CFF0', 0.6, '#EF4E4B', 0.8, '#FCD34D', 1, '#ffffff'],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 6, 14, 12, 42],
                'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.9, 13, 0],
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

            // Click unclustered → show MapPinCard overlay
            map.on("click", `${layer}-unclustered`, (e: any) => {
              const feat = e.features?.[0];
              if (!feat) return;
              const p = feat.properties || {};
              const id = String(p.id || p.uuid || '');
              const title = p.title || p.name || (id ? id.slice(0, 8) : layer);
              const subtitle = p.subtitle || p.county || p.location || p.owner_name || undefined;
              const status = p.status || undefined;
              onPinSelectRef.current({
                pin: {
                  layer: layer as PinLayer,
                  id,
                  title,
                  subtitle,
                  status,
                  href: hrefForPin(layer as PinLayer, id),
                  urgency: p.urgency || undefined,
                  county: p.county || undefined,
                  taxonomy: p.taxonomy_code || p.taxonomy || undefined,
                  capacity: p.capacity || p.capacity_available || undefined,
                  matchedTo: p.matched_to || undefined,
                  verifiedBy: p.verified_by || undefined,
                  date: p.date || p.event_date || undefined,
                  time: p.time || p.event_time || undefined,
                  filled: p.filled != null ? Number(p.filled) : p.current_count != null ? Number(p.current_count) : undefined,
                  slots: p.slots != null ? Number(p.slots) : p.capacity != null ? Number(p.capacity) : undefined,
                  type: p.type || p.facility_type || undefined,
                  description: p.description || undefined,
                },
                x: e.point.x,
                y: e.point.y,
              });
            });

            // Hover cursor
            map.on("mouseenter", `${layer}-clusters`, () => { map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", `${layer}-clusters`, () => { map.getCanvas().style.cursor = ""; });
            map.on("mouseenter", `${layer}-unclustered`, () => { map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", `${layer}-unclustered`, () => { map.getCanvas().style.cursor = ""; });
          }

          // Click on empty map → clear selected pin
          map.on("click", (e: any) => {
            const unclusteredLayers = LAYERS.map((l) => `${l}-unclustered`);
            const hits = map.queryRenderedFeatures(e.point, { layers: unclusteredLayers });
            if (hits.length === 0) onPinClearRef.current();
          });

          // Expose map instance to parent
          onMapReady?.(map);
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

  useEffect(() => {
    const handler = (e: Event) => {
      const map = mapInstance.current;
      if (!map) return;
      const cmd = (e as CustomEvent).detail;
      if (!cmd) return;

      if (cmd.action === "flyTo") {
        map.flyTo({ center: [cmd.lng, cmd.lat], zoom: cmd.zoom || 12 });
      } else if (cmd.action === "filter") {
        for (const layer of LAYERS) {
          const vis = Array.isArray(cmd.layers) && cmd.layers.includes(layer) ? "visible" : "none";
          for (const suffix of ["-clusters", "-cluster-glow", "-unclustered", "-glow", "-heatmap"]) {
            const layerId = `${layer}${suffix}`;
            if (map.getLayer(layerId)) {
              map.setLayoutProperty(layerId, "visibility", vis);
            }
          }
        }
      } else if (cmd.action === "mapMode") {
        for (const layer of LAYERS) {
          const isPins = cmd.mode === 'pins';
          for (const suffix of ["-clusters", "-cluster-glow", "-unclustered", "-glow"]) {
            const layerId = `${layer}${suffix}`;
            if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", isPins ? "visible" : "none");
          }
          const heatmapId = `${layer}-heatmap`;
          if (map.getLayer(heatmapId)) map.setLayoutProperty(heatmapId, "visibility", isPins ? "none" : "visible");
        }
      }
      if (cmd.action === "filter" && cmd.county) {
        const centroid = WNC_COUNTY_CENTROIDS[cmd.county.toLowerCase()];
        if (centroid) map.flyTo({ center: centroid, zoom: 10 });
      }
    };

    window.addEventListener("sos-map-cmd", handler);
    return () => window.removeEventListener("sos-map-cmd", handler);
  }, []);

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
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [features, setFeatures] = useState<MapFeature[]>([]);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    // admin: proceed without org filter
    api.crmMapFeatures(orgId || '')
      .then((res: unknown) => {
        const data = res as { features?: MapFeature[] };
        const featureList = Array.isArray(data) ? (data as MapFeature[]) : (data?.features ?? []);
        setFeatures(featureList);
        if (featureList.length > 0) setLayers(groupByLayer(featureList));
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
        <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden relative h-[calc(100dvh-220px)] min-h-[500px]">
          <MapboxEmbed
            orgId={orgId}
            onPinSelect={setSelectedPin}
            onPinClear={() => setSelectedPin(null)}
            featuresData={features}
            onMapReady={(map) => { mapRef.current = map; }}
          />
          {selectedPin && (
            <MapPinCard
              pin={selectedPin.pin}
              onClose={() => setSelectedPin(null)}
            />
          )}

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

        <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4 h-fit">
          <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-4">Map Layers</p>
          <div className="space-y-3">
            {[
              { label: "Cases", color: "#EF4E4B", count: layers?.cases?.length ?? 0 },
              { label: "Resources", color: "#89CFF0", count: layers?.resources?.length ?? 0 },
              { label: "Facilities", color: "#4ADE80", count: layers?.facilities?.length ?? 0 },
              { label: "Events", color: "#A855F7", count: layers?.events?.length ?? 0 },
            ].map((l) => (
              <label key={l.label} className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="sr-only peer" onChange={(e) => {
                    const map = mapRef.current;
                    if (!map) return;
                    const layerKey = l.label.toLowerCase().replace(/s$/, '');
                    const visibility = e.target.checked ? 'visible' : 'none';
                    [`${layerKey}-clusters`, `${layerKey}-cluster-glow`, `${layerKey}-unclustered`, `${layerKey}-glow`].forEach(id => {
                      try {
                        if (map.getLayer(id)) {
                          map.setLayoutProperty(id, 'visibility', visibility);
                        }
                      } catch {}
                    });
                  }} />
                  <span className="w-4 h-4 rounded border border-white/20 flex items-center justify-center peer-checked:bg-white/15 peer-checked:border-white/40 transition">
                    <span className="w-2 h-2 rounded-full peer-checked:opacity-100" style={{ background: l.color }} />
                  </span>
                  <span className="text-[13px] text-white/70 group-hover:text-white/90 transition">{l.label}</span>
                </div>
                <span className="font-mono text-[12px] text-white/45">{l.count.toLocaleString()}</span>
              </label>
            ))}
          </div>

          {hasRealData && (layers?.events?.length ?? 0) > 0 && (
            <div className="mt-5 pt-4 border-t border-white/10">
              <p className="font-mono text-xs uppercase tracking-wider text-[#A855F7] mb-3">
                Upcoming Events
              </p>
              {layers?.events?.slice(0, 5).map((f, i) => (
                <div key={`event-side-${i}`} className="rounded-xl bg-white/5 hover:bg-white/8 p-3 transition cursor-pointer mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={10} className="text-[#A855F7]" />
                    <span className="font-mono text-xs text-white/45">{f.properties.event_type as string ?? 'event'}</span>
                  </div>
                  <p className="text-[12px] font-medium">{f.properties.title as string ?? 'Untitled'}</p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </CrmShell>
  );
}
