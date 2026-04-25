'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { SwipeCard } from '@/components/swipe-card';
import { MatchSwipeContent } from '@/components/match-swipe-content';
import { MatchCard } from '@/components/match-card';
import { ChainView } from '@/components/chain-view';
import { MatchTimeline } from '@/components/match-timeline';
// TODO: rewire to lib/api.ts (Phase 3-5) — import { getMatchStats, getMatchEvents, getChainMatches, Match, MatchEvent } from '@/lib/match-queries';
// TODO: rewire to lib/api.ts (Phase 3-5) — import { getScopedMatches } from '@/lib/scoped-queries';
import { supabase } from '@/lib/supabase-client';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { getPortalConfig } from '@/lib/portal-config';
// TODO: rewire to EF (Phase 4) — // import { getVendorJobs, VendorJob } from '@/lib/vendor-queries'; // TODO: rewire to EF (Phase 4)
import { BidForm } from '@/components/bid-form';
import { AdminMatchView } from '@/components/admin-match-view';
import { LayoutGrid } from 'lucide-react';
import { Layers, Map, List } from 'lucide-react';
import { getUnreadNotifications, markMatchAsRead, type PartnerNotification } from '@/lib/notifications';
import { useNotifications } from '@/lib/notification-context';

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
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [chainMatches, setChainMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'urgency'>('score');
  const [disasters, setDisasters] = useState<any[]>([]);
  const [disasterFilter, setDisasterFilter] = useState('all');
  // const [vendorJobs, setVendorJobs] = useState<VendorJob[]>([]); // TODO: rewire to EF (Phase 4)
  const [vendorSwipeIndex, setVendorSwipeIndex] = useState(0);
  // const [showBidForm, setShowBidForm] = useState<VendorJob | null>(null); // TODO: rewire to EF (Phase 4)

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
      const [matchData, statsData] = await Promise.all([
        getScopedMatches(effectiveOrgId ?? orgId, { status: filter }),
        getMatchStats(),
      ]);
      // Filter by disaster if selected
      const filtered = disasterFilter !== 'all' 
        ? matchData.filter((m: any) => m.disaster_id === disasterFilter)
        : matchData;
      setMatches(filtered);
      setStats(statsData);
      setSwipeIndex(0);

      // Load disasters
      const { data: disData } = await supabase.from('disasters').select('id, name, status');
      setDisasters(disData || []);

      // Load vendor jobs if viewing as vendor
      if (effectiveOrgType === 'vendor') {
        const jobs = await getVendorJobs();
        setVendorJobs(jobs);
        setVendorSwipeIndex(0);
      }

      // Load unread notification match IDs
      const currentOrg = effectiveOrgId || orgId;
      if (currentOrg) {
        const unread = await getUnreadNotifications(currentOrg);
        setUnreadMatchIds(new Set(unread.map(n => n.match_id)));
      }

      setLoading(false);
    }
    load();
  }, [filter, orgId, effectiveOrgId, authLoading, disasterFilter]);

  // Deep link: auto-select and scroll to match from URL param
  useEffect(() => {
    if (!deepLinkMatchId || loading || matches.length === 0) return;
    const match = matches.find(m => m.id === deepLinkMatchId);
    if (match) {
      setMode('list');
      setHighlightedMatchId(deepLinkMatchId);
      selectMatch(match);
      // Scroll to the match card
      setTimeout(() => {
        const el = matchRefs.current[deepLinkMatchId];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
      // Remove highlight after 3 seconds
      setTimeout(() => setHighlightedMatchId(null), 3000);
    }
  }, [deepLinkMatchId, loading, matches.length]);

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

    // Mark as read if unread
    if (unreadMatchIds.has(match.id)) {
      const currentOrg = effectiveOrgId || orgId;
      if (currentOrg) {
        await markMatchAsRead(currentOrg, match.id);
        setUnreadMatchIds(prev => { const next = new Set(prev); next.delete(match.id); return next; });
        refreshNotifications();
      }
    }

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
  // Determine org type from view context or auth
  const isVendorView = effectiveOrgType === 'vendor';
  const currentVendorJob = vendorJobs[vendorSwipeIndex];
  const portalConfig = getPortalConfig(effectiveOrgType);

  return (
    <DashboardShell
      title={isVendorView ? "Available Jobs" : effectiveOrgType === 'citizen' ? "Your Options" : "Matches"}
      subtitle={isVendorView ? `${vendorJobs.length} jobs available` : effectiveOrgType === 'citizen' ? "Help available for you" : `${stats?.total || 0} matches${stats?.byStatus?.fulfilled ? ` · ${stats.byStatus.fulfilled} fulfilled` : ''}`}
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
          {/* Emergency Auto-Match Banner */}
          {currentSwipeMatch && (currentSwipeMatch as any).auto_consent_granted && (
            <div className="w-full max-w-md mb-4 bg-sos-red-500 text-white rounded-xl p-4 text-center">
              <p className="text-lg font-bold">🚨 Emergency Auto-Match</p>
              <p className="text-sm mt-1 opacity-90">Critical triage score — we've connected them with the nearest help.</p>
              <p className="text-xs mt-2 opacity-70">They're on their way.</p>
            </div>
          )}
          {/* Vendor Job Swipe */}
          {isVendorView && currentVendorJob ? (
            <SwipeCard
              key={`vendor-${vendorSwipeIndex}`}
              onAccept={() => { setShowBidForm(currentVendorJob); }}
              onDecline={() => setVendorSwipeIndex(prev => prev + 1)}
              acceptLabel="Bid"
              declineLabel="Pass"
            >
              <div className="p-6 min-h-[440px] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs text-white/50 font-medium">{vendorSwipeIndex + 1} of {vendorJobs.length} jobs</span>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 uppercase">💼 Job</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 rounded-3xl bg-yellow-500/10 flex items-center justify-center mb-6">
                    <span className="text-5xl">🔧</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white capitalize mb-3">
                    {currentVendorJob.category?.replace(/_/g, ' ') || 'Job Available'}
                  </h2>
                  <p className="text-base text-white/70 leading-relaxed mb-4">{currentVendorJob.details_sanitized}</p>
                  {currentVendorJob.vendor_budget > 0 && (
                    <div className="text-xl font-bold text-green-400 mb-2">
                      Budget: ${currentVendorJob.vendor_budget.toLocaleString()}
                    </div>
                  )}
                  {currentVendorJob.urgency && (
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                      currentVendorJob.urgency === 'critical' ? 'bg-sos-red-500/20 text-sos-red-300' :
                      currentVendorJob.urgency === 'high' ? 'bg-sos-red-500/10 text-sos-red-400' :
                      'bg-white/10 text-white/50'
                    }`}>{currentVendorJob.urgency}</span>
                  )}
                </div>
                <p className="text-[10px] text-white/30 text-center mt-4">Swipe right to bid · Left to pass</p>
              </div>
            </SwipeCard>
          ) : isVendorView ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h3 className="text-lg font-bold text-sos-blue-800">No More Jobs</h3>
              <p className="text-sm text-sos-gray-600 mt-1">You've reviewed all available jobs</p>
            </div>
          ) : currentSwipeMatch ? (
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
                <p className="text-xs text-sos-gray-400 mt-3">{matches.length} total matches · {stats?.byStatus?.fulfilled || 0} fulfilled</p>
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
              return 0; // urgency handled elsewhere
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
                      // Share to Slack via agent chat API
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

                {chainMatches.length > 1 && <ChainView matches={chainMatches} />}
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

      {/* Bid Form Modal */}
      {showBidForm && (
        <BidForm
          job={showBidForm}
          onClose={() => setShowBidForm(null)}
          onSubmitted={() => {
            setShowBidForm(null);
            setVendorSwipeIndex(prev => prev + 1);
          }}
        />
      )}
    </DashboardShell>
  );
}
