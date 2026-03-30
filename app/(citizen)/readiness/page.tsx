'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSOSScore, type SOSScore } from '@/lib/citizen-api';

interface ReadinessItem {
  id: string;
  icon: string;
  label: string;
  points: number;
  agentPrompt: string; // what the agent will ask
}

const READINESS_ITEMS: ReadinessItem[] = [
  { id: 'contact1', icon: '📱', label: 'Emergency Contact #1', points: 10, agentPrompt: 'Help me add an emergency contact' },
  { id: 'contact2', icon: '📱', label: 'Emergency Contact #2', points: 5, agentPrompt: 'Add a second emergency contact' },
  { id: 'evacuation', icon: '🗺️', label: 'Evacuation Route', points: 10, agentPrompt: 'Help me set up my evacuation route' },
  { id: 'gobag', icon: '🎒', label: 'Go-Bag Checklist', points: 5, agentPrompt: 'Walk me through a go-bag checklist' },
  { id: 'location', icon: '📍', label: 'Home Location', points: 3, agentPrompt: 'Set my home location for risk monitoring' },
  { id: 'risk', icon: '🌊', label: 'Risk Profile', points: 2, agentPrompt: 'What are my flood and fire risks?' },
  { id: 'petplan', icon: '🐕', label: 'Pet Plan', points: 3, agentPrompt: 'Help me make a plan for my pets' },
  { id: 'insurance', icon: '📄', label: 'Insurance Info', points: 2, agentPrompt: 'Help me save my insurance information' },
];

export default function ReadinessPage() {
  const router = useRouter();
  const [score, setScore] = useState<SOSScore | null>(null);
  const [loading, setLoading] = useState(true);
  const personId = typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : null;

  useEffect(() => {
    if (!personId) { setLoading(false); return; }
    getSOSScore(personId).then(s => { setScore(s); setLoading(false); });
  }, [personId]);

  const checklist = score?.checklist || {};
  const readiness = score?.readiness || 0;
  const total = score?.total || 0;
  const completedCount = READINESS_ITEMS.filter(i => checklist[i.id]).length;
  const pct = readiness / 40;
  const ringColor = pct >= 0.7 ? '#22C55E' : pct >= 0.4 ? '#89CFF0' : '#EF4E4B';

  // Navigate to agent chat with the readiness prompt pre-loaded
  function startWithAgent(prompt: string) {
    router.push(`/chat?q=${encodeURIComponent(prompt)}`);
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col max-w-lg mx-auto">
      <header className="bg-sos-blue-800 text-white px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-3">
        <button onClick={() => router.push('/c')} className="text-white/60 hover:text-white">←</button>
        <p className="text-sm font-bold">Your Readiness</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="flex-1 px-4 py-5 space-y-4">
          {/* Score display */}
          <div className="bg-white rounded-xl border border-sos-gray-300 p-5 flex items-center gap-5">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#E8E8E8" strokeWidth="8" />
                <circle cx="50" cy="50" r="38" fill="none" stroke={ringColor} strokeWidth="8"
                  strokeDasharray={`${pct * 238.76} ${238.76 - pct * 238.76}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-sos-blue-800">{total}</span>
                <span className="text-[9px] text-sos-gray-500">SOS Score</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-sos-blue-800">🛡️ Readiness: {readiness}/40</p>
              <p className="text-xs text-sos-gray-600 mt-1">{completedCount} of {READINESS_ITEMS.length} complete</p>
              {score?.next_action && (
                <button onClick={() => startWithAgent(score.next_action)}
                  className="mt-2 text-[10px] text-sos-accent-700 font-medium bg-sos-accent-50 px-2.5 py-1 rounded-full">
                  Next: {score.next_action} (+{score.next_points}) →
                </button>
              )}
            </div>
          </div>

          {/* Pillar breakdown */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: '🛡️', label: 'Readiness', value: score?.readiness || 0, max: 40, color: '#22C55E' },
              { icon: '🤝', label: 'Community', value: score?.community || 0, max: 30, color: '#89CFF0' },
              { icon: '⭐', label: 'Impact', value: score?.impact || 0, max: 30, color: '#EDB200' },
            ].map(p => (
              <div key={p.label} className="bg-white rounded-xl border border-sos-gray-300 p-3 text-center">
                <span className="text-lg">{p.icon}</span>
                <div className="h-1.5 bg-sos-gray-200 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p.max > 0 ? (p.value / p.max) * 100 : 0}%`, backgroundColor: p.color }} />
                </div>
                <p className="text-[10px] text-sos-gray-600 mt-1">{p.value}/{p.max}</p>
                <p className="text-[9px] text-sos-gray-400">{p.label}</p>
              </div>
            ))}
          </div>

          {/* Checklist — tap any incomplete item to start agent conversation */}
          <div>
            <p className="text-[10px] font-bold text-sos-gray-500 uppercase tracking-wider mb-2 px-1">Your Checklist</p>
            <div className="space-y-1.5">
              {READINESS_ITEMS.map(item => {
                const done = checklist[item.id];
                return (
                  <button key={item.id}
                    onClick={() => { if (!done) startWithAgent(item.agentPrompt); }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      done ? 'bg-green-50 border-green-200' : 'bg-white border-sos-gray-300 hover:border-sos-accent-300 hover:shadow-sm'
                    }`}>
                    <span className="text-lg flex-shrink-0">{done ? '✅' : item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'text-green-800 line-through' : 'text-sos-blue-800'}`}>{item.label}</p>
                    </div>
                    {done ? (
                      <span className="text-[10px] font-bold text-green-600 flex-shrink-0">Done</span>
                    ) : (
                      <span className="text-[10px] font-bold text-sos-accent-700 bg-sos-accent-50 px-2 py-0.5 rounded-full flex-shrink-0">
                        +{item.points} →
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CTA — general readiness conversation */}
          <button onClick={() => startWithAgent("Let's improve my readiness score")}
            className="w-full py-3.5 rounded-xl bg-sos-blue-800 text-white font-bold text-sm transition-colors hover:bg-sos-blue-700">
            💬 Talk to SOS About Readiness
          </button>
        </div>
      )}
    </div>
  );
}
