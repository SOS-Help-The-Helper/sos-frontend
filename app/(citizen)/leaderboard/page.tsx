'use client';
import { db } from '@/lib/api';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPersonId } from '@/lib/person-cookie';

interface LeaderboardEntry {
  id: string;
  sos_score: number;
  readiness_score: number;
  community_score: number;
  impact_score: number;
  rank: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const personId = typeof window !== 'undefined' ? getPersonId() : null;

  useEffect(() => {
    async function load() {
      // Location-scoped: get top scores near user
      // For now: top 20 globally (location scoping requires lat/lng on persons)
      const { data } = await supabase
        .from('persons')
        .select('id, sos_score, readiness_score, community_score, impact_score')
        .not('sos_score', 'is', null)
        .gt('sos_score', 0)
        .order('sos_score', { ascending: false })
        .limit(20);

      const ranked = (data || []).map((e, i) => ({ ...e, rank: i + 1 }));
      setEntries(ranked);

      // Find my rank
      if (personId) {
        const me = ranked.find(e => e.id === personId);
        if (me) { setMyRank(me.rank); setMyScore(me.sos_score); }
        else {
          // Not in top 20 — get my score
          const { data: myData } = await db.from('persons').select('sos_score').eq('id', personId).single();
          if (myData?.sos_score) {
            setMyScore(myData.sos_score);
            const { count } = await db.from('persons').select('id', { count: 'exact', head: true }).gt('sos_score', myData.sos_score);
            setMyRank((count || 0) + 1);
          }
        }
      }

      setLoading(false);
    }
    load();
  }, [personId]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col max-w-lg mx-auto">
      <header className="bg-sos-blue-800 text-white px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-3">
        <button onClick={() => router.push('/c')} className="text-white/60 hover:text-white">←</button>
        <p className="text-sm font-bold">🏆 Neighborhood Leaderboard</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="flex-1 px-4 py-5 space-y-4">
          {/* My position */}
          {myRank && (
            <div className="bg-sos-blue-800 text-white rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-white/50">Your Rank</p>
                <p className="text-2xl font-bold">#{myRank}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50">SOS Score</p>
                <p className="text-2xl font-bold">{myScore}</p>
              </div>
            </div>
          )}

          {/* Top entries */}
          <div className="space-y-1.5">
            {entries.map(entry => {
              const isMe = entry.id === personId;
              return (
                <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                  isMe ? 'bg-sos-accent-50 border-sos-accent-300' : 'bg-white border-sos-gray-300'
                }`}>
                  <span className="text-lg w-8 text-center flex-shrink-0">
                    {entry.rank <= 3 ? medals[entry.rank - 1] : <span className="text-xs font-bold text-sos-gray-400">#{entry.rank}</span>}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-sos-blue-800">{isMe ? 'You' : `Member #${entry.rank}`}</span>
                      {isMe && <span className="text-[9px] bg-sos-accent-500 text-white px-1.5 py-0.5 rounded-full font-bold">YOU</span>}
                    </div>
                    <div className="flex gap-2 mt-1 text-[9px] text-sos-gray-500">
                      <span>🛡️ {entry.readiness_score || 0}</span>
                      <span>🤝 {entry.community_score || 0}</span>
                      <span>⭐ {entry.impact_score || 0}</span>
                    </div>
                  </div>
                  <span className="text-base font-bold text-sos-blue-800">{entry.sos_score}</span>
                </div>
              );
            })}
            {entries.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-sos-gray-600">No scores yet. Be the first to improve your readiness!</p>
              </div>
            )}
          </div>

          {/* CTA */}
          <button onClick={() => router.push('/readiness')}
            className="w-full py-3.5 rounded-xl bg-sos-blue-800 text-white font-bold text-sm transition-colors">
            Improve Your Score →
          </button>
        </div>
      )}
    </div>
  );
}
