import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CrmShell } from "@/components/crm/CrmShell";
import { PageHeader } from "@/components/crm/ManageTabs";
import {
  cases,
  requests,
  resources,
  reports,
  incidents,
  type County,
} from "@/lib/prototype-data";
import { Filter, Layers, ChevronRight, MapPin, Flame } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Map — SOS Connect" }] }),
  component: MapPage,
});

// Free, token-less dark raster basemap (CARTO). Raster avoids external glyph/font failures blocking demo pins.
const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [{ id: "carto-dark", type: "raster", source: "carto-dark" }],
};

// ---------- Geo: WNC counties + representative cities ----------
type CountyGeo = { lng: number; lat: number; cities: { name: string; lng: number; lat: number }[] };
const COUNTIES: Record<County, CountyGeo> = {
  Buncombe: {
    lng: -82.55, lat: 35.6, cities: [
      { name: "Asheville", lng: -82.5515, lat: 35.5951 },
      { name: "Weaverville", lng: -82.5604, lat: 35.6962 },
      { name: "Black Mountain", lng: -82.3215, lat: 35.6182 },
    ],
  },
  Henderson: {
    lng: -82.47, lat: 35.32, cities: [
      { name: "Hendersonville", lng: -82.4596, lat: 35.3187 },
      { name: "Flat Rock", lng: -82.4393, lat: 35.2693 },
    ],
  },
  Madison: {
    lng: -82.7, lat: 35.86, cities: [
      { name: "Marshall", lng: -82.6843, lat: 35.7973 },
      { name: "Mars Hill", lng: -82.5482, lat: 35.8276 },
      { name: "Hot Springs", lng: -82.8262, lat: 35.8929 },
    ],
  },
  McDowell: {
    lng: -82.05, lat: 35.68, cities: [
      { name: "Marion", lng: -82.0093, lat: 35.6837 },
      { name: "Old Fort", lng: -82.1851, lat: 35.6276 },
    ],
  },
  Burke: {
    lng: -81.7, lat: 35.74, cities: [
      { name: "Morganton", lng: -81.6848, lat: 35.7454 },
      { name: "Valdese", lng: -81.5642, lat: 35.7409 },
    ],
  },
  Catawba: {
    lng: -81.21, lat: 35.66, cities: [
      { name: "Hickory", lng: -81.3412, lat: 35.7344 },
      { name: "Newton", lng: -81.2215, lat: 35.6695 },
      { name: "Conover", lng: -81.2178, lat: 35.7068 },
    ],
  },
};

// Deterministic hash → small jitter
function jitter(seed: string, range = 0.025): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = ((h & 0xffff) / 0xffff - 0.5) * range;
  const b = (((h >> 16) & 0xffff) / 0xffff - 0.5) * range;
  return [a, b];
}

type Layer = "cases" | "requests" | "resources" | "reports";
type Feature = {
  id: string;
  layer: Layer;
  title: string;
  subtitle: string;
  county: County;
  city: string;
  lng: number;
  lat: number;
  color: string;
  href: string;
  disaster?: string;
};

function projectToMap(lng: number, lat: number) {
  const minLng = -82.95;
  const maxLng = -81.05;
  const minLat = 35.18;
  const maxLat = 35.98;
  return {
    x: Math.min(94, Math.max(6, ((lng - minLng) / (maxLng - minLng)) * 100)),
    y: Math.min(92, Math.max(8, (1 - (lat - minLat) / (maxLat - minLat)) * 100)),
  };
}

const LAYER_META: Record<Layer, { label: string; color: string }> = {
  cases: { label: "Cases", color: "#EF4E4B" },
  requests: { label: "Requests", color: "#89CFF0" },
  resources: { label: "Resources", color: "#34D399" },
  reports: { label: "Reports", color: "#89CFF0" },
};

function placeIn(county: County, seed: string) {
  const cg = COUNTIES[county];
  if (!cg) return { lng: -82.5, lat: 35.6, city: "Unknown" };
  // pick city by seed
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 17 + seed.charCodeAt(i)) | 0;
  const city = cg.cities[Math.abs(h) % cg.cities.length];
  const [dx, dy] = jitter(seed);
  return { lng: city.lng + dx, lat: city.lat + dy, city: city.name };
}

function countyFromLocation(loc: string): County | null {
  const lc = loc.toLowerCase();
  for (const k of Object.keys(COUNTIES) as County[]) {
    if (lc.includes(k.toLowerCase())) return k;
    if (COUNTIES[k].cities.some((c) => lc.includes(c.name.toLowerCase()))) return k;
  }
  return null;
}

function buildFeatures(): Feature[] {
  const out: Feature[] = [];

  // Cases
  for (const c of cases) {
    const p = placeIn(c.county, c.id);
    out.push({
      id: c.id, layer: "cases", title: c.citizen, subtitle: `${c.id} · ${c.taxonomy.join(", ")}`,
      county: c.county, city: p.city, lng: p.lng, lat: p.lat,
      color: c.urgency === "critical" ? "#EF4E4B" : LAYER_META.cases.color,
      href: `/cases/${c.id}`,
    });
  }
  // Requests
  for (const r of requests) {
    const p = placeIn(r.county, r.id);
    out.push({
      id: r.id, layer: "requests", title: r.personName, subtitle: `${r.id} · ${r.taxonomy}`,
      county: r.county, city: p.city, lng: p.lng, lat: p.lat,
      color: LAYER_META.requests.color, disaster: r.disaster,
      href: `/directory/request/${r.id}`,
    });
  }
  // Resources — derive county from location string when possible
  for (const res of resources) {
    const county = countyFromLocation(res.location) || "Buncombe";
    const p = placeIn(county, res.id);
    out.push({
      id: res.id, layer: "resources", title: res.title, subtitle: `${res.status} · ${res.location}`,
      county, city: p.city, lng: p.lng, lat: p.lat,
      color: LAYER_META.resources.color, href: `/directory/resource/${res.id}`,
    });
  }
  // Reports
  for (const rep of reports) {
    const county = countyFromLocation(rep.location) || "Buncombe";
    const p = placeIn(county, rep.id);
    out.push({
      id: rep.id, layer: "reports", title: rep.taxonomy, subtitle: `${rep.severity} · ${rep.location}`,
      county, city: p.city, lng: p.lng, lat: p.lat,
      color: rep.severity === "Critical" ? "#EF4E4B" : LAYER_META.reports.color,
      href: `/directory/report/${rep.id}`, disaster: rep.disaster,
    });
  }
  return out;
}

const ALL_FEATURES = buildFeatures();

function MapPage() {
  const navigate = useNavigate();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const styleReady = useRef(false);

  const [activeLayers, setActiveLayers] = useState<Record<Layer, boolean>>({
    cases: true, requests: true, resources: true, reports: true,
  });
  const [disaster, setDisaster] = useState<string>("all"); // "all" | incident.name
  const [mode, setMode] = useState<"pins" | "heatmap">("pins");
  const [sheetOpen, setSheetOpen] = useState(false);

  const features = useMemo(() => {
    return ALL_FEATURES.filter((f) => activeLayers[f.layer]).filter((f) => {
      if (disaster === "all") return true;
      const inc = incidents.find((i) => i.name === disaster);
      if (!inc) return true;
      if (f.disaster && f.disaster === disaster) return true;
      return f.county === inc.county;
    });
  }, [activeLayers, disaster]);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: features.map((f) => ({
        type: "Feature" as const,
        properties: {
          id: f.id,
          layer: f.layer,
          title: f.title,
          subtitle: f.subtitle,
          city: f.city,
          href: f.href,
          color: f.color,
        },
        geometry: { type: "Point" as const, coordinates: [f.lng, f.lat] },
      })),
    }),
    [features],
  );

  // Init map once
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapEl.current,
      style: BASEMAP_STYLE,
      center: [-82.4, 35.65],
      zoom: 7.6,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    requestAnimationFrame(() => map.resize());
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("sos", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Heatmap (hidden by default)
      map.addLayer({
        id: "sos-heat",
        type: "heatmap",
        source: "sos",
        maxzoom: 13,
        layout: { visibility: "none" },
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["coalesce", ["get", "point_count"], 1], 0, 0.6, 20, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 6, 0.7, 12, 2.2],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(15,30,43,0)",
            0.2, "rgba(137,207,240,0.35)",
            0.4, "rgba(52,211,153,0.55)",
            0.65, "rgba(245,235,214,0.75)",
            0.9, "rgba(239,78,75,0.9)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 6, 14, 12, 42],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.9, 13, 0],
        },
      });

      // Cluster bubbles
      map.addLayer({
        id: "sos-clusters",
        type: "circle",
        source: "sos",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "rgba(137,207,240,0.85)", 5,
            "rgba(245,235,214,0.9)", 15,
            "rgba(239,78,75,0.9)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 14, 5, 20, 15, 26],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#0F1E2B",
        },
      });

      // Unclustered points — colored by layer
      map.addLayer({
        id: "sos-points",
        type: "circle",
        source: "sos",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match", ["get", "layer"],
            "cases", "#EF4E4B",
            "requests", "#89CFF0",
            "resources", "#34D399",
            "reports", "#89CFF0",
            "#ffffff",
          ],
          "circle-radius": 6,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#0F1E2B",
        },
      });
      map.addLayer({
        id: "sos-point-halo",
        type: "circle",
        source: "sos",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 13,
          "circle-color": [
            "match", ["get", "layer"],
            "cases", "rgba(239,78,75,0.18)",
            "requests", "rgba(245,235,214,0.18)",
            "resources", "rgba(52,211,153,0.18)",
            "reports", "rgba(137,207,240,0.18)",
            "#E5E7EB",
          ],
          "circle-stroke-width": 0,
        },
      }, "sos-points");

      // Interactions
      map.on("click", "sos-clusters", (e: maplibregl.MapMouseEvent) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["sos-clusters"] })[0];
        if (!f) return;
        const clusterId = f.properties?.cluster_id as number | undefined;
        if (clusterId == null) return;
        const src = map.getSource("sos") as maplibregl.GeoJSONSource;
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        const result = src.getClusterExpansionZoom(clusterId) as unknown;
        Promise.resolve(result as Promise<number>)
          .then((zoom) => map.easeTo({ center: coords, zoom: zoom ?? map.getZoom() + 2 }))
          .catch(() => map.easeTo({ center: coords, zoom: map.getZoom() + 2 }));
      });
      map.on("click", "sos-points", (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const p = f.properties as Record<string, string>;
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ offset: 14, closeButton: false })
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:Inter,sans-serif;color:#0F1E2B;min-width:200px">
               <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#64748b">${LAYER_META[p.layer as Layer].label} · ${p.city}</div>
               <div style="font-weight:600;margin-top:2px">${p.title}</div>
               <div style="font-size:11px;color:#475569;margin-top:2px">${p.subtitle}</div>
               <button id="sos-go" style="margin-top:8px;font-size:11px;font-weight:600;color:#0F1E2B;background:#89CFF0;border-radius:6px;padding:4px 8px;cursor:pointer;border:0">Open →</button>
             </div>`,
          )
          .addTo(map);
        setTimeout(() => {
          document.getElementById("sos-go")?.addEventListener("click", () => {
            popupRef.current?.remove();
            navigate({ to: p.href });
          });
        }, 0);
      });

      const setCursor = (c: string) => () => (map.getCanvas().style.cursor = c);
      map.on("mouseenter", "sos-clusters", setCursor("pointer"));
      map.on("mouseleave", "sos-clusters", setCursor(""));
      map.on("mouseenter", "sos-points", setCursor("pointer"));
      map.on("mouseleave", "sos-points", setCursor(""));

      styleReady.current = true;
      (map.getSource("sos") as maplibregl.GeoJSONSource).setData(geojson);
    });

    const onResize = () => map.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      styleReady.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push data on change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    const src = map.getSource("sos") as maplibregl.GeoJSONSource | undefined;
    src?.setData(geojson);
  }, [geojson]);

  // Toggle pin vs heatmap mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    const pinsOn = mode === "pins";
    map.setLayoutProperty("sos-clusters", "visibility", pinsOn ? "visible" : "none");
    map.setLayoutProperty("sos-point-halo", "visibility", pinsOn ? "visible" : "none");
    map.setLayoutProperty("sos-points", "visibility", pinsOn ? "visible" : "none");
    map.setLayoutProperty("sos-heat", "visibility", pinsOn ? "none" : "visible");
  }, [mode]);

  // Fly when disaster changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (disaster === "all") {
      map.flyTo({ center: [-82.4, 35.65], zoom: 7.6, duration: 800 });
    } else {
      const inc = incidents.find((i) => i.name === disaster);
      const cg = inc ? COUNTIES[inc.county as County] : null;
      if (cg) map.flyTo({ center: [cg.lng, cg.lat], zoom: 9.2, duration: 900 });
    }
  }, [disaster]);

  // Grouped sidebar: State > County > City
  const grouped = useMemo(() => {
    const state: Record<string, Record<string, Feature[]>> = { NC: {} };
    for (const f of features) {
      const cKey = `${f.county} County`;
      state.NC[cKey] = state.NC[cKey] || [];
      state.NC[cKey].push(f);
    }
    return state;
  }, [features]);

  const totals = useMemo(() => {
    const t: Record<Layer, number> = { cases: 0, requests: 0, resources: 0, reports: 0 };
    for (const f of features) t[f.layer]++;
    return t;
  }, [features]);

  const toggle = (l: Layer) => setActiveLayers((s) => ({ ...s, [l]: !s[l] }));

  return (
    <CrmShell module="Map">
      <PageHeader
        title="Map"
        subtitle="Live operating picture for WNC."
        actions={
          <>
            <div className="inline-flex items-center rounded-lg bg-white/[0.05] p-0.5">
              <button
                onClick={() => setMode("pins")}
                className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11.5px] font-medium transition ${mode === "pins" ? "bg-white/12 text-white" : "text-white/55 hover:text-white/85"}`}
              >
                <MapPin size={11} /> Pins
              </button>
              <button
                onClick={() => setMode("heatmap")}
                className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11.5px] font-medium transition ${mode === "heatmap" ? "bg-white/12 text-white" : "text-white/55 hover:text-white/85"}`}
              >
                <Flame size={11} /> Heatmap
              </button>
            </div>
            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/8 hover:bg-white/12 text-[12px] font-medium transition">
              <Filter size={12} /> Filter
            </button>
          </>
        }
      />

      {/* Disaster toggle */}
      <div className="px-4 pt-4 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setDisaster("all")}
          className={`shrink-0 h-7 px-2.5 rounded-md text-[11.5px] font-medium transition ${
            disaster === "all" ? "bg-white/12 text-white" : "bg-white/[0.05] hover:bg-white/8 text-white/55 hover:text-white/85"
          }`}
        >
          All disasters
        </button>
        {incidents.map((i) => (
          <button
            key={i.id}
            onClick={() => setDisaster(i.name)}
            className={`shrink-0 h-7 px-2.5 rounded-md text-[11.5px] font-medium transition flex items-center gap-1.5 ${
              disaster === i.name ? "bg-white/12 text-white" : "bg-white/[0.05] hover:bg-white/8 text-white/55 hover:text-white/85"
            }`}
          >
            {i.priority === "urgent" && <span className="w-1.5 h-1.5 rounded-full bg-[#EF4E4B]" />}
            {i.name}
            <span className="font-mono text-[10px] opacity-60">{i.county}</span>
          </button>
        ))}
      </div>

      {/* Layer chips */}
      <div className="px-4 pt-3 flex items-center gap-1.5 overflow-x-auto md:flex-wrap md:overflow-visible scrollbar-hide">
        <span className="shrink-0 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-white/45 mr-1">
          <Layers size={11} /> Layers
        </span>
        {(Object.keys(LAYER_META) as Layer[]).map((l) => {
          const on = activeLayers[l];
          return (
            <button
              key={l}
              onClick={() => toggle(l)}
              className={`shrink-0 h-7 px-2.5 rounded-full text-[11px] font-medium transition flex items-center gap-1.5 border ${
                on ? "border-white/20 bg-white/10" : "border-white/8 bg-transparent text-white/45"
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: LAYER_META[l].color, opacity: on ? 1 : 0.4 }} />
              {LAYER_META[l].label}
              <span className="font-mono text-[10px] opacity-70">{totals[l]}</span>
            </button>
          );
        })}
      </div>

      {/* Map + sidebar — single map container, responsive layout */}
      <div className="md:grid md:px-6 md:pt-4 md:pb-6 md:lg:grid-cols-[1fr_340px] md:gap-4">
        <div className="relative md:rounded-2xl md:bg-[var(--surface-1)] md:border md:border-[var(--hairline)] overflow-hidden md:aspect-[16/10] h-[calc(100dvh-260px)] min-h-[360px] md:h-auto md:min-h-0 mt-3 md:mt-0 border-y md:border-y border-[var(--hairline)]">
          <div ref={mapEl} className="absolute inset-0" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(137,207,240,0.12),transparent_28%),linear-gradient(135deg,#E5E7EB,transparent_35%)]" />
          <div className="pointer-events-none absolute inset-0">
            {features.map((f) => {
              const p = projectToMap(f.lng, f.lat);
              return (
                <a
                  key={f.id}
                  href={f.href}
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  aria-label={`${LAYER_META[f.layer].label}: ${f.title}`}
                >
                  <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 transition group-hover:scale-125" style={{ background: f.color }} />
                  <span className="relative block h-3.5 w-3.5 rounded-full border-2 border-[var(--background)] shadow-[0_0_0_1px_#9CA3AF]" style={{ background: f.color }} />
                  <span className="pointer-events-none absolute left-4 top-1/2 hidden min-w-40 -translate-y-1/2 rounded-lg border border-[var(--hairline)] bg-[var(--surface-2)] px-2.5 py-2 text-left shadow-xl group-hover:block">
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-white/45">{LAYER_META[f.layer].label} · {f.city}</span>
                    <span className="block text-[12px] font-semibold text-white">{f.title}</span>
                    <span className="block truncate text-[10px] text-white/55">{f.subtitle}</span>
                  </span>
                </a>
              );
            })}
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white text-[#0F1E2B] text-[12.5px] font-semibold shadow-lg"
          >
            <Layers size={13} /> {features.length} items
          </button>
        </div>

        <aside className="hidden md:block rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4 max-h-[78vh] overflow-y-auto">
          <SidebarList grouped={grouped} disaster={disaster} count={features.length} />
        </aside>
      </div>


      {/* Mobile bottom sheet */}
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] rounded-t-2xl bg-[var(--background)] border-t border-[var(--hairline)] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--hairline)]">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-white/55">
                {disaster === "all" ? "All counties" : disaster} · {features.length}
              </p>
              <button onClick={() => setSheetOpen(false)} className="text-white/55 text-[13px]">Done</button>
            </div>
            <div className="overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <SidebarList grouped={grouped} disaster={disaster} count={features.length} hideHeader onPick={() => setSheetOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </CrmShell>
  );
}

function SidebarList({
  grouped, disaster, count, hideHeader, onPick,
}: {
  grouped: Record<string, Record<string, Feature[]>>;
  disaster: string;
  count: number;
  hideHeader?: boolean;
  onPick?: () => void;
}) {
  return (
    <>
      {!hideHeader && (
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-3">
          {disaster === "all" ? "All counties" : disaster} · {count} items
        </p>
      )}
      {Object.entries(grouped).map(([state, counties]) => (
        <div key={state} className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ChevronRight size={12} className="text-white/40" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/55">{state}</span>
          </div>
          <div className="space-y-3 pl-3">
            {Object.entries(counties)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([county, items]) => {
                const byCity: Record<string, Feature[]> = {};
                for (const it of items) (byCity[it.city] = byCity[it.city] || []).push(it);
                return (
                  <div key={county}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-medium">{county}</span>
                      <span className="font-mono text-[10px] text-white/45">{items.length}</span>
                    </div>
                    <div className="space-y-2 pl-2 border-l border-white/8">
                      {Object.entries(byCity).map(([city, list]) => (
                        <div key={city} className="pl-2">
                          <p className="font-mono text-[9px] uppercase tracking-wider text-white/40 mb-1">{city}</p>
                          <div className="space-y-1">
                            {list.map((f) => (
                              <a
                                key={f.id}
                                href={f.href}
                                onClick={onPick}
                                className="block rounded-lg bg-white/5 hover:bg-white/10 p-2 transition"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.color }} />
                                  <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
                                    {LAYER_META[f.layer].label}
                                  </span>
                                  <span className="font-mono text-[9px] text-white/35 ml-auto">{f.id}</span>
                                </div>
                                <p className="text-[12px] font-medium mt-0.5 truncate">{f.title}</p>
                                <p className="text-[10px] text-white/50 truncate">{f.subtitle}</p>
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
      {count === 0 && (
        <p className="text-[12px] text-white/45 text-center py-8">No items match these filters.</p>
      )}
    </>
  );
}

