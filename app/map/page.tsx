'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { ArrowLeft } from 'lucide-react';

export default function FullMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const [reqData, offData] = await Promise.all([
        supabase.from('requests').select('id, category, urgency, latitude, longitude, status, details_sanitized, triage_score').not('latitude', 'is', null),
        supabase.from('resources').select('id, category, latitude, longitude, status, capacity_available, details_sanitized').not('latitude', 'is', null),
      ]);
      setRequests(reqData.data || []);
      setResources(offData.data || []);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

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
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-82.3, 35.7],
        zoom: 7,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        // Request pins
        requests.forEach(req => {
          if (!req.latitude || !req.longitude) return;
          const size = req.triage_score >= 80 ? 14 : req.triage_score >= 50 ? 10 : 8;
          const el = document.createElement('div');
          el.style.cssText = `
            width: ${size}px; height: ${size}px; border-radius: 50%;
            background: #EF4E4B; border: 2px solid rgba(239,78,75,0.3);
            box-shadow: 0 0 ${size}px rgba(239,78,75,0.4);
            cursor: pointer;
          `;
          if (req.triage_score >= 80) {
            el.style.animation = 'pulse 2s infinite';
          }

          const popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
            .setHTML(`
              <div style="font-family:Roboto,sans-serif; padding:4px;">
                <div style="font-weight:700; font-size:12px; color:#1A3850; text-transform:capitalize;">
                  ${req.category?.replace(/_/g, ' ')}
                </div>
                <div style="font-size:10px; color:#7C7C7C; margin-top:2px;">
                  ${req.urgency || 'standard'} · Triage: ${req.triage_score || '—'}
                </div>
                ${req.details_sanitized ? `<div style="font-size:10px; color:#494949; margin-top:4px;">${req.details_sanitized.slice(0, 80)}</div>` : ''}
              </div>
            `);

          new mapboxgl.Marker({ element: el })
            .setLngLat([req.longitude, req.latitude])
            .setPopup(popup)
            .addTo(map);
        });

        // Offer pins
        resources.forEach(offer => {
          if (!offer.latitude || !offer.longitude) return;
          const el = document.createElement('div');
          el.style.cssText = `
            width: 8px; height: 8px; border-radius: 50%;
            background: #89CFF0; border: 2px solid rgba(137,207,240,0.3);
            cursor: pointer;
          `;

          const popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
            .setHTML(`
              <div style="font-family:Roboto,sans-serif; padding:4px;">
                <div style="font-weight:700; font-size:12px; color:#1A3850; text-transform:capitalize;">
                  ${offer.category?.replace(/_/g, ' ')} (Offer)
                </div>
                <div style="font-size:10px; color:#7C7C7C; margin-top:2px;">
                  Capacity: ${offer.capacity_available || '—'}
                </div>
              </div>
            `);

          new mapboxgl.Marker({ element: el })
            .setLngLat([offer.longitude, offer.latitude])
            .setPopup(popup)
            .addTo(map);
        });
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
  }, [requests, resources]);

  return (
    <div className="fixed inset-0 z-50 bg-sos-blue-900">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-lg bg-sos-blue-800/90 backdrop-blur-sm text-white text-sm font-medium hover:bg-sos-blue-700 transition-colors"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-10 flex gap-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <span className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sos-red-500" />
          {requests.length} needs
        </span>
        <span className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sos-accent-500" />
          {resources.length} resources
        </span>
      </div>

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Pulse animation */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,78,75,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239,78,75,0); }
        }
      `}</style>
    </div>
  );
}
