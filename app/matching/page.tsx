'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { SwipeCard } from '@/components/swipe-card';
import { MatchSwipeContent } from '@/components/match-swipe-content';
import { MatchCard } from '@/components/match-card';
import { ChainView } from '@/components/chain-view';
import { MatchTimeline } from '@/components/match-timeline';
import { getMatchStats, getMatchEvents, getChainMatches, Match, MatchEvent } from '@/lib/match-queries';
import { getScopedMatches } from '@/lib/scoped-queries';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { Layers, Map, List } from 'lucide-react';

type MatchMode = 'swipe' | 'map' | 'list';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'proposed', label: 'Proposed' },
  { value: 'connected', label: 'Connected' },
  { value: 'fulfilled', label: 'Fulfilled' },
];

export default function Matching() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [mode, setMode] = useState<MatchMode>('swipe');
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [chainMatches, setChainMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const { orgId, orgType, loading: authLoading } = useAuthContext();
  const { effectiveOrgId } = useViewContext();

  useEffect(() => {
    if (authLoading) return;
    async function load() {
      const [matchData, statsData] = await Promise.all([
        getScopedMatches(effectiveOrgId ?? orgId, { status: filter }),
        getMatchStats(),
      ]);
      setMatches(matchData);
      setStats(statsData);
      setSwipeIndex(0);
      setLoading(false);
    }
    load();
  }, [filter, orgId, effectiveOrgId, authLoading]);

  const pendingMatches = matches.filter(m => 
    ['proposed', 'viewed', 'accepted'].includes(m.status)
  );

  function handleSwipeAccept() {
    // TODO: write to matches table
    setSwipeIndex(prev => prev + 1);
  }

  function handleSwipeDecline() {
    // TODO: write decline to matches table
    setSwipeIndex(prev => prev + 1);
  }

  async function selectMatch(match: Match) {
    setSelectedMatch(match);
    const events = await getMatchEvents(match.id);
    setMatchEvents(events);
    if (match.chain_id) {
      const chain = await getChainMatches(match.chain_id);
      setChainMatches(chain);
    } else {
      setChainMatches([]);
    }
  }

  if (loading) {
    return (
      <DashboardShell title="Matches" subtitle="Loading...">
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  const currentSwipeMatch = pendingMatches[swipeIndex];
  const effectiveOrgType = orgType || 'admin';

  return (
    <DashboardShell
      title="Matches"
      subtitle={`${stats?.total || 0} matches${stats?.byStatus?.fulfilled ? ` · ${stats.byStatus.fulfilled} fulfilled` : ''}`}
    >
      {/* Mode Toggle */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-1">
          <button
            onClick={() => setMode('swipe')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'swipe' ? 'bg-sos-blue-800 text-white' : 'text-sos-gray-600 hover:text-sos-blue-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Swipe
          </button>
          <button
            onClick={() => setMode('map')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'map' ? 'bg-sos-blue-800 text-white' : 'text-sos-gray-600 hover:text-sos-blue-800'
            }`}
          >
            <Map className="h-3.5 w-3.5" /> Map
          </button>
          <button
            onClick={() => setMode('list')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'list' ? 'bg-sos-blue-800 text-white' : 'text-sos-gray-600 hover:text-sos-blue-800'
            }`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
        </div>

        {/* Filter (list mode only) */}
        {mode === 'list' && (
          <div className="flex gap-1.5">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  filter === f.value
                    ? 'bg-sos-blue-800 text-white'
                    : 'bg-[#FDFCFA] text-sos-gray-600 border border-sos-gray-300 hover:bg-sos-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SWIPE MODE */}
      {mode === 'swipe' && (
        <div className="flex flex-col items-center py-4">
          {currentSwipeMatch ? (
            <SwipeCard
              onAccept={handleSwipeAccept}
              onDecline={handleSwipeDecline}
              acceptLabel={effectiveOrgType === 'vendor' ? 'Bid' : 'Accept'}
              declineLabel={effectiveOrgType === 'vendor' ? 'Pass' : 'Decline'}
            >
              <MatchSwipeContent
                match={currentSwipeMatch}
                orgType={effectiveOrgType}
                index={swipeIndex}
                total={pendingMatches.length}
              />
            </SwipeCard>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h3 className="text-lg font-bold text-sos-blue-800">All caught up</h3>
              <p className="text-sm text-sos-gray-600 mt-1">No pending matches to review</p>
              <p className="text-xs text-sos-gray-400 mt-3">{matches.length} total matches · {stats?.byStatus?.fulfilled || 0} fulfilled</p>
            </div>
          )}
        </div>
      )}

      {/* MAP MODE */}
      {mode === 'map' && (
        <div className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-sos-accent-50 flex items-center justify-center mx-auto mb-3">
            <Map className="w-6 h-6 text-sos-accent-600" />
          </div>
          <h3 className="text-base font-bold text-sos-blue-800">Match Map</h3>
          <p className="text-sm text-sos-gray-600 mt-1">
            Visual matching with pulsing connection lines between needs and resources.
          </p>
          <p className="text-xs text-sos-gray-400 mt-2">Coming soon — use the Map tab for now</p>
        </div>
      )}

      {/* LIST MODE */}
      {mode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            {matches.length > 0 ? matches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                onClick={() => selectMatch(match)}
              />
            )) : (
              <div className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-8 text-center">
                <p className="text-sm text-sos-gray-500">No matches found</p>
              </div>
            )}
          </div>

          <div className="space-y-4 md:sticky md:top-20 md:self-start md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
            {selectedMatch ? (
              <>
                <div className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-5">
                  <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Match Detail</h3>
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] text-sos-gray-500 uppercase">Score</span>
                      <p className="text-2xl font-bold text-sos-blue-800">{selectedMatch.match_score}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-sos-gray-500 uppercase">Status</span>
                      <p className="text-sm font-medium text-sos-blue-800 capitalize">{selectedMatch.status.replace(/_/g, ' ')}</p>
                    </div>
                    {selectedMatch.match_summary_masked && (
                      <div>
                        <span className="text-[10px] text-sos-gray-500 uppercase">Summary</span>
                        <div className="bg-[#F0EEEB] rounded-lg p-2.5 mt-1">
                          <p className="text-xs text-sos-blue-800">{selectedMatch.match_summary_masked}</p>
                        </div>
                      </div>
                    )}
                    {selectedMatch.match_reasoning && (
                      <div>
                        <span className="text-[10px] text-sos-gray-500 uppercase">Reasoning</span>
                        <p className="text-xs text-sos-gray-600 mt-1">{selectedMatch.match_reasoning}</p>
                      </div>
                    )}
                  </div>
                </div>
                {chainMatches.length > 1 && <ChainView matches={chainMatches} />}
                <div className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-5">
                  <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Timeline</h3>
                  <MatchTimeline events={matchEvents} />
                </div>
              </>
            ) : (
              <div className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-8 text-center">
                <p className="text-xs text-sos-gray-500">Select a match to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
