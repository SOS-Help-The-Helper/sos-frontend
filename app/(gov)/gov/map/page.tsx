'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { GovShell } from '@/components/gov-shell';
// TODO: rewire to lib/api.ts (Phase 3-5) — import { getGovMapData, type MapLayer } from '@/lib/gov-queries';
import { supabase } from '@/lib/supabase-client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1Ijoic29zY29ubmVjdCIsImEiOiJjbWxlNmwxMHUxN3hhM2Vwd2R0a2RjNWttIn0.Re0ubam0-wA5O5wkAHzyAw';

const CATEGORY_FILTERS = ['all', 'shelter', 'food', 'medical', 'transportation', 'utilities'];
const SEVERITY_FILTERS = ['all', 'critical', 'urgent', 'standard'];

export default function GovMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [layerFilter, setLayerFilter] = useState<'all' | 'needs' | 'resources' | 'gaps'>('all');
  const [disasters, setDisasters] = useState<any[]>([]);
  const [disasterFilter, setDisasterFilter] = useState('all');
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    supabase.from('disasters').select('id, name, status').then(({ data }) => setDisasters(data || []));
  }, []);

  useEffect(() => {
    getGovMapData(disasterFilter !== 'all' ? disasterFilter : undefined).then(data => {
      setLayers(data);
      setLoading(false);
    });
  }, [disasterFilter]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    
    mapboxgl.accessToken = MAPBOX_TOKEN;
    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-82.55, 35.59], // Asheville default
      zoom: 9,
    });
    mapInstance.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
  }, []);

  // Render markers
  useEffect(() => {
    if (!mapInstance.current) return;
    

    // Clear old
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const filtered = layers.filter(l => {
      if (categoryFilter !== 'all' && l.category !== categoryFilter) return false;
      if (severityFilter !== 'all' && l.severity !== severityFilter) return false;
      if (layerFilter === 'needs' && l.type !== 'need') return false;
      if (layerFilter === 'resources' && l.type !== 'resource') return false;
      if (layerFilter === 'gaps' && l.type !== 'gap') return false;
      return true;
    });

    filtered.forEach(layer => {
      const size = Math.min(8 + layer.count * 2, 24);
      const color = layer.type === 'need' ? '#EF4E4B' :
                    layer.type === 'resource' ? '#00C758' :
                    '#EDB200'; // gap = yellow
      const opacity = layer.type === 'gap' ? 0.8 : 0.7;

      const el = document.createElement('div');
      el.style.cssText = `
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};opacity:${opacity};
        border:2px solid ${color}80;
        box-shadow:0 0 ${size}px ${color}40;
        cursor:default;
        display:flex;align-items:center;justify-content:center;
      `;
      if (layer.count > 1) {
        el.innerHTML = `<span style="font:bold ${Math.max(8, size * 0.4)}px Roboto;color:white">${layer.count}</span>`;
      }

      el.title = `${layer.type.toUpperCase()}: ${layer.count} ${layer.category} (${layer.severity || ''})`;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([layer.lng, layer.lat])
        .addTo(mapInstance.current);
      markersRef.current.push(marker);
    });
  }, [layers, categoryFilter, severityFilter, layerFilter]);

  // Stats
  const needCount = layers.filter(l => l.type === 'need').reduce((s, l) => s + l.count, 0);
  const resourceCount = layers.filter(l => l.type === 'resource').reduce((s, l) => s + l.count, 0);
  const gapCount = layers.filter(l => l.type === 'gap').reduce((s, l) => s + l.count, 0);

  return (
    <GovShell title="Situational Awareness" subtitle="Aggregated view — no personally identifiable information">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Disaster */}
        <select value={disasterFilter} onChange={e => setDisasterFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-sos-gray-300 bg-white text-sos-blue-800 font-medium">
          <option value="all">All Disasters</option>
          {disasters.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        {/* Layer type */}
        <div className="flex bg-white rounded-lg border border-sos-gray-300 p-0.5">
          {[
            { id: 'all', label: 'All' },
            { id: 'needs', label: '🔴 Needs', count: needCount },
            { id: 'resources', label: '🟢 Resources', count: resourceCount },
            { id: 'gaps', label: '🟡 Gaps', count: gapCount },
          ].map(l => (
            <button key={l.id} onClick={() => setLayerFilter(l.id as any)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                layerFilter === l.id ? 'bg-sos-blue-800 text-white' : 'text-sos-gray-600 hover:bg-sos-gray-200'
              }`}>
              {l.label} {l.count != null ? `(${l.count})` : ''}
            </button>
          ))}
        </div>

        {/* Category */}
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-sos-gray-300 bg-white text-sos-blue-800 font-medium">
          {CATEGORY_FILTERS.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>

        {/* Severity */}
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-sos-gray-300 bg-white text-sos-blue-800 font-medium">
          {SEVERITY_FILTERS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Severity' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-sos-gray-300 relative">
        <div ref={mapRef} className="h-[500px] md:h-[600px]" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-[10px] space-y-1.5 border border-sos-gray-300">
          <p className="font-bold text-sos-blue-800 text-xs">Legend</p>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#EF4E4B]" /><span>Needs ({needCount})</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#00C758]" /><span>Resources ({resourceCount})</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#EDB200]" /><span>Gaps ({gapCount})</span></div>
          <p className="text-sos-gray-400 pt-1">Dot size = count at location</p>
        </div>
      </div>

      {/* Data notice */}
      <p className="text-[10px] text-sos-gray-400 mt-2 text-center">
        All data aggregated to ~1km grid. No personally identifiable information displayed. {layers.length} data points.
      </p>
    </GovShell>
  );
}
