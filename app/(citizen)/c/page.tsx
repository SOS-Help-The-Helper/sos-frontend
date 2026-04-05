'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { CitizenShell } from '@/components/citizen-shell';
import { SOSBottomSheet } from '@/components/sos-bottom-sheet';
import { MapResultsSheet } from '@/components/map-results-sheet';
import { onMapCommand, clearMapCommand, type MapCommand, type MapResult } from '@/lib/map-commands';
import { applyMapCategoryFilter, clearMapCategoryFilter } from '@/lib/map-filter';
import { getAlerts, type Alert } from '@/lib/citizen-api';
import { supabase } from '@/lib/supabase-client';
import { NotificationBell } from '@/components/notification-panel';
import { DEMO_ALERTS, DEMO_PARTNERS } from '@/lib/demo-data';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const STATUS_MAP: Record<string, { emoji: string; label: string }> = {
  safe: { emoji: '🟢', label: 'Safe' }, watch: { emoji: '🟡', label: 'Watch' }, active: { emoji: '🔴', label: 'Active' },
};

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

  const [lat, setLat] = useState(35.5951);
  const [lng, setLng] = useState(-82.5515);
  const [locationName, setLocationName] = useState('Asheville, NC');
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
    if (!gpsReady || !mapRef.current) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    if (!MAPBOX_TOKEN) return;

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      if (!mapRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapRef.current, style: 'mapbox://styles/mapbox/dark-v11',
        center: [lng, lat], zoom: 12, attributionControl: false,
      });
      // Navigation control removed — users pinch-to-zoom on mobile
      mapInstance.current = map;

      map.on('load', async () => {
        // Load data INSIDE map.on('load') so we don't miss the event
        let alertData: Alert[] = [], partners: any[] = [];
        let requests: any[] = [], resources: any[] = [], reports: any[] = [];
        try {
          if (isAdmin) {
            alertData = DEMO_ALERTS; partners = DEMO_PARTNERS;
          } else {
            const [a, p] = await Promise.all([
              getAlerts(lat, lng),
              supabase.from('organizations').select('id, name, org_type, latitude, longitude').not('latitude', 'is', null).eq('status', 'active'),
            ]);
            alertData = a; partners = (p as any).data || [];
          }
          setAlerts(alertData);

          const [reqResult, resResult, repResult] = await Promise.all([
            supabase.from('requests').select('id, category, urgency, latitude, longitude, status, details_sanitized, public_display_text, triage_score, household_size, person_id').not('latitude', 'is', null).eq('map_visible', true).in('status', ['open', 'active', 'matched']).limit(500),
            supabase.from('resources').select('id, category, latitude, longitude, status, capacity_available, details_sanitized, org_id').not('latitude', 'is', null).eq('map_visible', true).limit(500),
            supabase.from('community_messages').select('id, message_text, message_type, latitude, longitude, created_at, flagged').eq('message_type', 'report').not('latitude', 'is', null).order('created_at', { ascending: false }).limit(200),
          ]);
          requests = reqResult.data || [];
          resources = resResult.data || [];
          reports = repResult.data || [];
        } catch (err) {
          console.error('Map data load error:', err);
        }
        // === REQUESTS SOURCE (red) ===
        const requestFeatures = (requests || []).filter(r => r.latitude && r.longitude).map(r => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
          properties: { id: r.id, category: r.category, urgency: r.urgency, status: r.status, details: r.public_display_text || r.details_sanitized, triage: r.triage_score, household: r.household_size, type: 'request', person_id: r.person_id },
        }));

        map.addSource('requests-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: requestFeatures },
          cluster: true, clusterMaxZoom: 14, clusterRadius: 50,
        });

        // Cluster circles
        map.addLayer({ id: 'requests-clusters', type: 'circle', source: 'requests-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#EF4E4B', 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32], 'circle-opacity': 0.8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff40' } });
        map.addLayer({ id: 'requests-cluster-count', type: 'symbol', source: 'requests-source', filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } });
        // Individual points
        map.addLayer({ id: 'requests-points', type: 'circle', source: 'requests-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#EF4E4B', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });

        // === RESOURCES SOURCE (blue) ===
        const resourceFeatures = [
          ...(resources || []).filter(r => r.latitude && r.longitude).map(r => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
            properties: { id: r.id, category: r.category, status: r.status, capacity: r.capacity_available, details: r.details_sanitized, type: 'resource', source_type: 'sos' },
          })),
          ...partners.filter(p => p.latitude && p.longitude).map(p => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
            properties: { id: p.id, name: p.name, category: p.org_type, type: 'resource', source_type: 'partner' },
          })),
        ];

        map.addSource('resources-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: resourceFeatures },
          cluster: true, clusterMaxZoom: 14, clusterRadius: 50,
        });

        map.addLayer({ id: 'resources-clusters', type: 'circle', source: 'resources-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#89CFF0', 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32], 'circle-opacity': 0.8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff40' } });
        map.addLayer({ id: 'resources-cluster-count', type: 'symbol', source: 'resources-source', filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } });
        map.addLayer({ id: 'resources-points', type: 'circle', source: 'resources-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#89CFF0', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });

        // === REPORTS SOURCE (white) ===
        const reportFeatures = (reports || []).filter(r => r.latitude && r.longitude && !r.flagged).map(r => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [r.longitude, r.latitude] },
          properties: { id: r.id, description: r.message_text, created_at: r.created_at, type: 'report' },
        }));

        map.addSource('reports-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: reportFeatures },
          cluster: true, clusterMaxZoom: 14, clusterRadius: 50,
        });

        map.addLayer({ id: 'reports-clusters', type: 'circle', source: 'reports-source', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#FFFFFF', 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28], 'circle-opacity': 0.6, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff20' } });
        map.addLayer({ id: 'reports-cluster-count', type: 'symbol', source: 'reports-source', filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium'], 'text-size': 11 }, paint: { 'text-color': '#1A3850' } });
        map.addLayer({ id: 'reports-points', type: 'circle', source: 'reports-source', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#FFFFFF', 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff80' } });

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
          paint: { 'circle-color': '#89CFF0', 'circle-radius': 20, 'circle-opacity': 0.15 } });
        map.addLayer({ id: 'user-dot', type: 'circle', source: 'user-location',
          paint: { 'circle-color': '#89CFF0', 'circle-radius': 6, 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' } });

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

        // === CLICK HANDLERS ===
        const clickLayers = ['requests-points', 'resources-points', 'reports-points'];
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
              if (err) return;
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
      });

      setLoading(false);
    };

    initMap();
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [gpsReady, isAdmin]);

  // Map command subscription (for search results)
  useEffect(() => {
    const unsub = onMapCommand((cmd: MapCommand) => {
      const map = mapInstance.current;
      if (!map) return;

      if (cmd.type === 'clear') {
        setShowResults(false); setMapResults([]);
        clearMapCategoryFilter(map);
        // Restore all permanent layers
        const allLayers = ['requests-clusters', 'requests-cluster-count', 'requests-points', 'resources-clusters', 'resources-cluster-count', 'resources-points', 'reports-clusters', 'reports-cluster-count', 'reports-points', 'disasters-points'];
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
        const allLayers = ['requests-clusters', 'requests-cluster-count', 'requests-points', 'resources-clusters', 'resources-cluster-count', 'resources-points', 'reports-clusters', 'reports-cluster-count', 'reports-points', 'disasters-points'];
        allLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); });

        // Show search results using their natural colors (blue for resources, red for requests)
        const resultFeatures = cmd.results.map(r => ({
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
        }

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
      }

      // P1 Fix 9: Filter existing layers by category
      if ((cmd as any).type === 'filter' && (cmd as any).category) {
        const cat = (cmd as any).category;
        ['requests-points', 'resources-points'].forEach(layer => {
          if (map.getLayer(layer)) {
            map.setFilter(layer, ['all', ['!', ['has', 'point_count']], ['==', ['get', 'category'], cat]]);
          }
        });
        ['requests-clusters', 'requests-cluster-count', 'resources-clusters', 'resources-cluster-count'].forEach(layer => {
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
    mapInstance.current?.flyTo({ center: [result.lng, result.lat], zoom: 14, duration: 800 });
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
      <div className="absolute top-0 left-0 right-0 z-20 pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-between px-5 py-4 pb-12 bg-gradient-to-b from-[#1A3850] via-[#1A3850]/80 via-60% to-transparent">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSheetOpen(true)}
              className="relative h-9 w-9 flex items-center justify-center"
              aria-label="Open SOS Agent"
            >
              <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-40" />
              <img src="/logomark.svg" alt="SOS" className="h-8 w-8 relative z-10" />
            </button>
            <span className="text-[11px] font-medium text-white/70">📍 {locationName}</span>
          </div>
          <div className="flex items-center gap-2">
            {!gpsReady && (
              <button onClick={() => {
                navigator.geolocation.getCurrentPosition(
                  p => { setLat(p.coords.latitude); setLng(p.coords.longitude); setGpsReady(true);
                    mapInstance.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 12 });
                  },
                  () => setGpsReady(true), { enableHighAccuracy: true, timeout: 5000 }
                );
              }} className="px-2 py-1 rounded-full bg-[#89CFF0]/20 text-[10px] font-bold text-[#89CFF0] backdrop-blur-sm">
                📍 Share Location
              </button>
            )}
            {/* Notification bell */}
            <div className="relative">
              <NotificationBell personId={typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : null} />
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm">
              <span className="text-xs">{STATUS_MAP[status]?.emoji}</span>
              <span className="text-[10px] font-bold text-white">{STATUS_MAP[status]?.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full screen map */}
      <div ref={mapRef} style={{ width: '100%', height: '100%', background: '#0F1E2B' }} />

      {/* Legend */}
      <div className="absolute bottom-20 left-3 z-20 flex gap-1.5">
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4E4B]" /> Requests</span>
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#89CFF0]" /> Resources</span>
        <span className="text-[10px] bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-white border border-white/50" /> Reports</span>
      </div>

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="absolute top-16 left-3 right-3 z-20">
          <div className={`rounded-xl p-3 backdrop-blur-sm ${hasExtreme ? 'bg-sos-red-500/90' : 'bg-yellow-500/90'}`}>
            <p className={`text-xs font-bold ${hasExtreme ? 'text-white' : 'text-yellow-900'}`}>{alerts[0].headline}</p>
          </div>
        </div>
      )}

      {/* === Part 2: Detail Card === */}
      {selectedPin && !matchMode && (
        <div className={`absolute left-0 right-0 z-30 transition-all duration-300 max-w-lg lg:max-w-xl mx-auto ${
          detailMode === 'expanded' ? 'bottom-[calc(56px+env(safe-area-inset-bottom,0px))]' : 'bottom-[calc(56px+env(safe-area-inset-bottom,0px))]'
        }`} style={{ maxHeight: detailMode === 'expanded' ? '60vh' : '220px' }}>
          <div className="bg-[#1A3850] rounded-t-2xl shadow-2xl border-t border-white/10 overflow-hidden h-full flex flex-col">
            {/* Drag handle */}
            <button onClick={() => setDetailMode(detailMode === 'card' ? 'expanded' : 'card')} className="py-1.5 flex justify-center flex-shrink-0">
              <div className="w-8 h-1 bg-white/20 rounded-full" />
            </button>

            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {/* Row 1: Type label + close */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    selectedPin.type === 'request' ? 'bg-[#EF4E4B]' :
                    selectedPin.type === 'resource' ? 'bg-[#89CFF0]' : 'bg-white'
                  }`} />
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    selectedPin.type === 'request' ? 'text-[#EF4E4B]' :
                    selectedPin.type === 'resource' ? 'text-[#89CFF0]' : 'text-white/50'
                  }`}>
                    SOS {selectedPin.type === 'request' ? 'Request' : selectedPin.type === 'resource' ? 'Resource' : selectedPin.type === 'report' ? 'Report' : 'Disaster'}
                  </span>
                </div>
                <button onClick={() => { setSelectedPin(null); setDetailMode('card'); }} className="text-white/30 hover:text-white text-lg leading-none p-1">✕</button>
              </div>

              {/* Row 2: Name if present */}
              {p.name && (
                <h3 className="text-base font-bold text-white mb-1">{p.name}</h3>
              )}

              {/* Row 3: Summary text */}
              {(p.details || p.description) && (
                <p className="text-sm text-white/60 leading-relaxed mb-3">
                  {p.details || p.description}
                </p>
              )}

              {/* Row 4: Metadata chips — stacked vertically */}
              <div className="flex flex-col gap-1.5 mb-3">
                {/* Category chip */}
                {p.category && (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/10 text-white/70 capitalize">
                    {'Type: ' + p.category.replace(/_/g, ' ')}
                  </span>
                )}

                {/* Request: people count + badges (urgency not highlighted) */}
                {selectedPin.type === 'request' && p.household && (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/10 text-white/70">👥 {p.household} people</span>
                )}
                {selectedPin.type === 'request' && p.urgency && (
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-white/40">{p.urgency}</span>
                )}
                {selectedPin.type === 'request' && p.is_veteran && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-white/40">🎖️ Veteran</span>
                )}
                {selectedPin.type === 'request' && p.is_first_responder && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-white/40">🚒 First Responder</span>
                )}
                {selectedPin.type === 'request' && p.has_medical_needs && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-white/40">🏥 Medical</span>
                )}

                {/* Resource: source badge + capacity */}
                {selectedPin.type === 'resource' && p.source_type && (
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    p.source_type === 'partner' ? 'bg-[#89CFF0]/20 text-[#89CFF0]' : p.source_type === '211' ? 'bg-[#EDB200]/20 text-[#EDB200]' : 'bg-white/10 text-white/50'
                  }`}>{p.source_type === '211' ? 'Source: 211' : p.source_type === 'partner' ? 'Source: Partner' : 'Source: Community'}</span>
                )}
                {selectedPin.type === 'resource' && p.capacity != null && (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/10 text-white/70">Capacity: {p.capacity}</span>
                )}

                {/* Report: time + verified status */}
                {selectedPin.type === 'report' && p.created_at && (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/10 text-white/50">{timeSince(p.created_at)} ago</span>
                )}
                {selectedPin.type === 'report' && (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/10 text-white/50">Unverified</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-3">
                <button onClick={() => {
                    const pinData = { ...selectedPin };
                    setMatchMode(true); setSheetOpen(true); setSelectedPin(null);
                    // Pass structured match context with IDs
                    const matchContext = JSON.stringify({
                      action: 'match', intent: 'citizen_needs_this',
                      type: pinData.type,
                      id: pinData.id,
                      category: pinData.properties?.category,
                      urgency: pinData.properties?.urgency,
                      name: pinData.properties?.name,
                      details: pinData.properties?.details?.substring(0, 100),
                    });
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('sos-match-message', { detail: matchContext }));
                    }, 500);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#EF4E4B] text-white text-xs font-bold active:scale-[0.97]">
                  Match
                </button>
                <button onClick={() => setDetailMode(detailMode === 'card' ? 'expanded' : 'card')}
                  className="hidden">
                  {detailMode === 'card' ? 'Details →' : 'Collapse'}
                </button>
              </div>
            </div>
          </div>
        </div>
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
      />
    </CitizenShell>
  );
}
