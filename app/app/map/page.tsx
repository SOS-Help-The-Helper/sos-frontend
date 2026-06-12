'use client';

import { useState, useEffect, useRef } from "react";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
const cases: any[] = [];
import { Filter, Plus, Calendar, Layers } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { type PinLayer, type MapPin } from "@/components/map/map-pin-card";
import { PinDetailCard, type PinType } from "@/components/citizen/pin-detail-card";

const LAYER_COLORS: Record<string, string> = {
  case: "#EF4E4B", resource: "#89CFF0", facility: "#4ADE80", event: "#A855F7",
};

const LAYERS = ["case", "resource", "facility", "event"] as const;

// CRM layer name → vector-tile `type` property value (single 'sos' source-layer).
// Cases are stored as requests in the tiles; resources/facilities/events map 1:1.
const TYPE_FILTER: Record<(typeof LAYERS)[number], string> = {
  case: "request",
  resource: "resource",
  facility: "facility",
  event: "event",
};

// Mapbox layer id suffixes managed per CRM layer (points, glow, heatmap).
const LAYER_SUFFIXES = ["-glow", "-points", "-heatmap"] as const;

function tilesUrlFor(orgId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  // 'sos' is the synthetic all-partners view → public tiles. Empty/null → public.
  // All tiles served from /api/map/tiles/{z}/{x}/{y} — org_id passed as query param.
  if (orgId && orgId !== "sos") {
    return `${origin}/api/map/tiles/{z}/{x}/{y}?org_id=${encodeURIComponent(orgId)}`;
  }
  return `${origin}/api/map/tiles/{z}/{x}/{y}`;
}

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

// CRM layer → PinDetailCard type (request/resource/report)
const PIN_TYPE_FOR_LAYER: Record<PinLayer, PinType> = {
  case: "request",
  resource: "resource",
  facility: "resource",
  event: "report",
};

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
  onMapReady,
}: {
  orgId: string;
  onPinSelect: (s: SelectedPin) => void;
  onPinClear: () => void;
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

      map.on("load", () => {
        try {
          // === SOS POSTGIS VECTOR TILES SOURCE ===
          // Org-scoped tiles for a real org; public tiles for the 'sos' all-partners view.
          map.addSource("sos-tiles", {
            type: "vector",
            tiles: [tilesUrlFor(orgId)],
            minzoom: 2,
            maxzoom: 14,
          });

          for (const layer of LAYERS) {
            const color = LAYER_COLORS[layer];
            const filter = ["==", ["get", "type"], TYPE_FILTER[layer]] as any;

            // Glow ring
            map.addLayer({
              id: `${layer}-glow`,
              type: "circle",
              source: "sos-tiles",
              "source-layer": "sos",
              filter,
              paint: {
                "circle-color": color,
                "circle-radius": 12,
                "circle-opacity": 0.2,
                "circle-blur": 1,
              },
            });

            // Points
            map.addLayer({
              id: `${layer}-points`,
              type: "circle",
              source: "sos-tiles",
              "source-layer": "sos",
              filter,
              paint: {
                "circle-color": color,
                "circle-radius": 6,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#0F1E2B",
              },
            });

            // Heatmap layer (hidden by default — toggled via mapMode command)
            map.addLayer({
              id: `${layer}-heatmap`,
              type: "heatmap",
              source: "sos-tiles",
              "source-layer": "sos",
              filter,
              layout: { visibility: "none" },
              paint: {
                "heatmap-weight": ["match", ["get", "urgency"], "critical", 1, "high", 0.7, "medium", 0.4, 0.2],
                "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 6, 0.7, 12, 2.2],
                "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "transparent", 0.2, "#1a3850", 0.4, "#89CFF0", 0.6, "#EF4E4B", 0.8, "#FCD34D", 1, "#ffffff"],
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 6, 14, 12, 42],
                "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.9, 13, 0],
              },
            });

            // Click point → show MapPinCard overlay
            map.on("click", `${layer}-points`, (e: any) => {
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
                  location_text: p.location_text || p.location || undefined,
                  public_display_text: p.public_display_text || p.description || undefined,
                  household_size: p.household_size || undefined,
                  org_name: p.org_name || undefined,
                  created_at: p.created_at || undefined,
                  capacity_remaining: p.capacity_remaining || undefined,
                  corroboration_count: p.corroboration_count || undefined,
                  category: p.category || undefined,
                  taxonomy_code: p.taxonomy_code || p.taxonomy || undefined,
                },
                x: e.point.x,
                y: e.point.y,
              });
            });

            // Hover cursor
            map.on("mouseenter", `${layer}-points`, () => { map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", `${layer}-points`, () => { map.getCanvas().style.cursor = ""; });
          }

          // Click on empty map → clear selected pin
          map.on("click", (e: any) => {
            const pointLayers = LAYERS.map((l) => `${l}-points`).filter((id) => map.getLayer(id));
            const hits = map.queryRenderedFeatures(e.point, { layers: pointLayers });
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
          for (const suffix of LAYER_SUFFIXES) {
            const layerId = `${layer}${suffix}`;
            if (map.getLayer(layerId)) {
              map.setLayoutProperty(layerId, "visibility", vis);
            }
          }
        }
      } else if (cmd.action === "mapMode") {
        for (const layer of LAYERS) {
          const isPins = cmd.mode === 'pins';
          for (const suffix of ["-glow", "-points"]) {
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

const MAP_VIEWS = [
  { key: "deployment", label: "Deployment", src: null },
  { key: "ems", label: "EMS", src: "/maps/ems.html" },
  { key: "county", label: "County", src: "/maps/county.html" },
  { key: "state", label: "State", src: "/maps/state.html" },
  { key: "federal", label: "Federal", src: "/maps/federal.html" },
  { key: "admin", label: "Admin", src: "/maps/admin.html" },
] as const;

type MapViewKey = (typeof MAP_VIEWS)[number]["key"];

export default function MapPage() {
  const { orgId } = useAuthContext();
  const [mapView, setMapView] = useState<MapViewKey>("deployment");
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const mapRef = useRef<any>(null);

  return (
    <CrmShell module="Map">
      <PageHeader
        title="Map"
        subtitle="Western North Carolina · live"
        actions={
          <>
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white/8">
              {MAP_VIEWS.map((v) => {
                const active = mapView === v.key;
                return (
                  <button
                    key={v.key}
                    onClick={() => setMapView(v.key)}
                    className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition border ${
                      active
                        ? "bg-white/15 border-white/40 text-white"
                        : "border-transparent text-white/55 hover:text-white/85"
                    }`}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
            {mapView === "deployment" && (
              <>
                <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/8 hover:bg-white/12 text-[12px] font-medium transition">
                  <Filter size={12} /> Filter
                </button>
                <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition">
                  <Plus size={12} /> Drop pin
                </button>
              </>
            )}
          </>
        }
      />

      {mapView !== "deployment" ? (
        <div className="px-6 pt-6 pb-6">
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden relative h-[calc(100dvh-220px)] min-h-[500px]">
            <iframe
              key={mapView}
              src={MAP_VIEWS.find((v) => v.key === mapView)?.src ?? ""}
              title={MAP_VIEWS.find((v) => v.key === mapView)?.label}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      ) : (
      <div className="px-6 pt-6 pb-6 grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden relative h-[calc(100dvh-220px)] min-h-[500px]">
          <MapboxEmbed
            key={orgId ?? 'sos'}
            orgId={orgId ?? 'sos'}
            onPinSelect={setSelectedPin}
            onPinClear={() => setSelectedPin(null)}
            onMapReady={(map) => { mapRef.current = map; }}
          />
          {selectedPin && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex justify-center w-full px-4 pointer-events-none">
              <PinDetailCard
                type={PIN_TYPE_FOR_LAYER[selectedPin.pin.layer]}
                properties={selectedPin.pin as Record<string, any>}
                onClose={() => setSelectedPin(null)}
              />
            </div>
          )}

          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {["HOUSING", "FOOD", "MEDICAL", "CHILDCARE"].map((t) => (
              <button key={t} className="font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded-full bg-black/40 backdrop-blur text-white/70 hover:text-white">
                {t}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-1 bg-black/50 backdrop-blur rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4E4B] inline-block" />
              <span className="font-mono text-[9px] text-white/70">Cases</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#89CFF0] inline-block" />
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
        </div>

        <aside className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4 h-fit">
          <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-4">Map Layers</p>
          <div className="space-y-3">
            {[
              { label: "Cases", color: "#EF4E4B", layerKey: "case" },
              { label: "Resources", color: "#89CFF0", layerKey: "resource" },
              { label: "Facilities", color: "#4ADE80", layerKey: "facility" },
              { label: "Events", color: "#A855F7", layerKey: "event" },
            ].map((l) => (
              <label key={l.label} className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="sr-only peer" onChange={(e) => {
                    const map = mapRef.current;
                    if (!map) return;
                    const visibility = e.target.checked ? 'visible' : 'none';
                    [`${l.layerKey}-points`, `${l.layerKey}-glow`].forEach(id => {
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
              </label>
            ))}
          </div>
        </aside>
      </div>
      )}
    </CrmShell>
  );
}
