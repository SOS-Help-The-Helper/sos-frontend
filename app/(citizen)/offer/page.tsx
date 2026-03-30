'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'categories' | 'when' | 'where' | 'submitting' | 'done';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const CATEGORIES = [
  // Trade skills
  { id: 'shelter', icon: '🏠', label: 'Shelter', group: 'trade' },
  { id: 'food', icon: '🍽️', label: 'Food/Water', group: 'trade' },
  { id: 'transportation', icon: '🚗', label: 'Transport', group: 'trade' },
  { id: 'medical', icon: '🏥', label: 'Medical', group: 'trade' },
  { id: 'supplies', icon: '📦', label: 'Supplies', group: 'trade' },
  { id: 'construction', icon: '🔧', label: 'Construction', group: 'trade' },
  // Non-trade (Task 30 additions)
  { id: 'organizing', icon: '🧑‍💼', label: 'Organizing', group: 'non-trade' },
  { id: 'time', icon: '🚶', label: 'Just My Time', group: 'non-trade' },
  { id: 'bilingual', icon: '🗣️', label: 'Bilingual', group: 'non-trade' },
  { id: 'animals', icon: '🐕', label: 'Good with Animals', group: 'non-trade' },
  { id: 'childcare', icon: '👶', label: 'Childcare', group: 'non-trade' },
  { id: 'tech', icon: '💻', label: 'Tech Skills', group: 'non-trade' },
];

const AVAILABILITY = [
  { id: 'disasters_only', icon: '🆘', label: 'Disasters Only', desc: 'Only during active emergencies' },
  { id: 'anytime', icon: '🔄', label: 'Anytime', desc: 'Mutual aid + disaster response' },
  { id: 'volunteer', icon: '🙋', label: 'Active Volunteer', desc: 'I want regular assignments' },
];

const DISTANCES = [
  { id: '5', label: '5 mi' },
  { id: '15', label: '15 mi' },
  { id: '30', label: '30 mi' },
  { id: '50', label: '50+ mi' },
];

export default function OfferPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('categories');
  const [selected, setSelected] = useState<string[]>([]);
  const [availability, setAvailability] = useState('');
  const [distance, setDistance] = useState('15');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    setStep('submitting');
    const personId = localStorage.getItem('sos-person-id');

    try {
      await fetch(`${SUPABASE_URL}/functions/v1/intake-write`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'offer',
          person_id: personId,
          categories: selected,
          category: selected[0],
          availability,
          coverage_radius_km: parseInt(distance) * 1.60934,
          latitude: lat || null,
          longitude: lng || null,
          source: 'citizen_offer',
        }),
      });
      setStep('done');
    } catch {
      setStep('done');
    }
  }

  const tradeItems = CATEGORIES.filter(c => c.group === 'trade');
  const nonTradeItems = CATEGORIES.filter(c => c.group === 'non-trade');

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col max-w-lg mx-auto">
      <header className="bg-green-700 text-white px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-3">
        <button onClick={() => {
          if (step === 'categories') router.push('/c');
          else if (step === 'when') setStep('categories');
          else if (step === 'where') setStep('when');
        }} className="text-white/60 hover:text-white">←</button>
        <div className="flex-1">
          <p className="text-sm font-bold">I Can Help</p>
          {step !== 'submitting' && step !== 'done' && (
            <div className="flex gap-0.5 mt-1">
              {['categories','when','where'].map((s, i) => (
                <div key={s} className={`h-1 flex-1 rounded-full ${['categories','when','where'].indexOf(step) >= i ? 'bg-green-300' : 'bg-white/20'}`} />
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 px-4 py-5">
        {/* CATEGORIES — tap grid */}
        {step === 'categories' && (
          <div>
            <h2 className="text-base font-bold text-sos-blue-800 mb-1">What can you offer?</h2>
            <p className="text-xs text-sos-gray-600 mb-4">Select all that apply. Every skill matters.</p>

            <p className="text-[10px] font-bold text-sos-gray-500 uppercase tracking-wider mb-2">Skills & Resources</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {tradeItems.map(cat => (
                <button key={cat.id} onClick={() => toggle(cat.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 transition-all active:scale-[0.96] ${
                    selected.includes(cat.id) ? 'border-green-400 bg-green-50' : 'border-sos-gray-300 bg-white'
                  }`}>
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-[10px] font-semibold text-sos-blue-800">{cat.label}</span>
                </button>
              ))}
            </div>

            <p className="text-[10px] font-bold text-sos-gray-500 uppercase tracking-wider mb-2">You Don&apos;t Need a Trade</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {nonTradeItems.map(cat => (
                <button key={cat.id} onClick={() => toggle(cat.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 transition-all active:scale-[0.96] ${
                    selected.includes(cat.id) ? 'border-green-400 bg-green-50' : 'border-sos-gray-300 bg-white'
                  }`}>
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-[10px] font-semibold text-sos-blue-800">{cat.label}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setStep('when')} disabled={selected.length === 0}
              className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold disabled:opacity-40 transition-colors">
              Continue ({selected.length} selected)
            </button>
          </div>
        )}

        {/* WHEN */}
        {step === 'when' && (
          <div>
            <h2 className="text-base font-bold text-sos-blue-800 mb-4">When are you available?</h2>
            <div className="space-y-2.5">
              {AVAILABILITY.map(opt => (
                <button key={opt.id} onClick={() => { setAvailability(opt.id); setStep('where'); navigator.geolocation.getCurrentPosition(p => { setLat(p.coords.latitude); setLng(p.coords.longitude); }, () => {}, { enableHighAccuracy: true }); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                    availability === opt.id ? 'border-green-400 bg-green-50' : 'border-sos-gray-300 bg-white'
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

        {/* WHERE — distance */}
        {step === 'where' && (
          <div>
            <h2 className="text-base font-bold text-sos-blue-800 mb-4">How far can you help?</h2>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {DISTANCES.map(d => (
                <button key={d.id} onClick={() => setDistance(d.id)}
                  className={`py-3 rounded-xl border-2 text-center font-bold text-sm transition-all ${
                    distance === d.id ? 'border-green-400 bg-green-50 text-green-700' : 'border-sos-gray-300 bg-white text-sos-blue-800'
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <p className="text-xs text-green-800">
                <strong>You selected:</strong> {selected.length} skill{selected.length > 1 ? 's' : ''} ·
                {' '}{AVAILABILITY.find(a => a.id === availability)?.label} ·
                {' '}Within {distance} miles
              </p>
            </div>

            <button onClick={handleSubmit} className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold transition-colors">
              🤝 I&apos;m Ready to Help
            </button>
          </div>
        )}

        {/* SUBMITTING */}
        {step === 'submitting' && (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 border-3 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-sos-gray-600">Registering your help...</p>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"><span className="text-3xl">🤝</span></div>
            <h2 className="text-xl font-bold text-sos-blue-800 mb-2">Thank you, helper!</h2>
            <p className="text-sm text-sos-gray-600 max-w-xs">You&apos;re now in the system. We&apos;ll text you when someone nearby needs what you&apos;re offering.</p>
            <button onClick={() => router.push('/c')} className="mt-6 px-6 py-3 rounded-xl bg-sos-blue-800 text-white font-bold text-sm">Back to Home</button>
          </div>
        )}
      </div>
    </div>
  );
}
