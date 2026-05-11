'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { usePartnerOrg } from '@/lib/partner-context';
import { PinDetailCard } from '@/components/partner/pin-detail-card';
import { DashboardOverlay } from '@/components/partner/dashboard-overlay';
import { QuickActions } from '@/components/partner/quick-actions';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic29zY29ubmVjdCIsImEiOiJjbWxlNmwxMHUxN3hhM2Vwd2R0a2RjNWttIn0.Re0ubam0-wA5O5wkAHzyAw';

type FilterType = 'all' | 'survivors' | 'volunteers' | 'rvs';

export default function PartnerMapPage() {
  const { orgId, orgSlug } = usePartnerOrg();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapLoadedRef = useRef(false);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [survivors, setSurvivors] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [rvs, setRvs] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const layerClicked = useRef(false);

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const key = process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '';
    const headers = { 'x-partner-key': key, 'Content-Type': 'application/json' };

    const [survRes, rvsRes, volRes] = await Promise.all([
      fetch(`${SB_URL}/functions/v1/partner-read`, { method: 'POST', headers, body: JSON.stringify({ query_type: 'recent_requests', filters: { org_id: orgId }, limit: 3000 }) }).then(r => r.json()).catch(() => ({ results: [] })),
      fetch(`${SB_URL}/functions/v1/partner-read`, { method: 'POST', headers, body: JSON.stringify({ query_type: 'available_resources', filters: { org_id: orgId }, limit: 1000 }) }).then(r => r.json()).catch(() => ({ results: [] })),
      fetch(`${SB_URL}/functions/v1/partner-read`, { method: 'POST', headers, body: JSON.stringify({ query_type: 'person_lookup', filters: { org_id: orgId, role: 'volunteer' }, limit: 500 }) }).then(r => r.json()).catch(() => ({ results: [] })),
    ]);
    setSurvivors(survRes.results || []);
    setRvs(rvsRes.results || []);
    setVolunteers(volRes.results || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({ container: mapContainer.current!, style: 'mapbox://styles/mapbox/dark-v11', center: [-82.14, 29.19], zoom: 7 });
      mapRef.current = map;
      map.on('load', () => {
        mapLoadedRef.current = true;
        map.addSource('survivors', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addSource('volunteers', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addSource('rvs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({ id: 'survivor-pins', type: 'circle', source: 'survivors', paint: { 'circle-radius': 7, 'circle-color': '#EF4E4B', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
        map.addLayer({ id: 'volunteer-pins', type: 'circle', source: 'volunteers', paint: { 'circle-radius': 7, 'circle-color': '#60a5fa', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
        map.addLayer({ id: 'rv-pins', type: 'circle', source: 'rvs', paint: { 'circle-radius': 7, 'circle-color': '#34d399', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
        ['survivor-pins', 'volunteer-pins', 'rv-pins'].forEach(layer => {
          map.on('click', layer, (e: any) => { layerClicked.current = true; setSelectedPin(e.features?.[0]?.properties); });
        });
        map.on('click', () => { if (!layerClicked.current) setSelectedPin(null); layerClicked.current = false; });
      });
    });
  }, []);

  // Update map data when entity arrays change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current || !map.getSource('survivors')) return;
    const toFeature = (item: any, type: string) => ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [item.longitude || item.lng || 0, item.latitude || item.lat || 0] }, properties: { ...item, _type: type } });
    (map.getSource('survivors') as any).setData({ type: 'FeatureCollection', features: survivors.filter(r => r.latitude || r.lat).map(r => toFeature(r, 'survivor')) });
    (map.getSource('volunteers') as any).setData({ type: 'FeatureCollection', features: volunteers.filter(r => r.latitude || r.lat).map(r => toFeature(r, 'volunteer')) });
    (map.getSource('rvs') as any).setData({ type: 'FeatureCollection', features: rvs.filter(r => r.latitude || r.lat).map(r => toFeature(r, 'rv')) });
  }, [survivors, volunteers, rvs]);

  // Toggle layer visibility when filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const layerVisibility: Record<string, boolean> = {
      'survivor-pins': activeFilter === 'all' || activeFilter === 'survivors',
      'volunteer-pins': activeFilter === 'all' || activeFilter === 'volunteers',
      'rv-pins': activeFilter === 'all' || activeFilter === 'rvs',
    };
    Object.entries(layerVisibility).forEach(([layerId, visible]) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    });
  }, [activeFilter]);

  const pills: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: survivors.length + volunteers.length + rvs.length },
    { key: 'survivors', label: 'Survivors', count: survivors.length },
    { key: 'volunteers', label: 'Volunteers', count: volunteers.length },
    { key: 'rvs', label: 'RVs', count: rvs.length },
  ];

  return (
    <div className="relative w-full h-screen">
      <link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Toggle bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-4 py-2 bg-[#0F1E2B]/80 backdrop-blur-sm">
        {loading ? (
          <span className="text-xs text-white/40">Loading...</span>
        ) : (
          pills.map(pill => (
            <button
              key={pill.key}
              onClick={() => setActiveFilter(pill.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${activeFilter === pill.key ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'}`}
            >
              {pill.key === 'all' ? pill.label : `${pill.label} (${pill.count})`}
            </button>
          ))
        )}
      </div>

      <DashboardOverlay resources={rvs} />
      {selectedPin && <PinDetailCard pin={selectedPin} onClose={() => setSelectedPin(null)} />}
      {selectedPin && <QuickActions pin={selectedPin} orgSlug={orgSlug} />}
    </div>
  );
}
