'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const ERV_QUERY_URL = 'https://rtduqguwhkczexnoawej.supabase.co/functions/v1/erv-query';
const ERV_AUTH = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0ZHVxZ3V3aGtjemV4bm9hd2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2Njg1ODAsImV4cCI6MjA2NzI0NDU4MH0.1QZ5ofS-ND_OI71igPlxxMTyZJJRlATSSC0djccWR8o';

const RED = '#EF4E4B';
const GREEN = '#22C55E';
const BLUE = '#89CFF0';
const WHITE = '#FFFFFF';
const NAVY = '#0F1E2B';
const CARD_BG = '#1A3850';

type PinType = 'need' | 'housed' | 'rv' | 'driver';
type SelectedPin = { type: PinType; id: string; properties: Record<string, any> };
type LayerKey = 'needs' | 'housed' | 'rvs' | 'drivers';

async function ervQuery(queryType: string) {
  const res = await fetch(ERV_QUERY_URL, {
    method: 'POST',
    headers: { Authorization: ERV_AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_type: queryType, limit: 5000 }),
  });
  return res.json();
}

export default function ErvMapPage() {
  return (
    <Suspense fallback={<div style={{ background: NAVY, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: BLUE, fontSize: 14 }}>Loading ERV Map...</span></div>}>
      <ErvMap />
    </Suspense>
  );
}

function ErvMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const layerClickedRef = useRef(false);
  const mapInstance = useRef<any>(null);
  const searchParams = useSearchParams();
  const deepLinkPin = searchParams.get('pin');

  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(new Set(['needs', 'housed', 'rvs', 'drivers']));
  const [activeSubFilter, setActiveSubFilter] = useState<string | null>(null);
  const [showSubFilters, setShowSubFilters] = useState(false);
  const [stats, setStats] = useState({ needs: 0, housed: 0, rvs: 0, drivers: 0, people: 0, vets: 0, fr: 0, fema: 0 });
  const [allData, setAllData] = useState<Record<string, any[]>>({ needs: [], housed: [], rvs: [], drivers: [] });

  // Load data
  useEffect(() => {
    (async () => {
      const [reqRes, fleetRes, driverRes] = await Promise.all([
        ervQuery('request_summary'), ervQuery('fleet_status'), ervQuery('driver_status'),
      ]);
      const allReqs = reqRes?.data?.requests || [];
      const needs = allReqs.filter((r: any) => r.status !== 'delivered');
      const housed = allReqs.filter((r: any) => r.status === 'delivered');
      const rvs = fleetRes?.data?.resources || [];
      const drivers = Array.isArray(driverRes?.data) ? driverRes.data : [];
      setAllData({ needs, housed, rvs, drivers });
      setStats({
        needs: needs.length, housed: housed.length, rvs: rvs.length, drivers: drivers.length,
        people: reqRes?.data?.total_household_members || 0,
        vets: reqRes?.data?.veteran_count || 0, fr: allReqs.filter((r: any) => r.is_first_responder).length,
        fema: reqRes?.data?.fema_replacement_count || 0,
      });
    })();
  }, []);

  // Get filtered features
  const getFeatures = (key: LayerKey) => {
    if (!activeLayers.has(key)) return [];
    let data = allData[key] || [];

    // Apply sub-filters
    if ((key === 'needs' || key === 'housed') && activeSubFilter) {
      if (activeSubFilter === 'veterans') data = data.filter(r => r.is_veteran);
      if (activeSubFilter === 'first-responders') data = data.filter(r => r.is_first_responder);
      if (activeSubFilter === 'fema') data = data.filter(r => r.is_fema_replacement);
    }
    if (key === 'rvs' && activeSubFilter) {
      if (activeSubFilter === 'rv-available') data = data.filter(r => r.status === 'available' || r.status === 'ready');
      if (activeSubFilter === 'rv-deployed') data = data.filter(r => r.status === 'deployed');
      if (activeSubFilter === 'rv-pipeline') data = data.filter(r => r.status === 'pending');
    }

    return data.filter(r => r.latitude && r.longitude).map(r => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
      properties: {
        id: r.id,
        type: key === 'needs' ? 'need' : key === 'housed' ? 'housed' : key === 'rvs' ? 'rv' : 'driver',
        display_name: r.persons?.display_name || r.display_name || '',
        status: r.status, priority_score: r.priority_score, household_size: r.household_size,
        state: r.state, is_veteran: r.is_veteran, is_first_responder: r.is_first_responder,
        is_fema_replacement: r.is_fema_replacement, source: r.source,
        vehicle_type: r.vehicle_type, sleeps: r.sleeps, vin: r.vin,
        year: r.year, make: r.make, model: r.model,
        tow_capability: key === 'drivers' ? JSON.stringify(r.tow_capability || []) : undefined,
        has_class_a: r.has_class_a,
      },
    }));
  };

  // Update sources on filter change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !map.isStyleLoaded()) return;
    ['needs', 'housed', 'rvs', 'drivers'].forEach(key => {
      const src = map.getSource(`${key}-source`);
      if (src) src.setData({ type: 'FeatureCollection', features: getFeatures(key as LayerKey) });
    });
  }, [activeLayers, activeSubFilter, allData]);

  // Map init
  useEffect(() => {
    if (!mapRef.current || !MAPBOX_TOKEN) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    let glowFrame = 0; let destroyed = false;

    (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      if (!mapRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapRef.current, style: 'mapbox://styles/mapbox/dark-v11',
        center: [-95, 37], zoom: 3.8, attributionControl: false,
      });
      mapInstance.current = map;

      map.on('load', () => {
        const addLayer = (name: string, color: string, radius = 8) => {
          map.addSource(`${name}-source`, {
            type: 'geojson', data: { type: 'FeatureCollection', features: getFeatures(name as LayerKey) },
            cluster: true, clusterMaxZoom: 14, clusterRadius: 40, clusterMinPoints: 5,
          });
          map.addLayer({ id: `${name}-glow`, type: 'circle', source: `${name}-source`, filter: ['has', 'point_count'],
            paint: { 'circle-color': color, 'circle-radius': ['step', ['get', 'point_count'], 30, 10, 40, 50, 55], 'circle-opacity': 0.3, 'circle-blur': 1 } });
          map.addLayer({ id: `${name}-clusters`, type: 'circle', source: `${name}-source`, filter: ['has', 'point_count'],
            paint: { 'circle-color': color, 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32], 'circle-opacity': 0.7 } });
          map.addLayer({ id: `${name}-count`, type: 'symbol', source: `${name}-source`, filter: ['has', 'point_count'],
            layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium'], 'text-size': 12 }, paint: { 'text-color': '#fff' } });
          map.addLayer({ id: `${name}-hit`, type: 'circle', source: `${name}-source`, filter: ['!', ['has', 'point_count']],
            paint: { 'circle-color': 'transparent', 'circle-radius': 22 } });
          map.addLayer({ id: `${name}-points`, type: 'circle', source: `${name}-source`, filter: ['!', ['has', 'point_count']],
            paint: { 'circle-color': color, 'circle-radius': radius, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
        };

        addLayer('needs', RED, 8);
        addLayer('housed', GREEN, 8);
        addLayer('rvs', BLUE, 7);
        addLayer('drivers', WHITE, 6);

        // Glow
        const animateGlow = () => {
          if (destroyed) return;
          try {
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 1000 * 1.2);
            ['needs', 'housed', 'rvs', 'drivers'].forEach(n => {
              const id = `${n}-glow`;
              if (!map.getLayer(id)) return;
              const s = 1 + pulse * 0.3;
              map.setPaintProperty(id, 'circle-radius', ['step', ['get', 'point_count'], 30 * s, 10, 40 * s, 50, 55 * s]);
              map.setPaintProperty(id, 'circle-opacity', 0.3 * (0.6 + pulse * 0.4));
            });
          } catch {}
          glowFrame = requestAnimationFrame(animateGlow);
        };
        animateGlow();

        // Clicks
        const types: { prefix: string; type: PinType }[] = [
          { prefix: 'needs', type: 'need' }, { prefix: 'housed', type: 'housed' },
          { prefix: 'rvs', type: 'rv' }, { prefix: 'drivers', type: 'driver' },
        ];
        types.forEach(({ prefix, type }) => {
          [`${prefix}-hit`, `${prefix}-points`].forEach(layer => {
            map.on('click', layer, (e: any) => {
              if (!e.features?.length) return;
              layerClickedRef.current = true;
              const props = e.features[0].properties;
              setSelectedPin({ type, id: props.id, properties: typeof props === 'string' ? JSON.parse(props) : props });
            });
          });
          map.on('click', `${prefix}-clusters`, (e: any) => {
            const f = map.queryRenderedFeatures(e.point, { layers: [`${prefix}-clusters`] });
            if (!f.length) return;
            layerClickedRef.current = true;
            (map.getSource(`${prefix}-source`) as any).getClusterExpansionZoom(f[0].properties?.cluster_id, (_: any, z: number) => {
              if (z != null) map.easeTo({ center: (f[0].geometry as any).coordinates, zoom: z });
            });
          });
        });

        map.on('click', () => { setTimeout(() => { if (layerClickedRef.current) { layerClickedRef.current = false; return; } setSelectedPin(null); setShowSubFilters(false); }, 100); });

        // Deep link
        if (deepLinkPin) {
          const all = [...getFeatures('needs'), ...getFeatures('housed'), ...getFeatures('rvs'), ...getFeatures('drivers')];
          const t = all.find(f => f.properties.id === deepLinkPin);
          if (t) setTimeout(() => { map.flyTo({ center: t.geometry.coordinates, zoom: 14, duration: 1500 }); setSelectedPin({ type: t.properties.type, id: t.properties.id, properties: t.properties }); }, 1000);
        }
      });
    })();

    return () => { destroyed = true; cancelAnimationFrame(glowFrame); if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  const toggleLayer = (key: LayerKey) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const p = selectedPin?.properties || {};

  // Bottom nav tab
  const Tab = ({ layerKey, color, icon, label, count }: { layerKey: LayerKey; color: string; icon: string; label: string; count: number }) => {
    const active = activeLayers.has(layerKey);
    return (
      <button onClick={() => { toggleLayer(layerKey); setShowSubFilters(false); setActiveSubFilter(null); }}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors">
        <div className="relative">
          <span style={{ color: active ? color : 'rgba(255,255,255,0.25)', fontSize: 18 }}>{icon}</span>
        </div>
        <span style={{ color: active ? color : 'rgba(255,255,255,0.3)' }} className="text-[10px] font-semibold">{label}</span>
        <span style={{ color: active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)' }} className="text-[9px]">{count.toLocaleString()}</span>
      </button>
    );
  };

  // Sub-filter pill
  const Sub = ({ id, label, count }: { id: string; label: string; count?: number }) => (
    <button onClick={() => setActiveSubFilter(activeSubFilter === id ? null : id)}
      className="px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all"
      style={{
        background: activeSubFilter === id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
        color: activeSubFilter === id ? '#fff' : 'rgba(255,255,255,0.5)',
        border: `1px solid ${activeSubFilter === id ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
      }}>
      {label}{count != null ? ` · ${count}` : ''}
    </button>
  );

  return (
    <div style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', background: NAVY, overflow: 'hidden' }}>
      {/* Map area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Minimal header */}
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-3" style={{ background: 'linear-gradient(to bottom, rgba(15,30,43,0.95) 0%, transparent 100%)', paddingBottom: 20 }}>
          <h1 className="text-white text-sm font-bold">🚐 Emergency RV</h1>
          <p className="text-white/30 text-[10px]">{stats.housed.toLocaleString()} families housed · {stats.people.toLocaleString()} people served</p>
        </div>

        {/* Map */}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Legend */}
        <div className="absolute bottom-2 left-3 z-20 flex gap-1.5">
          {activeLayers.has('needs') && <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:RED}} /> Needs</span>}
          {activeLayers.has('housed') && <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:GREEN}} /> Housed</span>}
          {activeLayers.has('rvs') && <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:BLUE}} /> RVs</span>}
          {activeLayers.has('drivers') && <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:WHITE}} /> Drivers</span>}
        </div>

        {/* Detail Card */}
        {selectedPin && (
          <div className="absolute left-0 right-0 z-30 bottom-0 max-w-lg mx-auto">
            <div style={{ background: CARD_BG }} className="rounded-t-2xl shadow-2xl border-t border-white/10">
              <button onClick={() => setSelectedPin(null)} className="py-2 flex justify-center w-full"><div className="w-10 h-1 bg-white/30 rounded-full" /></button>
              <div className="px-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: selectedPin.type === 'need' ? RED : selectedPin.type === 'housed' ? GREEN : selectedPin.type === 'rv' ? BLUE : WHITE }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: selectedPin.type === 'need' ? RED : selectedPin.type === 'housed' ? GREEN : selectedPin.type === 'rv' ? BLUE : WHITE }}>
                    {selectedPin.type === 'need' ? 'Needs Help' : selectedPin.type === 'housed' ? 'Housed ✓' : selectedPin.type === 'rv' ? 'RV' : 'Driver'}
                  </span>
                </div>
                {(selectedPin.type === 'need' || selectedPin.type === 'housed') && (
                  <>
                    {p.display_name && <p className="text-sm text-white/90 font-semibold mb-1">{p.display_name}</p>}
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {p.is_veteran && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">🎖️ Veteran</span>}
                      {p.is_first_responder && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">🚒 First Responder</span>}
                      {p.is_fema_replacement && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">FEMA</span>}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {p.priority_score && <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${p.priority_score >= 80 ? 'bg-red-500/20 text-red-300' : p.priority_score >= 50 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>Priority {p.priority_score}</span>}
                      {p.household_size && <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">👨‍👩‍👧‍👦 {p.household_size}</span>}
                      {p.state && p.state !== 'unknown' && <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">{p.state}</span>}
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                        p.status === 'delivered' ? 'bg-green-500/20 text-green-300' :
                        p.status === 'approved' ? 'bg-blue-500/20 text-blue-300' :
                        p.status === 'on_hold' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-white/10 text-white/60'
                      }`}>{
                        p.status === 'pending' ? 'Waiting for match' :
                        p.status === 'delivered' ? 'Housed ✓' :
                        p.status === 'approved' ? 'Approved' :
                        p.status === 'on_hold' ? 'On hold' :
                        p.status === 'withdrew' ? 'Withdrew' :
                        p.status === 'declined' ? 'Declined' :
                        p.status || ''
                      }</span>
                    </div>
                  </>
                )}
                {selectedPin.type === 'rv' && (
                  <>
                    <p className="text-sm text-white/80 mb-2">{[p.year, p.make, p.model].filter(Boolean).join(' ') || p.vehicle_type || 'RV'}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {p.sleeps && <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">Sleeps {p.sleeps}</span>}
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full capitalize ${p.status === 'deployed' ? 'bg-green-500/20 text-green-300' : p.status === 'available' ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-white/60'}`}>{p.status}</span>
                    </div>
                  </>
                )}
                {selectedPin.type === 'driver' && (
                  <>
                    <p className="text-sm text-white/80 mb-2">{p.display_name || 'Volunteer Driver'}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {p.tow_capability && (() => { try { return JSON.parse(p.tow_capability).map((c: string) => <span key={c} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">{c.replace(/_/g, ' ')}</span>); } catch { return null; } })()}
                      {p.has_class_a && <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-300">Class A</span>}
                    </div>
                  </>
                )}
                <p className="text-[9px] text-white/15 mt-3 font-mono select-all">{selectedPin.id}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sub-filter strip — slides up above bottom nav when active */}
      {showSubFilters && (
        <div style={{ background: CARD_BG }} className="border-t border-white/10 px-3 py-2 flex gap-2 overflow-x-auto">
          {(activeLayers.has('needs') || activeLayers.has('housed')) && (
            <>
              <Sub id="veterans" label="🎖️ Veterans" count={stats.vets} />
              <Sub id="first-responders" label="🚒 First Responders" count={stats.fr} />
              <Sub id="fema" label="FEMA" count={stats.fema} />
            </>
          )}
          {activeLayers.has('rvs') && (
            <>
              <Sub id="rv-available" label="Available" />
              <Sub id="rv-deployed" label="With Families" />
              <Sub id="rv-pipeline" label="In Pipeline" />
            </>
          )}
        </div>
      )}

      {/* Bottom Nav — same pattern as citizen portal */}
      <nav style={{ background: CARD_BG }} className="border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center h-16 max-w-lg mx-auto">
          <Tab layerKey="needs" color={RED} icon="🔴" label="Needs" count={stats.needs} />
          <Tab layerKey="housed" color={GREEN} icon="🟢" label="Housed" count={stats.housed} />
          <Tab layerKey="rvs" color={BLUE} icon="🔵" label="RVs" count={stats.rvs} />
          <Tab layerKey="drivers" color={WHITE} icon="⚪" label="Drivers" count={stats.drivers} />
          {/* Filter toggle */}
          <button onClick={() => setShowSubFilters(s => !s)}
            className="flex flex-col items-center justify-center gap-0.5 w-14 h-full transition-colors"
            style={{ color: showSubFilters ? BLUE : 'rgba(255,255,255,0.3)' }}>
            <span style={{ fontSize: 18 }}>⚙️</span>
            <span className="text-[10px] font-semibold">Filter</span>
          </button>
        </div>
      </nav>
    </div>
  );
}