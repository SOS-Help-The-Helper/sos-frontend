'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const PARTNER_KEY  = process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '';
const API_BASE     = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

type SelectedPin = { type: 'request' | 'resource'; id: string; properties: Record<string, any> };

export default function PartnerMapPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const layerClicked = useRef(false);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);

  useEffect(() => {
    if (!mapRef.current || !MAPBOX_TOKEN) return;
    let destroyed = false;
    const init = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      if (!mapRef.current || destroyed) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({ container: mapRef.current, style: 'mapbox://styles/mapbox/dark-v11', center: [-98, 39], zoom: 3.5, attributionControl: false });
      mapInstance.current = map;
      map.on('error', (e: any) => console.warn('Mapbox error:', e.error));
      map.on('load', async () => {
        let requestFeatures: any[] = [], resourceFeatures: any[] = [];
        try {
          const headers = { 'Content-Type': 'application/json', 'x-partner-key': PARTNER_KEY };
          const post = (qt: string) => fetch(`${API_BASE}/functions/v1/partner-read`, { method: 'POST', headers, body: JSON.stringify({ query_type: qt, org_slug: orgSlug }) });
          const [reqResp, resResp] = await Promise.all([post('request_summary'), post('resource_summary')]);
          const [reqData, resData] = await Promise.all([reqResp.json(), resResp.json()]);
          const toFeature = (r: any, type: string) => ({ type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [r.longitude ?? r.lng, r.latitude ?? r.lat] },
            properties: { id: r.id, category: r.category, status: r.status, urgency: r.urgency, name: r.name, type },
          });
          (reqData.requests ?? reqData.data ?? []).filter((r: any) => r.latitude || r.lat).forEach((r: any) => requestFeatures.push(toFeature(r, 'request')));
          (resData.resources ?? resData.data ?? []).filter((r: any) => r.latitude || r.lat).forEach((r: any) => resourceFeatures.push(toFeature(r, 'resource')));
        } catch (err) { console.error('Partner map data error:', err); }

        map.addSource('requests-source', { type: 'geojson', data: { type: 'FeatureCollection', features: requestFeatures } });
        map.addLayer({ id: 'requests-points', type: 'circle', source: 'requests-source',
          paint: { 'circle-color': '#EF4E4B', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
        map.addSource('resources-source', { type: 'geojson', data: { type: 'FeatureCollection', features: resourceFeatures } });
        map.addLayer({ id: 'resources-points', type: 'circle', source: 'resources-source',
          paint: { 'circle-color': '#34d399', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });

        ['requests-points', 'resources-points'].forEach(layer => {
          map.on('click', layer, (e: any) => {
            if (!e.features?.length) return;
            layerClicked.current = true;
            const props = e.features[0].properties;
            setSelectedPin({ type: props.type, id: props.id, properties: props });
          });
          map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
        });
        map.on('click', () => setTimeout(() => {
          if (layerClicked.current) { layerClicked.current = false; return; }
          setSelectedPin(null);
        }, 100));
        setLoading(false);
      });
    };
    init();
    return () => { destroyed = true; mapInstance.current?.remove(); mapInstance.current = null; };
  }, [orgSlug]);

  const p = selectedPin?.properties ?? {};
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', background: '#0F1E2B' }} />
      {loading && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="text-white/40 text-sm">Loading map…</p></div>}
      <div className="absolute bottom-20 left-3 z-20 flex gap-1.5">
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4E4B]" /> Requests</span>
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#34d399]" /> Resources</span>
      </div>
      {selectedPin && (
        <div className="absolute bottom-20 left-3 right-3 z-30 bg-[#1A3850]/95 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <button onClick={() => setSelectedPin(null)} className="absolute top-3 right-3 text-white/30 hover:text-white text-sm">✕</button>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${selectedPin.type === 'request' ? 'text-[#EF4E4B]' : 'text-[#34d399]'}`}>{selectedPin.type}</p>
          <p className="text-white text-sm font-medium">{p.name || p.category?.replace(/_/g, ' ') || selectedPin.id}</p>
          {p.status && <p className="text-white/50 text-xs mt-1 capitalize">{p.status}</p>}
        </div>
      )}
    </div>
  );
}
