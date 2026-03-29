'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

type Step = 'info' | 'details' | 'submitted';

export default function FindSomeone() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState('');
  const [lastLocation, setLastLocation] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    const personId = localStorage.getItem('sos-person-id');

    await supabase.from('missing_person_reports').insert({
      reporter_person_id: personId,
      missing_name: name,
      last_known_location: lastLocation,
      description,
      contact_phone: phone,
      status: 'open',
    });

    setStep('submitted');
    setLoading(false);
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-[env(safe-area-inset-top)] pb-8 min-h-screen flex flex-col">
      <div className="flex items-center gap-3 py-4">
        <button onClick={() => step === 'info' ? router.push('/c') : setStep('info')} className="text-sos-gray-500 hover:text-sos-blue-800">← Back</button>
        <h1 className="text-base font-bold text-sos-blue-800">Find Someone</h1>
      </div>

      <div className="flex-1">
        {step === 'info' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sos-blue-800 mb-4">Who are you looking for?</h2>
            <div>
              <label className="text-xs font-medium text-sos-gray-600">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-sos-gray-600">Last known location</label>
              <input type="text" value={lastLocation} onChange={e => setLastLocation(e.target.value)} placeholder="Address, neighborhood, or landmark"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-sos-gray-600">Your contact phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
            </div>
            <button onClick={() => setStep('details')} disabled={!name} className="w-full py-3.5 rounded-xl bg-sos-blue-800 text-white font-bold disabled:opacity-40 transition-colors">Continue</button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sos-blue-800 mb-4">Any additional details?</h2>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Physical description, medical conditions, where they might go, who they're with..."
              rows={5} className="w-full px-4 py-3 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 resize-none focus:outline-none focus:border-sos-accent-400" />
            <div className="bg-sos-accent-50 border border-sos-accent-200 rounded-xl p-4">
              <p className="text-xs text-sos-blue-800"><strong>Privacy note:</strong> We&apos;ll cross-reference against intake records (anonymized). If we find a potential match, both parties must consent before any information is shared.</p>
            </div>
            <button onClick={handleSubmit} disabled={loading} className="w-full py-3.5 rounded-xl bg-sos-blue-800 text-white font-bold disabled:opacity-40 transition-colors">
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        )}

        {step === 'submitted' && (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-sos-accent-50 flex items-center justify-center mb-4"><span className="text-3xl">🔍</span></div>
            <h2 className="text-xl font-bold text-sos-blue-800 mb-2">Report submitted</h2>
            <p className="text-sm text-sos-gray-600 max-w-xs">We&apos;re searching our records. If we find a potential match, we&apos;ll text you at {phone}. This may require consent from both parties.</p>
            <button onClick={() => router.push('/c')} className="mt-6 px-6 py-3 rounded-xl bg-sos-blue-800 text-white font-bold transition-colors">Back to home</button>
          </div>
        )}
      </div>
    </div>
  );
}
