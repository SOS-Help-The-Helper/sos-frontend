'use client';

import { Match, getStatusColor, getScoreColor, getChainRoleIcon } from '@/lib/match-queries';

interface MatchCardProps {
  match: Match;
  onClick?: () => void;
  isNew?: boolean;
}

function formatSummary(text: string): string {
  return text
    .split(/[,·]/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' · ')
    .replace(/_/g, ' ')
    .replace(/food water/gi, 'Food & Water');
}

function fallbackSummary(match: Match): string {
  const parts: string[] = [];
  if (match.match_score) parts.push(`Score ${match.match_score}`);
  return parts.join(' · ') || 'Match details pending';
}

function getLifecycleAction(status: string): { label: string; style: string; secondary?: string; tertiary?: string } | null {
  switch (status) {
    case 'proposed':
    case 'viewed':
      return { label: 'Accept', style: 'bg-sos-red-500 text-white hover:bg-sos-red-600', secondary: 'Decline', tertiary: 'Refer' };
    case 'accepted':
    case 'citizen_consented':
    case 'partner_consented':
      return { label: 'Waiting for consent', style: 'bg-sos-gray-200 text-sos-gray-500 cursor-default' };
    case 'connected':
      return { label: 'Mark In Progress', style: 'bg-sos-accent-600 text-white hover:bg-sos-accent-700' };
    case 'in_progress':
      return { label: 'Mark Fulfilled', style: 'bg-green-600 text-white hover:bg-green-700' };
    case 'fulfilled':
    case 'failed':
    case 'expired':
    case 'cancelled':
      return null; // No action — resolved
    default:
      return null;
  }
}

export function MatchCard({ match, onClick, isNew }: MatchCardProps) {
  const action = getLifecycleAction(match.status);
  const summary = match.match_summary_masked
    ? formatSummary(match.match_summary_masked)
    : fallbackSummary(match);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border-2 border-sos-gray-300/80 p-4 cursor-pointer transition-all hover:shadow-md hover:border-sos-accent-400 shadow-sm active:scale-[0.97]"
    >
      {/* Header: Score + Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold px-2.5 py-0.5 rounded-md border ${getScoreColor(match.match_score || 0)}`}>
            {match.match_score || '—'}
          </span>
          {match.chain_id && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sos-blue-50 text-sos-blue-700 border border-sos-blue-200">
              {getChainRoleIcon(match.chain_role || '')} Chain #{match.chain_sequence}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isNew && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sos-red-500 text-white animate-pulse">
              NEW
            </span>
          )}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${getStatusColor(match.status)}`}>
            {match.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Masked Summary — bold Deep Blue */}
      <div className="bg-sos-gray-200/60 rounded-lg p-3 mb-2">
        <p className="text-sm font-bold text-sos-blue-800 leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Reasoning — Gray 600, lighter weight */}
      {match.match_reasoning && (
        <p className="text-[11px] text-sos-gray-600 mb-3 line-clamp-2 leading-relaxed">
          {match.match_reasoning}
        </p>
      )}

      {/* Fulfillment chain — multi-contributor display */}
      {match.fulfillment_chain && match.fulfillment_chain.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {match.fulfillment_chain.map((contributor, i) => (
            <span key={i} className="text-[10px] bg-sos-accent-50 text-sos-accent-800 px-2 py-1 rounded-full font-medium inline-flex items-center gap-1">
              <span className="text-sos-gray-500">{contributor.role}:</span> {contributor.name}{contributor.org ? ` · ${contributor.org}` : ''}
            </span>
          ))}
        </div>
      )}

      {/* Price tier badge */}
      {match.price_tier && (
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mb-3 inline-block ${
          match.price_tier === 'free' ? 'bg-green-100 text-green-700' :
          match.price_tier === 'donated' ? 'bg-green-50 text-green-600' :
          match.price_tier === 'subsidized' ? 'bg-sos-accent-50 text-sos-accent-700' :
          match.price_tier === 'discounted' ? 'bg-yellow-50 text-yellow-700' :
          match.price_tier === 'market' ? 'bg-sos-gray-200 text-sos-gray-600' :
          match.price_tier === 'insured' ? 'bg-sos-blue-50 text-sos-blue-800' :
          'bg-sos-gray-200 text-sos-gray-500'
        }`}>
          {match.price_tier === 'free' ? '🆓 Free' :
           match.price_tier === 'donated' ? '🎁 Donated' :
           match.price_tier === 'subsidized' ? '💚 Subsidized' :
           match.price_tier === 'discounted' ? '💲 Discounted' :
           match.price_tier === 'market' ? '💰 Market Rate' :
           match.price_tier === 'insured' ? '🛡️ Insured' :
           match.price_tier}
        </span>
      )}

      {/* Footer: Time + Lifecycle Actions */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-sos-gray-500">
          {new Date(match.created_at).toLocaleDateString()} · {timeAgo(match.created_at)}
        </span>

        {action && (
          <div className="flex gap-1.5">
            <button className={`text-xs font-semibold px-3 py-2 md:text-[10px] md:py-1 rounded-md transition-all active:scale-[0.97] ${action.style}`}>
              {action.label}
            </button>
            {action.secondary && (
              <button className="text-xs font-semibold px-3 py-2 md:text-[10px] md:py-1 rounded-md border border-sos-gray-300 text-sos-gray-600 hover:bg-sos-gray-200 transition-all active:scale-[0.97]">
                {action.secondary}
              </button>
            )}
            {action.tertiary && (
              <button
                onClick={async () => {
                  await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/partner-referral`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                      },
                      body: JSON.stringify({ match_id: match.id, action: 'refer', channel: 'partner_dashboard' }),
                    }
                  );
                  // Refresh handled by parent re-fetch
                }}
                className="text-xs font-semibold px-3 py-2 md:text-[10px] md:py-1 rounded-md border border-sos-accent-300 text-sos-accent-700 hover:bg-sos-accent-50 transition-all active:scale-[0.97]"
              >
                {action.tertiary}
              </button>
            )}
          </div>
        )}

        {match.status === 'fulfilled' && (
          <span className="text-[10px] font-medium text-green-600">✓ Fulfilled</span>
        )}
        {match.status === 'failed' && (
          <span className="text-[10px] font-medium text-sos-red-500">✗ Failed</span>
        )}
        {match.status === 'expired' && (
          <span className="text-[10px] font-medium text-sos-gray-500">⏱ Expired</span>
        )}
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
