'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

type Step = 'category' | 'urgency' | 'location' | 'details' | 'household' | 'confirm' | 'submitted';

const CATEGORIES = [
  { id: 'shelter', icon: '🏠', label: 'Shelter', desc: 'Emergency housing, temporary shelter' },
  { id: 'food', icon: '🍽️', label: 'Food & Water', desc: 'Meals, drinking water, baby formula' },
  { id: 'medical', icon: '🏥', label: 'Medical', desc: 'First aid, prescriptions, mobility' },
  { id: 'transportation', icon: '🚗', label: 'Transportation', desc: 'Evacuation, rides, vehicle recovery' },
  { id: 'utilities', icon: '⚡', label: 'Utilities', desc: 'Power, generator, water, internet' },
  { id: 'other', icon: '📋', label: 'Other', desc: 'Anything else you need help with' },
];

const URGENCY_LEVELS = [
  { id: 'critical', icon: '🔴', label: 'Critical', desc: 'Life-threatening, immediate danger', color: 'border-sos-red-400 bg-sos-red-50' },
  { id: 'urgent', icon: '🟠', label: 'Urgent', desc: 'Need help within hours', color: 'border-yellow-400 bg-yellow-50' },
  { id: 'can_wait', icon: '🟡', label: 'Can Wait', desc: 'Need help but not immediate', color: 'border-sos-accent-400 bg-sos-accent-50' },
];

export default function HelpIntake() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState('');
  const [location, setLocation] = useState({ lat: 0, lng: 0, name: '' });
  const [details, setDetails] = useState('');
  const [household, setHousehold] = useState({ size: 1, children: false, elderly: false, disabled: false, pets: false, petCount: 0 });
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  function detectLocation() {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
        setGpsLoading(false);
      },
      () => { setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit() {
    setLoading(true);
    const personId = localStorage.getItem('sos-person-id');

    // Call intake-write edge function (not direct DB insert)
    // This ensures: signal_trace written, PII sanitized, person enriched, match triggered
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/intake-write`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          person_id: personId,
          channel: 'citizen_pwa',
          agent_id: 'sos-citizen',
          needs: [{
            category,
            urgency,
            details: details,
          }],
          location: {
            lat: location.lat,
            lng: location.lng,
            name: location.name,
          },
          household_size: household.size,
          has_children: household.children,
          has_elderly: household.elderly,
          has_disabled: household.disabled,
          has_pets: household.pets,
          pet_count: household.petCount,
        }),
      }
    );

    if (resp.ok) {
      setStep('submitted');
    }
    setLoading(false);
  }

  const stepNum = ['category', 'urgency', 'location', 'details', 'household', 'confirm'].indexOf(step) + 1;
  const totalSteps = 6;

  return (
    <div className="max-w-lg mx-auto px-4 pt-[env(safe-area-inset-top)] pb-8 min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 py-4">
        <button onClick={() => step === 'category' ? router.push('/c') : setStep(
          step === 'urgency' ? 'category' :
          step === 'location' ? 'urgency' :
          step === 'details' ? 'location' :
          step === 'household' ? 'details' :
          step === 'confirm' ? 'household' : 'category'
        )} className="text-sos-gray-500 hover:text-sos-blue-800">
          ← Back
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-sos-blue-800">I Need Help</h1>
          {step !== 'submitted' && (
            <div className="flex gap-1 mt-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i < stepNum ? 'bg-sos-red-500' : 'bg-sos-gray-200'}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1">
        {step === 'category' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-sos-blue-800 mb-4">What do you need?</h2>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setCategory(cat.id); setStep('urgency'); }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors ${
                  category === cat.id ? 'border-sos-red-400 bg-sos-red-50' : 'border-sos-gray-300 bg-white hover:border-sos-gray-400'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="text-sm font-bold text-sos-blue-800">{cat.label}</p>
                  <p className="text-xs text-sos-gray-600">{cat.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 'urgency' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-sos-blue-800 mb-4">How urgent is this?</h2>
            {URGENCY_LEVELS.map(u => (
              <button
                key={u.id}
                onClick={() => { setUrgency(u.id); setStep('location'); detectLocation(); }}
                className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-colors ${
                  urgency === u.id ? u.color : 'border-sos-gray-300 bg-white hover:border-sos-gray-400'
                }`}
              >
                <span className="text-3xl">{u.icon}</span>
                <div>
                  <p className="text-base font-bold text-sos-blue-800">{u.label}</p>
                  <p className="text-xs text-sos-gray-600">{u.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 'location' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sos-blue-800 mb-4">Where are you?</h2>
            {gpsLoading ? (
              <div className="flex items-center gap-3 p-4 bg-sos-accent-50 rounded-xl">
                <div className="w-5 h-5 border-2 border-sos-accent-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-sos-blue-800">Detecting your location...</p>
              </div>
            ) : location.lat ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm font-medium text-green-800">📍 Location detected</p>
                <p className="text-xs text-green-600 mt-0.5">{location.name}</p>
              </div>
            ) : (
              <button onClick={detectLocation} className="w-full p-4 bg-sos-accent-50 rounded-xl border border-sos-accent-200 text-sm font-medium text-sos-accent-800">
                📍 Detect my location
              </button>
            )}
            <div>
              <label className="text-xs font-medium text-sos-gray-600">Or describe your location</label>
              <input
                type="text"
                value={location.name}
                onChange={e => setLocation({ ...location, name: e.target.value })}
                placeholder="e.g. Near the church on Oak St"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400"
              />
            </div>
            <button
              onClick={() => setStep('details')}
              disabled={!location.name && !location.lat}
              className="w-full py-3.5 rounded-xl bg-sos-red-500 text-white font-bold disabled:opacity-40 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sos-blue-800 mb-4">Tell us more</h2>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder={
                category === 'shelter' ? 'How many nights? Any accessibility needs?' :
                category === 'food' ? 'Any dietary restrictions? Baby formula needed?' :
                category === 'medical' ? 'What kind of medical help? Prescriptions needed?' :
                'Describe what you need...'
              }
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 resize-none focus:outline-none focus:border-sos-accent-400"
            />
            <button
              onClick={() => setStep('household')}
              className="w-full py-3.5 rounded-xl bg-sos-red-500 text-white font-bold transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'household' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sos-blue-800 mb-4">About your household</h2>
            <div>
              <label className="text-xs font-medium text-sos-gray-600">Household size</label>
              <div className="flex items-center gap-4 mt-2">
                <button onClick={() => setHousehold({ ...household, size: Math.max(1, household.size - 1) })} className="w-10 h-10 rounded-full border-2 border-sos-gray-300 text-lg font-bold text-sos-blue-800">−</button>
                <span className="text-2xl font-bold text-sos-blue-800 w-8 text-center">{household.size}</span>
                <button onClick={() => setHousehold({ ...household, size: household.size + 1 })} className="w-10 h-10 rounded-full border-2 border-sos-gray-300 text-lg font-bold text-sos-blue-800">+</button>
              </div>
            </div>
            <div className="space-y-3 mt-4">
              {[
                { key: 'children', label: 'Children in household', icon: '👶' },
                { key: 'elderly', label: 'Elderly or senior', icon: '👴' },
                { key: 'disabled', label: 'Disability or mobility needs', icon: '♿' },
                { key: 'pets', label: 'Pets', icon: '🐕' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-sos-gray-300">
                  <span className="text-lg">{item.icon}</span>
                  <span className="flex-1 text-sm text-sos-blue-800">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={household[item.key as keyof typeof household] as boolean}
                    onChange={e => setHousehold({ ...household, [item.key]: e.target.checked })}
                    className="h-5 w-5 rounded border-sos-gray-300 text-sos-accent-500"
                  />
                </label>
              ))}
            </div>
            <button
              onClick={() => setStep('confirm')}
              className="w-full py-3.5 rounded-xl bg-sos-red-500 text-white font-bold transition-colors mt-4"
            >
              Review
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sos-blue-800 mb-4">Review your request</h2>
            <div className="bg-white rounded-xl border border-sos-gray-300 p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-sos-gray-500">Category</span>
                <span className="text-sm font-medium text-sos-blue-800 capitalize">{category.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-sos-gray-500">Urgency</span>
                <span className="text-sm font-medium text-sos-blue-800 capitalize">{urgency.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-sos-gray-500">Location</span>
                <span className="text-sm font-medium text-sos-blue-800">{location.name || 'GPS detected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-sos-gray-500">Household</span>
                <span className="text-sm font-medium text-sos-blue-800">{household.size} {household.size === 1 ? 'person' : 'people'}</span>
              </div>
              {details && (
                <div>
                  <span className="text-xs text-sos-gray-500">Details</span>
                  <p className="text-sm text-sos-blue-800 mt-0.5">{details}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-sos-red-500 text-white font-bold hover:bg-sos-red-600 disabled:opacity-40 transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit — Find me help'}
            </button>
          </div>
        )}

        {step === 'submitted' && (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-xl font-bold text-sos-blue-800 mb-2">We&apos;re finding help</h2>
            <p className="text-sm text-sos-gray-600 max-w-xs">
              Your request has been submitted. We&apos;re matching you with the nearest available help. You&apos;ll get a text when we find a match.
            </p>
            <button
              onClick={() => router.push('/matches')}
              className="mt-6 px-6 py-3 rounded-xl bg-sos-blue-800 text-white font-bold hover:bg-sos-blue-700 transition-colors"
            >
              View My Matches
            </button>
            <button
              onClick={() => router.push('/c')}
              className="mt-3 text-sm text-sos-gray-500 hover:text-sos-blue-800 transition-colors"
            >
              Back to home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
