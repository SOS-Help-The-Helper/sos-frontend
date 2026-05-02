'use client';

import { useState, useEffect } from 'react';
// TODO: rewire to lib/api.ts (Phase 3-5) — import { Match, getScoreColor } from '@/lib/match-queries';
import { measureText } from '@/lib/text-measure';
import { TextReveal } from './text-reveal';
import { BalancedText } from './balanced-text';

interface MatchSwipeContentProps {
  match: Match;
  orgType?: string;
  index: number;
  total: number;
}

const CATEGORY_ICONS: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  housing: { icon: '🏠', label: 'Housing', color: 'text-sos-accent-700', bg: 'bg-sos-accent-50' },
  shelter: { icon: '🏠', label: 'Shelter', color: 'text-sos-accent-700', bg: 'bg-sos-accent-50' },
  emergency_shelter: { icon: '🏠', label: 'Emergency Shelter', color: 'text-sos-accent-700', bg: 'bg-sos-accent-50' },
  rv_housing: { icon: '🚐', label: 'RV Housing', color: 'text-sos-accent-700', bg: 'bg-sos-accent-50' },
  food_water: { icon: '🍽️', label: 'Food & Water', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  food: { icon: '🍽️', label: 'Food', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  medical: { icon: '🏥', label: 'Medical', color: 'text-sos-red-700', bg: 'bg-sos-red-50' },
  transport: { icon: '🚛', label: 'Transport', color: 'text-sos-blue-700', bg: 'bg-sos-blue-50' },
  transportation: { icon: '🚛', label: 'Transportation', color: 'text-sos-blue-700', bg: 'bg-sos-blue-50' },
  supplies: { icon: '📦', label: 'Supplies', color: 'text-sos-blue-700', bg: 'bg-sos-blue-50' },
  debris: { icon: '🌳', label: 'Debris Removal', color: 'text-green-700', bg: 'bg-green-50' },
  debris_removal: { icon: '🌳', label: 'Debris Removal', color: 'text-green-700', bg: 'bg-green-50' },
  utilities: { icon: '⚡', label: 'Utilities', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  power_generation: { icon: '⚡', label: 'Power', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  repairs: { icon: '🔧', label: 'Repairs', color: 'text-sos-gray-700', bg: 'bg-sos-gray-200' },
  clothing: { icon: '👕', label: 'Clothing', color: 'text-sos-blue-700', bg: 'bg-sos-blue-50' },
  pet_care: { icon: '🐾', label: 'Pet Care', color: 'text-sos-accent-700', bg: 'bg-sos-accent-50' },
  welfare_check: { icon: '👋', label: 'Welfare Check', color: 'text-sos-red-700', bg: 'bg-sos-red-50' },
  missing_person: { icon: '🔍', label: 'Missing Person', color: 'text-sos-red-700', bg: 'bg-sos-red-50' },
};

function detectCategory(summary: string): string {
  const lower = summary.toLowerCase();
  // Check each keyword
  if (lower.includes('food') || lower.includes('meal') || lower.includes('feeding')) return 'food';
  if (lower.includes('housing') || lower.includes('shelter') || lower.includes('rv') || lower.includes('roof')) return 'housing';
  if (lower.includes('medical') || lower.includes('oxygen') || lower.includes('diabetic') || lower.includes('medication')) return 'medical';
  if (lower.includes('transport') || lower.includes('ride') || lower.includes('vehicle')) return 'transportation';
  if (lower.includes('debris') || lower.includes('tree') || lower.includes('chainsaw')) return 'debris';
  if (lower.includes('supply') || lower.includes('supplies') || lower.includes('generator') || lower.includes('tarp')) return 'supplies';
  if (lower.includes('power') || lower.includes('electric') || lower.includes('utility')) return 'utilities';
  if (lower.includes('water') && !lower.includes('food')) return 'food_water';
  if (lower.includes('cloth') || lower.includes('blanket')) return 'clothing';
  if (lower.includes('pet') || lower.includes('animal') || lower.includes('dog') || lower.includes('cat')) return 'pet_care';
  if (lower.includes('repair') || lower.includes('fix')) return 'repairs';
  return '';
}

function parseSummary(summary: string) {
  // Parse "High · Food · 4 people, children · 0.6 mi from Church" into structured parts
  const parts = summary.split('·').map(s => s.trim()).filter(Boolean);
  
  let urgency = '';
  let category = '';
  let details: string[] = [];
  let distance = '';
  
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (['critical', 'high', 'standard', 'low', 'medium'].includes(lower)) {
      urgency = part;
    } else if (['food', 'housing', 'shelter', 'medical', 'transport', 'supplies', 'debris', 'utilities', 'repairs', 'clothing', 'food_water', 'food & water', 'pet care', 'welfare check'].some(c => lower.includes(c))) {
      category = part;
    } else if (lower.includes('mi from') || lower.includes('mile')) {
      distance = part;
    } else {
      details.push(part);
    }
  }
  
  return { urgency, category, details, distance };
}

export function MatchSwipeContent({ match, orgType, index, total }: MatchSwipeContentProps) {
  const summary = match.match_summary_masked || `Score ${match.match_score}`;
  const parsed = parseSummary(summary);
  const detectedCat = detectCategory(summary);
  const catKey = detectedCat || parsed.category.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_');
  const catInfo = CATEGORY_ICONS[catKey] || { icon: '🆘', label: parsed.category || 'SOS', color: 'text-sos-red-700', bg: 'bg-sos-red-50' };

  // Pretext: content-aware card sizing
  const [cardMinH, setCardMinH] = useState(380);
  useEffect(() => {
    const allText = [summary, match.match_reasoning || ''].join(' ');
    measureText(allText, '16px Roboto, sans-serif', 280, 24).then(result => {
      if (result) {
        const computed = 264 + result.height;
        setCardMinH(Math.max(340, Math.min(520, computed)));
      }
    });
  }, [summary, match.match_reasoning]);

  const urgencyColor = parsed.urgency.toLowerCase() === 'critical' ? 'bg-sos-red-500 text-white' :
    parsed.urgency.toLowerCase() === 'high' ? 'bg-sos-red-100 text-sos-red-700' :
    parsed.urgency.toLowerCase() === 'standard' ? 'bg-sos-accent-100 text-sos-accent-700' :
    'bg-sos-gray-200 text-sos-gray-600';

  // Action label based on org type
  const actionHint = orgType === 'citizen' ? 'Swipe right to accept help · Left for more options' :
    orgType === 'vendor' ? 'Swipe right to bid · Left to pass' :
    orgType === 'coordination' ? 'Swipe right to approve · Left to reassign' :
    orgType === 'food_service' ? 'Swipe right to send to site · Left to skip' :
    orgType === 'transport_housing' ? 'Swipe right to assign unit · Left to decline' :
    orgType === 'supply_warehouse' ? 'Swipe right to dispatch · Left to skip' :
    'Swipe right to accept · Left to decline';

  return (
    <div className="p-6 flex flex-col" style={{ minHeight: `${cardMinH}px` }}>
      {/* Top bar: counter + urgency */}
      <div className="flex items-center justify-between mb-8">
        <span className="text-xs text-white/50 font-medium">{index + 1} of {total}</span>
        {parsed.urgency && (
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${urgencyColor}`}>
            {parsed.urgency}
          </span>
        )}
      </div>

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Big category icon */}
        <div className={`w-24 h-24 rounded-3xl ${catInfo.bg} flex items-center justify-center mb-6 shadow-sm`}>
          <span className="text-5xl">{catInfo.icon}</span>
        </div>

        {/* Category label */}
        <BalancedText as="h2" className="text-2xl font-bold text-white mb-3" font="700 24px Roboto, sans-serif" maxWidth={280}>
          {catInfo.label}
        </BalancedText>

        {/* Detail lines — cascade reveal */}
        <div className="mb-5 text-base text-white/70">
          <TextReveal
            text={parsed.details.join('. ') + (parsed.distance ? `. 📍 ${parsed.distance}` : '')}
            mode="cascade"
            maxWidth={280}
            stagger={60}
            delay={150}
            font="16px Roboto, sans-serif"
          />
        </div>

        {/* Score */}
        <div className={`text-xl font-bold px-5 py-2 rounded-xl border-2 ${getScoreColor(match.match_score || 0)}`}>
          {match.match_score}
        </div>

        {/* Chain indicator */}
        {match.chain_id && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-xs text-sos-accent-400 font-medium">
              🔗 Chain step {match.chain_sequence}
            </span>
            {match.chain_role && (
              <span className="text-xs text-white/50 capitalize">· {match.chain_role}</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <p className="text-[10px] text-white/30 text-center mt-4">{actionHint}</p>
    </div>
  );
}
