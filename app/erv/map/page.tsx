'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const ERV_QUERY_URL = 'https://rtduqguwhkczexnoawej.supabase.co/functions/v1/erv-query';
const ERV_AUTH = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0ZHVxZ3V3aGtjemV4bm9hd2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2Njg1ODAsImV4cCI6MjA2NzI0NDU4MH0.1QZ5ofS-ND_OI71igPlxxMTyZJJRlATSSC0djccWR8o';

// Colors
const RED = '#EF4E4B';
const GREEN = '#22C55E';
const BLUE = '#89CFF0';
const WHITE = '#FFFFFF';
const NAVY = '#0F1E2B';
const CARD_BG = '#1A3850';

type PinType = 'need' | 'housed' | 'rv' | 'driver';
type SelectedPin = { type: PinType; id: string; properties: Record<string, any> };

// Filter state
type Filters = {
  needs: boolean;
  housed: boolean;
  rvs: boolean;
  drivers: boolean;
  // Sub-filters
  veterans: boolean;
  firstResponders: boolean;
  fema: boolean;
  rvAvailable: boolean;
  rvWithFamilies: boolean;
  rvPipeline: boolean;
};

const DEFAULT_FILTERS: Filters = {
  needs: true, housed: true, rvs: true, drivers: true,
  veterans: false, firstResponders: false, fema: false,
  rvAvailable: false, rvWithFamilies: false, rvPipeline: false,
};

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
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showRequestSub, setShowRequestSub] = useState(false);
  const [showResourceSub, setShowResourceSub] = useState(false);
  const [stats, setStats] = useState({ needs: 0, housed: 0, rvs: 0, drivers: 0, people: 0 });
  const [allData, setAllData] = useState<{ needs: any[]; housed: any[]; rvs: any[]; drivers: any[] }>({ needs: [], housed: [], rvs: [], drivers: [] });

  // Load data once
  useEffect(() => {
    (async () => {
      const [reqRes, fleetRes, driverRes] = await Promise.all([
        ervQuery('request_summary'),
        ervQuery('fleet_status'),
        ervQuery('driver_status'),
      ]);
      const allRequests = reqRes?.data?.requests || [];
      const needs = allRequests.filter((r: any) => r.status !== 'delivered');
      const housed = allRequests.filter((r: any) => r.status === 'delivered');
      const rvs = fleetRes?.data?.resources || [];
      const drivers = Array.isArray(driverRes?.data) ? driverRes.data : [];

      setAllData({ needs, housed, rvs, drivers });
      setStats({ needs: needs.length, housed: housed.length, rvs: rvs.length, drivers: drivers.length, people: reqRes?.data?.total_household_members || 0 });
    })();
  }, []);

  // Build filtered features
  const getFilteredFeatures = () => {
    let needFeatures: any[] = [];
    let housedFeatures: any[] = [];
    let rvFeatures: any[] = [];
    let driverFeatures: any[] = [];

    if (filters.needs) {
      let filtered = allData.needs;
      if (filters.veterans) filtered = filtered.filter(r => r.is_veteran);
      if (filters.firstResponders) filtered = filtered.filter(r => r.is_first_responder);
      if (filters.fema) filtered = filtered.filter(r => r.is_fema_replacement);
      needFeatures = filtered.filter(r => r.latitude && r.longitude).map(r => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
        properties: { id: r.id, type: 'need', status: r.status, priority_score: r.priority_score, household_size: r.household_size, state: r.state, is_veteran: r.is_veteran, is_first_responder: r.is_first_responder, is_fema_replacement: r.is_fema_replacement },
      }));
    }

    if (filters.housed) {
      let filtered = allData.housed;
      if (filters.veterans) filtered = filtered.filter(r => r.is_veteran);
      if (filters.firstResponders) filtered = filtered.filter(r => r.is_first_responder);
      if (filters.fema) filtered = filtered.filter(r => r.is_fema_replacement);
      housedFeatures = filtered.filter(r => r.latitude && r.longitude).map(r => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
        properties: { id: r.id, type: 'housed', status: r.status, priority_score: r.priority_score, household_size: r.household_size, state: r.state, is_veteran: r.is_veteran, is_first_responder: r.is_first_responder, is_fema_replacement: r.is_fema_replacement },
      }));
    }

    if (filters.rvs) {
      let filtered = allData.rvs;
      if (filters.rvAvailable) filtered = filtered.filter(r => r.status === 'available' || r.status === 'ready');
      if (filters.rvWithFamilies) filtered = filtered.filter(r => r.status === 'deployed');
      if (filters.rvPipeline) filtered = filtered.filter(r => r.status === 'pending');
      rvFeatures = filtered.filter(r => r.latitude && r.longitude).map(r => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
        properties: { id: r.id, type: 'rv', status: r.status, source: r.source, vehicle_type: r.vehicle_type, sleeps: r.sleeps, vin: r.vin, year: r.year, make: r.make, model: r.model },
      }));
    }

    if (filters.drivers) {
      driverFeatures = allData.drivers.filter(d => d.latitude && d.longitude).map(d => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [d.longitude, d.latitude] },
        properties: { id: d.id, type: 'driver', display_name: d.persons?.display_name || 'Driver', tow_capability: JSON.stringify(d.tow_capability || []), has_class_a: d.has_class_a },
      }));
    }

    return { needFeatures, housedFeatures, rvFeatures, driverFeatures };
  };

  // Update map sources when filters change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !map.isStyleLoaded()) return;
    const { needFeatures, housedFeatures, rvFeatures, driverFeatures } = getFilteredFeatures();
    const update = (name: string, features: any[]) => {
      const src = map.getSource(name);
      if (src) src.setData({ type: 'FeatureCollection', features });
    };
    update('needs-source', needFeatures);
    update('housed-source', housedFeatures);
    update('rvs-source', rvFeatures);
    update('drivers-source', driverFeatures);
  }, [filters, allData]);

  // Map init
  useEffect(() => {
    if (!mapRef.current || !MAPBOX_TOKEN) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    let glowFrame = 0;
    let destroyed = false;

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
        const { needFeatures, housedFeatures, rvFeatures, driverFeatures } = getFilteredFeatures();

        // Helper to add a pin layer set
        const addPinLayers = (name: string, features: any[], color: string, radius = 8) => {
          map.addSource(`${name}-source`, {
            type: 'geojson', data: { type: 'FeatureCollection', features },
            cluster: true, clusterMaxZoom: 14, clusterRadius: 40, clusterMinPoints: 5,
          });
          map.addLayer({ id: `${name}-glow`, type: 'circle', source: `${name}-source`, filter: ['has', 'point_count'],
            paint: { 'circle-color': color, 'circle-radius': ['step', ['get', 'point_count'], 30, 10, 40, 50, 55], 'circle-opacity': 0.3, 'circle-blur': 1 } });
          map.addLayer({ id: `${name}-clusters`, type: 'circle', source: `${name}-source`, filter: ['has', 'point_count'],
            paint: { 'circle-color': color, 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32], 'circle-opacity': 0.7 } });
          map.addLayer({ id: `${name}-count`, type: 'symbol', source: `${name}-source`, filter: ['has', 'point_count'],
            layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium'], 'text-size': 12 },
            paint: { 'text-color': '#ffffff' } });
          map.addLayer({ id: `${name}-hit`, type: 'circle', source: `${name}-source`, filter: ['!', ['has', 'point_count']],
            paint: { 'circle-color': 'transparent', 'circle-radius': 22 } });
          map.addLayer({ id: `${name}-points`, type: 'circle', source: `${name}-source`, filter: ['!', ['has', 'point_count']],
            paint: { 'circle-color': color, 'circle-radius': radius, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
        };

        addPinLayers('needs', needFeatures, RED, 8);
        addPinLayers('housed', housedFeatures, GREEN, 8);
        addPinLayers('rvs', rvFeatures, BLUE, 7);
        addPinLayers('drivers', driverFeatures, WHITE, 6);

        // Glow animation
        const animateGlow = () => {
          if (destroyed) return;
          try {
            const t = Date.now() / 1000;
            const pulse = 0.5 + 0.5 * Math.sin(t * 1.2);
            ['needs-glow', 'housed-glow', 'rvs-glow', 'drivers-glow'].forEach(id => {
              if (!map.getLayer(id)) return;
              const scale = 1 + pulse * 0.3;
              map.setPaintProperty(id, 'circle-radius', ['step', ['get', 'point_count'], 30 * scale, 10, 40 * scale, 50, 55 * scale]);
              map.setPaintProperty(id, 'circle-opacity', 0.3 * (0.6 + pulse * 0.4));
            });
          } catch {}
          glowFrame = requestAnimationFrame(animateGlow);
        };
        animateGlow();

        // Click handlers
        const pinTypes: { layers: string[]; type: PinType }[] = [
          { layers: ['needs-hit', 'needs-points'], type: 'need' },
          { layers: ['housed-hit', 'housed-points'], type: 'housed' },
          { layers: ['rvs-hit', 'rvs-points'], type: 'rv' },
          { layers: ['drivers-points'], type: 'driver' },
        ];
        pinTypes.forEach(({ layers, type }) => {
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

        // Cluster zoom
        ['needs-clusters', 'housed-clusters', 'rvs-clusters', 'drivers-clusters'].forEach(layer => {
          map.on('click', layer, (e: any) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [layer] });
            if (!features.length) return;
            layerClickedRef.current = true;
            const clusterId = features[0].properties?.cluster_id;
            (map.getSource(layer.replace('-clusters', '-source')) as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
              if (err || zoom == null) return;
              map.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
            });
          });
        });

        // Dismiss
        map.on('click', () => {
          setTimeout(() => {
            if (layerClickedRef.current) { layerClickedRef.current = false; return; }
            setSelectedPin(null);
          }, 100);
        });

        // Deep link
        if (deepLinkPin) {
          const all = [...needFeatures, ...housedFeatures, ...rvFeatures, ...driverFeatures];
          const target = all.find(f => f.properties.id === deepLinkPin);
          if (target) {
            setTimeout(() => {
              map.flyTo({ center: target.geometry.coordinates, zoom: 14, duration: 1500 });
              setSelectedPin({ type: target.properties.type, id: target.properties.id, properties: target.properties });
            }, 1000);
          }
        }
      });
    })();

    return () => { destroyed = true; cancelAnimationFrame(glowFrame); if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  const toggle = (key: keyof Filters) => setFilters(f => ({ ...f, [key]: !f[key] }));
  const p = selectedPin?.properties || {};

  // Filter pill component
  const Pill = ({ active, color, label, count, onClick }: { active: boolean; color: string; label: string; count?: number; onClick: () => void }) => (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap"
      style={{
        background: active ? `${color}20` : 'rgba(255,255,255,0.05)',
        color: active ? color : 'rgba(255,255,255,0.4)',
        border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
      }}>
      <span className="w-2 h-2 rounded-full" style={{ background: active ? color : 'rgba(255,255,255,0.2)' }} />
      {label}{count != null ? ` (${count.toLocaleString()})` : ''}
    </button>
  );

  const SubPill = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button onClick={onClick}
      className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all whitespace-nowrap"
      style={{
        background: active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
        color: active ? '#fff' : 'rgba(255,255,255,0.4)',
        border: `1px solid ${active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
      }}>
      {label}
    </button>
  );

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: NAVY, overflow: 'hidden' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 px-3 pt-2 pb-1" style={{ background: 'linear-gradient(to bottom, rgba(15,30,43,0.97), rgba(15,30,43,0.8), transparent)' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-white text-sm font-bold tracking-wide">🚐 Emergency RV</h1>
            <p className="text-white/30 text-[10px]">{stats.housed} families housed · {stats.people.toLocaleString()} people served</p>
          </div>
        </div>

        {/* Main layer toggles */}
        <div className="flex gap-1.5 mb-1 overflow-x-auto pb-0.5">
          <Pill active={filters.needs} color={RED} label="Needs" count={stats.needs}
            onClick={() => { toggle('needs'); setShowRequestSub(s => !filters.needs ? true : !s); setShowResourceSub(false); }} />
          <Pill active={filters.housed} color={GREEN} label="Housed" count={stats.housed}
            onClick={() => { toggle('housed'); setShowRequestSub(s => !filters.housed ? true : !s); setShowResourceSub(false); }} />
          <Pill active={filters.rvs} color={BLUE} label="RVs" count={stats.rvs}
            onClick={() => { toggle('rvs'); setShowResourceSub(s => !filters.rvs ? true : !s); setShowRequestSub(false); }} />
          <Pill active={filters.drivers} color={WHITE} label="Drivers" count={stats.drivers}
            onClick={() => toggle('drivers')} />
        </div>

        {/* Request sub-filters */}
        {showRequestSub && (filters.needs || filters.housed) && (
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            <SubPill active={filters.veterans} label="🎖️ Veterans" onClick={() => toggle('veterans')} />
            <SubPill active={filters.firstResponders} label="🚒 First Responders" onClick={() => toggle('firstResponders')} />
            <SubPill active={filters.fema} label="FEMA" onClick={() => toggle('fema')} />
          </div>
        )}

        {/* Resource sub-filters */}
        {showResourceSub && filters.rvs && (
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            <SubPill active={filters.rvAvailable} label="Available" onClick={() => toggle('rvAvailable')} />
            <SubPill active={filters.rvWithFamilies} label="With Families" onClick={() => toggle('rvWithFamilies')} />
            <SubPill active={filters.rvPipeline} label="In Pipeline" onClick={() => toggle('rvPipeline')} />
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Detail Card */}
      {selectedPin && (
        <div className="absolute left-0 right-0 z-30 bottom-0 max-w-lg lg:max-w-xl mx-auto">
          <div style={{ background: CARD_BG }} className="rounded-t-2xl shadow-2xl border-t border-white/10 flex flex-col overflow-hidden">
            <button onClick={() => setSelectedPin(null)} className="py-2 flex justify-center flex-shrink-0">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </button>
            <div className="px-5 pb-4">
              {/* Type badge */}
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{
                  background: selectedPin.type === 'need' ? RED : selectedPin.type === 'housed' ? GREEN : selectedPin.type === 'rv' ? BLUE : WHITE
                }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{
                  color: selectedPin.type === 'need' ? RED : selectedPin.type === 'housed' ? GREEN : selectedPin.type === 'rv' ? BLUE : WHITE
                }}>
                  {selectedPin.type === 'need' ? 'Family Needing Help' : selectedPin.type === 'housed' ? 'Family Housed' : selectedPin.type === 'rv' ? 'RV' : 'Volunteer Driver'}
                </span>
              </div>

              {/* Request detail (need or housed) */}
              {(selectedPin.type === 'need' || selectedPin.type === 'housed') && (
                <>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {p.is_veteran && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">🎖️ Veteran</span>}
                    {p.is_first_responder && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">🚒 First Responder</span>}
                    {p.is_fema_replacement && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">FEMA</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.priority_score && <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${p.priority_score >= 80 ? 'bg-red-500/20 text-red-300' : p.priority_score >= 50 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>Priority: {p.priority_score}</span>}
                    {p.household_size && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">👨‍👩‍👧‍👦 {p.household_size}</span>}
                    {p.state && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">{p.state}</span>}
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">{p.status}</span>
                  </div>
                </>
              )}

              {/* RV detail */}
              {selectedPin.type === 'rv' && (
                <>
                  <p className="text-sm text-white/80 mb-2">{[p.year, p.make, p.model].filter(Boolean).join(' ') || p.vehicle_type || 'RV'}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.sleeps && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">Sleeps {p.sleeps}</span>}
                    {p.vehicle_type && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">{p.vehicle_type.replace(/_/g, ' ')}</span>}
                    {p.source && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">{p.source.replace(/_/g, ' ')}</span>}
                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full capitalize ${p.status === 'deployed' ? 'bg-green-500/20 text-green-300' : p.status === 'available' ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-white/60'}`}>{p.status}</span>
                  </div>
                  {p.vin && <p className="text-[10px] text-white/30 font-mono mt-2">VIN: {p.vin}</p>}
                </>
              )}

              {/* Driver detail */}
              {selectedPin.type === 'driver' && (
                <>
                  <p className="text-sm text-white/80 mb-2">{p.display_name || 'Volunteer Driver'}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.tow_capability && (() => { try { return JSON.parse(p.tow_capability).map((c: string) => <span key={c} className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">{c.replace(/_/g, ' ')}</span>); } catch { return null; } })()}
                    {p.has_class_a && <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-300">Class A</span>}
                  </div>
                </>
              )}

              <p className="text-[9px] text-white/15 mt-3 font-mono select-all">{selectedPin.id}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}