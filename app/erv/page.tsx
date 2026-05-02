'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const ERV_QUERY_URL = 'https://rtduqguwhkczexnoawej.supabase.co/functions/v1/erv-query';
const ERV_AUTH = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0ZHVxZ3V3aGtjemV4bm9hd2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2Njg1ODAsImV4cCI6MjA2NzI0NDU4MH0.1QZ5ofS-ND_OI71igPlxxMTyZJJRlATSSC0djccWR8o';

type SelectedPin = {
  type: 'request' | 'resource' | 'driver';
  id: string;
  properties: Record<string, any>;
};

async function ervQuery(queryType: string, filters?: Record<string, any>) {
  const res = await fetch(ERV_QUERY_URL, {
    method: 'POST',
    headers: { Authorization: ERV_AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_type: queryType, filters, limit: 5000 }),
  });
  return res.json();
}

export default function ErvMapPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0F1E2B', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#89CFF0', fontSize: 14 }}>Loading ERV Map...</span></div>}>
      <ErvMap />
    </Suspense>
  );
}

function ErvMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const layerClickedRef = useRef(false);
  const mapInstance = useRef<any>(null);
  const mapboxglRef = useRef<any>(null);
  const searchParams = useSearchParams();
  const deepLinkPin = searchParams.get('pin');
  const deepLinkType = searchParams.get('type');

  const [lat, setLat] = useState(29.2);
  const [lng, setLng] = useState(-82.1);
  const [locationName, setLocationName] = useState('Ocala, FL');
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [stats, setStats] = useState<{ families: number; rvs: number; drivers: number; people: number }>({ families: 0, rvs: 0, drivers: 0, people: 0 });

  // GPS
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        setLat(p.coords.latitude);
        setLng(p.coords.longitude);
        if (mapInstance.current) {
          mapInstance.current.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 8, duration: 1500 });
        }
        try {
          const gKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
          if (gKey) {
            const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${p.coords.latitude},${p.coords.longitude}&key=${gKey}&result_type=locality`);
            const data = await res.json();
            if (data.results?.[0]) {
              const components = data.results[0].address_components || [];
              const city = components.find((c: any) => c.types.includes('locality'))?.long_name;
              const state = components.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name;
              if (city && state) setLocationName(`${city}, ${state}`);
            }
          }
        } catch {}
      },
      () => {}, { enableHighAccuracy: true, timeout: 3000 }
    );
  }, []);

  // Map init + data load
  useEffect(() => {
    if (!mapRef.current || !MAPBOX_TOKEN) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    let glowFrame = 0;
    let destroyed = false;

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      mapboxglRef.current = mapboxgl;
      await import('mapbox-gl/dist/mapbox-gl.css');
      if (!mapRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-82.1, 29.2], // Ocala, FL (ERV staging)
        zoom: 4,
        attributionControl: false,
      });
      mapInstance.current = map;

      map.on('load', async () => {
        // Fetch ERV data via edge functions
        let requests: any[] = [], resources: any[] = [], drivers: any[] = [];
        try {
          const [reqRes, fleetRes, driverRes] = await Promise.all([
            ervQuery('request_summary'),
            ervQuery('fleet_status'),
            ervQuery('driver_status'),
          ]);
          requests = reqRes?.data?.requests || [];
          resources = fleetRes?.data?.resources || [];
          drivers = (Array.isArray(driverRes?.data) ? driverRes.data : driverRes?.data?.resources || driverRes?.data || []);
          
          setStats({
            families: reqRes?.data?.total || requests.length,
            rvs: fleetRes?.data?.total || resources.length,
            drivers: Array.isArray(drivers) ? drivers.length : 0,
            people: reqRes?.data?.total_household || 0,
          });
        } catch (err) {
          console.error('ERV data load error:', err);
        }

        // === REQUESTS (red) — survivors needing help ===
        const requestFeatures = requests.filter((r: any) => r.latitude && r.longitude).map((r: any) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
          properties: {
            id: r.id, type: 'request', status: r.status, priority_score: r.priority_score,
            household_size: r.household_size, state: r.state, is_veteran: r.is_veteran,
            is_first_responder: r.is_first_responder, is_fema_replacement: r.is_fema_replacement,
            disaster_id: r.disaster_id,
          },
        }));

        map.addSource('requests-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: requestFeatures },
          cluster: true, clusterMaxZoom: 14, clusterRadius: 40, clusterMinPoints: 5,
        });

        // Cluster glow
        map.addLayer({ id: 'requests-cluster-glow', type: 'circle', source: 'requests-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#EF4E4B', 'circle-radius': ['step', ['get', 'point_count'], 32, 10, 43, 50, 58], 'circle-opacity': 0.3, 'circle-blur': 1 } });
        map.addLayer({ id: 'requests-clusters', type: 'circle', source: 'requests-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#EF4E4B', 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32], 'circle-opacity': 0.6 } });
        map.addLayer({ id: 'requests-cluster-count', type: 'symbol', source: 'requests-source', filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium'], 'text-size': 12 },
          paint: { 'text-color': '#ffffff' } });
        map.addLayer({ id: 'requests-hit', type: 'circle', source: 'requests-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': 'transparent', 'circle-radius': 22 } });
        map.addLayer({ id: 'requests-points', type: 'circle', source: 'requests-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#EF4E4B', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });

        // === RESOURCES (blue) — RVs ===
        const resourceFeatures = resources.filter((r: any) => r.latitude && r.longitude).map((r: any) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
          properties: {
            id: r.id, type: 'resource', status: r.status, source: r.source,
            vehicle_type: r.vehicle_type, sleeps: r.sleeps, vin: r.vin,
            year: r.year, make: r.make, model: r.model,
          },
        }));

        map.addSource('resources-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: resourceFeatures },
          cluster: true, clusterMaxZoom: 14, clusterRadius: 40, clusterMinPoints: 5,
        });

        map.addLayer({ id: 'resources-cluster-glow', type: 'circle', source: 'resources-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#89CFF0', 'circle-radius': ['step', ['get', 'point_count'], 32, 10, 43, 50, 58], 'circle-opacity': 0.3, 'circle-blur': 1 } });
        map.addLayer({ id: 'resources-clusters', type: 'circle', source: 'resources-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#89CFF0', 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32], 'circle-opacity': 0.6 } });
        map.addLayer({ id: 'resources-cluster-count', type: 'symbol', source: 'resources-source', filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium'], 'text-size': 12 },
          paint: { 'text-color': '#ffffff' } });
        map.addLayer({ id: 'resources-hit', type: 'circle', source: 'resources-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': 'transparent', 'circle-radius': 22 } });
        map.addLayer({ id: 'resources-points', type: 'circle', source: 'resources-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#89CFF0', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });

        // === DRIVERS (green) ===
        const driverFeatures = (Array.isArray(drivers) ? drivers : []).filter((d: any) => d.latitude && d.longitude).map((d: any) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [d.longitude, d.latitude] },
          properties: {
            id: d.id, type: 'driver', status: d.status,
            display_name: d.persons?.display_name || 'Driver',
            tow_capability: JSON.stringify(d.tow_capability || []),
            has_class_a: d.has_class_a,
          },
        }));

        map.addSource('drivers-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: driverFeatures },
          cluster: true, clusterMaxZoom: 14, clusterRadius: 40, clusterMinPoints: 5,
        });

        map.addLayer({ id: 'drivers-cluster-glow', type: 'circle', source: 'drivers-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#4CAF50', 'circle-radius': ['step', ['get', 'point_count'], 28, 5, 38, 20, 48], 'circle-opacity': 0.3, 'circle-blur': 1 } });
        map.addLayer({ id: 'drivers-clusters', type: 'circle', source: 'drivers-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#4CAF50', 'circle-radius': ['step', ['get', 'point_count'], 16, 5, 22, 20, 28], 'circle-opacity': 0.6 } });
        map.addLayer({ id: 'drivers-cluster-count', type: 'symbol', source: 'drivers-source', filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium'], 'text-size': 12 },
          paint: { 'text-color': '#ffffff' } });
        map.addLayer({ id: 'drivers-points', type: 'circle', source: 'drivers-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#4CAF50', 'circle-radius': 7, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });

        // === USER LOCATION (pulsing green) ===
        map.addSource('user-location', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} } });
        map.addLayer({ id: 'user-pulse', type: 'circle', source: 'user-location',
          paint: { 'circle-color': '#34d399', 'circle-radius': 24, 'circle-opacity': 0.2 } });
        map.addLayer({ id: 'user-dot', type: 'circle', source: 'user-location',
          paint: { 'circle-color': '#34d399', 'circle-radius': 7, 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' } });

        // === CLUSTER GLOW ANIMATION ===
        const animateGlow = () => {
          if (destroyed) return;
          try {
            const t = Date.now() / 1000;
            const pulse = 0.5 + 0.5 * Math.sin(t * 1.2);
            const glowLayers = [
              { id: 'requests-cluster-glow', baseRadius: [32, 43, 58], baseOpacity: 0.3 },
              { id: 'resources-cluster-glow', baseRadius: [32, 43, 58], baseOpacity: 0.3 },
              { id: 'drivers-cluster-glow', baseRadius: [28, 38, 48], baseOpacity: 0.3 },
            ];
            glowLayers.forEach(({ id, baseRadius, baseOpacity }) => {
              if (!map.getLayer(id)) return;
              const scale = 1 + pulse * 0.3;
              map.setPaintProperty(id, 'circle-radius', ['step', ['get', 'point_count'], baseRadius[0] * scale, 10, baseRadius[1] * scale, 50, baseRadius[2] * scale]);
              map.setPaintProperty(id, 'circle-opacity', baseOpacity * (0.6 + pulse * 0.4));
            });
          } catch {}
          glowFrame = requestAnimationFrame(animateGlow);
        };
        animateGlow();

        // === CLICK HANDLERS ===
        const clickLayers = [
          { layers: ['requests-hit', 'requests-points'], type: 'request' as const },
          { layers: ['resources-hit', 'resources-points'], type: 'resource' as const },
          { layers: ['drivers-points'], type: 'driver' as const },
        ];
        clickLayers.forEach(({ layers, type }) => {
          layers.forEach(layer => {
            map.on('click', layer, (e: any) => {
              if (!e.features?.length) return;
              layerClickedRef.current = true;
              const props = e.features[0].properties;
              setSelectedPin({ type, id: props.id, properties: typeof props === 'string' ? JSON.parse(props) : props });
            });
            map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
          });
        });

        // Cluster click → zoom
        ['requests-clusters', 'resources-clusters', 'drivers-clusters'].forEach(layer => {
          map.on('click', layer, (e: any) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [layer] });
            if (!features.length) return;
            layerClickedRef.current = true;
            const clusterId = features[0].properties?.cluster_id;
            const sourceName = layer.replace('-clusters', '-source');
            (map.getSource(sourceName) as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
              if (err || zoom == null) return;
              map.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
            });
          });
        });

        // Click empty → dismiss
        map.on('click', () => {
          setTimeout(() => {
            if (layerClickedRef.current) { layerClickedRef.current = false; return; }
            setSelectedPin(null);
          }, 100);
        });

        // Deep link: zoom to specific pin
        if (deepLinkPin) {
          const allFeatures = [...requestFeatures, ...resourceFeatures, ...driverFeatures];
          const target = allFeatures.find(f => f.properties.id === deepLinkPin);
          if (target) {
            const [tLng, tLat] = target.geometry.coordinates;
            setTimeout(() => {
              map.flyTo({ center: [tLng, tLat], zoom: 14, duration: 1500 });
              setSelectedPin({ type: target.properties.type, id: target.properties.id, properties: target.properties });
            }, 1000);
          }
        }
      });

      setLoading(false);
    };

    initMap();
    return () => { destroyed = true; cancelAnimationFrame(glowFrame); if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  const p = selectedPin?.properties || {};

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#0F1E2B', overflow: 'hidden' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-3 pb-2" style={{ background: 'linear-gradient(to bottom, rgba(15,30,43,0.95), transparent)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-sm font-bold tracking-wide">🚐 Emergency RV</h1>
            <p className="text-white/40 text-[10px]">{stats.families.toLocaleString()} families · {stats.rvs.toLocaleString()} RVs · {stats.drivers} drivers</p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Legend */}
      <div className="absolute bottom-4 left-3 z-20 flex gap-1.5">
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4E4B]" /> {stats.families.toLocaleString()} Families
        </span>
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#89CFF0]" /> {stats.rvs.toLocaleString()} RVs
        </span>
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4CAF50]" /> {stats.drivers} Drivers
        </span>
      </div>

      {/* Detail Card */}
      {selectedPin && (
        <div className="absolute left-0 right-0 z-30 bottom-0 max-w-lg lg:max-w-xl mx-auto" style={{ maxHeight: '360px' }}>
          <div className="bg-[#1A3850] rounded-t-2xl shadow-2xl border-t border-white/10 flex flex-col overflow-hidden">
            {/* Drag handle */}
            <button onClick={() => setSelectedPin(null)} className="py-2 flex justify-center flex-shrink-0">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </button>

            <div className="px-5 pb-4">
              {/* Type badge */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  selectedPin.type === 'request' ? 'bg-[#EF4E4B]' :
                  selectedPin.type === 'resource' ? 'bg-[#89CFF0]' : 'bg-[#4CAF50]'
                }`} />
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  selectedPin.type === 'request' ? 'text-[#EF4E4B]' :
                  selectedPin.type === 'resource' ? 'text-[#89CFF0]' : 'text-[#4CAF50]'
                }`}>
                  {selectedPin.type === 'request' ? 'Family Needing Help' :
                   selectedPin.type === 'resource' ? 'RV' : 'Volunteer Driver'}
                </span>
              </div>

              {/* Request detail */}
              {selectedPin.type === 'request' && (
                <>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {p.is_veteran && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">🎖️ Veteran</span>}
                    {p.is_first_responder && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">🚒 First Responder</span>}
                    {p.is_fema_replacement && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">FEMA Replacement</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {p.priority_score && (
                      <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                        p.priority_score >= 80 ? 'bg-red-500/20 text-red-300' :
                        p.priority_score >= 50 ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-green-500/20 text-green-300'
                      }`}>Priority: {p.priority_score}</span>
                    )}
                    {p.household_size && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">👨‍👩‍👧‍👦 {p.household_size} people</span>}
                    {p.state && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">{p.state}</span>}
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">{p.status}</span>
                  </div>
                </>
              )}

              {/* Resource (RV) detail */}
              {selectedPin.type === 'resource' && (
                <>
                  <p className="text-sm text-white/80 mb-2">
                    {[p.year, p.make, p.model].filter(Boolean).join(' ') || p.vehicle_type || 'RV'}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {p.sleeps && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">Sleeps {p.sleeps}</span>}
                    {p.vehicle_type && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">{p.vehicle_type.replace(/_/g, ' ')}</span>}
                    {p.source && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">{p.source.replace(/_/g, ' ')}</span>}
                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full capitalize ${
                      p.status === 'deployed' ? 'bg-green-500/20 text-green-300' :
                      p.status === 'available' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-white/10 text-white/60'
                    }`}>{p.status}</span>
                  </div>
                  {p.vin && <p className="text-[10px] text-white/30 font-mono">VIN: {p.vin}</p>}
                </>
              )}

              {/* Driver detail */}
              {selectedPin.type === 'driver' && (
                <>
                  <p className="text-sm text-white/80 mb-2">{p.display_name || 'Volunteer Driver'}</p>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {p.tow_capability && (() => {
                      try {
                        const caps = JSON.parse(p.tow_capability);
                        return caps.map((c: string) => (
                          <span key={c} className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">{c.replace(/_/g, ' ')}</span>
                        ));
                      } catch { return null; }
                    })()}
                    {p.has_class_a && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-300">Class A</span>}
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">{p.status}</span>
                  </div>
                </>
              )}

              {/* Pin ID for sharing */}
              <p className="text-[9px] text-white/20 mt-2 font-mono select-all">{selectedPin.id}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}