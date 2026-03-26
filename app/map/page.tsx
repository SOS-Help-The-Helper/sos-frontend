'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { supabase } from '@/lib/supabase-client';

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      const [reqData, resData] = await Promise.all([
        supabase.from('requests').select('id, category, urgency, latitude, longitude, status, details_sanitized, triage_score, sos_id').not('latitude', 'is', null),
        supabase.from('resources').select('id, category, latitude, longitude, status, capacity_available, details_sanitized, sos_id').not('latitude', 'is', null),
      ]);
      setRequests(reqData.data || []);
      setResources(resData.data || []);
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
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-82.3, 35.7],
        zoom: 9,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        // Request pins
        requests.forEach(req => {
          if (!req.latitude || !req.longitude) return;
          const size = req.triage_score >= 80 ? 16 : req.triage_score >= 50 ? 12 : 9;
          const el = document.createElement('div');
          el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:#EF4E4B;border:2px solid rgba(239,78,75,0.4);box-shadow:0 0 ${size}px rgba(239,78,75,0.5);cursor:pointer;`;
          if (req.triage_score >= 80) el.style.animation = 'pulse 2s infinite';

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelected({ type: 'request', ...req });
          });

          new mapboxgl.Marker({ element: el }).setLngLat([req.longitude, req.latitude]).addTo(map);
        });

        // Resource pins
        resources.forEach(res => {
          if (!res.latitude || !res.longitude) return;
          const el = document.createElement('div');
          el.style.cssText = 'width:10px;height:10px;border-radius:50%;background:#89CFF0;border:2px solid rgba(137,207,240,0.4);box-shadow:0 0 8px rgba(137,207,240,0.3);cursor:pointer;';

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelected({ type: 'resource', ...res });
          });

          new mapboxgl.Marker({ element: el }).setLngLat([res.longitude, res.latitude]).addTo(map);
        });
      });

      // Click map background to deselect
      map.on('click', () => setSelected(null));

      mapInstance.current = map;
    };
    document.head.appendChild(script);

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, [requests, resources]);

  return (
    <DashboardShell title="Map" subtitle={`${requests.length} requests · ${resources.length} resources`}>
      <div className="relative rounded-xl overflow-hidden border border-sos-gray-300 -mx-2 md:mx-0">
        <div ref={mapRef} className="h-[calc(100vh-7.5rem)] md:h-[calc(100vh-7rem)] -mx-4 md:-mx-6 -mb-20 md:-mb-6 bg-sos-blue-900" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex gap-2 z-10">
          <span className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sos-red-500" /> {requests.length} needs
          </span>
          <span className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sos-accent-500" /> {resources.length} resources
          </span>
        </div>

        {/* Selected Pin Detail Card */}
        {selected && (
          <div className="absolute bottom-4 right-4 left-4 md:left-auto md:w-80 z-10">
            <div className="bg-white rounded-xl border border-sos-gray-300 shadow-xl overflow-hidden">
              {/* Header */}
              <div className={`px-4 py-2.5 flex items-center justify-between ${
                selected.type === 'request' ? 'bg-sos-red-500' : 'bg-sos-accent-600'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm">
                    {selected.type === 'request' ? '🔴' : '🔵'}
                  </span>
                  <span className="text-white text-sm font-bold capitalize">
                    {selected.category?.replace(/_/g, ' ')}
                  </span>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {selected.type === 'request' && (
                  <>
                    {/* Urgency */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        selected.urgency === 'critical' ? 'bg-sos-red-50 text-sos-red-700' :
                        selected.urgency === 'high' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-sos-gray-200 text-sos-gray-600'
                      }`}>{selected.urgency || 'standard'}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        selected.status === 'matched' ? 'bg-sos-accent-50 text-sos-accent-700' :
                        selected.status === 'fulfilled' ? 'bg-green-50 text-green-700' :
                        'bg-sos-gray-200 text-sos-gray-600'
                      }`}>{selected.status}</span>
                    </div>

                    {/* Description */}
                    {selected.details_sanitized && (
                      <p className="text-sm text-sos-blue-800 leading-relaxed">{selected.details_sanitized}</p>
                    )}

                    {/* Triage Score Bar */}
                    {selected.triage_score != null && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-sos-gray-600">Triage Score</span>
                          <span className="text-xs font-bold text-sos-blue-800">{selected.triage_score}</span>
                        </div>
                        <div className="h-2 bg-sos-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              selected.triage_score >= 80 ? 'bg-sos-red-500' :
                              selected.triage_score >= 50 ? 'bg-yellow-500' :
                              'bg-sos-accent-500'
                            }`}
                            style={{ width: `${selected.triage_score}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selected.type === 'resource' && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        selected.status === 'available' ? 'bg-green-50 text-green-700' :
                        selected.status === 'deployed' ? 'bg-sos-accent-50 text-sos-accent-700' :
                        'bg-sos-gray-200 text-sos-gray-600'
                      }`}>{selected.status}</span>
                    </div>

                    {selected.details_sanitized && (
                      <p className="text-sm text-sos-blue-800 leading-relaxed">{selected.details_sanitized}</p>
                    )}

                    {selected.capacity_available && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-sos-gray-600">Capacity:</span>
                        <span className="text-sm font-bold text-sos-blue-800">{selected.capacity_available}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Action */}
                {selected.sos_id && (
                  <a
                    href={`/sos/${selected.sos_id}`}
                    className="block w-full text-center text-xs font-semibold py-2.5 rounded-lg bg-sos-blue-800 text-white hover:bg-sos-blue-700 transition-colors"
                  >
                    View SOS →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,78,75,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239,78,75,0); }
        }
      `}</style>
    </DashboardShell>
  );
}
