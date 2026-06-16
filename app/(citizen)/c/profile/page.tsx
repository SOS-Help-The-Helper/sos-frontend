'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CitizenShell } from '@/components/citizen-shell';
import { SOSBottomSheet } from '@/components/sos-bottom-sheet';
import type { SOSScore } from '@/lib/citizen-api';
import { api } from '@/lib/api';
import { getPersonId, clearPersonId } from '@/lib/person-cookie';
import { NotificationSettings } from '@/components/notification-settings';

const READINESS_ITEMS = [
  { id: 'contact1', icon: '📱', label: 'Emergency Contact #1', points: 10 },
  { id: 'contact2', icon: '📱', label: 'Emergency Contact #2', points: 5 },
  { id: 'evacuation', icon: '🗺️', label: 'Evacuation Route', points: 10 },
  { id: 'gobag', icon: '🎒', label: 'Go-Bag Checklist', points: 5 },
  { id: 'location', icon: '📍', label: 'Home Location', points: 3 },
  { id: 'risk', icon: '🌊', label: 'Risk Profile', points: 2 },
  { id: 'petplan', icon: '🐕', label: 'Pet Plan', points: 3 },
  { id: 'insurance', icon: '📄', label: 'Insurance Info', points: 2 },
];

export default function ProfilePage() {
  const router = useRouter();
  const [score, setScore] = useState<SOSScore | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const personId = typeof window !== 'undefined' ? getPersonId() : null;

  async function loadProfile() {
    setLoading(true);
    setError(false);
    try {
      if (personId) {
        const [scoreData, matchData, reportData] = await Promise.all([
          api.getScore(personId) as Promise<SOSScore>,
          api.efCall<unknown[]>('sos-read', { actor: { type: 'citizen', id: personId }, scope: 'my_records', include: ['matches'] }),
          api.efCall<unknown[]>('sos-read', { actor: { type: 'citizen', id: personId }, scope: 'my_records', include: ['community_messages'], filters: { message_type: 'report' } }),
        ]);
        setScore(scoreData);
        setMatchCount(Array.isArray(matchData) ? matchData.length : 0);
        setReportCount(Array.isArray(reportData) ? reportData.length : 0);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [personId]);

  const checklist = score?.checklist || {};
  const pct = score ? score.total / 100 : 0;
  const ringColor = pct >= 0.7 ? '#22C55E' : pct >= 0.4 ? '#89CFF0' : '#EF4E4B';

  return (
    <CitizenShell onSOSTap={() => setSheetOpen(true)} hideSOSButton={sheetOpen}>
      <div className="on-dark flex flex-col h-full pb-[calc(56px+env(safe-area-inset-bottom,0px))] overflow-y-auto bg-[#0F1E2B]">
        {/* Header */}
        <div className="bg-[#1A3850] px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
          <h1 className="text-sm font-bold text-white">👤 Profile</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm font-bold text-white">Something went wrong</p>
            <button onClick={loadProfile} className="text-xs text-sos-accent-500 underline">Tap to retry</button>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {/* SOS Score */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke={ringColor} strokeWidth="8"
                    strokeDasharray={`${pct * 238.76} ${238.76 - pct * 238.76}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{score?.total || 0}</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white mb-2">SOS Score</p>
                <div className="space-y-1.5">
                  {[
                    { icon: '🛡️', label: 'Readiness', v: score?.readiness || 0, max: 40, color: '#22C55E' },
                    { icon: '🤝', label: 'Community', v: score?.community || 0, max: 30, color: '#89CFF0' },
                    { icon: '⭐', label: 'Impact', v: score?.impact || 0, max: 30, color: '#EDB200' },
                  ].map(p => (
                    <div key={p.label} className="flex items-center gap-2">
                      <span className="text-[10px] w-12">{p.icon} {p.v}/{p.max}</span>
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(p.v / p.max) * 100}%`, backgroundColor: p.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                {score?.next_action && (
                  <button onClick={() => router.push(`/c/agent?q=${encodeURIComponent(score.next_action)}`)}
                    className="text-[10px] text-sos-red-400 font-medium mt-2">
                    Next: {score.next_action} (+{score.next_points}) →
                  </button>
                )}
              </div>
            </div>

            {/* Readiness checklist */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs font-bold text-white mb-3">🛡️ Readiness Checklist</p>
              <div className="space-y-1.5">
                {READINESS_ITEMS.map(item => {
                  const done = checklist[item.id];
                  return (
                    <button key={item.id}
                      onClick={() => { if (!done) router.push(`/c/agent?q=${encodeURIComponent(`Help me with ${item.label.toLowerCase()}`)}`); }}
                      className="w-full flex items-center gap-2 py-1.5 text-left">
                      <span className="text-sm">{done ? '✅' : item.icon}</span>
                      <span className={`text-xs flex-1 ${done ? 'text-white/40 line-through' : 'text-white/80'}`}>{item.label}</span>
                      {!done && <span className="text-[9px] text-sos-red-400">+{item.points} →</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => router.push('/matches')}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-white">{matchCount}</p>
                <p className="text-[10px] text-white/40">My Matches</p>
              </button>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-white">{reportCount}</p>
                <p className="text-[10px] text-white/40">My Reports</p>
              </div>
            </div>

            {/* Notification settings */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs font-bold text-white mb-1">🔔 Notifications</p>
              <p className="text-[11px] text-white/45 mb-2">How SOS reaches you about matches and alerts.</p>
              <NotificationSettings scope="citizen" recipientId={personId} />
            </div>

            {/* Links */}
            <div className="space-y-1.5">
              {[
                { label: '🤝 Invite Neighbors', href: '/invite' },
                { label: '🏆 Leaderboard', href: '/leaderboard' },
                { label: '⚙️ Settings', href: '/auth' },
              ].map(link => (
                <button key={link.href} onClick={() => router.push(link.href)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 hover:bg-white/10 transition-colors">
                  <span>{link.label}</span>
                  <span className="text-white/30">→</span>
                </button>
              ))}
            </div>

            {/* Sign out */}
            {personId && (
              <button onClick={() => { clearPersonId(); router.push('/auth'); }}
                className="w-full text-center text-[10px] text-white/20 hover:text-white/40 py-2">
                Sign out
              </button>
            )}
          </div>
        )}
      </div>

      <SOSBottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} context="profile" />
    </CitizenShell>
  );
}
