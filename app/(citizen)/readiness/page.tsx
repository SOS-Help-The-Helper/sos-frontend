'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ReadinessItem {
  id: string;
  icon: string;
  label: string;
  description: string;
  complete: boolean;
  points: number;
}

const READINESS_ITEMS: ReadinessItem[] = [
  { id: 'contacts', icon: '📱', label: 'Emergency Contacts', description: 'Add 3 emergency contacts', complete: false, points: 15 },
  { id: 'evacuation', icon: '🗺️', label: 'Evacuation Route', description: 'Save your primary exit route', complete: false, points: 20 },
  { id: 'gobag', icon: '🎒', label: 'Go-Bag Checklist', description: 'Pack essentials: water, meds, docs', complete: false, points: 15 },
  { id: 'petplan', icon: '🐕', label: 'Pet Plan', description: 'Where will pets go? Who can help?', complete: false, points: 10 },
  { id: 'location', icon: '📍', label: 'Home Location', description: 'Set your home for risk monitoring', complete: false, points: 10 },
  { id: 'insurance', icon: '📄', label: 'Insurance Info', description: 'Upload or photograph your policy', complete: false, points: 10 },
  { id: 'skills', icon: '💪', label: 'Skills & Resources', description: 'What can you offer others?', complete: false, points: 10 },
  { id: 'neighbors', icon: '👋', label: 'Know Your Neighbors', description: 'Connect with 3 nearby members', complete: false, points: 10 },
];

export default function ReadinessPage() {
  const router = useRouter();
  const [items, setItems] = useState(READINESS_ITEMS);

  const totalPoints = items.reduce((sum, i) => sum + i.points, 0);
  const earnedPoints = items.filter(i => i.complete).reduce((sum, i) => sum + i.points, 0);
  const score = Math.round((earnedPoints / totalPoints) * 100);
  const completed = items.filter(i => i.complete).length;

  function toggle(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, complete: !i.complete } : i));
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-[env(safe-area-inset-top)] pb-8 min-h-screen">
      <div className="flex items-center gap-3 py-4">
        <button onClick={() => router.push('/c')} className="text-sos-gray-500 hover:text-sos-blue-800">← Back</button>
        <h1 className="text-base font-bold text-sos-blue-800">Readiness Score</h1>
      </div>

      {/* Score hero */}
      <div className="bg-white rounded-2xl border border-sos-gray-300 p-6 text-center mb-6">
        <div className="relative w-28 h-28 mx-auto mb-3">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#E8E8E8" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={score >= 70 ? '#00C758' : score >= 40 ? '#89CFF0' : '#EF4E4B'} strokeWidth="8"
              strokeDasharray={`${score * 2.64} ${264 - score * 2.64}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-sos-blue-800">{score}</span>
          </div>
        </div>
        <p className="text-sm font-medium text-sos-blue-800">{completed} of {items.length} tasks complete</p>
        <p className="text-xs text-sos-gray-500 mt-1">
          {score >= 70 ? 'Great! You\'re well prepared.' : score >= 40 ? 'Getting there — keep going!' : 'Let\'s improve your readiness.'}
        </p>
      </div>

      {/* Community score */}
      <div className="bg-sos-accent-50 border border-sos-accent-200 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-sos-gray-600 uppercase tracking-wider">Community Readiness</p>
            <p className="text-lg font-bold text-sos-blue-800 mt-0.5">68/100</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-sos-gray-500">340 members</p>
            <p className="text-xs text-sos-gray-500">12 active helpers</p>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <h2 className="text-xs font-bold text-sos-gray-600 uppercase tracking-wider mb-3 px-1">Your Checklist</h2>
      <div className="space-y-2">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
              item.complete ? 'bg-green-50 border-green-200' : 'bg-white border-sos-gray-300'
            }`}
          >
            <span className="text-lg flex-shrink-0">{item.complete ? '✅' : item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.complete ? 'text-green-800 line-through' : 'text-sos-blue-800'}`}>{item.label}</p>
              <p className="text-xs text-sos-gray-500">{item.description}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              item.complete ? 'bg-green-100 text-green-700' : 'bg-sos-gray-200 text-sos-gray-500'
            }`}>+{item.points}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
