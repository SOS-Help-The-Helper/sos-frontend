'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { supabase } from '@/lib/supabase-client';
import { useViewContext } from '@/lib/view-context';
import { useAuthContext } from '@/lib/auth-context';
import { getMatchLines } from '@/lib/map-queries';
import { getMapViews, createMapView, updateMapView, deleteMapView, type MapView } from '@/lib/map-views';
import { MapPin, Link2, Plus, X, Save, GripVertical } from 'lucide-react';
import { measureText } from '@/lib/text-measure';
import { PersonaToggle, usePersonas } from '@/components/partner/persona-toggle';

// "All" is a virtual tab — always first, not deletable, not stored in DB
const ALL_TAB_ID = '__all__';
const MATCHES_TAB_ID = '__matches__';

export default function MapPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="w-10 h-10 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <MapContent />
    </Suspense>
  );
}

function MapContent() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const customPinMarkersRef = useRef<any[]>([]);
  const { effectiveOrgId } = useViewContext();
  const { orgId } = useAuthContext();
  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [matchLines, setMatchLines] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [disasters, setDisasters] = useState<any[]>([]);
  const [disasterFilter, setDisasterFilter] = useState<string>('all');

  // Dynamic tabs
  const [mapViews, setMapViews] = useState<MapView[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>(ALL_TAB_ID);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [newTabDisaster, setNewTabDisaster] = useState('');
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [addingPin, setAddingPin] = useState(false);
  const [pinLabel, setPinLabel] = useState('');

  const currentOrgId = effectiveOrgId || orgId;
  const [personas, setPersonas] = usePersonas();

  // Load map views
  useEffect(() => {
    if (!currentOrgId) return;
    getMapViews(currentOrgId).then(setMapViews);
  }, [currentOrgId]);

  // Load map data
  useEffect(() => {
    async function loadData() {
      let reqQuery = supabase.from('requests').select('id, category, urgency, latitude, longitude, status, details_sanitized, triage_score, sos_id, org_id, disaster_id, taxonomy_code, created_at, source').not('latitude', 'is', null);
      let resQuery = supabase.from('resources').select('id, category, latitude, longitude, status, capacity_available, details_sanitized, sos_id, org_id, taxonomy_code, created_at, source, persona_type').not('latitude', 'is', null);
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

  // Get active view config
  const activeView = activeTabId === ALL_TAB_ID || activeTabId === MATCHES_TAB_ID
    ? null
    : mapViews.find(v => v.id === activeTabId);

  const isMatchesTab = activeTabId === MATCHES_TAB_ID;

  // Active disaster filter from view or manual selection
  const effectiveDisasterFilter = activeView?.disaster_id || disasterFilter;

  // Filter requests by disaster
  const filteredRequests = effectiveDisasterFilter && effectiveDisasterFilter !== 'all'
    ? requests.filter(r => r.disaster_id === effectiveDisasterFilter)
    : requests;

  // Filter by persona
  const personaFilteredRequests = personas.includes('survivor') ? filteredRequests : [];
  const personaFilteredResources = resources.filter(res => {
    const cat = res.category || '';
    const pType = res.persona_type || '';
    const isDonor = cat === 'housing' || pType === 'donor';
    const isDriver = cat === 'transport' || pType === 'driver';
    if (isDonor && personas.includes('donor')) return true;
    if (isDriver && personas.includes('driver')) return true;
    if (!isDonor && !isDriver) return personas.includes('donor') || personas.includes('driver');
    return false;
  });

  // Render map
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    markersRef.current = [];
    customPinMarkersRef.current = [];

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

      // Restore viewport from saved view, or default
      const center = activeView ? [activeView.center_lng, activeView.center_lat] : [-98, 35];
      const zoom = activeView?.zoom || 4;

      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center,
        zoom,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        // Request pins (filtered by persona)
        personaFilteredRequests.forEach(req => {
          if (!req.latitude || !req.longitude) return;
          const score = req.triage_score || 50;
          const size = score >= 80 ? 16 : score >= 50 ? 12 : 9;
          const el = document.createElement('div');
          el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;';
          const dot = document.createElement('div');
          dot.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:#EF4E4B;border:2px solid rgba(239,78,75,0.5);box-shadow:0 0 ${size+4}px rgba(239,78,75,0.6);`;
          if (score >= 80) dot.style.animation = 'pulse 2s infinite';
          el.appendChild(dot);
          const labelText = req.category || 'SOS';
          const lbl = document.createElement('div');
          lbl.textContent = labelText;
          lbl.style.cssText = 'font:500 9px Roboto,sans-serif;color:#1B2A4A;background:rgba(255,255,255,0.85);padding:1px 4px;border-radius:3px;margin-top:2px;white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(4px);';
          measureText(labelText, '500 9px Roboto, sans-serif', 80, 11).then(m => { if (m && m.lineCount > 1) lbl.style.fontSize = '8px'; });
          el.appendChild(lbl);
          el.onclick = (e) => { e.stopPropagation(); setSelected({ type: 'request', ...req }); };
          const marker = new mapboxgl.Marker({ element: el }).setLngLat([req.longitude, req.latitude]).addTo(map);
          markersRef.current.push(marker);
        });

        // Resource pins — color-coded by capacity status (filtered by persona)
        personaFilteredResources.forEach(res => {
          if (!res.latitude || !res.longitude) return;
          const pinColor = res.status === 'available' ? '#22C55E' :
                           res.status === 'limited' ? '#EDB200' :
                           res.status === 'at_capacity' ? '#EF4E4B' :
                           res.status === 'paused' ? '#888888' : '#89CFF0';
          const el = document.createElement('div');
          el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;';
          const dot = document.createElement('div');
          dot.style.cssText = `width:12px;height:12px;border-radius:50%;background:${pinColor};border:2px solid ${pinColor}80;box-shadow:0 0 12px ${pinColor}50;`;
          el.appendChild(dot);
          const labelText = res.category || 'Resource';
          const lbl = document.createElement('div');
          lbl.textContent = labelText;
          lbl.style.cssText = 'font:500 9px Roboto,sans-serif;color:#1B2A4A;background:rgba(255,255,255,0.85);padding:1px 4px;border-radius:3px;margin-top:2px;white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(4px);';
          measureText(labelText, '500 9px Roboto, sans-serif', 80, 11).then(m => { if (m && m.lineCount > 1) lbl.style.fontSize = '8px'; });
          el.appendChild(lbl);
          el.onclick = (e) => { e.stopPropagation(); setSelected({ type: 'resource', ...res }); };
          const marker = new mapboxgl.Marker({ element: el }).setLngLat([res.longitude, res.latitude]).addTo(map);
          markersRef.current.push(marker);
        });

        // Match lines (matches tab or view with matches layer)
        const showMatches = isMatchesTab || (activeView?.layers?.includes('matches'));
        if (showMatches && matchLines.length > 0) {
          const bestByReq = new Map<string, any>();
          matchLines.forEach(ml => {
            const existing = bestByReq.get(ml.request_id);
            if (!existing || ml.match_score > existing.match_score) bestByReq.set(ml.request_id, ml);
          });
          const features = Array.from(bestByReq.values()).map(ml => ({
            type: 'Feature' as const,
            properties: { status: ml.status, score: ml.match_score },
            geometry: { type: 'LineString' as const, coordinates: [[ml.request.longitude, ml.request.latitude], [ml.resource.longitude, ml.resource.latitude]] },
          }));
          map.addSource('match-lines', { type: 'geojson', data: { type: 'FeatureCollection', features } });
          map.addLayer({
            id: 'match-lines-layer', type: 'line', source: 'match-lines',
            paint: {
              'line-color': ['match', ['get', 'status'], 'fulfilled', '#22C55E', 'connected', '#22C55E', 'accepted', '#89CFF0', 'declined', '#EF4E4B', '#FFFFFF'],
              'line-width': 2, 'line-opacity': 0.6, 'line-dasharray': [2, 2],
            },
          });
        }

        // Custom pins from saved view
        if (activeView?.pins?.length) {
          activeView.pins.forEach(pin => {
            const el = document.createElement('div');
            el.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
            const dot = document.createElement('div');
            dot.style.cssText = `width:14px;height:14px;border-radius:50%;background:${pin.color || '#EDB200'};border:2px solid white;box-shadow:0 0 8px rgba(0,0,0,0.3);`;
            el.appendChild(dot);
            const lbl = document.createElement('div');
            lbl.textContent = pin.label;
            lbl.style.cssText = 'font:600 9px Roboto,sans-serif;color:white;background:rgba(0,0,0,0.7);padding:1px 5px;border-radius:3px;margin-top:2px;white-space:nowrap;';
            el.appendChild(lbl);
            const marker = new mapboxgl.Marker({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(map);
            customPinMarkersRef.current.push(marker);
          });
        }
      });

      // Long press to add pin
      let pressTimeout: NodeJS.Timeout;
      map.on('mousedown', (e: any) => {
        pressTimeout = setTimeout(() => {
          const { lat, lng } = e.lngLat;
          setAddingPin(true);
          setPinLabel('');
          // Temporarily store coords
          (window as any).__pendingPin = { lat, lng };
        }, 600);
      });
      map.on('mouseup', () => clearTimeout(pressTimeout));
      map.on('mousemove', () => clearTimeout(pressTimeout));
      map.on('click', () => { if (!addingPin) setSelected(null); });

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
  }, [personaFilteredRequests, personaFilteredResources, matchLines, activeTabId, activeView]);

  // Create new tab from current viewport
  async function handleCreateTab() {
    if (!newTabName.trim() || !currentOrgId) return;
    const map = mapInstance.current;
    const center = map?.getCenter();
    const zoom = map?.getZoom();

    const view = await createMapView({
      org_id: currentOrgId,
      name: newTabName.trim(),
      disaster_id: newTabDisaster || null,
      center_lat: center?.lat || 0,
      center_lng: center?.lng || 0,
      zoom: zoom || 4,
      layers: ['all'],
      pins: [],
      sort_order: mapViews.length,
    });

    if (view) {
      setMapViews(prev => [...prev, view]);
      setActiveTabId(view.id);
    }
    setShowCreateModal(false);
    setNewTabName('');
    setNewTabDisaster('');
  }

  // Save current viewport to active view
  async function saveViewport() {
    if (!activeView) return;
    const map = mapInstance.current;
    if (!map) return;
    const center = map.getCenter();
    await updateMapView(activeView.id, {
      center_lat: center.lat,
      center_lng: center.lng,
      zoom: map.getZoom(),
    });
  }

  // Add custom pin to active view
  async function handleAddPin() {
    if (!activeView || !pinLabel.trim()) return;
    const pending = (window as any).__pendingPin;
    if (!pending) return;

    const newPin = { lat: pending.lat, lng: pending.lng, label: pinLabel.trim(), color: '#EDB200' };
    const updatedPins = [...(activeView.pins || []), newPin];
    await updateMapView(activeView.id, { pins: updatedPins });
    setMapViews(prev => prev.map(v => v.id === activeView.id ? { ...v, pins: updatedPins } : v));
    setAddingPin(false);
    setPinLabel('');
    delete (window as any).__pendingPin;
  }

  // Delete tab
  async function handleDeleteTab(id: string) {
    await deleteMapView(id);
    setMapViews(prev => prev.filter(v => v.id !== id));
    if (activeTabId === id) setActiveTabId(ALL_TAB_ID);
  }

  return (
    <DashboardShell title="Map" subtitle={`${requests.length} requests · ${resources.length} resources`}>
      {/* Dynamic Tabs */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
        {/* Built-in "All" tab */}
        <button
          onClick={() => setActiveTabId(ALL_TAB_ID)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
            activeTabId === ALL_TAB_ID ? 'bg-sos-blue-800 text-white' : 'bg-white border border-sos-gray-300 text-sos-gray-600 hover:bg-sos-gray-200'
          }`}
        >
          <MapPin className="h-3.5 w-3.5" /> All
        </button>

        {/* Built-in "Matches" tab */}
        <button
          onClick={() => setActiveTabId(MATCHES_TAB_ID)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
            activeTabId === MATCHES_TAB_ID ? 'bg-sos-blue-800 text-white' : 'bg-white border border-sos-gray-300 text-sos-gray-600 hover:bg-sos-gray-200'
          }`}
        >
          <Link2 className="h-3.5 w-3.5" /> Matches
        </button>

        {/* Dynamic saved tabs */}
        {mapViews.map(view => (
          <button
            key={view.id}
            onClick={() => setActiveTabId(view.id)}
            className={`group flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTabId === view.id ? 'bg-sos-blue-800 text-white' : 'bg-white border border-sos-gray-300 text-sos-gray-600 hover:bg-sos-gray-200'
            }`}
          >
            {view.name}
            <span
              onClick={(e) => { e.stopPropagation(); handleDeleteTab(view.id); }}
              className={`ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${activeTabId === view.id ? 'text-white/60 hover:text-white' : 'text-sos-gray-400 hover:text-sos-red-500'}`}
            >
              ×
            </span>
          </button>
        ))}

        {/* Add tab button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold border border-dashed border-sos-gray-300 text-sos-gray-400 hover:border-sos-accent-400 hover:text-sos-accent-600 transition-colors flex-shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>

        {/* Save viewport (when on a custom tab) */}
        {activeView && (
          <button
            onClick={saveViewport}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-sos-accent-600 hover:bg-sos-accent-50 transition-colors flex-shrink-0"
          >
            <Save className="h-3.5 w-3.5" /> Save View
          </button>
        )}

        {/* Disaster filter (for All tab) */}
        {activeTabId === ALL_TAB_ID && (
          <select
            value={disasterFilter}
            onChange={e => setDisasterFilter(e.target.value)}
            className="ml-auto text-xs px-3 py-2 rounded-lg border border-sos-gray-300 bg-white text-sos-blue-800 font-medium flex-shrink-0"
          >
            <option value="all">All Disasters</option>
            {disasters.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}

        {/* Match legend (matches tab) */}
        {isMatchesTab && (
          <div className="ml-auto flex gap-2 flex-shrink-0">
            <span className="text-[10px] text-sos-gray-500 flex items-center gap-1"><span className="w-4 h-0.5 bg-white inline-block" /> Proposed</span>
            <span className="text-[10px] text-sos-gray-500 flex items-center gap-1"><span className="w-4 h-0.5 bg-sos-accent-500 inline-block" /> Accepted</span>
            <span className="text-[10px] text-sos-gray-500 flex items-center gap-1"><span className="w-4 h-0.5 bg-green-500 inline-block" /> Fulfilled</span>
          </div>
        )}
      </div>

      {/* Persona Toggle */}
      <PersonaToggle selectedPersonas={personas} onPersonaChange={setPersonas} />

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border-2 border-sos-gray-300/80">
        <div ref={mapRef} className="h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)] bg-sos-blue-900" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex gap-2 z-10">
          <span className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sos-red-500" /> {filteredRequests.length} needs
          </span>
          <span className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sos-accent-500" /> {resources.length} resources
          </span>
          {isMatchesTab && (
            <span className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Link2 className="h-3 w-3" /> {matchLines.length} matches
            </span>
          )}
          {activeView?.pins?.length ? (
            <span className="text-[10px] bg-black/60 backdrop-blur-sm text-yellow-300 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              📌 {activeView.pins.length} pins
            </span>
          ) : null}
        </div>

        {/* Long-press pin creation */}
        {addingPin && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white rounded-xl shadow-xl border border-sos-gray-300 p-4 w-64">
            <p className="text-xs font-bold text-sos-blue-800 mb-2">Add Custom Pin</p>
            <input
              type="text"
              value={pinLabel}
              onChange={e => setPinLabel(e.target.value)}
              placeholder="Pin label..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => { setAddingPin(false); delete (window as any).__pendingPin; }}
                className="flex-1 py-2 rounded-lg border border-sos-gray-300 text-xs font-semibold text-sos-gray-600">Cancel</button>
              <button onClick={handleAddPin} disabled={!pinLabel.trim() || !activeView}
                className="flex-1 py-2 rounded-lg bg-sos-blue-800 text-white text-xs font-semibold disabled:opacity-40">
                {activeView ? 'Add Pin' : 'Save a view first'}
              </button>
            </div>
          </div>
        )}

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

      {/* Create Tab Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowCreateModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-xl shadow-xl border border-sos-gray-300 p-6 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-sos-blue-800 mb-4">Create Map View</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-sos-gray-600">View Name</label>
                <input
                  type="text"
                  value={newTabName}
                  onChange={e => setNewTabName(e.target.value)}
                  placeholder="e.g. Hurricane Response Zone"
                  autoFocus
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-sos-gray-600">Disaster Filter (optional)</label>
                <select
                  value={newTabDisaster}
                  onChange={e => setNewTabDisaster(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-sos-gray-300 text-sm text-sos-blue-800"
                >
                  <option value="">No filter</option>
                  {disasters.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <p className="text-[10px] text-sos-gray-400">Current viewport will be saved with this view.</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 rounded-lg border border-sos-gray-300 text-sm font-semibold text-sos-gray-600">Cancel</button>
              <button onClick={handleCreateTab} disabled={!newTabName.trim()} className="flex-1 py-2.5 rounded-lg bg-sos-blue-800 text-white text-sm font-semibold disabled:opacity-40">Create</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,78,75,0.4)} 50%{box-shadow:0 0 0 8px rgba(239,78,75,0)} }
      `}</style>
    </DashboardShell>
  );
}
