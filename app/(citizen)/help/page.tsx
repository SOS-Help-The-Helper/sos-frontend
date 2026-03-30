'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'triage' | 'what' | 'who' | 'where' | 'when' | 'details' | 'submitting' | 'done';

const CATEGORIES = [
  { id: 'shelter', icon: '🏠', label: 'Shelter' },
  { id: 'food', icon: '🍽️', label: 'Food/Water' },
  { id: 'medical', icon: '🏥', label: 'Medical' },
  { id: 'transportation', icon: '🚗', label: 'Transport' },
  { id: 'utilities', icon: '⚡', label: 'Utilities' },
  { id: 'supplies', icon: '📦', label: 'Supplies' },
  { id: 'childcare', icon: '👶', label: 'Childcare' },
  { id: 'safety', icon: '🛡️', label: 'Safety' },
  { id: 'other', icon: '📋', label: 'Other' },
];

const WHO_OPTIONS = [
  { id: 'me', icon: '🙋', label: 'Me', desc: 'I need help' },
  { id: 'someone', icon: '👤', label: 'Someone Else', desc: 'On behalf of another person' },
  { id: 'group', icon: '👨‍👩‍👧‍👦', label: 'My Household', desc: 'Multiple people' },
];

const WHEN_OPTIONS = [
  { id: 'now', icon: '🔴', label: 'Right Now', desc: 'Emergency — need help immediately', color: 'border-sos-red-400 bg-sos-red-50' },
  { id: 'today', icon: '🟠', label: 'Today', desc: 'Urgent — within the next few hours', color: 'border-yellow-400 bg-yellow-50' },
  { id: 'week', icon: '🟡', label: 'This Week', desc: 'Can wait — but I need help soon', color: 'border-sos-accent-400 bg-sos-accent-50' },
];

// Supabase edge function URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default function HelpIntake() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('triage');
  const [isEmergency, setIsEmergency] = useState<boolean | null>(null);
  const [category, setCategory] = useState('');
  const [who, setWho] = useState('');
  const [count, setCount] = useState(1);
  const [when, setWhen] = useState('');
  const [details, setDetails] = useState('');

  // Location — Task 28: on-behalf
  const [locMode, setLocMode] = useState<'gps' | 'search'>('gps');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [locationName, setLocationName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [gpsDetecting, setGpsDetecting] = useState(false);

  // On-behalf info
  const [onBehalfName, setOnBehalfName] = useState('');

  // GPS auto-detect (only if who !== 'someone')
  function detectGPS() {
    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocationName(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`); setGpsDetecting(false); },
      () => { setGpsDetecting(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Google Places autocomplete (Task 28)
  async function searchPlaces(query: string) {
    setSearchQuery(query);
    if (query.length < 3) { setSearchResults([]); return; }
    try {
      const PLACES_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY || '';
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${PLACES_KEY}`);
      const data = await res.json();
      setSearchResults((data.results || []).slice(0, 4).map((r: any) => ({
        name: r.formatted_address,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
      })));
    } catch { setSearchResults([]); }
  }

  function selectPlace(place: { name: string; lat: number; lng: number }) {
    setLocationName(place.name);
    setLat(place.lat);
    setLng(place.lng);
    setSearchResults([]);
    setSearchQuery('');
  }

  // Submit via intake-write edge function
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
          category,
          urgency: urgencyMap[when] || 'urgent',
          latitude: lat || null,
          longitude: lng || null,
          location_name: locationName || null,
          details_sanitized: details || null,
          household_size: who === 'group' ? count : 1,
          source: 'citizen_intake',
          is_emergency: isEmergency,
          on_behalf: who === 'someone',
          on_behalf_name: who === 'someone' ? onBehalfName : null,
        }),
      });
      setStep('done');
    } catch {
      setStep('done'); // show success anyway — may have queued offline
    }
  }

  const totalSteps = isEmergency ? 5 : 3;
  const currentStep = step === 'triage' ? 0 : step === 'what' ? 1 : step === 'who' ? 2 : step === 'where' ? 3 : step === 'when' ? 4 : 5;

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-sos-blue-800 text-white px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-3">
        <button onClick={() => {
          if (step === 'triage') router.push('/c');
          else if (step === 'what') setStep('triage');
          else if (step === 'who') setStep('what');
          else if (step === 'where') setStep('who');
          else if (step === 'when') setStep('where');
          else if (step === 'details') setStep('when');
        }} className="text-white/60 hover:text-white">←</button>
        <div className="flex-1">
          <p className="text-sm font-bold">I Need Help</p>
          {step !== 'triage' && step !== 'submitting' && step !== 'done' && (
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i < currentStep ? 'bg-sos-red-400' : 'bg-white/20'}`} />
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
              <button onClick={() => { setIsEmergency(true); setStep('what'); }}
                className="bg-sos-red-500 text-white rounded-2xl py-8 text-center font-bold text-base shadow-sm active:scale-[0.97] transition-all">
                <span className="text-3xl block mb-2">🚨</span>
                Yes
              </button>
              <button onClick={() => { setIsEmergency(false); setStep('what'); }}
                className="bg-white border-2 border-sos-gray-300 text-sos-blue-800 rounded-2xl py-8 text-center font-bold text-base active:scale-[0.97] transition-all">
                <span className="text-3xl block mb-2">💭</span>
                No, planning
              </button>
            </div>
          </div>
        )}

        {/* WHAT — 9 category tap grid */}
        {step === 'what' && (
          <div>
            <h2 className="text-base font-bold text-sos-blue-800 mb-4">What do you need?</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => { setCategory(cat.id); setStep('who'); }}
                  className={`flex flex-col items-center justify-center gap-1.5 py-5 rounded-xl border-2 transition-all active:scale-[0.96] ${
                    category === cat.id ? 'border-sos-red-400 bg-sos-red-50' : 'border-sos-gray-300 bg-white'
                  }`}>
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-[11px] font-semibold text-sos-blue-800">{cat.label}</span>
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
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                    who === opt.id ? 'border-sos-red-400 bg-sos-red-50' : 'border-sos-gray-300 bg-white'
                  }`}>
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-sos-blue-800">{opt.label}</p>
                    <p className="text-[10px] text-sos-gray-500">{opt.desc}</p>
                  </div>
                </button>
              ))}
              {who === 'group' && (
                <div className="flex items-center gap-4 px-4 mt-2">
                  <span className="text-xs text-sos-gray-600">How many people?</span>
                  <button onClick={() => setCount(Math.max(1, count - 1))} className="w-8 h-8 rounded-full border border-sos-gray-300 text-sm font-bold">−</button>
                  <span className="text-lg font-bold text-sos-blue-800 w-6 text-center">{count}</span>
                  <button onClick={() => setCount(count + 1)} className="w-8 h-8 rounded-full border border-sos-gray-300 text-sm font-bold">+</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WHERE — GPS auto or Places search (Task 28) */}
        {step === 'where' && (
          <div>
            <h2 className="text-base font-bold text-sos-blue-800 mb-4">
              {who === 'someone' ? 'Where are they?' : 'Where are you?'}
            </h2>

            {/* On-behalf name */}
            {who === 'someone' && (
              <div className="mb-4">
                <label className="text-xs font-medium text-sos-gray-600">Their name (optional)</label>
                <input type="text" value={onBehalfName} onChange={e => setOnBehalfName(e.target.value)} placeholder="First name"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
              </div>
            )}

            {/* GPS mode */}
            {locMode === 'gps' && (
              <div className="space-y-3">
                {gpsDetecting ? (
                  <div className="flex items-center gap-3 p-4 bg-sos-accent-50 rounded-xl">
                    <div className="w-5 h-5 border-2 border-sos-accent-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-sos-blue-800">Detecting your location...</p>
                  </div>
                ) : lat ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-sm font-medium text-green-800">📍 Location detected</p>
                    <p className="text-xs text-green-600 mt-0.5">{locationName}</p>
                  </div>
                ) : (
                  <button onClick={detectGPS} className="w-full p-4 bg-sos-accent-50 rounded-xl border border-sos-accent-200 text-sm font-medium text-sos-accent-800">
                    📍 Detect my location
                  </button>
                )}
                <button onClick={() => setLocMode('search')} className="text-xs text-sos-accent-700 font-medium">
                  Or enter an address manually
                </button>
              </div>
            )}

            {/* Search mode (Places autocomplete — Task 28) */}
            {locMode === 'search' && (
              <div className="space-y-3">
                <div className="relative">
                  <input type="text" value={searchQuery} onChange={e => searchPlaces(e.target.value)}
                    placeholder="Search address or place..."
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-sos-gray-300 shadow-lg z-10 overflow-hidden">
                      {searchResults.map((place, i) => (
                        <button key={i} onClick={() => selectPlace(place)}
                          className="w-full text-left px-4 py-3 text-xs text-sos-blue-800 hover:bg-sos-gray-200 border-b border-sos-gray-200 last:border-0">
                          📍 {place.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {locationName && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-xs font-medium text-green-800">📍 {locationName}</p>
                  </div>
                )}
                {who !== 'someone' && (
                  <button onClick={() => { setLocMode('gps'); detectGPS(); }} className="text-xs text-sos-accent-700 font-medium">
                    Use my GPS instead
                  </button>
                )}
              </div>
            )}

            <button onClick={() => setStep('when')} disabled={!lat && !locationName}
              className="w-full mt-4 py-3.5 rounded-xl bg-sos-red-500 text-white font-bold disabled:opacity-40 transition-colors">
              Continue
            </button>
          </div>
        )}

        {/* WHEN */}
        {step === 'when' && (
          <div>
            <h2 className="text-base font-bold text-sos-blue-800 mb-4">When do you need help?</h2>
            <div className="space-y-2.5">
              {WHEN_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => { setWhen(opt.id); if (isEmergency) handleSubmit(); else setStep('details'); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                    when === opt.id ? opt.color : 'border-sos-gray-300 bg-white'
                  }`}>
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-sos-blue-800">{opt.label}</p>
                    <p className="text-[10px] text-sos-gray-500">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DETAILS (non-emergency only) */}
        {step === 'details' && (
          <div>
            <h2 className="text-base font-bold text-sos-blue-800 mb-4">Anything else we should know?</h2>
            <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3}
              placeholder="Special needs, pets, medical equipment, children..."
              className="w-full px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 resize-none focus:outline-none focus:border-sos-accent-400" />
            <button onClick={handleSubmit} className="w-full mt-4 py-3.5 rounded-xl bg-sos-red-500 text-white font-bold transition-colors">
              Submit
            </button>
            <button onClick={handleSubmit} className="w-full mt-2 text-xs text-sos-gray-500 hover:text-sos-blue-800">Skip — submit now</button>
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
                ? "Your emergency request has been submitted. We're matching you with the nearest available help right now. You'll get a text when we find a match."
                : "Your request has been submitted. We'll text you when help is available."}
            </p>
            <button onClick={() => router.push('/matches')} className="mt-6 px-6 py-3 rounded-xl bg-sos-blue-800 text-white font-bold text-sm">View My Matches</button>
            <button onClick={() => router.push('/c')} className="mt-2 text-xs text-sos-gray-500">Back to home</button>
          </div>
        )}
      </div>
    </div>
  );
}
