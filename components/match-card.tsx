'use client';

import { Match, getStatusColor, getScoreColor, getChainRoleIcon } from '@/lib/match-queries';

interface MatchCardProps {
  match: Match;
  onClick?: () => void;
}

export function MatchCard({ match, onClick }: MatchCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-sos-gray-300 p-4 cursor-pointer transition-all hover:shadow-md hover:border-sos-accent-300"
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
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${getStatusColor(match.status)}`}>
          {match.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Masked Summary */}
      {match.match_summary_masked ? (
        <div className="bg-sos-gray-200/60 rounded-lg p-3 mb-3">
          <p className="text-sm text-sos-blue-800 leading-relaxed">
            {match.match_summary_masked}
          </p>
        </div>
      ) : (
        <div className="bg-sos-gray-200/60 rounded-lg p-3 mb-3">
          <p className="text-xs text-sos-gray-500 italic">
            Match details pending — score {match.match_score}
          </p>
        </div>
      )}

      {/* Reasoning (truncated) */}
      {match.match_reasoning && (
        <p className="text-[11px] text-sos-gray-600 mb-3 line-clamp-2 leading-relaxed">
          {match.match_reasoning}
        </p>
      )}

      {/* Footer: Time + Actions */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-sos-gray-500">
          {new Date(match.created_at).toLocaleDateString()} · {timeAgo(match.created_at)}
        </span>

        {(match.status === 'proposed' || match.status === 'viewed') && (
          <div className="flex gap-1.5">
            <button className="text-[10px] font-semibold px-3 py-1 rounded-md bg-sos-red-500 text-white hover:bg-sos-red-600 transition-colors">
              Accept
            </button>
            <button className="text-[10px] font-semibold px-3 py-1 rounded-md border border-sos-gray-300 text-sos-gray-600 hover:bg-sos-gray-200 transition-colors">
              Decline
            </button>
          </div>
        )}

        {match.status === 'connected' && (
          <span className="text-[10px] font-medium text-green-600">● Connected</span>
        )}

        {match.status === 'fulfilled' && (
          <span className="text-[10px] font-medium text-green-600">✓ Fulfilled</span>
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
