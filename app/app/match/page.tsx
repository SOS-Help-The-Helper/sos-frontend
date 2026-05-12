'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { usePartnerOrg } from '@/lib/partner-context';
import { usePartnerFetch } from '@/lib/partner-api';

const SOS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SOS_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type SubView = 'active' | 'find';

const STATUS_PILL: Record<string, string> = {
  proposed: 'bg-gray-500/20 text-gray-400',
  accepted: 'bg-blue-500/20 text-blue-400',
  connected: 'bg-purple-500/20 text-purple-400',
  in_progress: 'bg-orange-500/20 text-orange-400',
  fulfilled: 'bg-green-500/20 text-green-400',
  rated: 'bg-yellow-500/20 text-yellow-400',
};

const URGENCY_PILL: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-500/20 text-green-400',
};

function statusPillClass(status: string) {
  return STATUS_PILL[status] ?? 'bg-gray-500/20 text-gray-400';
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function urgencyPillClass(urgency: string) {
  return URGENCY_PILL[(urgency || '').toLowerCase()] ?? 'bg-gray-500/20 text-gray-400';
}

// ─── Active Matches ───────────────────────────────────────────────────────────

function CopyLinkButton({ chainId }: { chainId: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(`https://sosconnect.org/drive/${chainId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="text-[10px] px-2 py-1 rounded bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition-colors flex-shrink-0"
    >
      {copied ? 'Copied ✓' : 'Copy Link'}
    </button>
  );
}

function MatchCard({ match, onClick }: { match: any; onClick: (m: any) => void }) {
  const survivorName = match.requests?.persons?.display_name || match.survivor_name || match.request_name || match.full_name || 'Survivor';
  const rvDesc =
    match.resources?.description ||
    match.resource_description ||
    match.rv_description ||
    [match.rv_year, match.rv_make, match.rv_model].filter(Boolean).join(' ') ||
    'RV';
  const status = match.match_status || match.status || 'proposed';
  const driverName = match.driver_name || match.volunteer_name || null;
  const date = match.delivery_date || match.created_at || match.matched_at || null;
  const dateStr = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
  const chainId = match.chain_id || null;

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer hover:scale-[1.01] transition-all duration-200"
      style={{ background: 'linear-gradient(135deg, rgba(26,56,80,0.8), rgba(15,30,43,0.95))', border: '1px solid rgba(255,255,255,0.08)' }}
      onClick={() => onClick(match)}
    >
      <div className="p-4">
        {/* Survivor → RV connection */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-[#EF4E4B]/60 mb-0.5">Survivor</p>
            <p className="text-sm font-semibold text-white truncate">{survivorName}</p>
          </div>
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0 px-1">
            <div className="w-6 h-[1px] bg-white/20" />
            <span className="text-[8px] text-white/30">→</span>
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[10px] uppercase tracking-wider text-sky-400/60 mb-0.5">RV</p>
            <p className="text-sm font-semibold text-white truncate">{rvDesc}</p>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${statusPillClass(status)}`}>
            {statusLabel(status)}
          </span>
          {driverName && (
            <span className="text-[10px] text-white/40">🚛 {driverName}</span>
          )}
          <span className="flex-1" />
          {dateStr && <span className="text-[10px] text-white/25">{dateStr}</span>}
          {chainId && <CopyLinkButton chainId={chainId} />}
        </div>
      </div>
    </div>
  );
}

// ─── Find Matches ─────────────────────────────────────────────────────────────

interface Survivor {
  id: string;
  name: string;
  city?: string;
  state?: string;
  urgency?: string;
}

interface Candidate {
  resource_id: string;
  description?: string;
  year?: number | string;
  make?: string;
  model?: string;
  distance_miles?: number;
  condition_score?: number;
  match_score?: number;
  explanation?: string;
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-white/50 w-8 text-right">{pct}%</span>
    </div>
  );
}

function Stars({ score }: { score: number }) {
  const filled = Math.round(score);
  return (
    <span className="text-xs">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < filled ? 'text-yellow-400' : 'text-white/20'}>★</span>
      ))}
    </span>
  );
}

function CandidateCard({
  candidate,
  onCommit,
  committing,
}: {
  candidate: Candidate;
  onCommit: (c: Candidate) => void;
  committing: boolean;
}) {
  const rvDesc =
    candidate.description ||
    [candidate.year, candidate.make, candidate.model].filter(Boolean).join(' ') ||
    'RV';

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <p className="text-sm font-medium text-white mb-1">{rvDesc}</p>

      {candidate.distance_miles != null && (
        <p className="text-xs text-white/50 mb-1">{Math.round(candidate.distance_miles)} miles away</p>
      )}

      {candidate.condition_score != null && (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-white/40">Condition</span>
          <Stars score={candidate.condition_score} />
        </div>
      )}

      {candidate.match_score != null && (
        <div className="mb-2">
          <span className="text-[10px] text-white/40">Match score</span>
          <ScoreBar score={candidate.match_score} />
        </div>
      )}

      {candidate.explanation && (
        <p className="text-xs text-white/40 mb-3 leading-relaxed">{candidate.explanation}</p>
      )}

      <button
        onClick={() => onCommit(candidate)}
        disabled={committing}
        className="bg-[#EF4E4B] text-white text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {committing ? 'Committing…' : 'Commit Match'}
      </button>
    </div>
  );
}

function FindMatchesView({ orgId, disaster, onMatchCommitted }: { orgId: string; disaster?: { id: string; name: string; slug: string; lat: number; lng: number } | null; onMatchCommitted: () => void }) {
  const partnerFetch = usePartnerFetch();
  const [survivors, setSurvivors] = useState<Survivor[]>([]);
  const [loadingSurvivors, setLoadingSurvivors] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Survivor | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [finding, setFinding] = useState(false);
  const [committingId, setCommittingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [committedChainId, setCommittedChainId] = useState<string | null>(null);

  // Fetch survivors on mount
  useEffect(() => {
    if (!orgId) return;
    setLoadingSurvivors(true);
    partnerFetch('partner-read', {
      query_type: 'recent_requests',
      filters: { ops_status: ['pending', 'approved'], ...(disaster ? { disaster_id: disaster.id } : {}) },
      limit: 500,
    })
      .then(data => {
        const rows: any[] = data.requests || data.data || [];
        setSurvivors(
          rows.map(r => ({
            id: r.id || r.request_id,
            name: r.persons?.display_name || r.full_name || r.display_name || 'Unknown',
            city: r.city,
            state: r.state,
            urgency: r.urgency || r.priority,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoadingSurvivors(false));
  }, [orgId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return survivors.filter(s => s.name.toLowerCase().includes(q) || (s.city || '').toLowerCase().includes(q));
  }, [survivors, search]);

  async function findMatches() {
    if (!selected) return;
    setFinding(true);
    setCandidates([]);
    setSuccessMsg('');
    setErrorMsg('');
    setCommittedChainId(null);
    try {
      const res = await fetch(`${SOS_URL}/functions/v1/match-engine`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SOS_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'propose',
          request_id: selected.id,
          org_id: orgId,
          limit: 10,
        }),
      });
      const data = await res.json();
      setCandidates(data.candidates || data.results || []);
    } catch {
      setErrorMsg('Failed to fetch matches. Please try again.');
    } finally {
      setFinding(false);
    }
  }

  async function commitMatch(candidate: Candidate) {
    if (!selected) return;
    setCommittingId(candidate.resource_id);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await fetch(`${SOS_URL}/functions/v1/match-engine`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SOS_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'commit',
          request_id: selected.id,
          candidate_id: candidate.resource_id,
          chain: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || data.message || 'Commit failed.');
      } else {
        setSuccessMsg(`Match committed! ${data.message || ''}`);
        setCommittedChainId(data.chain_id || null);
        setSelected(null);
        setSearch('');
        setCandidates([]);
        onMatchCommitted();
      }
    } catch {
      setErrorMsg('Failed to commit match. Please try again.');
    } finally {
      setCommittingId(null);
    }
  }

  function clearSelection() {
    setSelected(null);
    setSearch('');
    setCandidates([]);
    setSuccessMsg('');
    setErrorMsg('');
    setCommittedChainId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Success / Error banners */}
      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-xs text-green-400">
          <p>{successMsg}</p>
          {committedChainId && (
            <div className="mt-2">
              <CopyLinkButton chainId={committedChainId} />
            </div>
          )}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
          {errorMsg}
        </div>
      )}

      {/* Selected survivor */}
      {selected ? (
        <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2.5 border border-white/20">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{selected.name}</p>
            {(selected.city || selected.state) && (
              <p className="text-[10px] text-white/40">
                {[selected.city, selected.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          {selected.urgency && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full mx-2 flex-shrink-0 ${urgencyPillClass(selected.urgency)}`}>
              {selected.urgency}
            </span>
          )}
          <button onClick={clearSelection} className="text-xs text-white/40 hover:text-white ml-2 flex-shrink-0">
            Clear
          </button>
        </div>
      ) : (
        /* Survivor picker */
        <div>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setErrorMsg(''); }}
            placeholder="Search survivors..."
            className="w-full text-sm bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder-white/30 border border-white/10 outline-none focus:border-white/30 mb-2"
          />
          {loadingSurvivors ? (
            <p className="text-xs text-white/30 px-1">Loading survivors…</p>
          ) : (
            <div className="max-h-60 overflow-y-auto flex flex-col gap-1 rounded-lg">
              {filtered.length === 0 ? (
                <p className="text-xs text-white/30 px-1 py-2">
                  {survivors.length === 0 ? 'No pending requests found.' : 'No results.'}
                </p>
              ) : (
                filtered.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelected(s); setCandidates([]); setSuccessMsg(''); setErrorMsg(''); }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="text-sm text-white block truncate">{s.name}</span>
                      {(s.city || s.state) && (
                        <span className="text-[10px] text-white/40">
                          {[s.city, s.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </span>
                    {s.urgency && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${urgencyPillClass(s.urgency)}`}>
                        {s.urgency}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Find RV Matches button */}
      <button
        onClick={findMatches}
        disabled={!selected || finding}
        className="w-full py-3 rounded-lg bg-[#EF4E4B] text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {finding ? 'Finding best matches…' : 'Find RV Matches'}
      </button>

      {/* Candidate cards */}
      {candidates.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-white/40">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} found</p>
          {candidates.map(c => (
            <CandidateCard
              key={c.resource_id}
              candidate={c}
              onCommit={commitMatch}
              committing={committingId === c.resource_id}
            />
          ))}
        </div>
      )}

      {!finding && candidates.length === 0 && selected && !successMsg && (
        <p className="text-xs text-white/30 text-center py-4">
          Select a survivor and tap Find RV Matches to see candidates.
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MatchPage() {
  const { orgId, disaster } = usePartnerOrg();
  const partnerFetch = usePartnerFetch();
  const [view, setView] = useState<SubView>('active');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMatches = useCallback(async () => {
    setLoading(true);

    const res = await partnerFetch('partner-read', { query_type: 'delivery_history', filters: disaster ? { disaster_id: disaster.id } : {}, limit: 200 }).catch(() => ({ deliveries: [] }));

    setMatches(res.deliveries || []);
    setLoading(false);
  }, [disaster]);

  useEffect(() => {
    if (view === 'active') fetchMatches();
  }, [view, fetchMatches]);

  const views: { key: SubView; label: string }[] = [
    { key: 'active', label: 'Active Matches' },
    { key: 'find', label: 'Find Matches' },
  ];

  return (
    <div className="pt-20 pb-20 px-4 bg-[#0F1E2B] min-h-screen text-white">
      {/* Sub-view toggle */}
      <div className="flex gap-2 mb-6 relative z-[70]">
        {views.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 ${
              view === v.key
                ? 'bg-white/15 text-white shadow-sm backdrop-blur-sm border border-white/10'
                : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Active Matches */}
      {view === 'active' && (
        loading ? (
          <p className="text-white/40 text-sm">Loading...</p>
        ) : matches.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-20">No matches found.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map((m, i) => (
              <MatchCard key={m.match_id || m.id || i} match={m} onClick={() => {}} />
            ))}
          </div>
        )
      )}

      {/* Find Matches */}
      {view === 'find' && orgId && (
        <FindMatchesView
          orgId={orgId}
          disaster={disaster}
          onMatchCommitted={() => {
            setView('active');
            fetchMatches();
          }}
        />
      )}
      {view === 'find' && !orgId && (
        <p className="text-white/40 text-sm text-center py-20">Loading org…</p>
      )}
    </div>
  );
}
