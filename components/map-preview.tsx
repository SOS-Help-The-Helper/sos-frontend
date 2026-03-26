'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MapPreviewProps {
  requests?: Array<{ id: string; latitude: number; longitude: number; category: string; urgency: string }>;
  offers?: Array<{ id: string; latitude: number; longitude: number; category: string }>;
}

export function MapPreview({ requests = [], offers = [] }: MapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setLoaded(true);
      return;
    }

    // Load Mapbox GL JS from CDN
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js';
    script.onload = () => {
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl || !mapRef.current) return;

      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-82.3, 35.7], // NC center (Helene area)
        zoom: 7,
        interactive: false, // Preview — no interaction
        attributionControl: false,
      });

      map.on('load', () => {
        // Add request pins (red)
        requests.forEach(req => {
          if (req.latitude && req.longitude) {
            const el = document.createElement('div');
            el.className = 'map-pin-request';
            el.style.cssText = `
              width: 10px; height: 10px; border-radius: 50%;
              background: #EF4E4B; border: 2px solid rgba(239,78,75,0.3);
              box-shadow: 0 0 8px rgba(239,78,75,0.4);
            `;
            new mapboxgl.Marker({ element: el })
              .setLngLat([req.longitude, req.latitude])
              .addTo(map);
          }
        });

        // Add offer pins (blue)
        offers.forEach(offer => {
          if (offer.latitude && offer.longitude) {
            const el = document.createElement('div');
            el.className = 'map-pin-offer';
            el.style.cssText = `
              width: 8px; height: 8px; border-radius: 50%;
              background: #89CFF0; border: 2px solid rgba(137,207,240,0.3);
            `;
            new mapboxgl.Marker({ element: el })
              .setLngLat([offer.longitude, offer.latitude])
              .addTo(map);
          }
        });

        setLoaded(true);
      });

      mapInstance.current = map;
    };
    document.head.appendChild(script);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [requests, offers]);

  return (
    <div
      onClick={() => router.push('/map')}
      className="relative rounded-xl overflow-hidden cursor-pointer group border border-sos-gray-300"
    >
      <div ref={mapRef} className="h-[300px] md:h-[420px] bg-sos-blue-900" />

      {/* Overlay on hover/tap */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-lg px-4 py-2 shadow-lg">
          <span className="text-sm font-semibold text-sos-blue-800">Open full map →</span>
        </div>
      </div>

      {/* Pin legend */}
      <div className="absolute bottom-3 left-3 flex gap-3">
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sos-red-500 inline-block" />
          {requests.length} needs
        </span>
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sos-accent-500 inline-block" />
          {offers.length} offers
        </span>
      </div>
    </div>
  );
}
