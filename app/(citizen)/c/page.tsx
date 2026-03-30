'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAlerts, getSOSScore, getCommunityPreview, getExternalResources, type Alert, type SOSScore, type CommunityMessage, type ExternalResource } from '@/lib/citizen-api';
import { supabase } from '@/lib/supabase-client';

// --- Constants ---
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const STATUS_MAP: Record<string, { emoji: string; label: string; color: string }> = {
  safe: { emoji: '🟢', label: 'Safe', color: 'bg-green-500' },
  watch: { emoji: '🟡', label: 'Watch', color: 'bg-yellow-500' },
  active: { emoji: '🔴', label: 'Active', color: 'bg-sos-red-500' },
};

type MapFilter = 'all' | 'partners' | 'community';

export default function CitizenHome() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Location
  const [lat, setLat] = useState(35.5951);
  const [lng, setLng] = useState(-82.5515);
  const [locationName, setLocationName] = useState('Asheville, NC');
  const [gpsReady, setGpsReady] = useState(false);

  // Data
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [score, setScore] = useState<SOSScore | null>(null);
  const [community, setCommunity] = useState<{ messages: CommunityMessage[]; memberCount: number; helperCount: number }>({ messages: [], memberCount: 0, helperCount: 0 });
  const [extResources, setExtResources] = useState<ExternalResource[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [mapFilter, setMapFilter] = useState<MapFilter>('all');
  const [agentInput, setAgentInput] = useState('');
  const [loading, setLoading] = useState(true);

  // Derive status from alerts
  const hasExtreme = alerts.some(a => a.severity === 'extreme' || a.severity === 'severe');
  const hasWatch = alerts.some(a => a.severity === 'moderate');
  const status = hasExtreme ? 'active' : hasWatch || alerts.length > 0 ? 'watch' : 'safe';
  const statusInfo = STATUS_MAP[status];

  // GPS detect
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setGpsReady(true); },
      () => setGpsReady(true), // proceed with default
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Load all data once GPS ready
  useEffect(() => {
    if (!gpsReady) return;
    async function loadAll() {
      const personId = typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : null;

      const [alertData, scoreData, communityData, extData, partnerData] = await Promise.all([
        getAlerts(lat, lng),
        personId ? getSOSScore(personId) : Promise.resolve(null),
        getCommunityPreview(lat, lng),
        getExternalResources(lat, lng),
        supabase.from('organizations').select('id, name, org_type, latitude, longitude').not('latitude', 'is', null).eq('status', 'active'),
      ]);

      setAlerts(alertData);
      setScore(scoreData);
      setCommunity(communityData);
      setExtResources(extData);
      setPartners(partnerData.data || []);
      setLoading(false);
    }
    loadAll();
  }, [gpsReady, lat, lng]);

  // Initialize map
  useEffect(() => {
    if (!gpsReady || !mapRef.current || loading) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    markersRef.current = [];

    if (!MAPBOX_TOKEN) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css';
    if (!document.querySelector('link[href*="mapbox-gl"]')) document.head.appendChild(link);

    const initMap = () => {
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl || !mapRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [lng, lat],
        zoom: 11,
        attributionControl: false,
        interactive: true,
      });

      // User location dot
      const userEl = document.createElement('div');
      userEl.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#89CFF0;border:3px solid white;box-shadow:0 0 12px rgba(137,207,240,0.8);';
      new mapboxgl.Marker({ element: userEl }).setLngLat([lng, lat]).addTo(map);

      // Partner pins (blue)
      if (mapFilter !== 'community') {
        partners.forEach(p => {
          if (!p.latitude || !p.longitude) return;
          const el = document.createElement('div');
          el.style.cssText = 'width:10px;height:10px;border-radius:50%;background:#1A3850;border:2px solid #89CFF0;cursor:pointer;';
          el.title = p.name;
          new mapboxgl.Marker({ element: el }).setLngLat([p.longitude, p.latitude]).addTo(map);
          markersRef.current.push(el);
        });
      }

      // 211 resource pins (orange)
      if (mapFilter !== 'partners') {
        extResources.slice(0, 50).forEach(r => {
          if (!r.latitude || !r.longitude) return;
          const el = document.createElement('div');
          el.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#EDB200;border:2px solid #EDB20080;cursor:pointer;';
          el.title = r.organization_name;
          new mapboxgl.Marker({ element: el }).setLngLat([r.longitude, r.latitude]).addTo(map);
          markersRef.current.push(el);
        });
      }

      // Alert geometries (if any have geometry)
      map.on('load', () => {
        alerts.forEach((alert, i) => {
          if (!alert.geometry) return;
          try {
            map.addSource(`alert-${i}`, { type: 'geojson', data: alert.geometry });
            const color = alert.severity === 'extreme' ? '#EF4E4B' : alert.severity === 'severe' ? '#EF4E4B' : '#EDB200';
            map.addLayer({
              id: `alert-fill-${i}`, type: 'fill', source: `alert-${i}`,
              paint: { 'fill-color': color, 'fill-opacity': 0.15 },
            });
            map.addLayer({
              id: `alert-line-${i}`, type: 'line', source: `alert-${i}`,
              paint: { 'line-color': color, 'line-width': 1.5, 'line-opacity': 0.5 },
            });
          } catch { /* geometry may be invalid */ }
        });
      });

      mapInstance.current = map;
    };

    const existingScript = document.querySelector('script[src*="mapbox-gl"]');
    if (existingScript && (window as any).mapboxgl) initMap();
    else {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [gpsReady, loading, lat, lng, partners, extResources, alerts, mapFilter]);

  // Score ring SVG
  function ScoreRing({ value, max }: { value: number; max: number }) {
    const pct = max > 0 ? value / max : 0;
    const r = 38;
    const circ = 2 * Math.PI * r;
    const color = pct >= 0.7 ? '#22C55E' : pct >= 0.4 ? '#89CFF0' : '#EF4E4B';
    return (
      <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1A385015" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${pct * circ} ${circ - pct * circ}`} strokeLinecap="round" />
      </svg>
    );
  }

  function PillarBar({ icon, label, value, max, color }: { icon: string; label: string; value: number; max: number; color: string }) {
    return (
      <div className="flex-1 text-center">
        <span className="text-sm">{icon}</span>
        <div className="h-1.5 bg-white/10 rounded-full mt-1 mx-1 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, backgroundColor: color }} />
        </div>
        <p className="text-[9px] text-sos-gray-500 mt-0.5">{value}/{max}</p>
      </div>
    );
  }

  function timeSince(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h`;
  }

  // Agent submit
  function handleAgentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agentInput.trim()) return;
    router.push(`/chat?q=${encodeURIComponent(agentInput.trim())}`);
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col max-w-lg mx-auto md:max-w-2xl">
      {/* HEADER — dark navy */}
      <header className="bg-sos-blue-800 text-white px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logomark.svg" alt="SOS" className="h-7 w-7" />
          <div>
            <p className="text-xs font-bold leading-none">📍 {locationName}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusInfo.color}/20`}>
          <span className="text-sm">{statusInfo.emoji}</span>
          <span className="text-[10px] font-bold">{statusInfo.label}</span>
        </div>
      </header>

      {/* MAP */}
      <div className="relative">
        <div ref={mapRef} className="h-44 bg-sos-blue-900" />

        {/* Filter pills */}
        <div className="absolute bottom-2 left-2 flex gap-1 z-10">
          {[
            { id: 'all' as MapFilter, label: 'All' },
            { id: 'partners' as MapFilter, label: '🔵 Partners' },
            { id: 'community' as MapFilter, label: '🟡 211' },
          ].map(f => (
            <button key={f.id} onClick={() => setMapFilter(f.id)}
              className={`text-[9px] font-bold px-2 py-1 rounded-full backdrop-blur-sm transition-colors ${
                mapFilter === f.id ? 'bg-white/90 text-sos-blue-800' : 'bg-black/40 text-white/80'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute bottom-2 right-2 z-10 flex gap-1.5">
          <span className="text-[8px] bg-black/50 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1A3850] border border-[#89CFF0]" /> Partners
          </span>
          <span className="text-[8px] bg-black/50 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EDB200]" /> 211
          </span>
        </div>
      </div>

      {/* ALERT BANNER */}
      {alerts.length > 0 && (
        <div className={`px-4 py-2.5 ${hasExtreme ? 'bg-sos-red-500 text-white' : 'bg-yellow-50 border-b border-yellow-200'}`}>
          {alerts.slice(0, 2).map((alert, i) => (
            <div key={alert.id || i} className="flex items-start gap-2">
              <span className="text-sm mt-0.5">{alert.type === 'weather' ? '⚠️' : alert.type === 'flood' ? '🌊' : alert.type === 'fire' ? '🔥' : '📢'}</span>
              <div className="flex-1">
                <p className={`text-xs font-bold ${hasExtreme ? 'text-white' : 'text-yellow-800'}`}>{alert.headline}</p>
                {alert.area && <p className={`text-[10px] ${hasExtreme ? 'text-white/70' : 'text-yellow-600'}`}>{alert.area}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 px-4 py-3 space-y-3">

        {/* ACTION BUTTONS — above fold, full width, prominent */}
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => router.push('/help')}
            className="bg-sos-red-500 text-white rounded-xl py-4 text-center font-bold text-sm shadow-sm hover:bg-sos-red-600 active:scale-[0.98] transition-all">
            <span className="text-lg block mb-0.5">🔴</span>
            I Need Help
          </button>
          <button onClick={() => router.push('/offer')}
            className="bg-green-600 text-white rounded-xl py-4 text-center font-bold text-sm shadow-sm hover:bg-green-700 active:scale-[0.98] transition-all">
            <span className="text-lg block mb-0.5">🤝</span>
            I Can Help
          </button>
        </div>

        {/* SOS SCORE */}
        <div className="bg-white rounded-xl border border-sos-gray-300 p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <ScoreRing value={score?.total || 0} max={100} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-sos-blue-800">{score?.total || 0}</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-sos-blue-800 mb-2">SOS Score</p>
              <div className="flex gap-1">
                <PillarBar icon="🛡️" label="Ready" value={score?.readiness || 0} max={score?.readiness_max || 40} color="#22C55E" />
                <PillarBar icon="🤝" label="Community" value={score?.community || 0} max={score?.community_max || 30} color="#89CFF0" />
                <PillarBar icon="⭐" label="Impact" value={score?.impact || 0} max={score?.impact_max || 30} color="#EDB200" />
              </div>
              {score?.next_action && (
                <p className="text-[10px] text-sos-accent-700 mt-2 font-medium">
                  Next: {score.next_action} <span className="text-sos-accent-500">(+{score.next_points})</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* COMMUNITY PREVIEW */}
        <button onClick={() => router.push('/community')} className="w-full bg-white rounded-xl border border-sos-gray-300 p-4 text-left hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-sos-blue-800">📢 Your Community</p>
            <span className="text-[10px] text-sos-accent-700 font-medium">Open Chat →</span>
          </div>
          {community.messages.length > 0 ? (
            <div className="space-y-1.5">
              {community.messages.map(msg => (
                <div key={msg.id} className="flex items-start gap-2">
                  <p className="text-xs text-sos-gray-700 flex-1 line-clamp-1">"{msg.message_text}"</p>
                  <span className="text-[9px] text-sos-gray-400 flex-shrink-0">{timeSince(msg.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-sos-gray-400">No messages yet. Be the first!</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-sos-gray-500">
            <span>{community.memberCount} members</span>
            <span>·</span>
            <span>{community.helperCount} helpers</span>
          </div>
        </button>
      </div>

      {/* AGENT INPUT — bottom, always visible */}
      <div className="sticky bottom-0 bg-sos-blue-800 px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] border-t border-white/10">
        <form onSubmit={handleAgentSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={agentInput}
            onChange={e => setAgentInput(e.target.value)}
            placeholder="💬 Ask SOS anything..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-sos-accent-400"
          />
          <button type="submit" disabled={!agentInput.trim()}
            className="w-10 h-10 rounded-xl bg-sos-red-500 text-white flex items-center justify-center hover:bg-sos-red-600 disabled:opacity-30 transition-colors flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
}
