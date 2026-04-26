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
  const requestFeaturesRef = useRef<any[]>([]);
  const resourceFeaturesRef = useRef<any[]>([]);
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

  // Map command results
  const [mapResults, setMapResults] = useState<MapResult[]>([]);
  const [mapResultsQuery, setMapResultsQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const isAdmin = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('admin') === 'true';
  
  // Allow setting personId via URL param for testing: /c?pid=xxx
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('pid');
    if (pid) {
      setPersonId(pid);
      console.log('Set sos-person-id:', pid);
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
        // Load data INSIDE map.on('load') so we don't miss the event
        let alertData: Alert[] = [];
        let requestFeatures: any[] = [], resourceFeatures: any[] = [], reportFeatures: any[] = [];
        try {
          if (isAdmin) {
            alertData = DEMO_ALERTS;
            resourceFeatures = (DEMO_PARTNERS as any[]).filter((p: any) => p.latitude && p.longitude).map((p: any) => ({
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
              properties: { id: p.id, name: p.name, category: p.org_type, type: 'resource', source_type: 'partner' },
            }));
          } else {
            const API_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            const [a, mapResp] = await Promise.all([
              getAlerts(lat, lng),
              fetch(`${API_BASE}/functions/v1/map-data?lat=${lat}&lng=${lng}&radius=100`, { headers: { 'Authorization': `Bearer ${API_KEY}` } }),
            ]);
            alertData = a;
            const mapData = await mapResp.json();
            requestFeatures = (mapData.requests || []).map((f: any) => ({
              ...f,
              properties: { ...f.properties, details: f.properties.text, type: 'request' },
            }));
            resourceFeatures = [
              ...(mapData.resources || []).map((f: any) => ({
                ...f,
                properties: { ...f.properties, details: f.properties.text, capacity: f.properties.capacity, type: 'resource', source_type: 'sos' },
              })),
              ...(mapData.organizations || []).map((f: any) => ({
                ...f,
                properties: { ...f.properties, type: 'resource', source_type: 'partner' },
              })),
            ];
            reportFeatures = (mapData.reports || []).map((f: any) => ({
              ...f,
              properties: { ...f.properties, description: f.properties.text, type: 'report' },
            }));
          }
          setAlerts(alertData);
        } catch (err) {
          console.error('Map data load error:', err);
        }
        // === REQUESTS SOURCE (red) ===
        requestFeaturesRef.current = requestFeatures;

        map.addSource('requests-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: requestFeatures },
          cluster: true, clusterMaxZoom: 14, clusterRadius: 40, clusterMinPoints: 5,
        });

        // Cluster glow (behind)
        map.addLayer({ id: 'requests-cluster-glow', type: 'circle', source: 'requests-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#EF4E4B', 'circle-radius': ['step', ['get', 'point_count'], 32, 10, 43, 50, 58], 'circle-opacity': 0.3, 'circle-blur': 1 } });
        // Cluster circles
        map.addLayer({ id: 'requests-clusters', type: 'circle', source: 'requests-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#EF4E4B', 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32], 'circle-opacity': 0.6, 'circle-stroke-width': 0, 'circle-stroke-color': 'transparent' } });
        // Invisible hit target (larger tap area)
        map.addLayer({ id: 'requests-hit', type: 'circle', source: 'requests-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': 'transparent', 'circle-radius': 22 } });
        // Individual points (visual)
        map.addLayer({ id: 'requests-points', type: 'circle', source: 'requests-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#EF4E4B', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });

        // === RESOURCES SOURCE (blue) ===
        resourceFeaturesRef.current = resourceFeatures;

        map.addSource('resources-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: resourceFeatures },
          cluster: true, clusterMaxZoom: 14, clusterRadius: 40, clusterMinPoints: 5,
        });

        map.addLayer({ id: 'resources-cluster-glow', type: 'circle', source: 'resources-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#89CFF0', 'circle-radius': ['step', ['get', 'point_count'], 32, 10, 43, 50, 58], 'circle-opacity': 0.3, 'circle-blur': 1 } });
        map.addLayer({ id: 'resources-clusters', type: 'circle', source: 'resources-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#89CFF0', 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32], 'circle-opacity': 0.6, 'circle-stroke-width': 0, 'circle-stroke-color': 'transparent' } });
        map.addLayer({ id: 'resources-hit', type: 'circle', source: 'resources-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': 'transparent', 'circle-radius': 22 } });
        map.addLayer({ id: 'resources-points', type: 'circle', source: 'resources-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#89CFF0', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });

        // === REPORTS SOURCE (white) ===

        map.addSource('reports-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: reportFeatures },
          cluster: true, clusterMaxZoom: 14, clusterRadius: 40, clusterMinPoints: 5,
        });

        map.addLayer({ id: 'reports-cluster-glow', type: 'circle', source: 'reports-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#FFFFFF', 'circle-radius': ['step', ['get', 'point_count'], 29, 10, 40, 50, 50], 'circle-opacity': 0.2, 'circle-blur': 1 } });
        map.addLayer({ id: 'reports-clusters', type: 'circle', source: 'reports-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#FFFFFF', 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28], 'circle-opacity': 0.4, 'circle-stroke-width': 0, 'circle-stroke-color': 'transparent' } });
        map.addLayer({ id: 'reports-points', type: 'circle', source: 'reports-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#FFFFFF', 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': 'rgba(255,255,255,0.5)' } });

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
        alertData.forEach((alert, i) => {
          if (!alert.geometry) return;
          try {
            const color = alert.severity === 'extreme' || alert.severity === 'severe' ? '#EF4E4B' : '#EDB200';
            map.addSource(`alert-${i}`, { type: 'geojson', data: alert.geometry });
            map.addLayer({ id: `alert-fill-${i}`, type: 'fill', source: `alert-${i}`, paint: { 'fill-color': color, 'fill-opacity': 0.12 } });
            map.addLayer({ id: `alert-line-${i}`, type: 'line', source: `alert-${i}`, paint: { 'line-color': color, 'line-width': 1.5, 'line-opacity': 0.5 } });
          } catch (e) { console.warn('Alert geometry error:', e); }
        });

        // === CLUSTER GLOW ANIMATION ===
        const animateGlow = () => {
          if (destroyed) return;
          try {
            const t = Date.now() / 1000;
            const pulse = 0.5 + 0.5 * Math.sin(t * 1.2);
            const glowLayers = [
              { id: 'requests-cluster-glow', baseRadius: [32, 43, 58], baseOpacity: 0.3 },
              { id: 'resources-cluster-glow', baseRadius: [32, 43, 58], baseOpacity: 0.3 },
              { id: 'reports-cluster-glow', baseRadius: [29, 40, 50], baseOpacity: 0.2 },
            ];
            glowLayers.forEach(({ id, baseRadius, baseOpacity }) => {
              if (!map.getLayer(id)) return;
              const scale = 1 + pulse * 0.3;
              map.setPaintProperty(id, 'circle-radius', ['step', ['get', 'point_count'], baseRadius[0] * scale, 10, baseRadius[1] * scale, 50, baseRadius[2] * scale]);
              map.setPaintProperty(id, 'circle-opacity', baseOpacity * (0.6 + pulse * 0.4));
            });
          } catch { /* map destroyed or style changed */ }
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
            const pinType = props.type || (layer.includes('request') ? 'request' : layer.includes('resource') ? 'resource' : 'report');
            setSelectedPin({ type: pinType, id: props.id, properties: typeof props === 'string' ? JSON.parse(props) : props });
            setDetailMode('card');
            setMatchMode(false);
          });
          map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
        });

        // Cluster click → zoom
        ['requests-clusters', 'resources-clusters', 'reports-clusters'].forEach(layer => {
          map.on('click', layer, (e: any) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [layer] });
            if (!features.length) return;
            const clusterId = features[0].properties?.cluster_id;
            const sourceName = layer.replace('-clusters', '-source');
            (map.getSource(sourceName) as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
              if (err || zoom == null) return;
              map.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
            });
          });
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
            map.setFilter(layer, ['!', ['has', 'point_count']]);
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
          // Find the pin in loaded GeoJSON features and select it
          const allFeatures = [...requestFeatures, ...resourceFeatures];
          const match = allFeatures.find((f: any) => f.properties?.id === dlPin);
          if (match) {
            const pinType: 'request' | 'resource' = match.properties.type === 'request' ? 'request' : 'resource';
            const coords = match.geometry.coordinates;
            map.flyTo({ center: [coords[0], coords[1]], zoom: 14, duration: 1200 });
            setTimeout(() => {
              setSelectedPin({ type: pinType, id: match.properties.id, properties: match.properties });
              setDetailMode('card');
            }, 1300);
          }
        } else if (dlLat && dlLng) {
          map.flyTo({ center: [parseFloat(dlLng), parseFloat(dlLat)], zoom: dlZoom ? parseFloat(dlZoom) : 13, duration: 1200 });
        }

        // === REALTIME SUBSCRIPTIONS ===
        const channel = supabase
          .channel('map-realtime')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests', filter: 'map_visible=eq.true' }, (payload: any) => {
            const r = payload.new;
            if (!r.latitude || !r.longitude) return;
            const feature = {
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
              properties: { id: r.id, category: r.category, urgency: r.urgency, status: r.status, details: r.public_display_text || r.details_sanitized, triage: r.triage_score, household: r.household_size, type: 'request', person_id: r.person_id },
            };
            requestFeaturesRef.current = [...requestFeaturesRef.current, feature];
            const src = map.getSource('requests-source') as any;
            if (src) src.setData({ type: 'FeatureCollection', features: requestFeaturesRef.current });
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'resources', filter: 'map_visible=eq.true' }, (payload: any) => {
            const r = payload.new;
            if (!r.latitude || !r.longitude) return;
            const feature = {
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
              properties: { id: r.id, category: r.category, status: r.status, capacity: r.capacity_available, details: r.details_sanitized, type: 'resource', source_type: 'sos' },
            };
            resourceFeaturesRef.current = [...resourceFeaturesRef.current, feature];
            const src = map.getSource('resources-source') as any;
            if (src) src.setData({ type: 'FeatureCollection', features: resourceFeaturesRef.current });
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
  }, [isAdmin]);

  // Map command subscription (for search results)
  useEffect(() => {
    const unsub = onMapCommand((cmd: MapCommand) => {
      const map = mapInstance.current;
      if (!map) return;

      if (cmd.type === 'clear') {
        setShowResults(false); setMapResults([]);
        clearMapCategoryFilter(map);
        // Restore all permanent layers
        const allLayers = ['requests-clusters', 'requests-cluster-glow', 'requests-points', 'resources-clusters', 'resources-cluster-glow', 'resources-points', 'reports-clusters', 'reports-cluster-glow', 'reports-points', 'disasters-points'];
        allLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible'); });
        // Clear search results
        if (map.getSource('search-results-source')) {
          (map.getSource('search-results-source') as any).setData({ type: 'FeatureCollection', features: [] });
        }
        // Reset any active filters
        ['requests-points', 'resources-points'].forEach(layer => {
          if (map.getLayer(layer)) map.setFilter(layer, ['!', ['has', 'point_count']]);
        });
        return;
      }

      if (cmd.type === 'show_results' && cmd.results) {
        setMapResults(cmd.results);
        setMapResultsQuery(cmd.query || '');
        setShowResults(true);


        // Hide all permanent layers — show only search results
        const allLayers = ['requests-clusters', 'requests-cluster-glow', 'requests-points', 'resources-clusters', 'resources-cluster-glow', 'resources-points', 'reports-clusters', 'reports-cluster-glow', 'reports-points', 'disasters-points'];
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
        // If this is a submission focus, add the new pin to the map
        const src = map.getSource('requests-source') as any;
        if (src) {
          try {
            const existing = src._data || { type: 'FeatureCollection', features: [] };
            const features = [...(existing.features || []), {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: cmd.center },
              properties: { id: 'new-submission', category: (cmd as any).category || 'housing', urgency: 'high', status: 'active', type: 'request', details: `${((cmd as any).category || 'housing').replace(/_/g, ' ')} request submitted just now` },
            }];
            src.setData({ type: 'FeatureCollection', features });
          } catch {}
        }
      }

      // P1 Fix 9: Filter existing layers by category
      if ((cmd as any).type === 'filter' && (cmd as any).category) {
        const cat = (cmd as any).category;
        ['requests-points', 'resources-points'].forEach(layer => {
          if (map.getLayer(layer)) {
            map.setFilter(layer, ['all', ['!', ['has', 'point_count']], ['==', ['get', 'category'], cat]]);
          }
        });
        ['requests-clusters', 'requests-cluster-glow', 'resources-clusters', 'resources-cluster-glow'].forEach(layer => {
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

      {/* Legend */}
      <div className="absolute bottom-20 left-3 z-20 flex gap-1.5">
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4E4B]" /> Requests</span>
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#89CFF0]" /> Resources</span>
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-white border border-white/50" /> Reports</span>
      </div>

      {/* Alert banner — disabled for now */}

      {/* === Part 2: Detail Card — Centered circular popup === */}
      {selectedPin && !matchMode && (
        <>
          {/* Backdrop */}
          <div className="absolute inset-0 z-25 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300"
            onClick={() => { setSelectedPin(null); setDetailMode('card'); }} />

          {/* Centered card */}
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none px-6">
            <div className="pointer-events-auto w-full max-w-[340px] animate-[cardPop_0.25s_ease-out] relative"
              style={{
                background: 'rgba(26, 56, 80, 0.92)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '24px',
                boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 40px ${
                  selectedPin.type === 'request' ? 'rgba(239,78,75,0.15)' :
                  selectedPin.type === 'resource' ? 'rgba(137,207,240,0.15)' : 'rgba(255,255,255,0.05)'
                }`,
              }}>

              {/* Border that stops where logomark is — using pseudo-element via clip-path */}
              <div className="absolute inset-0 rounded-[24px] pointer-events-none" style={{
                border: `1.5px solid ${
                  selectedPin.type === 'request' ? 'rgba(239,78,75,0.3)' :
                  selectedPin.type === 'resource' ? 'rgba(137,207,240,0.3)' : 'rgba(255,255,255,0.15)'
                }`,
                mask: 'linear-gradient(to bottom, transparent 0px, transparent 24px, black 24px)',
                WebkitMask: 'linear-gradient(to bottom, transparent 0px, transparent 24px, black 24px)',
              }} />

              {/* Top logomark — floating above the card */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background: selectedPin.type === 'request' ? 'rgba(15,30,43,0.95)' : selectedPin.type === 'resource' ? 'rgba(15,30,43,0.95)' : 'rgba(15,30,43,0.95)',
                    boxShadow: `0 0 24px ${selectedPin.type === 'request' ? 'rgba(239,78,75,0.4)' : selectedPin.type === 'resource' ? 'rgba(137,207,240,0.4)' : 'rgba(255,255,255,0.2)'}`,
                    border: `2px solid ${selectedPin.type === 'request' ? 'rgba(239,78,75,0.4)' : selectedPin.type === 'resource' ? 'rgba(137,207,240,0.4)' : 'rgba(255,255,255,0.2)'}`,
                  }}>
                  <img
                    src={selectedPin.type === 'resource' ? '/logomark-blue.svg' : selectedPin.type === 'report' ? '/logomark-white.svg' : '/logomark-red.svg'}
                    alt="SOS" className="w-8 h-8" />
                </div>
              </div>

              <div className="px-6 pt-6 pb-5">
                {/* Close button */}
                <button onClick={() => { setSelectedPin(null); setDetailMode('card'); }}
                  className="absolute top-3 right-4 text-white/30 hover:text-white text-lg transition-colors">✕</button>

                {/* Type label */}
                <p className={`text-center text-[11px] font-bold uppercase tracking-[0.2em] mb-3 ${
                  selectedPin.type === 'request' ? 'text-[#EF4E4B]' :
                  selectedPin.type === 'resource' ? 'text-[#89CFF0]' : 'text-white/50'
                }`}>
                  SOS {selectedPin.type === 'request' ? 'Request' : selectedPin.type === 'resource' ? 'Resource' : selectedPin.type === 'report' ? 'Report' : 'Disaster'}
                </p>

                {/* Summary */}
                <p className="text-center text-sm text-white/70 leading-relaxed mb-4 line-clamp-3">
                  {p.details || p.description || `${(p.category || 'help').replace(/_/g, ' ')} ${selectedPin?.type === 'request' ? 'request' : 'resource'}${p.household ? ` for ${p.household} people` : ''}${p.urgency ? ` · ${p.urgency} urgency` : ''}`}
                </p>

                {/* Metadata pills */}
                <div className="flex items-center justify-center gap-2 flex-wrap mb-5">
                  {p.category && (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">
                      {p.category.replace(/_/g, ' ')}
                    </span>
                  )}
                  {selectedPin.type === 'request' && p.household && (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">👨‍👩‍👧‍👦 {p.household}</span>
                  )}
                  {selectedPin.type === 'request' && p.urgency && (
                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full capitalize ${
                      p.urgency === 'critical' ? 'bg-red-500/20 text-red-300' :
                      p.urgency === 'high' ? 'bg-orange-500/20 text-orange-300' :
                      'bg-white/10 text-white/60'
                    }`}>{p.urgency}</span>
                  )}
                  {selectedPin.type === 'resource' && p.source_type && (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">
                      {p.source_type === '211' ? '211' : p.source_type === 'partner' ? 'Partner' : 'Community'}
                    </span>
                  )}
                  {selectedPin.type === 'resource' && p.capacity != null && (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">Capacity: {p.capacity}</span>
                  )}
                </div>

                {/* Match button */}
                <button onClick={() => {
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
                  className="w-full py-3 rounded-2xl text-white text-xs font-bold tracking-wide active:scale-[0.97] transition-transform"
                  style={{
                    background: selectedPin.type === 'request' ? '#EF4E4B' : '#89CFF0',
                    boxShadow: `0 4px 20px ${selectedPin.type === 'request' ? 'rgba(239,78,75,0.3)' : 'rgba(137,207,240,0.3)'}`,
                  }}>
                  Match
                </button>
              </div>
            </div>
          </div>

          <style>{`@keyframes cardPop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`}</style>
        </>
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
