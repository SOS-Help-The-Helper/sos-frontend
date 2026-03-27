'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { supabase } from '@/lib/supabase-client';
import { useViewContext } from '@/lib/view-context';
import { getMatchLines } from '@/lib/map-queries';
import { MapPin, Link2, Flame } from 'lucide-react';

type MapTab = 'all' | 'matches' | 'disasters';

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const { effectiveOrgId } = useViewContext();
  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [matchLines, setMatchLines] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [tab, setTab] = useState<MapTab>('all');
  const [disasterFilter, setDisasterFilter] = useState<string>('all');
  const [disasters, setDisasters] = useState<any[]>([]);

  // Load data
  useEffect(() => {
    async function loadData() {
      let reqQuery = supabase.from('requests').select('id, category, urgency, latitude, longitude, status, details_sanitized, triage_score, sos_id, org_id, disaster_id').not('latitude', 'is', null);
      let resQuery = supabase.from('resources').select('id, category, latitude, longitude, status, capacity_available, details_sanitized, sos_id, org_id').not('latitude', 'is', null);
      if (effectiveOrgId) {
        reqQuery = reqQuery.eq('org_id', effectiveOrgId);
        resQuery = resQuery.eq('org_id', effectiveOrgId);
      }
      const [reqData, resData, disData, lines] = await Promise.all([
        reqQuery, resQuery,
        supabase.from('disasters').select('id, name, status'),
        getMatchLines(effectiveOrgId),
      ]);
      setRequests(reqData.data || []);
      setResources(resData.data || []);
      setDisasters(disData.data || []);
      setMatchLines(lines);
    }
    loadData();
  }, [effectiveOrgId]);

  // Render map
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    markersRef.current = [];

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css';
    if (!document.querySelector('link[href*="mapbox-gl"]')) document.head.appendChild(link);

    const existingScript = document.querySelector('script[src*="mapbox-gl"]');
    const initMap = () => {
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl || !mapRef.current) return;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-98, 35],
        zoom: 4,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        // Filter by disaster if on disasters tab
        const filteredReqs = disasterFilter !== 'all' && tab === 'disasters'
          ? requests.filter(r => r.disaster_id === disasterFilter)
          : requests;

        // Request pins
        filteredReqs.forEach(req => {
          if (!req.latitude || !req.longitude) return;
          const score = req.triage_score || 50;
          const size = score >= 80 ? 16 : score >= 50 ? 12 : 9;
          const el = document.createElement('div');
          el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:#EF4E4B;border:2px solid rgba(239,78,75,0.5);box-shadow:0 0 ${size+4}px rgba(239,78,75,0.6);cursor:pointer;`;
          if (score >= 80) el.style.animation = 'pulse 2s infinite';
          el.onclick = (e) => { e.stopPropagation(); setSelected({ type: 'request', ...req }); };
          const marker = new mapboxgl.Marker({ element: el }).setLngLat([req.longitude, req.latitude]).addTo(map);
          markersRef.current.push(marker);
        });

        // Resource pins
        resources.forEach(res => {
          if (!res.latitude || !res.longitude) return;
          const el = document.createElement('div');
          el.style.cssText = 'width:12px;height:12px;border-radius:50%;background:#89CFF0;border:2px solid rgba(137,207,240,0.5);box-shadow:0 0 12px rgba(137,207,240,0.5);cursor:pointer;';
          el.onclick = (e) => { e.stopPropagation(); setSelected({ type: 'resource', ...res }); };
          const marker = new mapboxgl.Marker({ element: el }).setLngLat([res.longitude, res.latitude]).addTo(map);
          markersRef.current.push(marker);
        });

        // Match connection lines (matches tab only)
        if (tab === 'matches' && matchLines.length > 0) {
          // Group by request — find best match per request
          const bestByReq = new Map<string, any>();
          matchLines.forEach(ml => {
            const existing = bestByReq.get(ml.request_id);
            if (!existing || ml.match_score > existing.match_score) {
              bestByReq.set(ml.request_id, ml);
            }
          });

          const features = Array.from(bestByReq.values()).map(ml => ({
            type: 'Feature' as const,
            properties: {
              status: ml.status,
              score: ml.match_score,
              id: ml.id,
            },
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [ml.request.longitude, ml.request.latitude],
                [ml.resource.longitude, ml.resource.latitude],
              ],
            },
          }));

          map.addSource('match-lines', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features },
          });

          map.addLayer({
            id: 'match-lines-layer',
            type: 'line',
            source: 'match-lines',
            paint: {
              'line-color': [
                'match', ['get', 'status'],
                'fulfilled', '#22C55E',
                'connected', '#22C55E',
                'accepted', '#89CFF0',
                'declined', '#EF4E4B',
                '#FFFFFF'  // proposed = white
              ],
              'line-width': 2,
              'line-opacity': 0.6,
              'line-dasharray': [2, 2],
            },
          });

          // Animate proposed lines
          let dashOffset = 0;
          const animateLines = () => {
            dashOffset = (dashOffset + 0.5) % 4;
            if (map.getLayer('match-lines-layer')) {
              map.setPaintProperty('match-lines-layer', 'line-dasharray', [2, 2]);
            }
            requestAnimationFrame(animateLines);
          };
          animateLines();
        }
      });

      map.on('click', () => setSelected(null));
      mapInstance.current = map;
    };

    if (existingScript && (window as any).mapboxgl) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [requests, resources, matchLines, tab, disasterFilter]);

  return (
    <DashboardShell title="Map" subtitle={`${requests.length} requests · ${resources.length} resources`}>
      {/* Tab Toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-1">
          <button onClick={() => setTab('all')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'all' ? 'bg-sos-blue-800 text-white' : 'text-sos-gray-600'}`}>
            <MapPin className="h-3.5 w-3.5" /> All
          </button>
          <button onClick={() => setTab('matches')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'matches' ? 'bg-sos-blue-800 text-white' : 'text-sos-gray-600'}`}>
            <Link2 className="h-3.5 w-3.5" /> Matches
          </button>
          <button onClick={() => setTab('disasters')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'disasters' ? 'bg-sos-blue-800 text-white' : 'text-sos-gray-600'}`}>
            <Flame className="h-3.5 w-3.5" /> Disasters
          </button>
        </div>

        {/* Disaster filter (disasters tab only) */}
        {tab === 'disasters' && (
          <select
            value={disasterFilter}
            onChange={e => setDisasterFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border-2 border-sos-gray-300/80 bg-[#FDFCFA] text-sos-blue-800 font-medium"
          >
            <option value="all">All Disasters</option>
            {disasters.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}

        {/* Match line legend (matches tab) */}
        {tab === 'matches' && (
          <div className="flex gap-2">
            <span className="text-[10px] text-sos-gray-500 flex items-center gap-1"><span className="w-4 h-0.5 bg-white inline-block" /> Proposed</span>
            <span className="text-[10px] text-sos-gray-500 flex items-center gap-1"><span className="w-4 h-0.5 bg-sos-accent-500 inline-block" /> Accepted</span>
            <span className="text-[10px] text-sos-gray-500 flex items-center gap-1"><span className="w-4 h-0.5 bg-green-500 inline-block" /> Fulfilled</span>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border-2 border-sos-gray-300/80">
        <div ref={mapRef} className="h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)] bg-sos-blue-900" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex gap-2 z-10">
          <span className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sos-red-500" /> {requests.length} needs
          </span>
          <span className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sos-accent-500" /> {resources.length} resources
          </span>
          {tab === 'matches' && (
            <span className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Link2 className="h-3 w-3" /> {matchLines.length} matches
            </span>
          )}
        </div>

        {/* Selected pin card */}
        {selected && (
          <div className="absolute bottom-4 right-4 left-4 md:left-auto md:w-80 z-10">
            <div className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 shadow-xl overflow-hidden">
              <div className={`px-4 py-2.5 flex items-center justify-between ${selected.type === 'request' ? 'bg-sos-red-500' : 'bg-sos-accent-600'}`}>
                <span className="text-white text-sm font-bold capitalize">{selected.category?.replace(/_/g, ' ')}</span>
                <button onClick={() => setSelected(null)} className="text-white/70 hover:text-white text-lg">×</button>
              </div>
              <div className="p-4 space-y-2">
                {selected.details_sanitized && <p className="text-sm text-sos-blue-800">{selected.details_sanitized}</p>}
                {selected.triage_score && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-sos-gray-500">Triage:</span>
                    <div className="flex-1 h-1.5 bg-sos-gray-200 rounded-full"><div className={`h-full rounded-full ${selected.triage_score >= 80 ? 'bg-sos-red-500' : 'bg-sos-accent-500'}`} style={{width:`${selected.triage_score}%`}} /></div>
                    <span className="text-xs font-bold text-sos-blue-800">{selected.triage_score}</span>
                  </div>
                )}
                {selected.sos_id && (
                  <a href={`/sos/${selected.sos_id}`} className="block text-center text-xs font-semibold py-2 rounded-lg bg-sos-blue-800 text-white hover:bg-sos-blue-700 transition-colors">View SOS →</a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,78,75,0.4)} 50%{box-shadow:0 0 0 8px rgba(239,78,75,0)} }
      `}</style>
    </DashboardShell>
  );
}
