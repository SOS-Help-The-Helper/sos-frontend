'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePartnerOrg } from '@/lib/partner-context';
import { PinDetailCard } from '@/components/partner/pin-detail-card';
import { DashboardOverlay } from '@/components/partner/dashboard-overlay';

import { usePartnerFetch } from '@/lib/partner-api';

type FilterType = 'all' | 'survivors' | 'volunteers' | 'rvs';

const PILL_ACTIVE: Record<FilterType, string> = {
  all: 'bg-white/20 text-white',
  survivors: 'bg-[#EF4E4B]/20 text-[#EF4E4B] border border-[#EF4E4B]/40',
  rvs: 'bg-[#89CFF0]/20 text-[#89CFF0] border border-[#89CFF0]/40',
  volunteers: 'bg-[#FFCA28]/20 text-[#FFCA28] border border-[#FFCA28]/40',
};

function PartnerMapPageInner() {
  const { orgId, orgSlug, disaster } = usePartnerOrg();
  const partnerFetch = usePartnerFetch();
  const searchParams = useSearchParams();
  const router = useRouter();

  function navigateTo(path: string, extra?: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    router.push(path + '?' + params.toString());
  }
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
        center: disaster ? [disaster.lng, disaster.lat] : [-82.14, 29.19],
        zoom: disaster ? 8 : 7,
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
            // Flatten nested person fields for pin detail card (GeoJSON properties must be flat)
            display_name: item.persons?.display_name || item.display_name || item.full_name || item.contact_name || undefined,
            is_veteran: item.is_veteran ?? item.persons?.is_veteran,
            is_first_responder: item.is_first_responder ?? item.persons?.is_first_responder,
            has_disability: item.has_disability ?? item.persons?.has_disability,
            has_pets: item.has_pets ?? item.persons?.has_pets,
            phone: item.phone ?? item.persons?.phone,
            persons: undefined,
          },
        });

        // Add empty sources + layers first
        map.addSource('survivors', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterMaxZoom: 12, clusterRadius: 50 });
        map.addSource('volunteers', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addSource('rvs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

        // Layer order: glow → clusters → count → rv-pins → volunteer-pins → survivor-pins → hit targets

        // Cluster glow (behind main cluster circle)
        map.addLayer({ id: 'survivor-cluster-glow', type: 'circle', source: 'survivors', filter: ['has', 'point_count'], paint: {
          'circle-color': '#EF4E4B',
          'circle-opacity': 0.3,
          'circle-blur': 1,
          'circle-radius': ['step', ['get', 'point_count'], 32, 10, 43, 50, 58],
        }});

        // Main cluster circle
        map.addLayer({ id: 'survivor-clusters', type: 'circle', source: 'survivors', filter: ['has', 'point_count'], paint: {
          'circle-color': '#EF4E4B',
          'circle-opacity': 0.6,
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32],
        }});

        // Cluster count label
        map.addLayer({ id: 'survivor-cluster-count', type: 'symbol', source: 'survivors', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } });

        // Individual pin layers (rv → volunteer → survivor, bottom to top)
        map.addLayer({ id: 'rv-pins', type: 'circle', source: 'rvs', paint: { 'circle-radius': 8, 'circle-color': '#89CFF0', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
        map.addLayer({ id: 'volunteer-pins', type: 'circle', source: 'volunteers', paint: { 'circle-radius': 8, 'circle-color': '#FFCA28', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
        map.addLayer({ id: 'survivor-pins', type: 'circle', source: 'survivors', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': 8, 'circle-color': '#EF4E4B', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });

        // Invisible hit target layers (larger touch area)
        map.addLayer({ id: 'survivor-pins-hit', type: 'circle', source: 'survivors', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': 22, 'circle-color': 'transparent', 'circle-opacity': 0 } });
        map.addLayer({ id: 'rv-pins-hit', type: 'circle', source: 'rvs', paint: { 'circle-radius': 22, 'circle-color': 'transparent', 'circle-opacity': 0 } });
        map.addLayer({ id: 'volunteer-pins-hit', type: 'circle', source: 'volunteers', paint: { 'circle-radius': 22, 'circle-color': 'transparent', 'circle-opacity': 0 } });

        // Fetch data, then populate sources
        try {
          const [survRes, rvsRes, volRes] = await Promise.all([
            partnerFetch('partner-read', { query_type: 'recent_requests', filters: disaster ? { disaster_id: disaster.id } : {}, limit: 3000 }).catch(() => ({ requests: [] })),
            partnerFetch('partner-read', { query_type: 'available_resources', filters: disaster ? { disaster_id: disaster.id } : {}, limit: 1000 }).catch(() => ({ resources: [] })),
            partnerFetch('partner-read', { query_type: 'driver_availability', filters: disaster ? { disaster_id: disaster.id } : {}, limit: 500 }).catch(() => ({ results: [] })),
          ]);

          if (destroyed) return;

          const survivorData = survRes.requests || [];
          const rvsData = rvsRes.resources || [];
          const volunteerData = volRes.results || [];

          (map.getSource('survivors') as any).setData({ type: 'FeatureCollection', features: survivorData.filter((r: any) => (r.latitude || r.lat) && r.household_size).map((r: any) => toFeature(r, 'survivor')) });
          (map.getSource('volunteers') as any).setData({ type: 'FeatureCollection', features: volunteerData.filter((r: any) => r.latitude || r.lat).map((r: any) => toFeature(r, 'volunteer')) });
          (map.getSource('rvs') as any).setData({ type: 'FeatureCollection', features: rvsData.filter((r: any) => r.latitude || r.lat).map((r: any) => toFeature(r, 'rv')) });

          setSurvivors(survivorData.filter((r: any) => r.household_size));
          setRvs(rvsData);
          setVolunteers(volunteerData);
        } catch (err) {
          console.error('Map data load error:', err);
        }

        setLoading(false);

        // Cluster glow pulse animation
        function animateClusters() {
          const t = performance.now() / 1000;
          const opacity = 0.3 * (0.6 + 0.4 * Math.sin(t * 1.2));
          if (map.getLayer('survivor-cluster-glow')) {
            map.setPaintProperty('survivor-cluster-glow', 'circle-opacity', opacity);
          }
          requestAnimationFrame(animateClusters);
        }
        animateClusters();

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

        // Click handlers on hit target layers for better touch accuracy
        ['survivor-pins-hit', 'volunteer-pins-hit', 'rv-pins-hit'].forEach(layer => {
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
    // Re-init when disaster scope changes so the map recenters and refetches
    // with the new disaster_id filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disaster?.id]);

  // Toggle layer visibility when filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const survivorsVisible = activeFilter === 'all' || activeFilter === 'survivors';
    const volunteersVisible = activeFilter === 'all' || activeFilter === 'volunteers';
    const rvsVisible = activeFilter === 'all' || activeFilter === 'rvs';
    const layerVisibility: Record<string, boolean> = {
      'survivor-cluster-glow': survivorsVisible,
      'survivor-clusters': survivorsVisible,
      'survivor-cluster-count': survivorsVisible,
      'survivor-pins': survivorsVisible,
      'survivor-pins-hit': survivorsVisible,
      'volunteer-pins': volunteersVisible,
      'volunteer-pins-hit': volunteersVisible,
      'rv-pins': rvsVisible,
      'rv-pins-hit': rvsVisible,
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
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${activeFilter === pill.key ? PILL_ACTIVE[pill.key] : 'bg-white/5 text-white/40'}`}
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
            onAction={(action) => {
              const pinId = selectedPin?.id;
              switch (action) {
                case 'find_match':
                  navigateTo('/app/match', { request_id: pinId });
                  break;
                case 'update':
                case 'details':
                  navigateTo('/app/manage', { record_id: pinId, record_type: selectedPin?._type === 'survivor' ? 'request' : 'resource' });
                  break;
                case 'assign_driver':
                  navigateTo('/app/match', { resource_id: pinId });
                  break;
                case 'call':
                  if (selectedPin?.phone) window.open('tel:' + selectedPin.phone);
                  break;
                case 'view_route':
                  navigateTo('/app/manage', { record_id: pinId });
                  break;
              }
              setSelectedPin(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function PartnerMapPage() {
  return (
    <Suspense fallback={<div className="w-full h-full bg-[#0F1E2B]" />}>
      <PartnerMapPageInner />
    </Suspense>
  );
}
