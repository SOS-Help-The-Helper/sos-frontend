'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ShiftStatus = 'on_shift' | 'available' | 'off_shift';

export default function EmsStatus() {
  const router = useRouter();
  const [status, setStatus] = useState<ShiftStatus>('off_shift');

  const statuses: { id: ShiftStatus; icon: string; label: string; desc: string; color: string }[] = [
    { id: 'on_shift', icon: '🟢', label: 'On Shift', desc: 'Actively responding to calls', color: 'border-green-500 bg-green-500/10' },
    { id: 'available', icon: '🟡', label: 'Available', desc: 'On standby, can be dispatched', color: 'border-yellow-500 bg-yellow-500/10' },
    { id: 'off_shift', icon: '⚫', label: 'Off Shift', desc: 'Not currently available', color: 'border-white/20 bg-white/5' },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 pt-[env(safe-area-inset-top)] pb-8 min-h-screen">
      <div className="flex items-center gap-3 py-4">
        <button onClick={() => router.push('/ems/sitrep')} className="text-white/40 hover:text-white text-sm">← Sitrep</button>
        <h1 className="text-sm font-bold">Shift Status</h1>
      </div>

      <div className="space-y-3">
        {statuses.map(s => (
          <button
            key={s.id}
            onClick={() => setStatus(s.id)}
            className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-colors ${
              status === s.id ? s.color : 'border-white/10 bg-white/5'
            }`}
          >
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-base font-bold">{s.label}</p>
              <p className="text-xs text-white/50">{s.desc}</p>
            </div>
            {status === s.id && <span className="ml-auto text-sos-accent-400">●</span>}
          </button>
        ))}
      </div>

      <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-2">Today&apos;s Activity</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-xl font-bold">0</p><p className="text-[10px] text-white/40">Sitreps</p></div>
          <div><p className="text-xl font-bold">0</p><p className="text-[10px] text-white/40">Verified</p></div>
          <div><p className="text-xl font-bold">0h</p><p className="text-[10px] text-white/40">On Shift</p></div>
        </div>
      </div>
    </div>
  );
}
