'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

type Step = 'category' | 'details' | 'availability' | 'location' | 'confirm' | 'submitted';

const OFFER_CATEGORIES = [
  { id: 'shelter', icon: '🏠', label: 'Shelter', desc: 'Room, housing, temporary space' },
  { id: 'food', icon: '🍽️', label: 'Food & Water', desc: 'Meals, supplies, cooking' },
  { id: 'transportation', icon: '🚗', label: 'Transportation', desc: 'Rides, vehicle, equipment' },
  { id: 'labor', icon: '💪', label: 'Physical Help', desc: 'Cleanup, moving, building' },
  { id: 'medical', icon: '🏥', label: 'Medical Skills', desc: 'First aid, nursing, counseling' },
  { id: 'supplies', icon: '📦', label: 'Supplies', desc: 'Tools, generators, clothing' },
  { id: 'childcare', icon: '👶', label: 'Childcare', desc: 'Babysitting, supervision' },
  { id: 'other', icon: '🤝', label: 'Other', desc: 'Anything else you can offer' },
];

const AVAILABILITY = [
  { id: 'now', icon: '⚡', label: 'Available Now', desc: 'Can help immediately' },
  { id: 'scheduled', icon: '📅', label: 'Scheduled', desc: 'Available at specific times' },
  { id: 'ongoing', icon: '🔄', label: 'Ongoing', desc: 'Available regularly' },
];

export default function OfferIntake() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('category');
  const [categories, setCategories] = useState<string[]>([]);
  const [details, setDetails] = useState('');
  const [availability, setAvailability] = useState('');
  const [location, setLocation] = useState({ lat: 0, lng: 0, name: '', radius: 5 });
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  function toggleCategory(id: string) {
    setCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  function detectLocation() {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(l => ({ ...l, lat: pos.coords.latitude, lng: pos.coords.longitude, name: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` }));
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit() {
    setLoading(true);
    const personId = localStorage.getItem('sos-person-id');

    const { error } = await supabase.from('resources').insert({
      person_id: personId,
      category: categories[0],
      capabilities: categories,
      description: details,
      availability,
      latitude: location.lat || null,
      longitude: location.lng || null,
      location_name: location.name || null,
      coverage_radius_km: location.radius,
      status: 'available',
      source: 'citizen_offer',
    });

    if (!error) setStep('submitted');
    setLoading(false);
  }

  const stepNum = ['category', 'details', 'availability', 'location', 'confirm'].indexOf(step) + 1;

  return (
    <div className="max-w-lg mx-auto px-4 pt-[env(safe-area-inset-top)] pb-8 min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 py-4">
        <button onClick={() => step === 'category' ? router.push('/c') : setStep(
          step === 'details' ? 'category' :
          step === 'availability' ? 'details' :
          step === 'location' ? 'availability' :
          step === 'confirm' ? 'location' : 'category'
        )} className="text-sos-gray-500 hover:text-sos-blue-800">← Back</button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-sos-blue-800">I Can Help</h1>
          {step !== 'submitted' && (
            <div className="flex gap-1 mt-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i < stepNum ? 'bg-green-500' : 'bg-sos-gray-200'}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        {step === 'category' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-sos-blue-800 mb-1">What can you offer?</h2>
            <p className="text-sm text-sos-gray-600 mb-4">Select all that apply</p>
            {OFFER_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors ${
                  categories.includes(cat.id) ? 'border-green-400 bg-green-50' : 'border-sos-gray-300 bg-white hover:border-sos-gray-400'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-sos-blue-800">{cat.label}</p>
                  <p className="text-xs text-sos-gray-600">{cat.desc}</p>
                </div>
                {categories.includes(cat.id) && <span className="text-green-500 text-lg">✓</span>}
              </button>
            ))}
            <button
              onClick={() => setStep('details')}
              disabled={categories.length === 0}
              className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold disabled:opacity-40 transition-colors mt-4"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sos-blue-800 mb-4">Tell us more about what you can offer</h2>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="e.g. I have a truck and can move supplies. I'm also a certified EMT."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 resize-none focus:outline-none focus:border-green-400"
            />
            <button onClick={() => setStep('availability')} className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold transition-colors">Continue</button>
          </div>
        )}

        {step === 'availability' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-sos-blue-800 mb-4">When are you available?</h2>
            {AVAILABILITY.map(a => (
              <button
                key={a.id}
                onClick={() => { setAvailability(a.id); setStep('location'); detectLocation(); }}
                className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-colors ${
                  availability === a.id ? 'border-green-400 bg-green-50' : 'border-sos-gray-300 bg-white hover:border-sos-gray-400'
                }`}
              >
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="text-sm font-bold text-sos-blue-800">{a.label}</p>
                  <p className="text-xs text-sos-gray-600">{a.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 'location' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sos-blue-800 mb-4">Where can you help?</h2>
            {gpsLoading ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-sos-blue-800">Detecting location...</p>
              </div>
            ) : location.lat ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm font-medium text-green-800">📍 Location detected</p>
                <p className="text-xs text-green-600 mt-0.5">{location.name}</p>
              </div>
            ) : (
              <button onClick={detectLocation} className="w-full p-4 bg-green-50 rounded-xl border border-green-200 text-sm font-medium text-green-800">📍 Detect my location</button>
            )}
            <div>
              <label className="text-xs font-medium text-sos-gray-600">How far can you travel? ({location.radius} miles)</label>
              <input
                type="range"
                min={1}
                max={50}
                value={location.radius}
                onChange={e => setLocation({ ...location, radius: Number(e.target.value) })}
                className="w-full mt-2"
              />
              <div className="flex justify-between text-[10px] text-sos-gray-400">
                <span>1 mi</span><span>25 mi</span><span>50 mi</span>
              </div>
            </div>
            <button onClick={() => setStep('confirm')} className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold transition-colors">Review</button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sos-blue-800 mb-4">Review your offer</h2>
            <div className="bg-white rounded-xl border border-sos-gray-300 p-4 space-y-3">
              <div>
                <span className="text-xs text-sos-gray-500">Offering</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {categories.map(c => {
                    const cat = OFFER_CATEGORIES.find(oc => oc.id === c);
                    return <span key={c} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">{cat?.icon} {cat?.label}</span>;
                  })}
                </div>
              </div>
              <div className="flex justify-between"><span className="text-xs text-sos-gray-500">Availability</span><span className="text-sm font-medium text-sos-blue-800 capitalize">{availability.replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between"><span className="text-xs text-sos-gray-500">Range</span><span className="text-sm font-medium text-sos-blue-800">{location.radius} miles</span></div>
              {details && <div><span className="text-xs text-sos-gray-500">Details</span><p className="text-sm text-sos-blue-800 mt-0.5">{details}</p></div>}
            </div>
            <button onClick={handleSubmit} disabled={loading} className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold disabled:opacity-40 transition-colors">
              {loading ? 'Submitting...' : 'Submit — I\'m ready to help'}
            </button>
          </div>
        )}

        {step === 'submitted' && (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"><span className="text-3xl">🤝</span></div>
            <h2 className="text-xl font-bold text-sos-blue-800 mb-2">Thank you, helper!</h2>
            <p className="text-sm text-sos-gray-600 max-w-xs">Your offer is now visible to our matching system. We&apos;ll text you when someone near you needs what you&apos;re offering.</p>
            <button onClick={() => router.push('/c')} className="mt-6 px-6 py-3 rounded-xl bg-sos-blue-800 text-white font-bold transition-colors">Back to home</button>
          </div>
        )}
      </div>
    </div>
  );
}
