'use client';
import { useEffect, useRef, useState } from 'react';
import { usePartnerOrg } from '@/lib/partner-context';
import { PinDetailCard } from '@/components/partner/pin-detail-card';
import { DashboardOverlay } from '@/components/partner/dashboard-overlay';

import { usePartnerFetch } from '@/lib/partner-api';

type FilterType = 'all' | 'survivors' | 'volunteers' | 'rvs';

export default function PartnerMapPage() {
  const { orgId, orgSlug } = usePartnerOrg();
  const partnerFetch = usePartnerFetch();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [survivors, setSurvivors] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [rvs, setRvs] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const layerClicked = useRef(false);

  // Initialize map + fetch data inside map.on('load')
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let destroyed = false;

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      if (!mapContainer.current || destroyed) return;

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-82.14, 29.19],
        zoom: 7,
      });
      mapRef.current = map;

      map.on('load', async () => {
        if (destroyed) return;

        const toFeature = (item: any, type: string) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [item.longitude || item.lng || 0, item.latitude || item.lat || 0] },
          properties: {
            ...item,
            _type: type,
            // Flatten nested person name for pin detail card
            display_name: item.persons?.display_name || item.display_name || item.full_name || item.contact_name || undefined,
            // Remove nested objects (GeoJSON properties must be flat)
            persons: undefined,
          },
        });

        // Add empty sources + layers first
        map.addSource('survivors', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterMaxZoom: 12, clusterRadius: 50 });
        map.addSource('volunteers', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addSource('rvs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

        map.addLayer({ id: 'survivor-clusters', type: 'circle', source: 'survivors', filter: ['has', 'point_count'], paint: { 'circle-color': ['step', ['get', 'point_count'], '#EF4E4B', 50, '#d63a3a', 200, '#b02525'], 'circle-radius': ['step', ['get', 'point_count'], 18, 50, 24, 200, 30], 'circle-opacity': 0.85 } });
        map.addLayer({ id: 'survivor-cluster-count', type: 'symbol', source: 'survivors', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } });
        map.addLayer({ id: 'survivor-pins', type: 'circle', source: 'survivors', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': 7, 'circle-color': '#EF4E4B', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
        map.addLayer({ id: 'volunteer-pins', type: 'circle', source: 'volunteers', paint: { 'circle-radius': 7, 'circle-color': '#60a5fa', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
        map.addLayer({ id: 'rv-pins', type: 'circle', source: 'rvs', paint: { 'circle-radius': 7, 'circle-color': '#34d399', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });

        // Fetch data, then populate sources
        try {
          const [survRes, rvsRes, volRes] = await Promise.all([
            partnerFetch('partner-read', { query_type: 'recent_requests', limit: 3000 }).catch(() => ({ requests: [] })),
            partnerFetch('partner-read', { query_type: 'available_resources', limit: 1000 }).catch(() => ({ resources: [] })),
            partnerFetch('partner-read', { query_type: 'driver_availability', limit: 500 }).catch(() => ({ results: [] })),
          ]);

          if (destroyed) return;

          const survivorData = survRes.requests || [];
          const rvsData = rvsRes.resources || [];
          const volunteerData = volRes.results || [];

          (map.getSource('survivors') as any).setData({ type: 'FeatureCollection', features: survivorData.filter((r: any) => r.latitude || r.lat).map((r: any) => toFeature(r, 'survivor')) });
          (map.getSource('volunteers') as any).setData({ type: 'FeatureCollection', features: volunteerData.filter((r: any) => r.latitude || r.lat).map((r: any) => toFeature(r, 'volunteer')) });
          (map.getSource('rvs') as any).setData({ type: 'FeatureCollection', features: rvsData.filter((r: any) => r.latitude || r.lat).map((r: any) => toFeature(r, 'rv')) });

          setSurvivors(survivorData);
          setRvs(rvsData);
          setVolunteers(volunteerData);
        } catch (err) {
          console.error('Map data load error:', err);
        }

        setLoading(false);

        // Cluster click → zoom
        map.on('click', 'survivor-clusters', (e: any) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['survivor-clusters'] });
          const clusterId = features[0].properties.cluster_id;
          (map.getSource('survivors') as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err) return;
            map.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
          });
        });

        map.on('mouseenter', 'survivor-clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'survivor-clusters', () => { map.getCanvas().style.cursor = ''; });

        ['survivor-pins', 'volunteer-pins', 'rv-pins'].forEach(layer => {
          map.on('click', layer, (e: any) => { layerClicked.current = true; setSelectedPin(e.features?.[0]?.properties); });
          map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
        });

        map.on('click', () => { if (!layerClicked.current) setSelectedPin(null); layerClicked.current = false; });
      });
    };

    initMap();
    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Toggle layer visibility when filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const survivorsVisible = activeFilter === 'all' || activeFilter === 'survivors';
    const layerVisibility: Record<string, boolean> = {
      'survivor-clusters': survivorsVisible,
      'survivor-cluster-count': survivorsVisible,
      'survivor-pins': survivorsVisible,
      'volunteer-pins': activeFilter === 'all' || activeFilter === 'volunteers',
      'rv-pins': activeFilter === 'all' || activeFilter === 'rvs',
    };
    Object.entries(layerVisibility).forEach(([layerId, visible]) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    });
  }, [activeFilter]);

  const pills: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: survivors.length + volunteers.length + rvs.length },
    { key: 'survivors', label: 'Survivors', count: survivors.length },
    { key: 'volunteers', label: 'Volunteers', count: volunteers.length },
    { key: 'rvs', label: 'RVs', count: rvs.length },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%', background: '#0F1E2B' }} />

      {/* Toggle bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-4 py-2 bg-[#0F1E2B]/80 backdrop-blur-sm">
        {loading ? (
          <span className="text-xs text-white/40">Loading...</span>
        ) : (
          pills.map(pill => (
            <button
              key={pill.key}
              onClick={() => setActiveFilter(pill.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${activeFilter === pill.key ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'}`}
            >
              {pill.key === 'all' ? pill.label : `${pill.label} (${pill.count})`}
            </button>
          ))
        )}
      </div>

      <DashboardOverlay resources={rvs} />
      {selectedPin && (
        <div className="absolute bottom-16 left-0 right-0 z-30">
          <PinDetailCard
            type={selectedPin._type === 'survivor' ? 'request' : selectedPin._type === 'volunteer' ? 'driver' : 'resource'}
            data={selectedPin}
            onClose={() => setSelectedPin(null)}
            onAction={(action) => console.log('Pin action:', action, selectedPin)}
          />
        </div>
      )}
    </div>
  );
}
