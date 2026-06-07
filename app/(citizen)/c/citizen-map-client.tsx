'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { CitizenShell } from '@/components/citizen-shell';
import { SOSBottomSheet } from '@/components/sos-bottom-sheet';
import { MapResultsSheet } from '@/components/map-results-sheet';
import { onMapCommand, clearMapCommand, type MapCommand, type MapResult } from '@/lib/map-commands';
import { applyMapCategoryFilter, clearMapCategoryFilter } from '@/lib/map-filter';
import { getAlerts, type Alert } from '@/lib/citizen-api';
import { supabase } from '@/lib/supabase-client';
import { CitizenHeader } from '@/components/citizen-header';
import { PinDetailCard } from '@/components/citizen/pin-detail-card';
import { setPersonId } from '@/lib/person-cookie';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
type SelectedPin = {
  type: 'request' | 'resource' | 'report';
  id: string;
  properties: Record<string, any>;
};

type DetailMode = 'card' | 'expanded' | 'match';

export default function CitizenMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const layerClickedRef = useRef(false);
  const mapInstance = useRef<any>(null);
  const mapboxglRef = useRef<any>(null);


  const realtimeChannelRef = useRef<any>(null);

  const [lat, setLat] = useState(39);
  const [lng, setLng] = useState(-98);
  const [locationName, setLocationName] = useState('United States');
  const [gpsReady, setGpsReady] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Selected pin + detail card
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [detailMode, setDetailMode] = useState<DetailMode>('card');
  const [matchMode, setMatchMode] = useState(false);

  // Heatmap mode toggle
  const [heatmapMode, setHeatmapMode] = useState(false);

  // Map command results
  const [mapResults, setMapResults] = useState<MapResult[]>([]);
  const [mapResultsQuery, setMapResultsQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Heatmap mode toggle effect
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !map.isStyleLoaded()) return;
    const pinLayers = ['requests-cluster-glow', 'requests-points', 'requests-hit', 'resources-cluster-glow', 'resources-points', 'resources-hit', 'reports-points'];
    const heatLayers = ['requests-heatmap', 'resources-heatmap'];
    pinLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', heatmapMode ? 'none' : 'visible'); });
    heatLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', heatmapMode ? 'visible' : 'none'); });
  }, [heatmapMode]);

  // Allow setting personId via URL param for testing: /c?pid=xxx
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('pid');
    if (pid) {
      setPersonId(pid);
    }
  }, []);
  // Close sheet when submission animation completes
  useEffect(() => {
    const handler = () => { setSheetOpen(false); setMatchMode(false); };
    window.addEventListener('sos-close-sheet', handler);
    return () => window.removeEventListener('sos-close-sheet', handler);
  }, []);

  const hasExtreme = alerts.some(a => a.severity === 'extreme' || a.severity === 'severe');
  const hasWatch = alerts.some(a => a.severity === 'moderate');
  const status = hasExtreme ? 'active' : hasWatch || alerts.length > 0 ? 'watch' : 'safe';

  // GPS + reverse geocode for city name
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        setLat(p.coords.latitude);
        setLng(p.coords.longitude);
        setGpsReady(true);
        // Fly to user location once GPS resolves
        if (mapInstance.current) {
        if (!mapInstance.current) return;
          mapInstance.current.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 12, duration: 1500 });
          // Update user location dot
          const userSrc = mapInstance.current.getSource('user-location');
          if (userSrc) userSrc.setData({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.coords.longitude, p.coords.latitude] }, properties: {} });
        }
        // Reverse geocode with Google
        try {
          const gKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
          if (gKey) {
            const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${p.coords.latitude},${p.coords.longitude}&key=${gKey}&result_type=locality`);
            const data = await res.json();
            if (data.results?.[0]) {
              const components = data.results[0].address_components || [];
              const city = components.find((c: any) => c.types.includes('locality'))?.long_name;
              const state = components.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name;
              if (city && state) setLocationName(`${city}, ${state}`);
            }
          }
        } catch { /* keep default */ }
      },
      () => setGpsReady(true), { enableHighAccuracy: true, timeout: 3000 }
    );
  }, []);

  // Load data + initialize map
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    if (!MAPBOX_TOKEN) return;
    let glowFrame = 0;
    let destroyed = false;

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      mapboxglRef.current = mapboxgl;
      await import('mapbox-gl/dist/mapbox-gl.css');
      if (!mapRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapRef.current, style: 'mapbox://styles/mapbox/dark-v11',
        center: [-98, 39], zoom: 3.5, attributionControl: false,
      });
      // Navigation control removed — users pinch-to-zoom on mobile
      mapInstance.current = map;
      map.on('error', (e: any) => console.warn('Mapbox error:', e.error));

      map.on('load', async () => {
        // === SOS VECTOR TILES SOURCE ===
        map.addSource('sos-tiles', {
          type: 'vector',
          tiles: [`${window.location.origin}/api/map/tiles/{z}/{x}/{y}`],
          minzoom: 2,
          maxzoom: 14,
        });

        // === REQUESTS LAYERS (red) ===
        map.addLayer({ id: 'requests-cluster-glow', type: 'circle', source: 'sos-tiles', 'source-layer': 'sos',
          filter: ['==', ['get', 'type'], 'request'],
          paint: { 'circle-color': '#EF4E4B', 'circle-radius': 12, 'circle-opacity': 0.3, 'circle-blur': 1 } });
        map.addLayer({ id: 'requests-points', type: 'circle', source: 'sos-tiles', 'source-layer': 'sos',
          filter: ['==', ['get', 'type'], 'request'],
          paint: { 'circle-color': '#EF4E4B', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
        map.addLayer({ id: 'requests-hit', type: 'circle', source: 'sos-tiles', 'source-layer': 'sos',
          filter: ['==', ['get', 'type'], 'request'],
          paint: { 'circle-color': 'transparent', 'circle-radius': 22 } });

        // === RESOURCES LAYERS (blue) ===
        map.addLayer({ id: 'resources-cluster-glow', type: 'circle', source: 'sos-tiles', 'source-layer': 'sos',
          filter: ['==', ['get', 'type'], 'resource'],
          paint: { 'circle-color': '#89CFF0', 'circle-radius': 12, 'circle-opacity': 0.3, 'circle-blur': 1 } });
        map.addLayer({ id: 'resources-points', type: 'circle', source: 'sos-tiles', 'source-layer': 'sos',
          filter: ['==', ['get', 'type'], 'resource'],
          paint: { 'circle-color': '#89CFF0', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
        map.addLayer({ id: 'resources-hit', type: 'circle', source: 'sos-tiles', 'source-layer': 'sos',
          filter: ['==', ['get', 'type'], 'resource'],
          paint: { 'circle-color': 'transparent', 'circle-radius': 22 } });

        // === REPORTS LAYERS (white) ===
        map.addLayer({ id: 'reports-points', type: 'circle', source: 'sos-tiles', 'source-layer': 'sos',
          filter: ['==', ['get', 'type'], 'report'],
          paint: { 'circle-color': '#FFFFFF', 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': 'rgba(255,255,255,0.5)' } });

        // === HEATMAP LAYERS (hidden by default, toggled via button) ===
        map.addLayer({ id: 'requests-heatmap', type: 'heatmap', source: 'sos-tiles', 'source-layer': 'sos',
          filter: ['==', ['get', 'type'], 'request'],
          layout: { visibility: 'none' },
          paint: {
            'heatmap-weight': ['match', ['get', 'urgency'], 'critical', 1, 'high', 0.7, 'medium', 0.4, 0.2],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
            'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(15,30,43,0)', 0.2, '#1a3850', 0.4, '#89CFF0', 0.6, '#EF4E4B', 0.8, '#FCD34D', 1, '#ffffff'],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 9, 0],
          }
        });
        map.addLayer({ id: 'resources-heatmap', type: 'heatmap', source: 'sos-tiles', 'source-layer': 'sos',
          filter: ['==', ['get', 'type'], 'resource'],
          layout: { visibility: 'none' },
          paint: {
            'heatmap-weight': 1,
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
            'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(15,30,43,0)', 0.2, '#1a3850', 0.4, '#89CFF0', 0.7, '#34d399', 1, '#ffffff'],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 9, 0],
          }
        });

        // === DISASTERS SOURCE (navy, empty for now) ===
        map.addSource('disasters-source', {
          type: 'geojson', data: { type: 'FeatureCollection', features: [] },
          cluster: true, clusterMaxZoom: 14, clusterRadius: 50,
        });
        map.addLayer({ id: 'disasters-points', type: 'circle', source: 'disasters-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#1A3850', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#89CFF0' } });

        // === USER LOCATION (pulsing) ===
        map.addSource('user-location', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} } });
        map.addLayer({ id: 'user-pulse', type: 'circle', source: 'user-location',
          paint: { 'circle-color': '#34d399', 'circle-radius': 24, 'circle-opacity': 0.2 } });
        map.addLayer({ id: 'user-dot', type: 'circle', source: 'user-location',
          paint: { 'circle-color': '#34d399', 'circle-radius': 7, 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' } });

        // === ALERT GEOMETRIES ===
        // Load alerts initially with current position
        try {
          const alertData = await getAlerts(lat, lng).catch(() => [] as Alert[]);
          setAlerts(alertData);
          alertData.forEach((alert, i) => {
            if (!alert.geometry) return;
            try {
              const color = alert.severity === 'extreme' || alert.severity === 'severe' ? '#EF4E4B' : '#EDB200';
              map.addSource(`alert-${i}`, { type: 'geojson', data: alert.geometry });
              map.addLayer({ id: `alert-fill-${i}`, type: 'fill', source: `alert-${i}`, paint: { 'fill-color': color, 'fill-opacity': 0.12 } });
              map.addLayer({ id: `alert-line-${i}`, type: 'line', source: `alert-${i}`, paint: { 'line-color': color, 'line-width': 1.5, 'line-opacity': 0.5 } });
            } catch (e) { console.warn('Alert geometry error:', e); }
          });
        } catch (err) {
          console.error('Alert load error:', err);
        }

        // === GLOW ANIMATION ===
        const animateGlow = () => {
          if (destroyed) return;
          try {
            const t = Date.now() / 1000;
            const pulse = 0.5 + 0.5 * Math.sin(t * 1.2);
            ['requests-cluster-glow', 'resources-cluster-glow'].forEach(id => {
              if (!map.getLayer(id)) return;
              map.setPaintProperty(id, 'circle-opacity', 0.15 + pulse * 0.15);
              map.setPaintProperty(id, 'circle-radius', 10 + pulse * 4);
            });
          } catch { /* map destroyed */ }
          glowFrame = requestAnimationFrame(animateGlow);
        };
        animateGlow();

        // === CLICK HANDLERS ===
        const clickLayers = ['requests-hit', 'requests-points', 'resources-hit', 'resources-points', 'reports-points'];
        clickLayers.forEach(layer => {
          map.on('click', layer, (e: any) => {
            if (!e.features?.length) return;
            layerClickedRef.current = true;
            const props = e.features[0].properties;
            const pinType = props.type || 'request';
            setSelectedPin({ type: pinType, id: props.id, properties: typeof props === 'string' ? JSON.parse(props) : props });
            setDetailMode('card');
            setMatchMode(false);
          });
          map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
        });

        // Click empty space → dismiss (skip if a layer click just happened)
        map.on('click', () => {
          setTimeout(() => {
            if (layerClickedRef.current) { layerClickedRef.current = false; return; }
            setSelectedPin(null); setMatchMode(false);
          }, 100);
        });

        // Safety: reset all filters on load (in case a previous session left filters active)
        ['requests-points', 'resources-points', 'reports-points'].forEach(layer => {
          if (map.getLayer(layer)) {
            map.setFilter(layer, null);
          }
        });

        // === DEEP LINK: /c?pin=UUID&type=request|resource  or  /c?lat=X&lng=Y&zoom=Z ===
        const dlParams = new URLSearchParams(window.location.search);
        const dlPin = dlParams.get('pin');
        const dlType = dlParams.get('type') || 'request';
        const dlLat = dlParams.get('lat');
        const dlLng = dlParams.get('lng');
        const dlZoom = dlParams.get('zoom');

        if (dlPin) {
          // Fetch pin location from sos-read
          try {
            const SOS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
            const SOS_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
            const table = dlType === 'resource' ? 'resources' : dlType === 'report' ? 'reports' : 'requests';
            const res = await fetch(`${SOS_URL}/rest/v1/${table}?id=eq.${dlPin}&select=id,latitude,longitude,category,urgency,status`, {
              headers: { apikey: SOS_ANON, Authorization: `Bearer ${SOS_ANON}` }
            });
            const rows = await res.json();
            if (rows?.[0]?.latitude && rows?.[0]?.longitude) {
              map.flyTo({ center: [rows[0].longitude, rows[0].latitude], zoom: 14, duration: 1200 });
              setTimeout(() => {
                setSelectedPin({ type: dlType as any, id: dlPin, properties: rows[0] });
                setDetailMode('card');
              }, 1300);
            }
          } catch { /* ignore */ }
        } else if (dlLat && dlLng) {
          map.flyTo({ center: [parseFloat(dlLng), parseFloat(dlLat)], zoom: dlZoom ? parseFloat(dlZoom) : 13, duration: 1200 });
        }

        // === REALTIME SUBSCRIPTIONS ===
        const channel = supabase
          .channel('map-realtime')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests', filter: 'map_visible=eq.true' }, () => {
            // Force tile reload by adding a cache-busting param
            const source = map.getSource('sos-tiles');
            if (source && 'setTiles' in source) {
              (source as any).setTiles([`${window.location.origin}/api/map/tiles/{z}/{x}/{y}?t=${Date.now()}`]);
            }
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'resources', filter: 'map_visible=eq.true' }, () => {
            // Force tile reload by adding a cache-busting param
            const source = map.getSource('sos-tiles');
            if (source && 'setTiles' in source) {
              (source as any).setTiles([`${window.location.origin}/api/map/tiles/{z}/{x}/{y}?t=${Date.now()}`]);
            }
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, (_payload: any) => {
            // For future use
          })
          .subscribe();
        realtimeChannelRef.current = channel;
      });

      setLoading(false);
    };

    initMap();
    return () => { destroyed = true; cancelAnimationFrame(glowFrame); if (realtimeChannelRef.current) { supabase.removeChannel(realtimeChannelRef.current); realtimeChannelRef.current = null; } if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);



  // Map command subscription (for search results)
  useEffect(() => {
    const unsub = onMapCommand((cmd: MapCommand) => {
      const map = mapInstance.current;
      if (!map) return;

      if (cmd.type === 'clear') {
        setShowResults(false); setMapResults([]);
        clearMapCategoryFilter(map);
        // Restore all permanent layers
        const allLayers = ['requests-cluster-glow', 'requests-points', 'resources-cluster-glow', 'resources-points', 'reports-points', 'disasters-points'];
        allLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible'); });
        // Clear search results
        if (map.getSource('search-results-source')) {
          (map.getSource('search-results-source') as any).setData({ type: 'FeatureCollection', features: [] });
        }
        // Reset any active filters
        ['requests-points', 'resources-points'].forEach(layer => {
          if (map.getLayer(layer)) map.setFilter(layer, null);
        });
        return;
      }

      if (cmd.type === 'show_results' && cmd.results) {
        setMapResults(cmd.results);
        setMapResultsQuery(cmd.query || '');
        setShowResults(true);


        // Hide all permanent layers — show only search results
        const allLayers = ['requests-cluster-glow', 'requests-points', 'resources-cluster-glow', 'resources-points', 'reports-points', 'disasters-points'];
        allLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); });

        // Show search results using their natural colors (blue for resources, red for requests)
        try {
          const resultFeatures = cmd.results.filter(r => r.lng != null && r.lat != null).map(r => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
            properties: { id: r.id, name: r.name, category: r.category, source_type: r.source, type: r.source === 'sos' ? 'request' : 'resource' },
          }));

          if (map.getSource('search-results-source')) {
            (map.getSource('search-results-source') as any).setData({ type: 'FeatureCollection', features: resultFeatures });
          } else {
            map.addSource('search-results-source', { type: 'geojson', data: { type: 'FeatureCollection', features: resultFeatures } });
            map.addLayer({ id: 'search-results-points', type: 'circle', source: 'search-results-source',
              paint: {
                'circle-color': ['match', ['get', 'type'], 'request', '#EF4E4B', 'resource', '#89CFF0', '#89CFF0'],
                'circle-radius': 10, 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff'
              } });
            // Click handler for search result pins
            map.on('click', 'search-results-points', (e: any) => {
              if (!e.features?.length) return;
              layerClickedRef.current = true;
              const props = e.features[0].properties;
              setSelectedPin({ type: props.type === 'request' ? 'request' : 'resource', id: props.id, properties: typeof props === 'string' ? JSON.parse(props) : props });
              setDetailMode('card');
              setMatchMode(false);
            });
            map.on('mouseenter', 'search-results-points', () => { map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', 'search-results-points', () => { map.getCanvas().style.cursor = ''; });
          }

          // Auto-fit map to search results
          const mapboxgl = mapboxglRef.current;
          if (mapboxgl && cmd.results.length > 0) {
            const validResults = cmd.results.filter(r => r.lng != null && r.lat != null);
            if (validResults.length > 0) {
              const bounds = new mapboxgl.LngLatBounds();
              validResults.forEach((r: MapResult) => bounds.extend([r.lng, r.lat]));
              map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
            }
          }
        } catch (e) { console.warn('Search results render error:', e); }

        // Fix 9: Apply category filter to permanent layers
        if (cmd.filterCategory) {
          applyMapCategoryFilter(map, cmd.filterCategory);
        }

        if (cmd.fitBounds) {
          map.fitBounds([[cmd.fitBounds.sw[1], cmd.fitBounds.sw[0]], [cmd.fitBounds.ne[1], cmd.fitBounds.ne[0]]], { padding: 60, duration: 1000 });
        }
      }

      if (cmd.type === 'filter' && cmd.filterCategory) {
        applyMapCategoryFilter(map, cmd.filterCategory);
      }

      if (cmd.type === 'focus' && cmd.center) {
        map.flyTo({ center: cmd.center, zoom: cmd.zoom || 14, duration: 800 });
        // Vector tiles will automatically show the new submission via realtime subscription
      }

      // Filter existing layers by category
      if ((cmd as any).type === 'filter' && (cmd as any).category) {
        const cat = (cmd as any).category;
        ['requests-points', 'resources-points'].forEach(layer => {
          if (map.getLayer(layer)) {
            map.setFilter(layer, ['==', ['get', 'category'], cat]);
          }
        });
        ['requests-cluster-glow', 'resources-cluster-glow'].forEach(layer => {
          if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', 'none');
        });
      }

      // ── Map Intelligence Command Handlers ──

      if (cmd.type === 'show_nearby' && cmd.results) {
        // Show nearby results + fly to user
        setMapResults(cmd.results);
        setShowResults(true);
        if (cmd.center) map.flyTo({ center: cmd.center, zoom: 12, duration: 800 });
      }

      if (cmd.type === 'show_route' && cmd.route) {
        // Draw route line on map
        const routeData = { type: 'FeatureCollection' as const, features: [{ type: 'Feature' as const, geometry: cmd.route.geometry, properties: {} }] };
        if (map.getSource('route-source')) {
          (map.getSource('route-source') as any).setData(routeData);
        } else {
          map.addSource('route-source', { type: 'geojson', data: routeData });
          map.addLayer({ id: 'route-line', type: 'line', source: 'route-source',
            paint: { 'line-color': '#89CFF0', 'line-width': 4, 'line-opacity': 0.8 },
            layout: { 'line-cap': 'round', 'line-join': 'round' } });
        }
        // Add destination marker
        if (cmd.destination) {
          const destData = { type: 'FeatureCollection' as const, features: [{ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [cmd.destination.lng, cmd.destination.lat] }, properties: { name: cmd.destination.name } }] };
          if (map.getSource('dest-source')) {
            (map.getSource('dest-source') as any).setData(destData);
          } else {
            map.addSource('dest-source', { type: 'geojson', data: destData });
            map.addLayer({ id: 'dest-marker', type: 'circle', source: 'dest-source',
              paint: { 'circle-color': '#89CFF0', 'circle-radius': 12, 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } });
          }
        }
        // Fit bounds to route
        const coords = cmd.route.geometry.coordinates;
        if (coords.length > 1) {
          const lngs = coords.map((c: number[]) => c[0]), lats = coords.map((c: number[]) => c[1]);
          map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, duration: 1000 });
        }
      }

      if (cmd.type === 'show_gaps' && cmd.gaps) {
        // Draw gap circles (red translucent)
        const gapFeatures = cmd.gaps.map((g: any) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [g.lng, g.lat] },
          properties: { radius: g.radius_km, category: g.category, requests: g.request_count },
        }));
        const gapData = { type: 'FeatureCollection' as const, features: gapFeatures };
        if (map.getSource('gaps-source')) {
          (map.getSource('gaps-source') as any).setData(gapData);
        } else {
          map.addSource('gaps-source', { type: 'geojson', data: gapData });
          map.addLayer({ id: 'gaps-circles', type: 'circle', source: 'gaps-source',
            paint: { 'circle-color': 'rgba(239,78,75,0.15)', 'circle-radius': 30, 'circle-stroke-width': 2, 'circle-stroke-color': '#EF4E4B' } });
        }
        if (cmd.center) map.flyTo({ center: cmd.center, zoom: cmd.zoom || 10, duration: 800 });
      }

      if (cmd.type === 'show_activity' && cmd.activity) {
        // Show activity pins with time labels
        const actFeatures = (cmd.activity || []).map((a: any) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [a.lng, a.lat] },
          properties: { label: a.label, type: a.type, timestamp: a.timestamp },
        }));
        if (map.getSource('activity-source')) {
          (map.getSource('activity-source') as any).setData({ type: 'FeatureCollection', features: actFeatures });
        } else {
          map.addSource('activity-source', { type: 'geojson', data: { type: 'FeatureCollection', features: actFeatures } });
          map.addLayer({ id: 'activity-points', type: 'circle', source: 'activity-source',
            paint: { 'circle-color': '#34d399', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff', 'circle-opacity': 0.7 } });
        }
        if (cmd.center) map.flyTo({ center: cmd.center, zoom: 11, duration: 800 });
      }

      if (cmd.type === 'show_risk' && cmd.riskZones) {
        // Show risk zones as translucent circles
        const riskFeatures = (cmd.riskZones || []).map((z: any) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: z.center || [0, 0] },
          properties: { severity: z.severity, label: z.label, type: z.type },
        }));
        if (map.getSource('risk-source')) {
          (map.getSource('risk-source') as any).setData({ type: 'FeatureCollection', features: riskFeatures });
        } else {
          map.addSource('risk-source', { type: 'geojson', data: { type: 'FeatureCollection', features: riskFeatures } });
          map.addLayer({ id: 'risk-circles', type: 'circle', source: 'risk-source',
            paint: {
              'circle-color': ['match', ['get', 'severity'], 'extreme', 'rgba(239,78,75,0.3)', 'severe', 'rgba(239,78,75,0.2)', 'moderate', 'rgba(245,158,11,0.2)', 'rgba(245,158,11,0.1)'],
              'circle-radius': 40, 'circle-stroke-width': 2,
              'circle-stroke-color': ['match', ['get', 'severity'], 'extreme', '#EF4E4B', 'severe', '#EF4E4B', '#f59e0b'],
            } });
        }
        if (cmd.center) map.flyTo({ center: cmd.center, zoom: 11, duration: 800 });
      }

      if (cmd.type === 'track_sos' && cmd.trackingData) {
        const td = cmd.trackingData;
        // Show request pin + connecting line to resource if matched
        const features: any[] = [
          { type: 'Feature', geometry: { type: 'Point', coordinates: [td.requestPin.lng, td.requestPin.lat] }, properties: { type: 'your_request', status: td.matchStatus } },
        ];
        if (td.resourcePin) {
          features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [td.resourcePin.lng, td.resourcePin.lat] }, properties: { type: 'matched_resource', name: td.resourcePin.name } });
          // Add connecting line
          features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[td.requestPin.lng, td.requestPin.lat], [td.resourcePin.lng, td.resourcePin.lat]] }, properties: { type: 'connection' } });
        }
        if (map.getSource('tracking-source')) {
          (map.getSource('tracking-source') as any).setData({ type: 'FeatureCollection', features });
        } else {
          map.addSource('tracking-source', { type: 'geojson', data: { type: 'FeatureCollection', features } });
          map.addLayer({ id: 'tracking-line', type: 'line', source: 'tracking-source', filter: ['==', ['get', 'type'], 'connection'],
            paint: { 'line-color': '#89CFF0', 'line-width': 2, 'line-dasharray': [4, 4] } });
          map.addLayer({ id: 'tracking-points', type: 'circle', source: 'tracking-source', filter: ['!=', ['get', 'type'], 'connection'],
            paint: { 'circle-color': ['match', ['get', 'type'], 'your_request', '#EF4E4B', '#89CFF0'], 'circle-radius': 12, 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } });
        }
        if (cmd.center) map.flyTo({ center: cmd.center, zoom: 13, duration: 800 });
      }

      if (cmd.type === 'show_disaster') {
        if (cmd.center) map.flyTo({ center: cmd.center, zoom: cmd.zoom || 10, duration: 800 });
      }

      if (cmd.type === 'bookmark' && cmd.bookmarkId) {
        // Visual feedback — star animation on the pinned resource (TODO: find pin and add star)
      }
    });
    return unsub;
  }, []);

  function handleResultSelect(result: MapResult) {
    if (!mapInstance.current) return;
    mapInstance.current.flyTo({ center: [result.lng, result.lat], zoom: 14, duration: 800 });
    setSelectedPin({ type: 'resource', id: result.id, properties: { name: result.name, category: result.category, details: result.description, phone: result.phone, address: result.address, source_type: result.source } });
    setDetailMode('card');
  }

  function timeSince(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return 'now'; if (m < 60) return `${m}m`; return `${Math.floor(m / 60)}h`;
  }

  const p = selectedPin?.properties || {};

  return (
    <CitizenShell onSOSTap={() => setSheetOpen(true)} hideSOSButton={sheetOpen || showResults || matchMode}>
      {/* Header */}
      <CitizenHeader onAgentTap={() => setSheetOpen(true)} locationName={locationName} status={status} agentOpen={sheetOpen} />

      {/* Full screen map */}
      <div ref={mapRef} style={{ width: '100%', height: '100%', background: '#0F1E2B' }} />

      {/* Heatmap toggle */}
      <button
        onClick={() => setHeatmapMode(prev => !prev)}
        className={`absolute bottom-20 right-3 z-20 text-[10px] px-3 py-1.5 rounded-full backdrop-blur-sm font-medium transition ${
          heatmapMode
            ? 'bg-[#EF4E4B]/80 text-white'
            : 'bg-black/50 text-white/70 hover:text-white'
        }`}
      >
        {heatmapMode ? '● Heatmap' : '○ Heatmap'}
      </button>

      {/* Legend */}
      <div className="absolute bottom-20 left-3 z-20 flex gap-1.5">
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4E4B]" /> Requests</span>
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#89CFF0]" /> Resources</span>
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-white border border-white/50" /> Reports</span>
      </div>

      {/* Alert banner — disabled for now */}

            {/* === Part 2: Detail Card === */}
      {selectedPin && !matchMode && (
        <PinDetailCard
          type={selectedPin.type as any}
          properties={selectedPin.properties || {}}
          onClose={() => { setSelectedPin(null); setDetailMode('card'); }}
          onMatch={() => {
            const pinData = { ...selectedPin };
            setMatchMode(true); setSheetOpen(true); setSelectedPin(null);
            const matchContext = JSON.stringify({
              action: 'match',
              intent: pinData.type === 'request' ? 'citizen_wants_to_help' : 'citizen_needs_this',
              type: pinData.type, id: pinData.id,
              category: pinData.properties?.category, urgency: pinData.properties?.urgency,
              name: pinData.properties?.name, details: pinData.properties?.details?.substring(0, 100),
            });
            setTimeout(() => { window.dispatchEvent(new CustomEvent('sos-match-message', { detail: matchContext })); }, 500);
          }}
        />
      )}

      {/* Results slide-up */}
      {showResults && mapResults.length > 0 && !selectedPin && (
        <MapResultsSheet results={mapResults} query={mapResultsQuery}
          onSelectResult={handleResultSelect}
          onClose={() => { setShowResults(false); setMapResults([]); clearMapCommand(); }} />
      )}

      {/* SOS Agent Sheet — in match mode, pre-load the match message */}
      <SOSBottomSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setMatchMode(false); }}
        context="map"
        userLat={lat} userLng={lng}
        fullScreen={matchMode}
      />
    </CitizenShell>
  );
}
