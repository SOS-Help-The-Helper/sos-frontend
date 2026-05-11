'use client';
import { useEffect, useState, useCallback } from 'react';
import { usePartnerOrg } from '@/lib/partner-context';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

type SubView = 'active' | 'find';

const STATUS_PILL: Record<string, string> = {
  proposed: 'bg-gray-500/20 text-gray-400',
  accepted: 'bg-blue-500/20 text-blue-400',
  connected: 'bg-purple-500/20 text-purple-400',
  in_progress: 'bg-orange-500/20 text-orange-400',
  fulfilled: 'bg-green-500/20 text-green-400',
  rated: 'bg-yellow-500/20 text-yellow-400',
};

function statusPillClass(status: string) {
  return STATUS_PILL[status] ?? 'bg-gray-500/20 text-gray-400';
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function MatchCard({ match, onClick }: { match: any; onClick: (m: any) => void }) {
  const survivorName = match.survivor_name || match.request_name || match.full_name || 'Unknown Survivor';
  const rvDesc =
    match.rv_description ||
    [match.rv_year, match.rv_make, match.rv_model].filter(Boolean).join(' ') ||
    match.resource_description ||
    'RV';
  const status = match.match_status || match.status || 'proposed';
  const driverName = match.driver_name || match.volunteer_name || null;
  const date = match.created_at || match.matched_at || null;
  const dateStr = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div
      className="bg-white/5 rounded-lg p-4 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
      onClick={() => { console.log('Match card clicked:', match); onClick(match); }}
    >
      {/* Top row: survivor ↔ RV */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-white flex-1 leading-tight">{survivorName}</span>
        <span className="text-white/40 text-xs flex-shrink-0">↔</span>
        <span className="text-sm font-medium text-white flex-1 text-right leading-tight">{rvDesc}</span>
      </div>

      {/* Status pill */}
      <div className="mb-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusPillClass(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

      {/* Driver */}
      {driverName && (
        <p className="text-xs text-white/30 mb-1">Driver: {driverName}</p>
      )}

      {/* Date */}
      {dateStr && <p className="text-[10px] text-white/20">{dateStr}</p>}
    </div>
  );
}

export default function MatchPage() {
  const { orgId } = usePartnerOrg();
  const [view, setView] = useState<SubView>('active');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMatches = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const key = process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '';
    const headers = { 'x-partner-key': key, 'Content-Type': 'application/json' };

    const [active, completed] = await Promise.all([
      fetch(`${SB_URL}/functions/v1/partner-read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query_type: 'delivery_tracking', filters: { org_id: orgId } }),
      }).then(r => r.json()).catch(() => ({ results: [] })),
      fetch(`${SB_URL}/functions/v1/partner-read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query_type: 'delivery_history', filters: { org_id: orgId }, limit: 200 }),
      }).then(r => r.json()).catch(() => ({ results: [] })),
    ]);

    setMatches([...(active.results || []), ...(completed.results || [])]);
    setLoading(false);
  }, [orgId]);

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
      <div className="flex gap-2 mb-6">
        {views.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`text-xs font-medium px-4 py-1.5 rounded-full transition-colors ${
              view === v.key ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'
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
      {view === 'find' && (
        <p className="text-white/40 text-center py-20">Find Matches — coming in next build</p>
      )}
    </div>
  );
}
