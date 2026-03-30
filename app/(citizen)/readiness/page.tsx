'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSOSScore, type SOSScore } from '@/lib/citizen-api';
import { supabase } from '@/lib/supabase-client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface ReadinessItem {
  id: string;
  icon: string;
  label: string;
  desc: string;
  points: number;
  field: string; // persons column or score_data key
}

const READINESS_ITEMS: ReadinessItem[] = [
  { id: 'contact1', icon: '📱', label: 'Emergency Contact #1', desc: 'Add your primary emergency contact', points: 10, field: 'emergency_contact_1' },
  { id: 'contact2', icon: '📱', label: 'Emergency Contact #2', desc: 'Add a backup contact', points: 5, field: 'emergency_contact_2' },
  { id: 'evacuation', icon: '🗺️', label: 'Evacuation Route', desc: 'Save your primary exit route', points: 10, field: 'evacuation_route' },
  { id: 'gobag', icon: '🎒', label: 'Go-Bag Checklist', desc: 'Water, meds, docs, charger, cash', points: 5, field: 'go_bag' },
  { id: 'location', icon: '📍', label: 'Home Location', desc: 'Set your location for risk monitoring', points: 3, field: 'location_set' },
  { id: 'risk', icon: '🌊', label: 'View Risk Profile', desc: 'Know your flood/fire/wind risks', points: 2, field: 'risk_viewed' },
  { id: 'petplan', icon: '🐕', label: 'Pet Plan', desc: 'Where will pets go?', points: 3, field: 'pet_plan' },
  { id: 'insurance', icon: '📄', label: 'Insurance Info', desc: 'Upload or save your policy info', points: 2, field: 'insurance_reviewed' },
];

export default function ReadinessWizard() {
  const router = useRouter();
  const [score, setScore] = useState<SOSScore | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [animatingItem, setAnimatingItem] = useState<string | null>(null);
  const personId = typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : null;

  useEffect(() => {
    if (!personId) { setLoading(false); return; }
    getSOSScore(personId).then(s => {
      setScore(s);
      setChecklist(s?.checklist || {});
      setLoading(false);
    });
  }, [personId]);

  async function toggleItem(item: ReadinessItem) {
    if (!personId) return;
    const newState = !checklist[item.id];
    setChecklist(prev => ({ ...prev, [item.id]: newState }));
    setAnimatingItem(item.id);

    // Call score-compute EF to update score
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/score-compute`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: personId, action: newState ? 'complete' : 'uncomplete', item_id: item.id }),
      });
      if (res.ok) {
        const updated = await res.json();
        setScore(updated);
      }
    } catch { /* offline — local state updated, will sync later */ }

    setTimeout(() => setAnimatingItem(null), 600);
  }

  const readinessScore = score?.readiness || 0;
  const totalScore = score?.total || 0;
  const completedCount = Object.values(checklist).filter(Boolean).length;
  const pct = 40 > 0 ? readinessScore / 40 : 0;
  const ringColor = pct >= 0.7 ? '#22C55E' : pct >= 0.4 ? '#89CFF0' : '#EF4E4B';

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col max-w-lg mx-auto">
      <header className="bg-sos-blue-800 text-white px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-3">
        <button onClick={() => router.push('/c')} className="text-white/60 hover:text-white">←</button>
        <p className="text-sm font-bold">Readiness</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="flex-1 px-4 py-5 space-y-4">
          {/* Score hero */}
          <div className="bg-white rounded-xl border border-sos-gray-300 p-5 flex items-center gap-5">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#E8E8E8" strokeWidth="8" />
                <circle cx="50" cy="50" r="38" fill="none" stroke={ringColor} strokeWidth="8"
                  strokeDasharray={`${pct * 238.76} ${238.76 - pct * 238.76}`} strokeLinecap="round"
                  className="transition-all duration-500" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-sos-blue-800">{totalScore}</span>
                <span className="text-[9px] text-sos-gray-500">SOS Score</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-sos-blue-800">🛡️ Readiness: {readinessScore}/40</p>
              <p className="text-xs text-sos-gray-600 mt-1">{completedCount} of {READINESS_ITEMS.length} tasks complete</p>
              {score?.next_action && (
                <p className="text-[10px] text-sos-accent-700 mt-2 font-medium">
                  Next: {score.next_action} (+{score.next_points})
                </p>
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {READINESS_ITEMS.map(item => {
              const done = checklist[item.id];
              const isAnimating = animatingItem === item.id;
              return (
                <button key={item.id} onClick={() => toggleItem(item)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                    done ? 'bg-green-50 border-green-200' : 'bg-white border-sos-gray-300'
                  } ${isAnimating ? 'scale-[1.02] shadow-md' : ''}`}>
                  <span className="text-lg flex-shrink-0">{done ? '✅' : item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${done ? 'text-green-800 line-through' : 'text-sos-blue-800'}`}>{item.label}</p>
                    <p className="text-[10px] text-sos-gray-500">{item.desc}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    done ? 'bg-green-100 text-green-700' : 'bg-sos-gray-200 text-sos-gray-500'
                  }`}>
                    {done ? '✓' : `+${item.points}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
