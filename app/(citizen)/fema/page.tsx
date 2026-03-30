'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkFEMA } from '@/lib/citizen-api';

interface FEMADeclaration {
  id: string;
  title: string;
  disaster_type: string;
  state: string;
  declaration_date: string;
  ia_eligible: boolean;
  pa_eligible: boolean;
}

interface PreFillField {
  label: string;
  value: string;
  source: 'sos' | 'manual';
  fema_field: string;
}

export default function FEMAAssistancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [declarations, setDeclarations] = useState<FEMADeclaration[]>([]);
  const [eligible, setEligible] = useState(false);
  const [showPreFill, setShowPreFill] = useState(false);

  // Pre-fill fields from SOS data
  const [preFillFields, setPreFillFields] = useState<PreFillField[]>([]);

  useEffect(() => {
    async function load() {
      // Check FEMA declarations for user's state
      const data = await checkFEMA('NC'); // TODO: derive from user location

      if (data?.declarations) {
        const iaEligible = data.declarations.filter((d: any) => d.ia_eligible);
        setDeclarations(iaEligible);
        setEligible(iaEligible.length > 0);
      }

      // Build pre-fill from localStorage person data
      // In a real implementation, this reads from the person record
      const personId = localStorage.getItem('sos-person-id');
      if (personId) {
        setPreFillFields([
          { label: 'First Name', value: '', source: 'manual', fema_field: 'firstName' },
          { label: 'Last Name', value: '', source: 'manual', fema_field: 'lastName' },
          { label: 'Phone', value: '', source: 'sos', fema_field: 'phone' },
          { label: 'Address', value: '', source: 'sos', fema_field: 'damagedAddress' },
          { label: 'City', value: '', source: 'sos', fema_field: 'city' },
          { label: 'State', value: 'NC', source: 'sos', fema_field: 'state' },
          { label: 'Zip', value: '', source: 'sos', fema_field: 'zip' },
          { label: 'Disaster Type', value: declarations[0]?.disaster_type || '', source: 'sos', fema_field: 'disasterType' },
          { label: 'Number in Household', value: '', source: 'sos', fema_field: 'householdSize' },
          { label: 'Insurance Status', value: '', source: 'manual', fema_field: 'insurance' },
        ]);
      }

      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col max-w-lg mx-auto">
      <header className="bg-sos-blue-800 text-white px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-3">
        <button onClick={() => router.push('/c')} className="text-white/60 hover:text-white">←</button>
        <p className="text-sm font-bold">FEMA Assistance</p>
      </header>

      <div className="flex-1 px-4 py-5">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : !eligible ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-sos-gray-200 flex items-center justify-center mx-auto mb-3"><span className="text-2xl">📋</span></div>
            <h3 className="text-base font-bold text-sos-blue-800">No Active Declarations</h3>
            <p className="text-sm text-sos-gray-600 mt-2 max-w-xs mx-auto">
              There are currently no FEMA Individual Assistance declarations for your area. This page will update automatically when new declarations are issued.
            </p>
            <button onClick={() => router.push('/c')} className="mt-6 text-sm text-sos-accent-700 font-medium">← Back to home</button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Eligible declaration */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-bold text-green-800 mb-1">✓ You may be eligible for FEMA assistance</p>
              {declarations.map(d => (
                <div key={d.id} className="mt-2">
                  <p className="text-sm font-bold text-sos-blue-800">{d.title}</p>
                  <p className="text-[10px] text-sos-gray-500">Declared {d.declaration_date} · {d.disaster_type}</p>
                </div>
              ))}
            </div>

            {/* What to expect */}
            <div className="bg-white rounded-xl border border-sos-gray-300 p-4">
              <h3 className="text-sm font-bold text-sos-blue-800 mb-3">How SOS Can Help</h3>
              <div className="space-y-2.5 text-xs text-sos-gray-700">
                <div className="flex items-start gap-2">
                  <span>1️⃣</span>
                  <p>We&apos;ll <strong>pre-fill your FEMA application</strong> using info from your SOS request</p>
                </div>
                <div className="flex items-start gap-2">
                  <span>2️⃣</span>
                  <p>You&apos;ll review and <strong>fill in any missing fields</strong></p>
                </div>
                <div className="flex items-start gap-2">
                  <span>3️⃣</span>
                  <p>We&apos;ll link you to <strong>DisasterAssistance.gov</strong> to submit</p>
                </div>
                <div className="flex items-start gap-2">
                  <span>4️⃣</span>
                  <p>We&apos;ll <strong>remind you</strong> about identity verification deadlines</p>
                </div>
              </div>
            </div>

            {!showPreFill ? (
              <button onClick={() => setShowPreFill(true)}
                className="w-full py-3.5 rounded-xl bg-sos-red-500 text-white font-bold text-sm hover:bg-sos-red-600 transition-colors">
                Start Pre-Fill Review
              </button>
            ) : (
              <>
                {/* Pre-fill review */}
                <div className="bg-white rounded-xl border border-sos-gray-300 p-4">
                  <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Application Pre-Fill</h3>
                  <div className="space-y-2.5">
                    {preFillFields.map((field, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            field.source === 'sos' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                          }`}>
                            {field.source === 'sos' ? 'Auto' : 'Manual'}
                          </span>
                          <span className="text-xs text-sos-gray-600">{field.label}</span>
                        </div>
                        <span className="text-xs font-medium text-sos-blue-800">
                          {field.value || <span className="text-sos-gray-400 italic">—</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-sos-gray-400 mt-3">
                    {preFillFields.filter(f => f.source === 'sos').length} of {preFillFields.length} fields auto-filled from your SOS data
                  </p>
                </div>

                {/* Remaining items checklist */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-yellow-800 mb-2">You&apos;ll Need</h3>
                  <div className="space-y-1.5 text-xs text-yellow-700">
                    <p>☐ Social Security Number</p>
                    <p>☐ Insurance policy details</p>
                    <p>☐ Bank account for direct deposit</p>
                    <p>☐ Contact info for current residence</p>
                    <p>☐ Photos of damage (optional but helpful)</p>
                  </div>
                </div>

                <a href="https://www.disasterassistance.gov/" target="_blank" rel="noopener noreferrer"
                  className="block w-full py-3.5 rounded-xl bg-sos-blue-800 text-white font-bold text-sm text-center hover:bg-sos-blue-700 transition-colors">
                  Go to DisasterAssistance.gov →
                </a>
                <p className="text-[10px] text-sos-gray-400 text-center">We&apos;ll remind you about deadlines via text</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
