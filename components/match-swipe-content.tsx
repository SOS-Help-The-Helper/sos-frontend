'use client';

import { Match, getScoreColor } from '@/lib/match-queries';

interface MatchSwipeContentProps {
  match: Match;
  orgType?: string;
  index: number;
  total: number;
}

const CATEGORY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  housing: { icon: '🏠', color: 'text-sos-accent-700', bg: 'bg-sos-accent-50' },
  shelter: { icon: '🏠', color: 'text-sos-accent-700', bg: 'bg-sos-accent-50' },
  emergency_shelter: { icon: '🏠', color: 'text-sos-accent-700', bg: 'bg-sos-accent-50' },
  rv_housing: { icon: '🚐', color: 'text-sos-accent-700', bg: 'bg-sos-accent-50' },
  food_water: { icon: '🍽️', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  food: { icon: '🍽️', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  medical: { icon: '🏥', color: 'text-sos-red-700', bg: 'bg-sos-red-50' },
  transport: { icon: '🚛', color: 'text-sos-blue-700', bg: 'bg-sos-blue-50' },
  transportation: { icon: '🚛', color: 'text-sos-blue-700', bg: 'bg-sos-blue-50' },
  supplies: { icon: '📦', color: 'text-sos-blue-700', bg: 'bg-sos-blue-50' },
  debris: { icon: '🌳', color: 'text-green-700', bg: 'bg-green-50' },
  debris_removal: { icon: '🌳', color: 'text-green-700', bg: 'bg-green-50' },
  utilities: { icon: '⚡', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  power_generation: { icon: '⚡', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  repairs: { icon: '🔧', color: 'text-sos-gray-700', bg: 'bg-sos-gray-200' },
  clothing: { icon: '👕', color: 'text-sos-blue-700', bg: 'bg-sos-blue-50' },
  pet_care: { icon: '🐾', color: 'text-sos-accent-700', bg: 'bg-sos-accent-50' },
  welfare_check: { icon: '👋', color: 'text-sos-red-700', bg: 'bg-sos-red-50' },
  missing_person: { icon: '🔍', color: 'text-sos-red-700', bg: 'bg-sos-red-50' },
};

function getCategoryInfo(match: Match) {
  // Try to extract category from summary or chain_role
  const category = match.chain_role || '';
  const summaryFirst = (match.match_summary_masked || '').split('·')[0]?.trim().toLowerCase() || '';
  const key = Object.keys(CATEGORY_ICONS).find(k => 
    category.includes(k) || summaryFirst.includes(k)
  );
  return CATEGORY_ICONS[key || ''] || { icon: '🆘', color: 'text-sos-red-700', bg: 'bg-sos-red-50' };
}

export function MatchSwipeContent({ match, orgType, index, total }: MatchSwipeContentProps) {
  const summary = match.match_summary_masked || `Match · Score ${match.match_score}`;

  // Vendor card
  if (orgType === 'vendor') {
    return (
      <div className="p-6 min-h-[420px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-sos-gray-500">{index + 1} of {total} jobs</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">💼 Job</span>
        </div>
        <h2 className="text-xl font-bold text-sos-blue-800 capitalize mb-2">
          {match.chain_role || summary.split('·')[0] || 'Available Job'}
        </h2>
        <p className="text-sm text-sos-gray-600 leading-relaxed mb-4">{summary}</p>
        {match.match_score && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-sos-gray-500">Match fit:</span>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-md border ${getScoreColor(match.match_score)}`}>
              {match.match_score}
            </span>
          </div>
        )}
        <p className="text-[10px] text-sos-gray-400 mt-4">Swipe right to submit bid · Left to pass</p>
      </div>
    );
  }

  // Coordinator card (Aid Arena)
  if (orgType === 'coordination') {
    return (
      <div className="p-6 min-h-[420px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-sos-gray-500">{index + 1} of {total}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">📋 Coordination</span>
        </div>
        <h2 className="text-xl font-bold text-sos-blue-800 capitalize mb-2">
          {summary.split('·')[0] || 'Coordination Needed'}
        </h2>
        <p className="text-sm text-sos-gray-600 leading-relaxed mb-4">{summary}</p>
        {match.chain_id && (
          <div className="bg-sos-blue-50 rounded-lg p-3 mb-3">
            <p className="text-xs font-semibold text-sos-blue-800">Chain: Step {match.chain_sequence}</p>
            <p className="text-[10px] text-sos-blue-600 capitalize">{match.chain_role}</p>
          </div>
        )}
        <div className={`text-sm font-bold px-2 py-0.5 rounded-md border inline-block ${getScoreColor(match.match_score || 0)}`}>
          Score: {match.match_score}
        </div>
        <p className="text-[10px] text-sos-gray-400 mt-4">Swipe right to approve · Left to reassign</p>
      </div>
    );
  }

  // Food service card (FHM)
  if (orgType === 'food_service') {
    return (
      <div className="p-6 min-h-[420px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-sos-gray-500">{index + 1} of {total}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">🍽️ Food</span>
        </div>
        <h2 className="text-xl font-bold text-sos-blue-800 capitalize mb-2">
          {summary.split('·')[0] || 'Food Request'}
        </h2>
        <p className="text-sm text-sos-gray-600 leading-relaxed mb-4">{summary}</p>
        <div className={`text-sm font-bold px-2 py-0.5 rounded-md border inline-block ${getScoreColor(match.match_score || 0)}`}>
          Score: {match.match_score}
        </div>
        <p className="text-[10px] text-sos-gray-400 mt-4">Swipe right to send to site · Left to skip</p>
      </div>
    );
  }

  // Transport/housing card (ERV)
  if (orgType === 'transport_housing') {
    return (
      <div className="p-6 min-h-[420px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-sos-gray-500">{index + 1} of {total}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sos-accent-50 text-sos-accent-700">🚐 Housing</span>
        </div>
        <h2 className="text-xl font-bold text-sos-blue-800 capitalize mb-2">
          {summary.split('·')[0] || 'Housing Request'}
        </h2>
        <p className="text-sm text-sos-gray-600 leading-relaxed mb-4">{summary}</p>
        {match.chain_id && (
          <div className="bg-sos-accent-50 rounded-lg p-3 mb-3">
            <p className="text-xs font-semibold text-sos-accent-800">3-Way Match · Step {match.chain_sequence}</p>
            <p className="text-[10px] text-sos-accent-600 capitalize">Role: {match.chain_role}</p>
          </div>
        )}
        <div className={`text-sm font-bold px-2 py-0.5 rounded-md border inline-block ${getScoreColor(match.match_score || 0)}`}>
          Score: {match.match_score}
        </div>
        <p className="text-[10px] text-sos-gray-400 mt-4">Swipe right to assign unit · Left to decline</p>
      </div>
    );
  }

  // Citizen card — warm, simple, no jargon
  if (orgType === 'citizen') {
    return (
      <div className="p-6 min-h-[420px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-sos-gray-500">Option {index + 1} of {total}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sos-accent-50 text-sos-accent-700">Help Available</span>
        </div>
        <h2 className="text-xl font-bold text-sos-blue-800 capitalize mb-2">
          {summary.split('·')[0] || 'Help Available'}
        </h2>
        <p className="text-sm text-sos-gray-600 leading-relaxed mb-4">{summary}</p>
        <p className="text-[10px] text-sos-gray-400 mt-4">Swipe right to accept this help · Left to see more options</p>
      </div>
    );
  }

  // Supply warehouse card (Greater Good)
  if (orgType === 'supply_warehouse') {
    return (
      <div className="p-6 min-h-[420px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-sos-gray-500">{index + 1} of {total}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sos-blue-50 text-sos-blue-700">📦 Supply</span>
        </div>
        <h2 className="text-xl font-bold text-sos-blue-800 capitalize mb-2">
          {summary.split('·')[0] || 'Supply Request'}
        </h2>
        <p className="text-sm text-sos-gray-600 leading-relaxed mb-4">{summary}</p>
        <div className={`text-sm font-bold px-2 py-0.5 rounded-md border inline-block ${getScoreColor(match.match_score || 0)}`}>
          Score: {match.match_score}
        </div>
        <p className="text-[10px] text-sos-gray-400 mt-4">Swipe right to dispatch · Left to skip</p>
      </div>
    );
  }

  // Default card (admin, citizen, supply_warehouse, etc.) — FULL SIZE TINDER STYLE
  const catInfo = getCategoryInfo(match);

  return (
    <div className="p-6 min-h-[420px] flex flex-col">
      {/* Counter */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] text-sos-gray-500">{index + 1} of {total}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          match.status === 'proposed' ? 'bg-sos-accent-50 text-sos-accent-700' :
          match.status === 'fulfilled' ? 'bg-green-50 text-green-700' :
          'bg-sos-gray-200 text-sos-gray-600'
        }`}>{match.status}</span>
      </div>

      {/* Big Category Icon */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className={`w-20 h-20 rounded-2xl ${catInfo.bg} flex items-center justify-center mb-5`}>
          <span className="text-4xl">{catInfo.icon}</span>
        </div>

        <h2 className="text-2xl font-bold text-sos-blue-800 capitalize mb-3">
          {summary.split('·')[0]?.trim() || 'Match Proposal'}
        </h2>

        <p className="text-base text-sos-gray-600 leading-relaxed mb-4 max-w-sm">{summary}</p>

        {match.match_reasoning && (
          <p className="text-xs text-sos-gray-500 mb-4 max-w-sm line-clamp-2">{match.match_reasoning}</p>
        )}

        <div className={`text-lg font-bold px-4 py-1.5 rounded-xl border-2 ${getScoreColor(match.match_score || 0)}`}>
          {match.match_score}
        </div>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-sos-gray-400 text-center mt-4">
        {orgType === 'citizen' ? 'Swipe right to accept help · Left for more options' :
         orgType === 'vendor' ? 'Swipe right to bid · Left to pass' :
         'Swipe right to accept · Left to decline'}
      </p>
    </div>
  );
}
