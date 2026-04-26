'use client';

import { useState } from 'react';

export function ScoreDisplay({ data }: { data: any }) {
  const s = data.score || data;
  const total = s.total || 0;
  const pct = total / 100;
  const color = pct >= 0.7 ? '#22C55E' : pct >= 0.4 ? '#89CFF0' : '#EF4E4B';

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${pct * 238.76} ${238.76 - pct * 238.76}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{total}</span>
        </div>
      </div>
      <div className="flex-1 space-y-1">
        {[{ l: '🛡️', v: s.readiness || 0, m: 40 }, { l: '🤝', v: s.community || 0, m: 30 }, { l: '⭐', v: s.impact || 0, m: 30 }].map(p => (
          <div key={p.l} className="flex items-center gap-1.5">
            <span className="text-[9px] w-8">{p.l} {p.v}</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full"><div className="h-full rounded-full bg-white/40" style={{ width: `${(p.v / p.m) * 100}%` }} /></div>
          </div>
        ))}
        {s.next_action && <p className="text-[9px] text-sos-red-400">Next: {s.next_action}</p>}
      </div>
    </div>
  );
}


export function PhoneInput({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');


export function PhotoCapture({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  return (
    <div>
      {data.prompt && <p className="text-xs text-white/60 mb-2">{data.prompt}</p>}
      <label className="block w-full py-4 rounded-xl border border-dashed border-white/20 text-center cursor-pointer hover:border-white/40 transition-colors">
        <span className="text-2xl block mb-1">📸</span>
        <span className="text-xs text-white/50">Tap to take a photo</span>
        <input type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(`[Photo captured: ${file.name}]`);
          }} />
      </label>
    </div>
  );
}


export function FEMACard({ data }: { data: any }) {
  const declarations: any[] = data.declarations || [];
  const programs: string[] = data.programsAvailable || [];
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-white">FEMA Assistance</p>
        {data.state && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/50">{data.state}</span>}
      </div>
      <p className="text-[10px] text-white/50">
        {declarations.length} active declaration{declarations.length !== 1 ? 's' : ''}
      </p>
      {declarations.length > 0 && (
        <ul className="space-y-0.5">
          {declarations.map((d: any, i: number) => (
            <li key={i} className="text-[10px] text-white/60 truncate">• {d.title || d.name || d.id || JSON.stringify(d)}</li>
          ))}
        </ul>
      )}
      {programs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {programs.map((p: string) => (
            <span key={p} className="text-[9px] px-1.5 py-0.5 rounded-full bg-sos-accent-500/20 text-sos-accent-400">{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}


export function ReferralCard({ data }: { data: any }) {
  const shareUrl = `https://sosconnect.org/join?ref=${data.code || ''}`;

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: 'Join SOS Connect', text: 'Be prepared. Help your neighbors.', url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <p className="text-xs font-bold text-white mb-1">🤝 Invite Neighbors</p>
      <code className="text-[10px] text-sos-accent-400 block bg-white/5 px-2 py-1 rounded mb-2 truncate">{shareUrl}</code>
      <button onClick={handleShare}
        className="w-full py-2 rounded-lg bg-sos-red-500 text-white text-xs font-bold active:scale-[0.97]">
        📤 Share Invite
      </button>
      {data.stats && (
        <p className="text-[9px] text-white/30 mt-1 text-center">{data.stats.invited || 0} invited · {data.stats.signed_up || 0} joined</p>
      )}
    </div>
  );
}

// ── Toggle Chip Wrapper (stateful multi-select) ──

