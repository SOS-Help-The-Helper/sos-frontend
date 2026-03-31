'use client';

import { useEffect, useState, useRef } from 'react';
// mapbox-gl loaded dynamically in useEffect to avoid SSR issues
import { CitizenShell } from '@/components/citizen-shell';
import { SOSBottomSheet } from '@/components/sos-bottom-sheet';
import { getAlerts, getExternalResources, type Alert, type ExternalResource } from '@/lib/citizen-api';
import { supabase } from '@/lib/supabase-client';
import { DEMO_ALERTS, DEMO_PARTNERS, DEMO_EXTERNAL_RESOURCES } from '@/lib/demo-data';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1Ijoic29zY29ubmVjdCIsImEiOiJjbWxlNmwxMHUxN3hhM2Vwd2R0a2RjNWttIn0.Re0ubam0-wA5O5wkAHzyAw';

const STATUS_MAP: Record<string, { emoji: string; label: string }> = {
  safe: { emoji: '🟢', label: 'Safe' },
  watch: { emoji: '🟡', label: 'Watch' },
  active: { emoji: '🔴', label: 'Active' },
};

type MapFilter = 'all' | 'partners' | 'community' | 'alerts';

/**
 * Map tab — the default citizen view. Full screen Mapbox.
 * MAP IS THE APP.
 */
export default function CitizenMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [lat, setLat] = useState(35.5951);
  const [lng, setLng] = useState(-82.5515);
  const [locationName, setLocationName] = useState('Asheville, NC');
  const [gpsReady, setGpsReady] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [extResources, setExtResources] = useState<ExternalResource[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [mapFilter, setMapFilter] = useState<MapFilter>('all');
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<any>(null);

  // Check admin preview
  const isAdmin = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('admin') === 'true';

  // Status from alerts
  const hasExtreme = alerts.some(a => a.severity === 'extreme' || a.severity === 'severe');
  const hasWatch = alerts.some(a => a.severity === 'moderate');
  const status = hasExtreme ? 'active' : hasWatch || alerts.length > 0 ? 'watch' : 'safe';

  // GPS
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      p => { setLat(p.coords.latitude); setLng(p.coords.longitude); setGpsReady(true); },
      () => setGpsReady(true),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Load data
  useEffect(() => {
    if (!gpsReady) return;
    if (isAdmin) {
      setAlerts(DEMO_ALERTS); setPartners(DEMO_PARTNERS); setExtResources(DEMO_EXTERNAL_RESOURCES);
      setLoading(false); return;
    }
    async function load() {
      const [alertData, extData, partnerData] = await Promise.all([
        getAlerts(lat, lng),
        getExternalResources(lat, lng),
        supabase.from('organizations').select('id, name, org_type, latitude, longitude').not('latitude', 'is', null).eq('status', 'active'),
      ]);
      setAlerts(alertData); setExtResources(extData); setPartners(partnerData.data || []);
      setLoading(false);
    }
    load();
  }, [gpsReady, lat, lng, isAdmin]);

  // Map
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    markersRef.current = [];
    if (!MAPBOX_TOKEN) return;

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      if (!mapRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapRef.current, style: 'mapbox://styles/mapbox/dark-v11',
        center: [lng || -82.5515, lat || 35.5951], zoom: 12, attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // User dot
      const userEl = document.createElement('div');
      userEl.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#89CFF0;border:3px solid white;box-shadow:0 0 12px rgba(137,207,240,0.8);';
      new mapboxgl.Marker({ element: userEl }).setLngLat([lng, lat]).addTo(map);

      map.on('load', () => {
        // Partner pins
        if (mapFilter !== 'community') {
          partners.forEach(p => {
            if (!p.latitude || !p.longitude) return;
            const el = document.createElement('div');
            el.style.cssText = 'width:10px;height:10px;border-radius:50%;background:#1A3850;border:2px solid #89CFF0;cursor:pointer;';
            el.onclick = (e) => { e.stopPropagation(); setSelectedPin({ type: 'partner', ...p }); };
            new mapboxgl.Marker({ element: el }).setLngLat([p.longitude, p.latitude]).addTo(map);
            markersRef.current.push(el);
          });
        }

        // 211 pins
        if (mapFilter !== 'partners' && mapFilter !== 'alerts') {
          extResources.slice(0, 50).forEach(r => {
            if (!r.latitude || !r.longitude) return;
            const el = document.createElement('div');
            el.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#EDB200;border:2px solid #EDB20080;cursor:pointer;';
            el.onclick = (e) => { e.stopPropagation(); setSelectedPin({ type: '211', ...r }); };
            new mapboxgl.Marker({ element: el }).setLngLat([r.longitude, r.latitude]).addTo(map);
            markersRef.current.push(el);
          });
        }

        // Alert geometries
        if (mapFilter === 'all' || mapFilter === 'alerts') {
          alerts.forEach((alert, i) => {
            if (!alert.geometry) return;
            try {
              const color = alert.severity === 'extreme' || alert.severity === 'severe' ? '#EF4E4B' : '#EDB200';
              map.addSource(`alert-${i}`, { type: 'geojson', data: alert.geometry });
              map.addLayer({ id: `alert-fill-${i}`, type: 'fill', source: `alert-${i}`, paint: { 'fill-color': color, 'fill-opacity': 0.15 } });
              map.addLayer({ id: `alert-line-${i}`, type: 'line', source: `alert-${i}`, paint: { 'line-color': color, 'line-width': 1.5 } });
            } catch {}
          });
        }
      });

      map.on('click', () => setSelectedPin(null));
      mapInstance.current = map;
    };

    initMap();
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [lat, lng, partners, extResources, alerts, mapFilter]);

  return (
    <CitizenShell onSOSTap={() => setSheetOpen(true)} hideSOSButton={sheetOpen}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-b from-[#0F1E2B] to-transparent">
          <div className="flex items-center gap-2">
            <img src="/logomark.svg" alt="SOS" className="h-6 w-6" />
            <span className="text-xs font-bold text-white">📍 {locationName}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm">
            <span className="text-xs">{STATUS_MAP[status]?.emoji}</span>
            <span className="text-[10px] font-bold text-white">{STATUS_MAP[status]?.label}</span>
          </div>
        </div>
      </div>

      {/* Full screen map */}
      <div ref={mapRef} className="absolute inset-0 bg-[#0F1E2B]" style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }} />

      {/* Filter pills */}
      <div className="absolute top-16 left-3 z-20 flex gap-1">
        {(['all', 'partners', 'community', 'alerts'] as MapFilter[]).map(f => (
          <button key={f} onClick={() => setMapFilter(f)}
            className={`text-[9px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm transition-colors ${
              mapFilter === f ? 'bg-white/90 text-[#1A3850]' : 'bg-black/40 text-white/70'
            }`}>
            {f === 'all' ? 'All' : f === 'partners' ? '🔵 Partners' : f === 'community' ? '🟡 211' : '⚠️ Alerts'}
          </button>
        ))}
      </div>

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="absolute top-24 left-3 right-3 z-20">
          <div className={`rounded-xl p-3 backdrop-blur-sm ${hasExtreme ? 'bg-sos-red-500/90' : 'bg-yellow-500/90'}`}>
            <p className={`text-xs font-bold ${hasExtreme ? 'text-white' : 'text-yellow-900'}`}>
              {alerts[0].headline}
            </p>
            {alerts[0].area && <p className={`text-[10px] ${hasExtreme ? 'text-white/70' : 'text-yellow-800'}`}>{alerts[0].area}</p>}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-20 left-3 z-20 flex gap-1.5">
        <span className="text-[8px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1A3850] border border-[#89CFF0]" /> Partners
        </span>
        <span className="text-[8px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EDB200]" /> 211
        </span>
        <span className="text-[8px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#89CFF0]" /> You
        </span>
      </div>

      {/* Selected pin card */}
      {selectedPin && (
        <div className="absolute bottom-20 left-3 right-16 z-20">
          <div className="bg-white rounded-xl shadow-xl p-3 max-w-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#1A3850]">
                {selectedPin.name || selectedPin.organization_name}
              </span>
              <button onClick={() => setSelectedPin(null)} className="text-sos-gray-400 text-sm">✕</button>
            </div>
            {selectedPin.org_type && <p className="text-[10px] text-sos-gray-500 capitalize">{selectedPin.org_type.replace(/_/g, ' ')}</p>}
            {selectedPin.service_name && <p className="text-[10px] text-sos-gray-600">{selectedPin.service_name}</p>}
            {selectedPin.phone && <p className="text-[10px] text-sos-accent-700 mt-1">📞 {selectedPin.phone}</p>}
          </div>
        </div>
      )}

      {/* SOS Bottom Sheet */}
      <SOSBottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} context="map" />
    </CitizenShell>
  );
}
