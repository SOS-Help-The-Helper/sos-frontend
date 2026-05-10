'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { usePartnerOrg } from '@/lib/partner-context';
import { PinDetailCard } from '@/components/partner/pin-detail-card';
import { DashboardOverlay } from '@/components/partner/dashboard-overlay';
import { QuickActions } from '@/components/partner/quick-actions';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic29zY29ubmVjdCIsImEiOiJjbWxlNmwxMHUxN3hhM2Vwd2R0a2RjNWttIn0.Re0ubam0-wA5O5wkAHzyAw';

export default function PartnerMapPage() {
  const { orgId, orgSlug } = usePartnerOrg();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const layerClicked = useRef(false);

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    const key = process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '';
    const headers = { 'x-partner-key': key, 'Content-Type': 'application/json' };

    const [reqRes, resRes] = await Promise.all([
      fetch(`${SB_URL}/functions/v1/partner-read`, { method: 'POST', headers, body: JSON.stringify({ query_type: 'requests', filters: { org_id: orgId }, limit: 200 }) }).then(r => r.json()).catch(() => ({ results: [] })),
      fetch(`${SB_URL}/functions/v1/partner-read`, { method: 'POST', headers, body: JSON.stringify({ query_type: 'resources', filters: { org_id: orgId }, limit: 200 }) }).then(r => r.json()).catch(() => ({ results: [] })),
    ]);
    setRequests(reqRes.results || []);
    setResources(resRes.results || []);
  }, [orgId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({ container: mapContainer.current!, style: 'mapbox://styles/mapbox/dark-v11', center: [-82.14, 29.19], zoom: 7 });
      mapRef.current = map;
      map.on('load', () => {
        map.addSource('requests', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addSource('resources', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({ id: 'request-pins', type: 'circle', source: 'requests', paint: { 'circle-radius': 7, 'circle-color': '#EF4E4B', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
        map.addLayer({ id: 'resource-pins', type: 'circle', source: 'resources', paint: { 'circle-radius': 7, 'circle-color': '#34d399', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
        ['request-pins', 'resource-pins'].forEach(layer => {
          map.on('click', layer, (e: any) => { layerClicked.current = true; setSelectedPin(e.features?.[0]?.properties); });
        });
        map.on('click', () => { if (!layerClicked.current) setSelectedPin(null); layerClicked.current = false; });
      });
    });
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource('requests')) return;
    const toFeature = (item: any, type: string) => ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [item.longitude || item.lng || 0, item.latitude || item.lat || 0] }, properties: { ...item, _type: type } });
    (map.getSource('requests') as any).setData({ type: 'FeatureCollection', features: requests.filter(r => r.latitude || r.lat).map(r => toFeature(r, 'request')) });
    (map.getSource('resources') as any).setData({ type: 'FeatureCollection', features: resources.filter(r => r.latitude || r.lat).map(r => toFeature(r, 'resource')) });
  }, [requests, resources]);

  return (
    <div className="relative w-full h-screen">
      <link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
      <div ref={mapContainer} className="absolute inset-0" />
      <DashboardOverlay resources={resources} />
      {selectedPin && <PinDetailCard pin={selectedPin} onClose={() => setSelectedPin(null)} />}
      {selectedPin && <QuickActions pin={selectedPin} orgSlug={orgSlug} />}
    </div>
  );
}
