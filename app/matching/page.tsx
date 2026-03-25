'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { MatchCard } from '@/components/match-card';
import { ChainView } from '@/components/chain-view';
import { MatchTimeline } from '@/components/match-timeline';
import { getMatches, getMatchStats, getMatchEvents, getChainMatches, Match, MatchEvent } from '@/lib/match-queries';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'proposed', label: 'Proposed' },
  { value: 'connected', label: 'Connected' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'failed', label: 'Failed' },
  { value: 'expired', label: 'Expired' },
];

export default function Matching() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [chainMatches, setChainMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [matchData, statsData] = await Promise.all([
        getMatches({ status: filter }),
        getMatchStats(),
      ]);
      setMatches(matchData);
      setStats(statsData);
      setLoading(false);
    }
    load();
  }, [filter]);

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
      <DashboardShell title="Matching" subtitle="Loading...">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl border border-sos-gray-300 p-4 h-40 animate-pulse" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Matching" subtitle={`${stats?.total || 0} matches · Avg score ${stats?.avgScore || 0}`}>
      {/* Stats Bar */}
      <div className="flex items-center gap-4 mb-5">
        {stats && Object.entries(stats.byStatus).map(([status, count]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-sos-gray-600 capitalize">{status.replace(/_/g, ' ')}</span>
            <span className="text-xs font-bold text-sos-blue-800">{count as number}</span>
          </div>
        ))}
        {stats?.chains > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs font-medium text-sos-blue-600">🔗 {stats.chains} coordination chains</span>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex gap-1.5 mb-5">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              filter === f.value
                ? 'bg-sos-blue-800 text-white'
                : 'bg-white text-sos-gray-600 border border-sos-gray-300 hover:bg-sos-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Match Cards (2 cols) */}
        <div className="col-span-2 space-y-3">
          {matches.length > 0 ? (
            matches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                onClick={() => selectMatch(match)}
              />
            ))
          ) : (
            <div className="bg-white rounded-xl border border-sos-gray-300 p-8 text-center">
              <p className="text-sm text-sos-gray-500">No matches found for this filter</p>
            </div>
          )}
        </div>

        {/* Detail Panel (1 col) */}
        <div className="space-y-4">
          {selectedMatch ? (
            <>
              {/* Match Detail */}
              <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
                <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Match Detail</h3>

                <div className="space-y-2.5">
                  <div>
                    <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Score</span>
                    <p className="text-2xl font-bold text-sos-blue-800">{selectedMatch.match_score}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Status</span>
                    <p className="text-sm font-medium text-sos-blue-800 capitalize">{selectedMatch.status.replace(/_/g, ' ')}</p>
                  </div>

                  {selectedMatch.match_summary_masked && (
                    <div>
                      <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Summary</span>
                      <div className="bg-sos-gray-200/60 rounded-lg p-2.5 mt-1">
                        <p className="text-xs text-sos-blue-800">{selectedMatch.match_summary_masked}</p>
                      </div>
                    </div>
                  )}

                  {selectedMatch.match_reasoning && (
                    <div>
                      <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Reasoning</span>
                      <p className="text-xs text-sos-gray-600 mt-1 leading-relaxed">{selectedMatch.match_reasoning}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sos-gray-300">
                    <div>
                      <span className="text-[10px] text-sos-gray-500">Created</span>
                      <p className="text-[11px] text-sos-blue-800">{new Date(selectedMatch.created_at).toLocaleString()}</p>
                    </div>
                    {selectedMatch.connected_at && (
                      <div>
                        <span className="text-[10px] text-sos-gray-500">Connected</span>
                        <p className="text-[11px] text-sos-blue-800">{new Date(selectedMatch.connected_at).toLocaleString()}</p>
                      </div>
                    )}
                    {selectedMatch.resolved_at && (
                      <div>
                        <span className="text-[10px] text-sos-gray-500">Resolved</span>
                        <p className="text-[11px] text-sos-blue-800">{new Date(selectedMatch.resolved_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Accept/Decline for actionable matches */}
                {(selectedMatch.status === 'proposed' || selectedMatch.status === 'viewed') && (
                  <div className="flex gap-2 mt-4 pt-3 border-t border-sos-gray-300">
                    <button className="flex-1 text-sm font-semibold py-2 rounded-lg bg-sos-red-500 text-white hover:bg-sos-red-600 transition-colors">
                      Accept Match
                    </button>
                    <button className="flex-1 text-sm font-semibold py-2 rounded-lg border border-sos-gray-300 text-sos-gray-600 hover:bg-sos-gray-200 transition-colors">
                      Decline
                    </button>
                  </div>
                )}
              </div>

              {/* Chain View */}
              {chainMatches.length > 1 && (
                <ChainView matches={chainMatches} />
              )}

              {/* Event Timeline */}
              <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
                <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Event Timeline</h3>
                <MatchTimeline events={matchEvents} />
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-sos-gray-300 p-8 text-center">
              <p className="text-xs text-sos-gray-500">Select a match to view details</p>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
