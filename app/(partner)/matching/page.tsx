'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/api';
import { DashboardShell } from '@/components/dashboard-shell';
import { SwipeCard } from '@/components/swipe-card';
import { MatchSwipeContent } from '@/components/match-swipe-content';
import { MatchCard } from '@/components/match-card';
import { MatchTimeline } from '@/components/match-timeline';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { getPortalConfig } from '@/lib/portal-config';
import { AdminMatchView } from '@/components/admin-match-view';
import { LayoutGrid } from 'lucide-react';
import { Layers, Map, List } from 'lucide-react';
import { getUnreadNotifications, markMatchAsRead } from '@/lib/notifications';
import { useNotifications } from '@/lib/notification-context';

type Match = { id: string; status: string; score: number; request_id: string; resource_id: string; created_at: string; [key: string]: any };

type MatchMode = 'swipe' | 'map' | 'list' | 'admin';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'proposed', label: 'Proposed' },
  { value: 'connected', label: 'Connected' },
  { value: 'fulfilled', label: 'Fulfilled' },
];

export default function MatchingPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="w-10 h-10 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <Matching />
    </Suspense>
  );
}

function Matching() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [mode, setMode] = useState<MatchMode>('swipe');
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchEvents, setMatchEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'urgency'>('score');
  const [disasters, setDisasters] = useState<any[]>([]);
  const [disasterFilter, setDisasterFilter] = useState('all');

  const { orgId, orgType, loading: authLoading } = useAuthContext();
  const { effectiveOrgId, effectiveOrgType } = useViewContext();
  const { refreshCount: refreshNotifications } = useNotifications();
  const searchParams = useSearchParams();
  const deepLinkMatchId = searchParams.get('match');
  const [unreadMatchIds, setUnreadMatchIds] = useState<Set<string>>(new Set());
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(null);
  const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (authLoading) return;
    async function load() {
      let query = db.from('matches').select('*').order('created_at', { ascending: false }).limit(50);
      if (filter !== 'all') query = query.eq('status', filter);
      const { data: matchData } = await query;
      const allMatches: Match[] = matchData || [];

      const filtered = disasterFilter !== 'all'
        ? allMatches.filter((m) => m.disaster_id === disasterFilter)
        : allMatches;
      setMatches(filtered);

      setStats({
        total: filtered.length,
        proposed: filtered.filter(m => m.status === 'proposed').length,
        connected: filtered.filter(m => m.status === 'connected').length,
        fulfilled: filtered.filter(m => m.status === 'fulfilled').length,
      });
      setSwipeIndex(0);

      const { data: disData } = await db.from('disasters').select('id, name, status');
      setDisasters(disData || []);

      const currentOrg = effectiveOrgId || orgId;
      if (currentOrg) {
        const unread = await getUnreadNotifications(currentOrg);
        setUnreadMatchIds(new Set(unread.map(n => n.match_id)));
      }

      setLoading(false);
    }
    load();
  }, [filter, orgId, effectiveOrgId, authLoading, disasterFilter]);

  useEffect(() => {
    if (!deepLinkMatchId || loading || matches.length === 0) return;
    const match = matches.find(m => m.id === deepLinkMatchId);
    if (match) {
      setMode('list');
      setHighlightedMatchId(deepLinkMatchId);
      selectMatch(match);
      setTimeout(() => {
        const el = matchRefs.current[deepLinkMatchId];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
      setTimeout(() => setHighlightedMatchId(null), 3000);
    }
  }, [deepLinkMatchId, loading, matches.length]);

  const pendingMatches = matches.filter(m =>
    ['proposed', 'viewed', 'accepted'].includes(m.status)
  );

  function handleSwipeAccept() {
    setSwipeIndex(prev => prev + 1);
  }

  function handleSwipeDecline() {
    setSwipeIndex(prev => prev + 1);
  }

  async function selectMatch(match: Match) {
    setSelectedMatch(match);

    if (unreadMatchIds.has(match.id)) {
      const currentOrg = effectiveOrgId || orgId;
      if (currentOrg) {
        await markMatchAsRead(currentOrg, match.id);
        setUnreadMatchIds(prev => { const next = new Set(prev); next.delete(match.id); return next; });
        refreshNotifications();
      }
    }

    const { data: events } = await db.from('match_events').select('*').eq('match_id', match.id).order('created_at', { ascending: false }).limit(20);
    setMatchEvents(events || []);
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
  const portalConfig = getPortalConfig(effectiveOrgType);

  return (
    <DashboardShell
      title={effectiveOrgType === 'citizen' ? "Your Options" : "Matches"}
      subtitle={effectiveOrgType === 'citizen' ? "Help available for you" : `${stats?.total || 0} matches${stats?.fulfilled ? ` · ${stats.fulfilled} fulfilled` : ''}`}
    >
      {/* Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex bg-white rounded-xl border-2 border-sos-gray-300/80 p-1">
          <button
            onClick={() => setMode('swipe')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.97] ${
              mode === 'swipe' ? 'bg-sos-blue-800 text-white' : 'text-sos-gray-600 hover:text-sos-blue-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Swipe
          </button>
          <button
            onClick={() => setMode('map')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.97] ${
              mode === 'map' ? 'bg-sos-blue-800 text-white' : 'text-sos-gray-600 hover:text-sos-blue-800'
            }`}
          >
            <Map className="h-3.5 w-3.5" /> Map
          </button>
          <button
            onClick={() => setMode('list')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.97] ${
              mode === 'list' ? 'bg-sos-blue-800 text-white' : 'text-sos-gray-600 hover:text-sos-blue-800'
            }`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          {effectiveOrgType === 'admin' && (
            <button
              onClick={() => setMode('admin')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.97] ${
                mode === 'admin' ? 'bg-sos-blue-800 text-white' : 'text-sos-gray-600 hover:text-sos-blue-800'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Assign
            </button>
          )}
        </div>

        {/* Disaster filter */}
        <select
          value={disasterFilter}
          onChange={e => setDisasterFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border-2 border-sos-gray-300/80 bg-white text-sos-blue-800 font-medium"
        >
          <option value="all">All Disasters</option>
          {disasters.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Filter (list mode only) */}
        {mode === 'list' && (
          <div className="flex gap-1.5">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all active:scale-[0.97] ${
                  filter === f.value
                    ? 'bg-sos-blue-800 text-white'
                    : 'bg-white text-sos-gray-600 border border-sos-gray-300 hover:bg-sos-gray-200'
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
          {currentSwipeMatch && (currentSwipeMatch as any).auto_consent_granted && (
            <div className="w-full max-w-md mb-4 bg-sos-red-500 text-white rounded-xl p-4 text-center">
              <p className="text-lg font-bold">🚨 Emergency Auto-Match</p>
              <p className="text-sm mt-1 opacity-90">Critical triage score — we've connected them with the nearest help.</p>
              <p className="text-xs mt-2 opacity-70">They're on their way.</p>
            </div>
          )}
          {currentSwipeMatch ? (
            <SwipeCard
              key={`match-${swipeIndex}`}
              onAccept={handleSwipeAccept}
              onDecline={handleSwipeDecline}
              acceptLabel={portalConfig.matchCard.acceptLabel}
              declineLabel={portalConfig.matchCard.declineLabel}
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
                <span className="text-2xl">{matches.length > 0 ? '✓' : '📋'}</span>
              </div>
              <h3 className="text-lg font-bold text-sos-blue-800">
                {matches.length > 0 ? 'All caught up' : 'No coordination tasks yet'}
              </h3>
              <p className="text-sm text-sos-gray-600 mt-1">
                {matches.length > 0
                  ? 'No pending matches to review'
                  : 'When citizens submit needs in your area, assignments will appear here.'}
              </p>
              {matches.length > 0 && (
                <p className="text-xs text-sos-gray-400 mt-3">{matches.length} total matches · {stats?.fulfilled || 0} fulfilled</p>
              )}
              <div className="flex items-center justify-center gap-2 mt-4">
                <button onClick={() => setMode('list')} className="text-xs font-semibold px-4 py-2 rounded-lg border border-sos-gray-300 text-sos-gray-600 hover:bg-sos-gray-200 transition-all active:scale-[0.97]">
                  View All Matches
                </button>
                <a href="/agent" className="text-xs font-semibold px-4 py-2 rounded-lg bg-sos-accent-600 text-white hover:bg-sos-accent-700 transition-all active:scale-[0.97]">
                  Open Agent Chat
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MAP MODE */}
      {mode === 'map' && (
        <div className="bg-white rounded-xl border-2 border-sos-gray-300/80 p-8 text-center">
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
        <div>
          {/* Batch toolbar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (selectedIds.size === matches.length) setSelectedIds(new Set());
                  else setSelectedIds(new Set(matches.map(m => m.id)));
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border-2 border-sos-gray-300/80 bg-white text-sos-gray-600 hover:bg-sos-gray-200"
              >
                {selectedIds.size === matches.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs text-sos-gray-500">{selectedIds.size} selected</span>
                  <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all active:scale-[0.97]">
                    Accept Selected
                  </button>
                  <button
                    onClick={() => {
                      const highScore = matches.filter(m => m.match_score >= 80 && ['proposed','viewed'].includes(m.status));
                      setSelectedIds(new Set(highScore.map(m => m.id)));
                    }}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border-2 border-green-300 text-green-700 hover:bg-green-50 transition-all active:scale-[0.97]"
                  >
                    Select 80+ Scores ({matches.filter(m => m.match_score >= 80 && ['proposed','viewed'].includes(m.status)).length})
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-sos-gray-500">Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="text-xs px-2 py-1 rounded-lg border border-sos-gray-300 bg-white text-sos-blue-800"
              >
                <option value="score">Score ↓</option>
                <option value="date">Newest</option>
                <option value="urgency">Urgency</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            {[...matches].sort((a, b) => {
              if (sortBy === 'score') return (b.match_score || 0) - (a.match_score || 0);
              if (sortBy === 'date') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              return 0;
            }).map(match => (
              <div key={match.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(match.id)}
                  onChange={() => {
                    const next = new Set(selectedIds);
                    if (next.has(match.id)) next.delete(match.id);
                    else next.add(match.id);
                    setSelectedIds(next);
                  }}
                  className="mt-4 h-4 w-4 rounded border-sos-gray-300 text-sos-red-500 flex-shrink-0"
                />
                <div
                  className={`flex-1 transition-all duration-500 ${highlightedMatchId === match.id ? 'ring-2 ring-sos-accent-400 rounded-xl' : ''}`}
                  ref={(el) => { matchRefs.current[match.id] = el; }}
                >
                  <MatchCard match={match} onClick={() => selectMatch(match)} isNew={unreadMatchIds.has(match.id)} />
                </div>
              </div>
            ))}
            {matches.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border-2 border-sos-gray-300/80 p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-sos-gray-200 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg">📋</span>
                </div>
                <h3 className="text-sm font-bold text-sos-blue-800">No coordination tasks yet</h3>
                <p className="text-xs text-sos-gray-500 mt-1">When citizens submit needs in your area, assignments will appear here.</p>
                <a href="/agent" className="inline-block mt-3 text-xs font-semibold px-4 py-2 rounded-lg bg-sos-accent-600 text-white hover:bg-sos-accent-700 transition-all active:scale-[0.97]">
                  Open Agent Chat
                </a>
              </div>
            )}
          </div>

          <div className="space-y-4 md:sticky md:top-20 md:self-start md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
            {selectedMatch ? (
              <>
                <div className="bg-white rounded-xl border-2 border-sos-gray-300/80 p-5">
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
                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const summary = selectedMatch.match_summary_masked || `Match score: ${selectedMatch.match_score}`;
                      const deepLink = `${window.location.origin}/matching?match=${selectedMatch.id}`;
                      await fetch('/api/agent/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          message: `Share this match to our Slack channel: ${summary}\n\nDashboard link: ${deepLink}`,
                        }),
                      });
                      alert('Match shared to Slack');
                    }}
                    className="flex-1 text-xs font-semibold py-2 rounded-lg border border-sos-gray-300 text-sos-gray-600 hover:bg-sos-gray-200 transition-all active:scale-[0.97]"
                  >
                    💬 Share to Slack
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/matching?match=${selectedMatch.id}`);
                      alert('Link copied!');
                    }}
                    className="flex-1 text-xs font-semibold py-2 rounded-lg border border-sos-gray-300 text-sos-gray-600 hover:bg-sos-gray-200 transition-all active:scale-[0.97]"
                  >
                    🔗 Copy Link
                  </button>
                </div>

                <div className="bg-white rounded-xl border-2 border-sos-gray-300/80 p-5">
                  <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Timeline</h3>
                  <MatchTimeline events={matchEvents} />
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border-2 border-sos-gray-300/80 p-8 text-center">
                <p className="text-xs text-sos-gray-500">Select a match to view details</p>
              </div>
            )}
          </div>
        </div>
        </div>
      )}
      {/* ADMIN ASSIGN MODE */}
      {mode === 'admin' && (
        <AdminMatchView disasterFilter={disasterFilter} />
      )}
    </DashboardShell>
  );
}
