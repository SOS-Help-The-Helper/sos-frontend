'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'triage' | 'domain' | 'refine' | 'who' | 'where' | 'when' | 'submitting' | 'done';

// 6 need domains — tap cards
const DOMAINS = [
  { id: 'housing', icon: '🏠', label: 'Housing' },
  { id: 'food', icon: '🍽️', label: 'Food' },
  { id: 'health', icon: '💊', label: 'Health' },
  { id: 'transport', icon: '🚗', label: 'Transport' },
  { id: 'utilities', icon: '⚡', label: 'Utilities' },
  { id: 'supplies', icon: '📦', label: 'Supplies' },
];

// Taxonomy refinements per domain — agent would normally handle this conversationally
// but we show a quick-tap second level for speed
const TAXONOMY: Record<string, Array<{ code: string; label: string; flat: string }>> = {
  housing: [
    { code: 'HOUSING.EMERGENCY_SHELTER', label: 'Emergency shelter tonight', flat: 'shelter' },
    { code: 'HOUSING.TEMPORARY', label: 'Temporary housing (days/weeks)', flat: 'shelter' },
    { code: 'HOUSING.REPAIR', label: 'Home damage / repair needed', flat: 'shelter' },
    { code: 'HOUSING.RELOCATION', label: 'Need to relocate', flat: 'shelter' },
  ],
  food: [
    { code: 'FOOD.IMMEDIATE', label: 'Need a meal now', flat: 'food' },
    { code: 'FOOD.GROCERIES', label: 'Groceries / food supplies', flat: 'food' },
    { code: 'FOOD.WATER', label: 'Clean drinking water', flat: 'food' },
    { code: 'FOOD.BABY', label: 'Baby formula / infant food', flat: 'food' },
    { code: 'FOOD.DIETARY', label: 'Special dietary needs', flat: 'food' },
  ],
  health: [
    { code: 'HEALTH.EMERGENCY', label: 'Medical emergency', flat: 'medical' },
    { code: 'HEALTH.PRESCRIPTION', label: 'Need prescriptions', flat: 'medical' },
    { code: 'HEALTH.FIRST_AID', label: 'First aid / minor injury', flat: 'medical' },
    { code: 'HEALTH.MENTAL', label: 'Mental health / counseling', flat: 'medical' },
    { code: 'HEALTH.MOBILITY', label: 'Mobility / disability aid', flat: 'medical' },
  ],
  transport: [
    { code: 'TRANSPORT.EVACUATION', label: 'Need evacuation', flat: 'transportation' },
    { code: 'TRANSPORT.RIDE', label: 'Need a ride somewhere', flat: 'transportation' },
    { code: 'TRANSPORT.VEHICLE', label: 'Vehicle recovery / tow', flat: 'transportation' },
    { code: 'TRANSPORT.FUEL', label: 'Need fuel', flat: 'transportation' },
  ],
  utilities: [
    { code: 'UTILITIES.POWER', label: 'No power', flat: 'utilities' },
    { code: 'UTILITIES.GENERATOR', label: 'Need a generator', flat: 'utilities' },
    { code: 'UTILITIES.WATER', label: 'No running water', flat: 'utilities' },
    { code: 'UTILITIES.INTERNET', label: 'No phone / internet', flat: 'utilities' },
  ],
  supplies: [
    { code: 'SUPPLIES.CLEANING', label: 'Cleaning supplies', flat: 'supplies' },
    { code: 'SUPPLIES.TOOLS', label: 'Tools / equipment', flat: 'supplies' },
    { code: 'SUPPLIES.CLOTHING', label: 'Clothing / bedding', flat: 'supplies' },
    { code: 'SUPPLIES.SANDBAGS', label: 'Sandbags / tarps', flat: 'supplies' },
  ],
};

const WHO_OPTIONS = [
  { id: 'me', icon: '🙋', label: 'Me' },
  { id: 'someone', icon: '👤', label: 'Someone Else' },
  { id: 'group', icon: '👨‍👩‍👧‍👦', label: 'My Household' },
];

const WHEN_OPTIONS = [
  { id: 'now', icon: '🔴', label: 'Right Now', color: 'border-sos-red-400 bg-sos-red-50' },
  { id: 'today', icon: '🟠', label: 'Today', color: 'border-yellow-400 bg-yellow-50' },
  { id: 'week', icon: '🟡', label: 'This Week', color: 'border-sos-accent-400 bg-sos-accent-50' },
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default function HelpIntake() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('triage');
  const [isEmergency, setIsEmergency] = useState<boolean | null>(null);

  // Domain + taxonomy
  const [domain, setDomain] = useState('');
  const [taxonomyCode, setTaxonomyCode] = useState('');
  const [flatCategory, setFlatCategory] = useState('');
  const [freeText, setFreeText] = useState('');

  // Who
  const [who, setWho] = useState('');
  const [count, setCount] = useState(1);
  const [onBehalfName, setOnBehalfName] = useState('');

  // Where
  const [locMode, setLocMode] = useState<'gps' | 'search'>('gps');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [locationName, setLocationName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [gpsDetecting, setGpsDetecting] = useState(false);

  // When
  const [when, setWhen] = useState('');

  function detectGPS() {
    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocationName(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`); setGpsDetecting(false); },
      () => setGpsDetecting(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function searchPlaces(query: string) {
    setSearchQuery(query);
    if (query.length < 3) { setSearchResults([]); return; }
    try {
      const PLACES_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY || '';
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${PLACES_KEY}`);
      const data = await res.json();
      setSearchResults((data.results || []).slice(0, 4).map((r: any) => ({
        name: r.formatted_address, lat: r.geometry.location.lat, lng: r.geometry.location.lng,
      })));
    } catch { setSearchResults([]); }
  }

  function selectPlace(place: { name: string; lat: number; lng: number }) {
    setLocationName(place.name); setLat(place.lat); setLng(place.lng); setSearchResults([]); setSearchQuery('');
  }

  async function handleSubmit() {
    setStep('submitting');
    const personId = localStorage.getItem('sos-person-id');
    const urgencyMap: Record<string, string> = { now: 'critical', today: 'urgent', week: 'can_wait' };

    try {
      await fetch(`${SUPABASE_URL}/functions/v1/intake-write`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: personId,
          category: flatCategory || domain, // backward-compat flat category
          taxonomy_code: taxonomyCode || null, // structured taxonomy
          urgency: urgencyMap[when] || 'urgent',
          latitude: lat || null,
          longitude: lng || null,
          location_name: locationName || null,
          details_sanitized: freeText || null,
          household_size: who === 'group' ? count : 1,
          source: 'citizen_intake',
          is_emergency: isEmergency,
          on_behalf: who === 'someone',
          on_behalf_name: who === 'someone' ? onBehalfName : null,
        }),
      });
      setStep('done');
    } catch { setStep('done'); }
  }

  function goBack() {
    if (step === 'triage') router.push('/c');
    else if (step === 'domain') setStep('triage');
    else if (step === 'refine') setStep('domain');
    else if (step === 'who') { if (freeText) setStep('domain'); else setStep('refine'); }
    else if (step === 'where') setStep('who');
    else if (step === 'when') setStep('where');
  }

  const steps = isEmergency ? ['triage','domain','refine','who','where','when'] : ['triage','domain','refine','who','where','when'];
  const currentIdx = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-sos-blue-800 text-white px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-3">
        <button onClick={goBack} className="text-white/60 hover:text-white">←</button>
        <div className="flex-1">
          <p className="text-sm font-bold">I Need Help</p>
          {step !== 'triage' && step !== 'submitting' && step !== 'done' && (
            <div className="flex gap-0.5 mt-1">
              {steps.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i <= currentIdx ? 'bg-sos-red-400' : 'bg-white/20'}`} />
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 px-4 py-5">

        {/* TRIAGE */}
        {step === 'triage' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sos-blue-800 text-center">Is this an emergency<br />right now?</h2>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => { setIsEmergency(true); setStep('domain'); }}
                className="bg-sos-red-500 text-white rounded-2xl py-8 text-center font-bold text-base shadow-sm active:scale-[0.97] transition-all">
                <span className="text-3xl block mb-2">🚨</span>Yes
              </button>
              <button onClick={() => { setIsEmergency(false); setStep('domain'); }}
                className="bg-white border-2 border-sos-gray-300 text-sos-blue-800 rounded-2xl py-8 text-center font-bold text-base active:scale-[0.97] transition-all">
                <span className="text-3xl block mb-2">💭</span>No, planning
              </button>
            </div>
          </div>
        )}

        {/* DOMAIN — 6 quick-tap cards + free text option */}
        {step === 'domain' && (
          <div>
            <h2 className="text-base font-bold text-sos-blue-800 mb-4">What do you need help with?</h2>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {DOMAINS.map(d => (
                <button key={d.id} onClick={() => { setDomain(d.id); setStep('refine'); }}
                  className={`flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 transition-all active:scale-[0.96] ${
                    domain === d.id ? 'border-sos-red-400 bg-sos-red-50' : 'border-sos-gray-300 bg-white'
                  }`}>
                  <span className="text-3xl">{d.icon}</span>
                  <span className="text-xs font-bold text-sos-blue-800">{d.label}</span>
                </button>
              ))}
            </div>

            {/* Free text alternative */}
            <div className="bg-white rounded-xl border border-sos-gray-300 p-4">
              <p className="text-xs font-medium text-sos-gray-600 mb-2">💬 Or just tell me what&apos;s going on</p>
              <div className="flex gap-2">
                <input type="text" value={freeText} onChange={e => setFreeText(e.target.value)}
                  placeholder="Describe your situation..."
                  className="flex-1 px-3 py-2.5 rounded-lg border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                <button onClick={() => {
                  if (!freeText.trim()) return;
                  // Agent will classify from natural language — for now set domain from keywords
                  const text = freeText.toLowerCase();
                  const detected = text.includes('shelter') || text.includes('hous') || text.includes('roof') ? 'housing' :
                    text.includes('food') || text.includes('hungry') || text.includes('water') || text.includes('meal') ? 'food' :
                    text.includes('medic') || text.includes('hurt') || text.includes('prescri') || text.includes('doctor') ? 'health' :
                    text.includes('ride') || text.includes('car') || text.includes('evacuat') || text.includes('transport') ? 'transport' :
                    text.includes('power') || text.includes('electric') || text.includes('generator') || text.includes('internet') ? 'utilities' :
                    text.includes('supply') || text.includes('tool') || text.includes('sandbag') || text.includes('cloth') ? 'supplies' : 'housing';
                  setDomain(detected);
                  setTaxonomyCode(`${detected.toUpperCase()}.GENERAL`);
                  setFlatCategory(detected === 'health' ? 'medical' : detected === 'transport' ? 'transportation' : detected);
                  setStep('who'); // skip refine — agent handles from text
                }}
                  disabled={!freeText.trim()}
                  className="px-4 py-2.5 rounded-lg bg-sos-blue-800 text-white text-xs font-bold disabled:opacity-40 transition-colors flex-shrink-0">
                  Go
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REFINE — taxonomy second level */}
        {step === 'refine' && domain && (
          <div>
            <h2 className="text-base font-bold text-sos-blue-800 mb-1">
              {DOMAINS.find(d => d.id === domain)?.icon} {DOMAINS.find(d => d.id === domain)?.label}
            </h2>
            <p className="text-xs text-sos-gray-600 mb-4">Which best describes your situation?</p>
            <div className="space-y-2">
              {(TAXONOMY[domain] || []).map(item => (
                <button key={item.code} onClick={() => {
                  setTaxonomyCode(item.code);
                  setFlatCategory(item.flat);
                  setStep('who');
                }}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all active:scale-[0.98] ${
                    taxonomyCode === item.code ? 'border-sos-red-400 bg-sos-red-50' : 'border-sos-gray-300 bg-white hover:border-sos-gray-400'
                  }`}>
                  <p className="text-sm font-medium text-sos-blue-800">{item.label}</p>
                  <p className="text-[9px] text-sos-gray-400 mt-0.5">{item.code}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* WHO */}
        {step === 'who' && (
          <div>
            <h2 className="text-base font-bold text-sos-blue-800 mb-4">Who needs help?</h2>
            <div className="space-y-2.5">
              {WHO_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => {
                  setWho(opt.id);
                  if (opt.id === 'someone') { setLocMode('search'); setStep('where'); }
                  else { setLocMode('gps'); detectGPS(); setStep('where'); }
                }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-sos-gray-300 bg-white text-left transition-all active:scale-[0.98] hover:border-sos-gray-400">
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="text-sm font-bold text-sos-blue-800">{opt.label}</span>
                </button>
              ))}
            </div>
            {who === 'group' && (
              <div className="flex items-center gap-4 px-4 mt-3">
                <span className="text-xs text-sos-gray-600">How many?</span>
                <button onClick={() => setCount(Math.max(1, count - 1))} className="w-8 h-8 rounded-full border border-sos-gray-300 text-sm font-bold">−</button>
                <span className="text-lg font-bold text-sos-blue-800 w-6 text-center">{count}</span>
                <button onClick={() => setCount(count + 1)} className="w-8 h-8 rounded-full border border-sos-gray-300 text-sm font-bold">+</button>
              </div>
            )}
          </div>
        )}

        {/* WHERE */}
        {step === 'where' && (
          <div>
            <h2 className="text-base font-bold text-sos-blue-800 mb-4">{who === 'someone' ? 'Where are they?' : 'Where are you?'}</h2>
            {who === 'someone' && (
              <div className="mb-4">
                <label className="text-xs font-medium text-sos-gray-600">Their name (optional)</label>
                <input type="text" value={onBehalfName} onChange={e => setOnBehalfName(e.target.value)} placeholder="First name"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
              </div>
            )}
            {locMode === 'gps' ? (
              <div className="space-y-3">
                {gpsDetecting ? (
                  <div className="flex items-center gap-3 p-4 bg-sos-accent-50 rounded-xl">
                    <div className="w-5 h-5 border-2 border-sos-accent-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-sos-blue-800">Detecting location...</p>
                  </div>
                ) : lat ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-sm font-medium text-green-800">📍 Location detected</p>
                    <p className="text-xs text-green-600 mt-0.5">{locationName}</p>
                  </div>
                ) : (
                  <button onClick={detectGPS} className="w-full p-4 bg-sos-accent-50 rounded-xl border border-sos-accent-200 text-sm font-medium text-sos-accent-800">📍 Detect my location</button>
                )}
                <button onClick={() => setLocMode('search')} className="text-xs text-sos-accent-700 font-medium">Or enter address</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <input type="text" value={searchQuery} onChange={e => searchPlaces(e.target.value)} placeholder="Search address..."
                    autoFocus className="w-full px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-sos-gray-300 shadow-lg z-10 overflow-hidden">
                      {searchResults.map((p, i) => (
                        <button key={i} onClick={() => selectPlace(p)} className="w-full text-left px-4 py-3 text-xs text-sos-blue-800 hover:bg-sos-gray-200 border-b border-sos-gray-200 last:border-0">📍 {p.name}</button>
                      ))}
                    </div>
                  )}
                </div>
                {locationName && <div className="p-3 bg-green-50 border border-green-200 rounded-xl"><p className="text-xs font-medium text-green-800">📍 {locationName}</p></div>}
                {who !== 'someone' && <button onClick={() => { setLocMode('gps'); detectGPS(); }} className="text-xs text-sos-accent-700 font-medium">Use GPS instead</button>}
              </div>
            )}
            <button onClick={() => setStep('when')} disabled={!lat && !locationName}
              className="w-full mt-4 py-3.5 rounded-xl bg-sos-red-500 text-white font-bold disabled:opacity-40 transition-colors">Continue</button>
          </div>
        )}

        {/* WHEN */}
        {step === 'when' && (
          <div>
            <h2 className="text-base font-bold text-sos-blue-800 mb-4">When do you need help?</h2>
            <div className="space-y-2.5">
              {WHEN_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => { setWhen(opt.id); handleSubmit(); }}
                  className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${opt.color}`}>
                  <span className="text-3xl">{opt.icon}</span>
                  <span className="text-sm font-bold text-sos-blue-800">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SUBMITTING */}
        {step === 'submitting' && (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 border-3 border-sos-red-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-sos-gray-600">Finding help near you...</p>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"><span className="text-3xl">✓</span></div>
            <h2 className="text-xl font-bold text-sos-blue-800 mb-2">We&apos;re on it</h2>
            <p className="text-sm text-sos-gray-600 max-w-xs">
              {isEmergency
                ? "Emergency request submitted. We're matching you with the nearest help right now."
                : "Request submitted. We'll text you when help is available."}
            </p>
            {taxonomyCode && <p className="text-[10px] text-sos-gray-400 mt-2">Ref: {taxonomyCode}</p>}
            <button onClick={() => router.push('/matches')} className="mt-6 px-6 py-3 rounded-xl bg-sos-blue-800 text-white font-bold text-sm">View My Matches</button>
            <button onClick={() => router.push('/c')} className="mt-2 text-xs text-sos-gray-500">Back to home</button>
          </div>
        )}
      </div>
    </div>
  );
}
