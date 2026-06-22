"use client";

/**
 * Map — operating picture. Phase 5 (redesign 2026-06, SOS Connect System).
 * Full-height interactive Mapbox dark map wrapped in the console shell.
 * Legend chips double as layer toggles; clicking a pin opens a console-styled
 * detail card that links to the entity. Composed entirely from
 * @/components/console. Data via lib/api (EFs) only.
 *
 * No hardcoded hex lives outside MAP_STYLE — the Mapbox style/paint config is
 * its own concern (Mapbox needs literal colors). Everything else uses tokens.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import {
  ConsoleShell,
  AgentPanel,
  Surface,
  SectionLabel,
  Chip,
  Tag,
  Button,
  Spinner,
  EmptyState,
  StatusDot,
  useDemoMode,
  URGENCY_TONE,
  type DisasterOption,
  type AgentMessage,
  type AgentSuggestion,
  type EntityType,
  type StatusTone,
} from "@/components/console";

/* ------------------------------------------------------------------ */
/* Mapbox style config — the ONE place literal colors are allowed.     */
/* (Mapbox paint expressions require concrete color strings.) These    */
/* mirror the console tokens: coral / blue / amber + the navy bg.      */
/* ------------------------------------------------------------------ */
const MAP_STYLE = {
  url: "mapbox://styles/mapbox/dark-v11",
  center: [-95, 37] as [number, number],
  zoom: 3.6,
  stroke: "#0A131C", // --cn-bg
  layers: [
    { kind: "request", label: "Requests", tone: "new" as StatusTone, entity: "request" as EntityType, color: "#FF5A57" },
    { kind: "resource", label: "Resources", tone: "reserved" as StatusTone, entity: "resource" as EntityType, color: "#6BB8F0" },
    { kind: "report", label: "Reports", tone: "report" as StatusTone, entity: "report" as EntityType, color: "#F5B544" },
  ],
} as const;

type Kind = (typeof MAP_STYLE.layers)[number]["kind"];
const KINDS = MAP_STYLE.layers.map((l) => l.kind) as Kind[];
const LAYER_META = Object.fromEntries(MAP_STYLE.layers.map((l) => [l.kind, l])) as Record<
  Kind,
  (typeof MAP_STYLE.layers)[number]
>;

const SOURCE_ID = "sos-map";
const EMPTY_FC = { type: "FeatureCollection", features: [] as unknown[] };
const pointsLayer = (k: Kind) => `${k}-points`;
const glowLayer = (k: Kind) => `${k}-glow`;

interface PinSelection {
  id: string;
  kind: Kind;
  category: string;
  urgency: string;
}

interface Disaster {
  id: string;
  name: string;
  day?: number;
}

function hrefForPin(kind: Kind, id: string): string {
  if (kind === "resource") return `/app/directory/resource/${id}`;
  // requests + reports both resolve to their case workspace
  return `/app/cases/${id}`;
}

/* ------------------------------------------------------------------ */
/* MapCanvas — interactive Mapbox GL canvas (loads the real dep).      */
/* Presentational: parent owns features, visibility + selection.       */
/* ------------------------------------------------------------------ */
function MapCanvas({
  features,
  visible,
  onSelect,
  onClear,
}: {
  features: typeof EMPTY_FC;
  visible: Record<Kind, boolean>;
  onSelect: (pin: PinSelection) => void;
  onClear: () => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapboxRef = useRef<any>(null);
  const didFit = useRef(false);
  const [ready, setReady] = useState(false);

  // Keep latest handlers without re-initialising the map.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  // One-time map init.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return; // parent renders the fallback

    let cancelled = false;

    if (!document.getElementById("mapbox-css")) {
      const link = document.createElement("link");
      link.id = "mapbox-css";
      link.rel = "stylesheet";
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css";
      document.head.appendChild(link);
    }

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !elRef.current) return;
      mapboxRef.current = mapboxgl;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: elRef.current,
        style: MAP_STYLE.url,
        center: MAP_STYLE.center,
        zoom: MAP_STYLE.zoom,
        attributionControl: false,
      });
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
      mapRef.current = map;

      map.on("load", () => {
        map.addSource(SOURCE_ID, { type: "geojson", data: EMPTY_FC as any });

        for (const layer of MAP_STYLE.layers) {
          const filter = ["==", ["get", "kind"], layer.kind] as any;

          map.addLayer({
            id: glowLayer(layer.kind),
            type: "circle",
            source: SOURCE_ID,
            filter,
            paint: {
              "circle-color": layer.color,
              "circle-radius": 13,
              "circle-opacity": 0.18,
              "circle-blur": 1,
            },
          });
          map.addLayer({
            id: pointsLayer(layer.kind),
            type: "circle",
            source: SOURCE_ID,
            filter,
            paint: {
              "circle-color": layer.color,
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 12, 8],
              "circle-stroke-width": 2,
              "circle-stroke-color": MAP_STYLE.stroke,
            },
          });

          map.on("click", pointsLayer(layer.kind), (e: any) => {
            const f = e.features?.[0];
            if (!f) return;
            const p = f.properties || {};
            onSelectRef.current({
              id: String(p.id ?? ""),
              kind: layer.kind,
              category: String(p.category ?? ""),
              urgency: String(p.urgency ?? ""),
            });
          });
          map.on("mouseenter", pointsLayer(layer.kind), () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", pointsLayer(layer.kind), () => {
            map.getCanvas().style.cursor = "";
          });
        }

        // Click on empty map → dismiss the detail card.
        map.on("click", (e: any) => {
          const ids = KINDS.map(pointsLayer).filter((id) => map.getLayer(id));
          const hits = map.queryRenderedFeatures(e.point, { layers: ids });
          if (hits.length === 0) onClearRef.current();
        });

        setReady(true);
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
      didFit.current = false;
    };
  }, []);

  // Sync feature data + fit to bounds once.
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !ready) return;
    const src = map.getSource(SOURCE_ID);
    if (src) src.setData(features as any);

    if (!didFit.current && mapboxgl && features.features.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      let any = false;
      for (const f of features.features as any[]) {
        const c = f?.geometry?.coordinates;
        if (Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
          bounds.extend(c as [number, number]);
          any = true;
        }
      }
      if (any) {
        map.fitBounds(bounds, { padding: 64, maxZoom: 11, duration: 0 });
        didFit.current = true;
      }
    }
  }, [features, ready]);

  // Sync layer visibility.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const k of KINDS) {
      const vis = visible[k] ? "visible" : "none";
      for (const id of [pointsLayer(k), glowLayer(k)]) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
      }
    }
  }, [visible, ready]);

  return <div ref={elRef} style={{ position: "absolute", inset: 0 }} />;
}

/* ------------------------------------------------------------------ */
/* PinDetail — console-styled detail card for a selected pin.          */
/* ------------------------------------------------------------------ */
function PinDetail({ pin, onClose }: { pin: PinSelection; onClose: () => void }) {
  const router = useRouter();
  const meta = LAYER_META[pin.kind];
  const tone = URGENCY_TONE[(pin.urgency || "").toLowerCase()] || "neutral";
  const title = pin.category || meta.label;
  return (
    <Surface
      variant="card"
      pad={4}
      radius="lg"
      style={{ width: "min(340px, calc(100vw - 32px))", boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <Tag type={meta.entity} />
        <button
          aria-label="Close detail"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--cn-text-3)",
            cursor: "pointer",
            display: "inline-flex",
            padding: 2,
          }}
        >
          <X size={15} />
        </button>
      </div>

      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 19,
          color: "var(--cn-text)",
          marginTop: 6,
          textTransform: "capitalize",
        }}
      >
        {title}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {pin.urgency && <Chip tone={tone}>{pin.urgency}</Chip>}
        <Chip tone={meta.tone}>{meta.label.replace(/s$/, "")}</Chip>
      </div>

      <div style={{ marginTop: 14 }}>
        <Button
          variant="primary"
          size="sm"
          onClick={() => router.push(hrefForPin(pin.kind, pin.id))}
          leading={<ArrowUpRight size={14} />}
          disabled={!pin.id}
          style={{ width: "100%" }}
        >
          Open {pin.kind === "resource" ? "in directory" : "case"}
        </Button>
      </div>
    </Surface>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function MapPage() {
  const router = useRouter();
  const { orgId } = useAuthContext();
  const demo = useDemoMode();

  const [disasters, setDisasters] = useState<DisasterOption[]>([]);
  const [activeDisaster, setActiveDisaster] = useState<string | undefined>();
  const [features, setFeatures] = useState<typeof EMPTY_FC | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<Kind, boolean>>({ request: true, resource: true, report: true });
  const [selected, setSelected] = useState<PinSelection | null>(null);

  const tokenMissing = !process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Load disasters once.
  useEffect(() => {
    let alive = true;
    api
      .crmDisastersList()
      .then((d: any) => {
        if (!alive) return;
        const list: Disaster[] = (d?.disasters || d || []).map((x: any) => ({
          id: x.id,
          name: x.name,
          day: x.day ?? x.day_count,
        }));
        setDisasters(list);
      })
      .catch(() => alive && setDisasters([]));
    return () => {
      alive = false;
    };
  }, []);

  // Load map features when org/disaster changes.
  const loadFeatures = useMemo(
    () => () => {
      if (!orgId) return;
      let alive = true;
      setFeatures(null);
      setError(null);
      const filters = activeDisaster ? { disaster_id: activeDisaster } : undefined;
      api
        .crmMapFeatures(orgId, filters)
        .then((f: any) => {
          if (!alive) return;
          const feats = Array.isArray(f?.features) ? f.features : [];
          setFeatures({ type: "FeatureCollection", features: feats });
        })
        .catch(() => {
          if (!alive) return;
          setError("Couldn't load map data.");
          setFeatures({ type: "FeatureCollection", features: [] });
        });
      return () => {
        alive = false;
      };
    },
    [orgId, activeDisaster],
  );

  useEffect(() => {
    const cleanup = loadFeatures();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFeatures, demo]);

  // Selected pin must clear if its layer is toggled off.
  useEffect(() => {
    if (selected && !visible[selected.kind]) setSelected(null);
  }, [visible, selected]);

  const counts = useMemo(() => {
    const base: Record<Kind, number> = { request: 0, resource: 0, report: 0 };
    for (const f of features?.features ?? []) {
      const k = (f as any)?.properties?.kind as Kind | undefined;
      if (k && k in base) base[k] += 1;
    }
    return base;
  }, [features]);

  const total = counts.request + counts.resource + counts.report;
  const loading = features === null;

  const agentMessages: AgentMessage[] = useMemo(
    () => [
      {
        id: "m1",
        role: "agent",
        text: loading
          ? "Pulling the latest operating picture…"
          : `${total} markers on the map — ${counts.request} requests, ${counts.resource} resources, ${counts.report} reports.`,
      },
      { id: "m2", role: "agent", text: "Toggle a layer or tap a pin to drill in." },
    ],
    [loading, total, counts],
  );

  const agentSuggestions: AgentSuggestion[] = [
    { id: "cases", label: "Open cases", tone: "new", onSelect: () => router.push("/app/cases") },
    { id: "directory", label: "Directory", onSelect: () => router.push("/app/directory") },
  ];

  return (
    <ConsoleShell
      bare
      navCounts={{ map: counts.request }}
      disasters={disasters}
      activeDisasterId={activeDisaster}
      onSelectDisaster={setActiveDisaster}
      agent={
        <AgentPanel
          status={loading ? "Loading" : `Watching · ${total} markers`}
          statusTone="active"
          messages={agentMessages}
          suggestions={agentSuggestions}
          onSend={() => router.push("/app/cases")}
        />
      }
    >
      <div
        className="cn-map-wrap"
        style={{
          position: "relative",
          width: "100%",
          height: "calc(100dvh - 110px)",
          minHeight: 360,
          overflow: "hidden",
          background: "var(--cn-sunken)",
        }}
      >
        {tokenMissing ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <EmptyState
              title="Map unavailable"
              hint="Set NEXT_PUBLIC_MAPBOX_TOKEN to render the operating picture."
            />
          </div>
        ) : (
          <MapCanvas features={features ?? EMPTY_FC} visible={visible} onSelect={setSelected} onClear={() => setSelected(null)} />
        )}

        {/* Legend chips — double as layer toggles */}
        {!tokenMissing && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              zIndex: 10,
            }}
          >
            {MAP_STYLE.layers.map((l) => {
              const on = visible[l.kind];
              return (
                <button
                  key={l.kind}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setVisible((v) => ({ ...v, [l.kind]: !v[l.kind] }))}
                  title={`${on ? "Hide" : "Show"} ${l.label.toLowerCase()}`}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    opacity: on ? 1 : 0.45,
                    filter: on ? "none" : "grayscale(0.6)",
                    transition: "opacity .15s",
                  }}
                >
                  <Chip tone={l.tone} muted={!on}>
                    {l.label} {counts[l.kind]}
                  </Chip>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading overlay */}
        {!tokenMissing && loading && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Surface variant="card" pad={2} radius="md" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Spinner size={13} />
              <SectionLabel>Loading map</SectionLabel>
            </Surface>
          </div>
        )}

        {/* Error / empty banners */}
        {!tokenMissing && !loading && error && (
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, maxWidth: 260 }}>
            <Surface variant="card" pad={3} radius="md">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <StatusDot tone="new" size={7} />
                <SectionLabel tone="new">Map error</SectionLabel>
              </div>
              <div style={{ fontSize: 13, color: "var(--cn-text-2)", marginBottom: 10 }}>{error}</div>
              <Button size="sm" onClick={() => loadFeatures()}>
                Retry
              </Button>
            </Surface>
          </div>
        )}
        {!tokenMissing && !loading && !error && total === 0 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 16,
              transform: "translateX(-50%)",
              zIndex: 10,
            }}
          >
            <Surface variant="card" pad={3} radius="md">
              <SectionLabel>No markers in this view</SectionLabel>
            </Surface>
          </div>
        )}

        {/* Selected pin detail */}
        {selected && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 20,
              transform: "translateX(-50%)",
              zIndex: 20,
            }}
          >
            <PinDetail pin={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}
