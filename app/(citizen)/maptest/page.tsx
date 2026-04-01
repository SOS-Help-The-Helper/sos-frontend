'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

export default function MapDiag() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<string[]>([]);

  function log(msg: string) {
    console.log('[MAP DIAG]', msg);
    setLogs(prev => [...prev, `${new Date().toISOString().slice(11,19)} ${msg}`]);
  }

  useEffect(() => {
    async function init() {
      log('Starting...');
      
      // 1. Import mapbox
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      log('Mapbox imported');

      if (!mapRef.current) { log('ERROR: no map ref'); return; }

      mapboxgl.accessToken = 'pk.eyJ1Ijoic29zY29ubmVjdCIsImEiOiJjbWxlNmwxMHUxN3hhM2Vwd2R0a2RjNWttIn0.Re0ubam0-wA5O5wkAHzyAw';

      // 2. Create map centered on Asheville
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-82.5515, 35.5951],
        zoom: 11,
      });
      log('Map created, waiting for load...');

      map.on('load', async () => {
        log('Map loaded!');

        // 3. Query data
        const { data: requests, error: reqErr } = await supabase
          .from('requests')
          .select('id, category, latitude, longitude, status')
          .not('latitude', 'is', null)
          .in('status', ['open', 'active', 'matched'])
          .limit(500);
        log(`Requests: ${requests?.length || 0} (error: ${reqErr?.message || 'none'})`);

        const { data: resources, error: resErr } = await supabase
          .from('resources')
          .select('id, category, latitude, longitude, status')
          .not('latitude', 'is', null)
          .limit(500);
        log(`Resources: ${resources?.length || 0} (error: ${resErr?.message || 'none'})`);

        const { data: extRes, error: extErr } = await supabase
          .from('external_resources')
          .select('id, organization_name, latitude, longitude, category')
          .not('latitude', 'is', null)
          .limit(200);
        log(`External (211): ${extRes?.length || 0} (error: ${extErr?.message || 'none'})`);

        const { data: reports, error: repErr } = await supabase
          .from('community_messages')
          .select('id, message_text, latitude, longitude')
          .eq('message_type', 'report')
          .not('latitude', 'is', null)
          .limit(100);
        log(`Reports: ${reports?.length || 0} (error: ${repErr?.message || 'none'})`);

        // 4. Build features
        const reqFeatures = (requests || []).filter(r => r.latitude && r.longitude).map(r => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
          properties: { id: r.id, category: r.category },
        }));
        log(`Request features built: ${reqFeatures.length}`);

        const resFeatures = [
          ...(resources || []).filter(r => r.latitude && r.longitude).map(r => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
            properties: { id: r.id, category: r.category },
          })),
          ...(extRes || []).filter(r => r.latitude && r.longitude).map(r => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
            properties: { id: r.id, name: r.organization_name },
          })),
        ];
        log(`Resource features built: ${resFeatures.length}`);

        // 5. Add sources + layers
        map.addSource('req-src', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: reqFeatures },
        });
        map.addLayer({
          id: 'req-circles', type: 'circle', source: 'req-src',
          paint: { 'circle-color': '#EF4E4B', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
        });
        log('Request layer added');

        map.addSource('res-src', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: resFeatures },
        });
        map.addLayer({
          id: 'res-circles', type: 'circle', source: 'res-src',
          paint: { 'circle-color': '#89CFF0', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
        });
        log('Resource layer added');

        log('DONE — you should see circles on the map');
      });

      map.on('error', (e: any) => log(`Map error: ${e.error?.message || JSON.stringify(e)}`));
    }

    init().catch(e => log(`FATAL: ${e.message}`));
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div ref={mapRef} style={{ flex: 1 }} />
      <div style={{ height: '200px', overflow: 'auto', background: '#000', color: '#0f0', fontFamily: 'monospace', fontSize: '11px', padding: '8px' }}>
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
