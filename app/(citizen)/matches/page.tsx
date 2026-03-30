'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

interface CitizenMatch {
  id: string;
  status: string;
  match_score: number;
  match_summary_masked: string;
  match_reasoning: string;
  created_at: string;
  connected_at: string | null;
  org_name?: string;
  category?: string;
  price_tier?: string;
  fulfillment_chain?: Array<{ role: string; name: string; org?: string }>;
}

const PRICE_TIER_ORDER: Record<string, number> = {
  free: 0, donated: 1, subsidized: 2, discounted: 3, market: 4, insured: 5,
};

const PRICE_TIER_BADGE: Record<string, { label: string; color: string }> = {
  free: { label: '🆓 Free', color: 'bg-green-100 text-green-700' },
  donated: { label: '🎁 Donated', color: 'bg-green-50 text-green-600' },
  subsidized: { label: '💚 Subsidized', color: 'bg-sos-accent-50 text-sos-accent-700' },
  discounted: { label: '💲 Discounted', color: 'bg-yellow-50 text-yellow-700' },
  market: { label: '💰 Market', color: 'bg-sos-gray-200 text-sos-gray-600' },
  insured: { label: '🛡️ Insured', color: 'bg-sos-blue-50 text-sos-blue-800' },
};

export default function CitizenMatches() {
  const router = useRouter();
  const [matches, setMatches] = useState<CitizenMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CitizenMatch | null>(null);

  useEffect(() => {
    const personId = localStorage.getItem('sos-person-id');
    if (!personId) { setLoading(false); return; }

    async function load() {
      const { data } = await supabase
        .from('matches')
        .select('id, status, match_score, match_summary_masked, match_reasoning, created_at, connected_at, price_tier, fulfillment_chain')
        .eq('person_id', personId)
        .order('created_at', { ascending: false });
      setMatches(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const statusColors: Record<string, string> = {
    proposed: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    connected: 'bg-green-50 text-green-700 border-green-200',
    fulfilled: 'bg-sos-accent-50 text-sos-accent-800 border-sos-accent-200',
    failed: 'bg-sos-gray-200 text-sos-gray-600 border-sos-gray-300',
  };

  async function handleAccept(matchId: string) {
    // Use consent-flow edge function (writes signal_trace, updates trust)
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/consent-flow`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ match_id: matchId, action: 'accept', channel: 'citizen_pwa' }),
      }
    );
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: 'connected', connected_at: new Date().toISOString() } : m));
    setSelected(null);
  }

  async function handleDecline(matchId: string) {
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/match-respond`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ match_id: matchId, action: 'decline', channel: 'citizen_pwa' }),
      }
    );
    setMatches(prev => prev.filter(m => m.id !== matchId));
    setSelected(null);
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-[env(safe-area-inset-top)] pb-8 min-h-screen">
      <div className="flex items-center gap-3 py-4">
        <button onClick={() => router.push('/c')} className="text-sos-gray-500 hover:text-sos-blue-800">← Back</button>
        <h1 className="text-base font-bold text-sos-blue-800">My Matches</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-sos-gray-200 flex items-center justify-center mx-auto mb-3"><span className="text-2xl">📭</span></div>
          <h3 className="text-base font-bold text-sos-blue-800">No matches yet</h3>
          <p className="text-sm text-sos-gray-600 mt-1">When we find help for you, it&apos;ll show up here. We&apos;ll also text you.</p>
          <button onClick={() => router.push('/help')} className="mt-4 px-5 py-2.5 rounded-xl bg-sos-red-500 text-white text-sm font-bold">Submit a request</button>
        </div>
      ) : (
        <div className="space-y-3">
          {[...matches].sort((a, b) => {
            // Sort by price tier: free first, then by score
            const tierA = PRICE_TIER_ORDER[a.price_tier || 'market'] ?? 5;
            const tierB = PRICE_TIER_ORDER[b.price_tier || 'market'] ?? 5;
            if (tierA !== tierB) return tierA - tierB;
            return (b.match_score || 0) - (a.match_score || 0);
          }).map(match => (
            <button
              key={match.id}
              onClick={() => setSelected(match)}
              className="w-full text-left bg-white rounded-xl border border-sos-gray-300 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[match.status] || statusColors.proposed}`}>
                  {match.status.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-sos-gray-400">
                  {new Date(match.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-sos-blue-800 leading-snug">{match.match_summary_masked || 'Match details'}</p>
              {/* Price tier + fulfillment chain */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {match.price_tier && PRICE_TIER_BADGE[match.price_tier] && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${PRICE_TIER_BADGE[match.price_tier].color}`}>
                    {PRICE_TIER_BADGE[match.price_tier].label}
                  </span>
                )}
                {match.fulfillment_chain?.map((c, i) => (
                  <span key={i} className="text-[9px] bg-sos-gray-200 text-sos-gray-600 px-1.5 py-0.5 rounded-full">
                    {c.role}: {c.name}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 flex-1 bg-sos-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-sos-accent-500 rounded-full" style={{ width: `${match.match_score}%` }} />
                </div>
                <span className="text-[10px] font-bold text-sos-blue-800">{match.match_score}%</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl p-6 pb-8 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-sos-gray-300 rounded-full mx-auto mb-4" />
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[selected.status] || statusColors.proposed}`}>
              {selected.status.replace(/_/g, ' ')}
            </span>
            <h3 className="text-base font-bold text-sos-blue-800 mt-3">{selected.match_summary_masked}</h3>
            {selected.match_reasoning && (
              <p className="text-sm text-sos-gray-600 mt-2">{selected.match_reasoning}</p>
            )}
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 bg-sos-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-sos-accent-500 rounded-full" style={{ width: `${selected.match_score}%` }} />
                </div>
                <span className="text-sm font-bold text-sos-blue-800">{selected.match_score}%</span>
              </div>
            </div>

            {selected.status === 'proposed' && (
              <div className="flex gap-3 mt-6">
                <button onClick={() => handleDecline(selected.id)} className="flex-1 py-3 rounded-xl border-2 border-sos-gray-300 text-sos-gray-600 font-bold text-sm">Decline</button>
                <button onClick={() => handleAccept(selected.id)} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm">Accept Help</button>
              </div>
            )}

            {selected.status === 'connected' && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-medium text-green-800">✓ Connected</p>
                <p className="text-xs text-green-600 mt-0.5">Your helper has been notified and is coordinating.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
