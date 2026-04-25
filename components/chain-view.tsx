'use client';

// TODO: rewire to lib/api.ts (Phase 3-5) — import { Match, getStatusColor, getChainRoleIcon } from '@/lib/match-queries';

interface ChainViewProps {
  matches: Match[];
}

export function ChainView({ matches }: ChainViewProps) {
  if (!matches.length) return null;

  const sorted = [...matches].sort((a, b) => (a.chain_sequence || 0) - (b.chain_sequence || 0));

  return (
    <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-bold text-sos-blue-800">Coordination Chain</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sos-blue-50 text-sos-blue-700 border border-sos-blue-200">
          {sorted.length} steps
        </span>
      </div>

      <div className="relative">
        {sorted.map((match, i) => {
          const isLast = i === sorted.length - 1;
          const isActive = !['fulfilled', 'failed', 'expired', 'cancelled'].includes(match.status);
          const isCompleted = match.status === 'fulfilled' || match.status === 'connected';
          const isWaiting = i > 0 && !['fulfilled', 'connected', 'in_progress'].includes(sorted[i - 1].status);

          return (
            <div key={match.id} className="flex items-start gap-3 mb-0">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                  isCompleted
                    ? 'bg-green-100 text-green-700'
                    : isWaiting
                    ? 'bg-sos-gray-200 text-sos-gray-500'
                    : isActive
                    ? 'bg-sos-accent-100 text-sos-accent-700'
                    : 'bg-sos-gray-200 text-sos-gray-500'
                }`}>
                  {isCompleted ? '✓' : getChainRoleIcon(match.chain_role || '')}
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-8 ${
                    isCompleted ? 'bg-green-300' : 'bg-sos-gray-300'
                  }`} />
                )}
              </div>

              {/* Step content */}
              <div className={`flex-1 pb-4 ${isWaiting ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-sos-blue-800 capitalize">
                    {match.chain_role || `Step ${match.chain_sequence}`}
                  </span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${getStatusColor(match.status)}`}>
                    {match.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-sos-gray-500">
                    Score: {match.match_score}
                  </span>
                </div>
                {match.match_summary_masked && (
                  <p className="text-xs text-sos-gray-600 mt-0.5">{match.match_summary_masked}</p>
                )}
                {isWaiting && (
                  <p className="text-[10px] text-sos-gray-400 mt-0.5 italic">
                    Waiting on step {(match.chain_sequence || 1) - 1}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
