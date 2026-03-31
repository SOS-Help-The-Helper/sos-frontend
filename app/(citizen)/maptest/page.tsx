'use client';

import { useEffect, useRef } from 'react';

export default function MapTest() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      
      if (!mapRef.current) return;
      
      mapboxgl.accessToken = 'pk.eyJ1Ijoic29zY29ubmVjdCIsImEiOiJjbWxlNmwxMHUxN3hhM2Vwd2R0a2RjNWttIn0.Re0ubam0-wA5O5wkAHzyAw';
      
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-82.5515, 35.5951],
        zoom: 12,
      });

      console.log('MAP INITIALIZED:', map);
    }
    init().catch(err => console.error('MAP ERROR:', err));
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'red' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
