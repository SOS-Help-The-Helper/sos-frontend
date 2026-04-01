'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

type Step = 'basics' | 'location' | 'capabilities' | 'review' | 'submitted';

const ORG_TYPES = [
  { id: 'transport_housing', icon: '🚐', label: 'Transport / Housing', desc: 'Vehicles, temporary shelter, evacuation' },
  { id: 'food_service', icon: '🍽️', label: 'Food Service', desc: 'Meal distribution, kitchens, food banks' },
  { id: 'coordination', icon: '🤝', label: 'Coordination', desc: 'Volunteer network, multi-org coordination' },
  { id: 'supply_warehouse', icon: '📦', label: 'Supply / Warehouse', desc: 'Supplies, equipment, distribution' },
  { id: 'medical', icon: '🏥', label: 'Medical / Health', desc: 'First aid, counseling, pharmacy' },
  { id: 'vendor', icon: '🔨', label: 'Vendor / Contractor', desc: 'Restoration, debris removal, generators' },
  { id: 'community', icon: '🏘️', label: 'Community Org', desc: 'Churches, mutual aid, neighborhood groups' },
];

const CAPABILITY_OPTIONS: Record<string, Array<{ id: string; label: string }>> = {
  transport_housing: [
    { id: 'emergency_rv', label: 'Emergency RVs / Trailers' },
    { id: 'passenger_transport', label: 'Passenger Transport' },
    { id: 'cdl_drivers', label: 'CDL Drivers' },
    { id: 'temporary_shelter', label: 'Temporary Shelter Units' },
    { id: 'evacuation', label: 'Evacuation Support' },
    { id: 'towing', label: 'Towing / Vehicle Recovery' },
  ],
  food_service: [
    { id: 'mass_feeding', label: 'Mass Feeding' },
    { id: 'mobile_kitchen', label: 'Mobile Kitchen' },
    { id: 'food_distribution', label: 'Food Distribution' },
    { id: 'water_supply', label: 'Water Supply' },
    { id: 'dietary_special', label: 'Special Dietary (halal, kosher, allergies)' },
    { id: 'baby_formula', label: 'Baby Formula / Infant Supplies' },
  ],
  coordination: [
    { id: 'volunteer_management', label: 'Volunteer Management' },
    { id: 'multi_org_coord', label: 'Multi-Org Coordination' },
    { id: 'donation_management', label: 'Donation Management' },
    { id: 'case_management', label: 'Case Management' },
  ],
  supply_warehouse: [
    { id: 'generators', label: 'Generators' },
    { id: 'tools', label: 'Tools & Equipment' },
    { id: 'clothing', label: 'Clothing & Bedding' },
    { id: 'cleaning_supplies', label: 'Cleaning Supplies' },
    { id: 'building_materials', label: 'Building Materials' },
  ],
  medical: [
    { id: 'first_aid', label: 'First Aid' },
    { id: 'mental_health', label: 'Mental Health / Counseling' },
    { id: 'pharmacy', label: 'Pharmacy / Prescriptions' },
    { id: 'mobility_aids', label: 'Mobility Aids' },
  ],
  vendor: [
    { id: 'roofing', label: 'Roofing' },
    { id: 'debris_removal', label: 'Debris Removal' },
    { id: 'tree_service', label: 'Tree Service' },
    { id: 'plumbing', label: 'Plumbing' },
    { id: 'electrical', label: 'Electrical' },
    { id: 'generator_install', label: 'Generator Install' },
    { id: 'mold_remediation', label: 'Mold Remediation' },
  ],
  community: [
    { id: 'shelter_space', label: 'Shelter Space' },
    { id: 'meeting_space', label: 'Meeting / Gathering Space' },
    { id: 'mutual_aid', label: 'Mutual Aid Network' },
    { id: 'neighborhood_comms', label: 'Neighborhood Communications' },
  ],
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('basics');
  const [saving, setSaving] = useState(false);

  // Basic info
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');

  // Location
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [locationName, setLocationName] = useState('');
  const [coverageRadius, setCoverageRadius] = useState(15);
  const [gpsDetected, setGpsDetected] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<string | null>(null);

  // Capabilities
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  // Vendor-specific
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  // Type-specific extras
  const [vehicleCount, setVehicleCount] = useState('');
  const [mealCapacity, setMealCapacity] = useState('');
  const [networkSize, setNetworkSize] = useState('');

  const stepNum = ['basics', 'location', 'capabilities', 'review'].indexOf(step) + 1;

  function detectLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setGpsDetected(true); },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Map for coverage area
  useEffect(() => {
    if (step !== 'location' || !mapRef.current || !lat) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css';
    if (!document.querySelector('link[href*="mapbox-gl"]')) document.head.appendChild(link);

    const initMap = () => {
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl || !mapRef.current) return;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [lng, lat],
        zoom: 10,
      });

      // Draggable marker
      const marker = new mapboxgl.Marker({ draggable: true, color: '#EF4E4B' })
        .setLngLat([lng, lat])
        .addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        setLat(pos.lat);
        setLng(pos.lng);
      });

      markerRef.current = marker;
      mapInstance.current = map;

      // Draw coverage circle
      map.on('load', () => drawCircle(map, lng, lat, coverageRadius));
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
  }, [step, lat, lng]);

  // Update circle when radius changes
  useEffect(() => {
    if (!mapInstance.current || step !== 'location') return;
    drawCircle(mapInstance.current, lng, lat, coverageRadius);
  }, [coverageRadius, lat, lng, step]);

  function drawCircle(map: any, cLng: number, cLat: number, radiusMi: number) {
    const radiusKm = radiusMi * 1.60934;
    const points = 64;
    const coords = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = radiusKm * Math.cos(angle);
      const dy = radiusKm * Math.sin(angle);
      const newLat = cLat + (dy / 111.32);
      const newLng = cLng + (dx / (111.32 * Math.cos(cLat * Math.PI / 180)));
      coords.push([newLng, newLat]);
    }

    const sourceId = 'coverage-circle';
    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as any).setData({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} });
    } else {
      try {
        map.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} } });
        map.addLayer({ id: 'coverage-fill', type: 'fill', source: sourceId, paint: { 'fill-color': '#89CFF0', 'fill-opacity': 0.15 } });
        map.addLayer({ id: 'coverage-outline', type: 'line', source: sourceId, paint: { 'line-color': '#89CFF0', 'line-width': 2, 'line-opacity': 0.6 } });
      } catch { /* source may already exist during re-render */ }
    }
  }

  function toggleCapability(id: string) {
    setCapabilities(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    setSaving(true);
    const { error } = await supabase.from('organizations').insert({
      name: orgName,
      org_type: orgType,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      website: website || null,
      latitude: lat || null,
      longitude: lng || null,
      location_name: locationName || null,
      coverage_radius_km: Math.round(coverageRadius * 1.60934),
      capabilities,
      service_categories: capabilities,
      description: description || null,
      min_budget: minBudget ? parseFloat(minBudget) : null,
      max_budget: maxBudget ? parseFloat(maxBudget) : null,
      status: 'pending',
    });

    if (!error) setStep('submitted');
    setSaving(false);
  }

  const typeInfo = ORG_TYPES.find(t => t.id === orgType);
  const capOptions = CAPABILITY_OPTIONS[orgType] || [];

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <img src="/logomark.svg" alt="SOS" className="h-10 w-10" />
          <div>
            <h1 className="text-lg font-bold text-sos-blue-800">Register Your Organization</h1>
            <p className="text-xs text-sos-gray-600">Join the SOS coordination network</p>
          </div>
        </div>

        {/* Progress */}
        {step !== 'submitted' && (
          <div className="flex gap-1 mb-6">
            {['basics', 'location', 'capabilities', 'review'].map((s, i) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${i < stepNum ? 'bg-sos-red-500' : 'bg-sos-gray-200'}`} />
            ))}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 'basics' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-sos-blue-800">Basic Information</h2>

            <div>
              <label className="text-xs font-medium text-sos-gray-600">Organization Name *</label>
              <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Emergency RV"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
            </div>

            <div>
              <label className="text-xs font-medium text-sos-gray-600">Organization Type *</label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {ORG_TYPES.map(type => (
                  <button key={type.id} onClick={() => setOrgType(type.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                      orgType === type.id ? 'border-sos-red-400 bg-sos-red-50' : 'border-sos-gray-300 bg-white hover:border-sos-gray-400'
                    }`}>
                    <span className="text-xl">{type.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-sos-blue-800">{type.label}</p>
                      <p className="text-[10px] text-sos-gray-500">{type.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-sos-gray-600">Contact Name *</label>
                <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-sos-gray-600">Phone</label>
                <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-sos-gray-600">Email *</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                className="w-full mt-1 px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
            </div>

            <div>
              <label className="text-xs font-medium text-sos-gray-600">Website (optional)</label>
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
            </div>

            <button onClick={() => { setStep('location'); if (!lat) detectLocation(); }}
              disabled={!orgName || !orgType || !contactName || !contactEmail}
              className="w-full py-3.5 rounded-xl bg-sos-red-500 text-white font-bold disabled:opacity-40 transition-colors">
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Location & Coverage */}
        {step === 'location' && (
          <div className="space-y-4">
            <button onClick={() => setStep('basics')} className="text-sm text-sos-gray-500 hover:text-sos-blue-800">← Back</button>
            <h2 className="text-base font-bold text-sos-blue-800">Location & Coverage</h2>

            {!gpsDetected && !lat ? (
              <button onClick={detectLocation} className="w-full p-4 bg-sos-accent-50 rounded-xl border border-sos-accent-200 text-sm font-medium text-sos-accent-800">
                📍 Detect Location
              </button>
            ) : null}

            <div>
              <label className="text-xs font-medium text-sos-gray-600">Location Name</label>
              <input type="text" value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="e.g. Asheville, NC"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
            </div>

            {/* Map with coverage circle */}
            {lat !== 0 && (
              <>
                <div ref={mapRef} className="h-64 rounded-xl overflow-hidden border border-sos-gray-300" />
                <p className="text-[10px] text-sos-gray-400 text-center">Drag the red marker to adjust your location</p>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-sos-gray-600">Coverage Radius: {coverageRadius} miles</label>
              <input type="range" min={1} max={100} value={coverageRadius} onChange={e => setCoverageRadius(Number(e.target.value))} className="w-full mt-1" />
              <div className="flex justify-between text-[10px] text-sos-gray-400"><span>1 mi</span><span>50 mi</span><span>100 mi</span></div>
            </div>

            <button onClick={() => setStep('capabilities')}
              className="w-full py-3.5 rounded-xl bg-sos-red-500 text-white font-bold transition-colors">
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Capabilities */}
        {step === 'capabilities' && (
          <div className="space-y-4">
            <button onClick={() => setStep('location')} className="text-sm text-sos-gray-500 hover:text-sos-blue-800">← Back</button>
            <h2 className="text-base font-bold text-sos-blue-800">Capabilities</h2>
            <p className="text-sm text-sos-gray-600">What can your organization provide? Select all that apply.</p>

            <div className="space-y-2">
              {capOptions.map(cap => (
                <button key={cap.id} onClick={() => toggleCapability(cap.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                    capabilities.includes(cap.id) ? 'border-green-400 bg-green-50' : 'border-sos-gray-300 bg-white hover:border-sos-gray-400'
                  }`}>
                  <span className="text-sm">{capabilities.includes(cap.id) ? '✅' : '⬜'}</span>
                  <span className="text-sm text-sos-blue-800">{cap.label}</span>
                </button>
              ))}
            </div>

            {/* Type-specific fields */}
            {orgType === 'transport_housing' && (
              <div>
                <label className="text-xs font-medium text-sos-gray-600">Number of Vehicles</label>
                <input type="number" value={vehicleCount} onChange={e => setVehicleCount(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
              </div>
            )}
            {orgType === 'food_service' && (
              <div>
                <label className="text-xs font-medium text-sos-gray-600">Meal Capacity (per day)</label>
                <input type="number" value={mealCapacity} onChange={e => setMealCapacity(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
              </div>
            )}
            {orgType === 'coordination' && (
              <div>
                <label className="text-xs font-medium text-sos-gray-600">Network Size (members)</label>
                <input type="number" value={networkSize} onChange={e => setNetworkSize(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
              </div>
            )}
            {orgType === 'vendor' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-sos-gray-600">Min Job Budget ($)</label>
                  <input type="number" value={minBudget} onChange={e => setMinBudget(e.target.value)} placeholder="500"
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-sos-gray-600">Max Job Budget ($)</label>
                  <input type="number" value={maxBudget} onChange={e => setMaxBudget(e.target.value)} placeholder="50000"
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-sos-gray-600">About Your Organization (optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Tell us about your mission and capacity..."
                className="w-full mt-1 px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 resize-none focus:outline-none focus:border-sos-accent-400" />
            </div>

            <button onClick={() => setStep('review')}
              disabled={capabilities.length === 0}
              className="w-full py-3.5 rounded-xl bg-sos-red-500 text-white font-bold disabled:opacity-40 transition-colors">
              Review
            </button>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 'review' && (
          <div className="space-y-4">
            <button onClick={() => setStep('capabilities')} className="text-sm text-sos-gray-500 hover:text-sos-blue-800">← Back</button>
            <h2 className="text-base font-bold text-sos-blue-800">Review Your Application</h2>

            <div className="bg-white rounded-xl border border-sos-gray-300 p-4 space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-sos-gray-200">
                <span className="text-2xl">{typeInfo?.icon}</span>
                <div>
                  <p className="text-base font-bold text-sos-blue-800">{orgName}</p>
                  <p className="text-xs text-sos-gray-500">{typeInfo?.label}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-sos-gray-500">Contact</span><p className="font-medium text-sos-blue-800">{contactName}</p></div>
                <div><span className="text-sos-gray-500">Email</span><p className="font-medium text-sos-blue-800">{contactEmail}</p></div>
                {contactPhone && <div><span className="text-sos-gray-500">Phone</span><p className="font-medium text-sos-blue-800">{contactPhone}</p></div>}
                {locationName && <div><span className="text-sos-gray-500">Location</span><p className="font-medium text-sos-blue-800">{locationName}</p></div>}
                <div><span className="text-sos-gray-500">Coverage</span><p className="font-medium text-sos-blue-800">{coverageRadius} miles</p></div>
              </div>
              <div>
                <span className="text-xs text-sos-gray-500">Capabilities</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {capabilities.map(c => {
                    const cap = capOptions.find(co => co.id === c);
                    return <span key={c} className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">{cap?.label || c}</span>;
                  })}
                </div>
              </div>
              {description && <div><span className="text-xs text-sos-gray-500">About</span><p className="text-xs text-sos-blue-800 mt-0.5">{description}</p></div>}
            </div>

            <button onClick={handleSubmit} disabled={saving}
              className="w-full py-3.5 rounded-xl bg-sos-red-500 text-white font-bold hover:bg-sos-red-600 disabled:opacity-40 transition-colors">
              {saving ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        )}

        {/* Submitted */}
        {step === 'submitted' && (
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"><span className="text-3xl">✓</span></div>
            <h2 className="text-xl font-bold text-sos-blue-800 mb-2">Application Submitted</h2>
            <p className="text-sm text-sos-gray-600 max-w-xs">Your organization is under review. We typically verify within 24-48 hours. You&apos;ll receive an email at <strong>{contactEmail}</strong> when approved.</p>
            <div className="mt-6 space-y-2">
              <button onClick={() => router.push('/matching')} className="block w-full px-6 py-3 rounded-xl bg-sos-blue-800 text-white font-bold text-sm">Go to Dashboard</button>
              <p className="text-[10px] text-sos-gray-400">Your dashboard will be fully unlocked after verification.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
