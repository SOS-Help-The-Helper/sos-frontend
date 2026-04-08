'use client';

import { useState, useEffect } from 'react';
import { CitizenShell } from '@/components/citizen-shell';
import { SwipeCard } from '@/components/swipe-card';
import { SOSBottomSheet } from '@/components/sos-bottom-sheet';
import { CitizenHeader } from '@/components/citizen-header';
import { supabase } from '@/lib/supabase-client';
import { getPersonId } from '@/lib/person-cookie';

/**
 * Citizen Match Page — swipe through match PROPOSALS from the matches table.
 * 
 * Per spec: cards come from `matches` where status='proposed' and the match
 * references one of the citizen's requests or resources. On accept, calls
 * match-respond EF with { match_id: matches.id, response: "accept" }.
 */

interface MatchProposal {
  id: string;                    // matches.id — the actual match ID
  match_score: number;
  match_summary_masked: string | null;
  match_reasoning: string | null;
  status: string;
  created_at: string;
  request_id: string | null;
  resource_id: string | null;
  // Joined data
  request_category?: string;
  request_description?: string;
  request_urgency?: string;
  request_location?: string;
  request_lat?: number;
  request_lng?: number;
  resource_category?: string;
  resource_description?: string;
  resource_location?: string;
  resource_lat?: number;
  resource_lng?: number;
  resource_org_name?: string;
  resource_capacity?: number;
  // Direction: am I the requester or the helper?
  direction: 'i_need_help' | 'i_can_help';
}

type FilterMode = 'all' | 'for_me' | 'i_help';

const URGENCY_COLORS: Record<string, string> = {
  critical: 'border-l-[#EF4E4B] bg-[#EF4E4B]/5',
  high: 'border-l-amber-500 bg-amber-500/5',
  medium: 'border-l-[#89CFF0] bg-[#89CFF0]/5',
  low: 'border-l-white/20 bg-white/5',
};

const CATEGORY_EMOJI: Record<string, string> = {
  housing: '🏠', food_water: '🍞', medical: '🏥', transportation: '🚗',
  utilities: '⚡', debris: '🌳', supplies: '📦', clothing: '👕',
  financial: '💰', legal: '⚖️', mental_health: '💚', welfare_check: '👋',
};

function timeSince(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function MatchPage() {
  const [proposals, setProposals] = useState<MatchProposal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [acceptedMatches, setAcceptedMatches] = useState<MatchProposal[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const personId = typeof window !== 'undefined' ? getPersonId() : null;

  useEffect(() => {
    if (personId) loadProposals();
    else setLoading(false);
  }, [personId]);

  async function loadProposals() {
    setLoading(true);
    try {
      // Step 1: Get my request IDs and resource IDs
      const [{ data: myRequests }, { data: myResources }] = await Promise.all([
        supabase.from('requests').select('id').eq('person_id', personId!),
        supabase.from('resources').select('id').eq('person_id', personId!),
      ]);

      const myRequestIds = (myRequests || []).map(r => r.id);
      const myResourceIds = (myResources || []).map(r => r.id);

      if (myRequestIds.length === 0 && myResourceIds.length === 0) {
        setProposals([]);
        setLoading(false);
        return;
      }

      // Step 2: Query matches referencing my requests (resources offered TO me)
      let requestMatches: any[] = [];
      if (myRequestIds.length > 0) {
        const { data } = await supabase
          .from('matches')
          .select('id, match_score, match_summary_masked, match_reasoning, status, created_at, request_id, resource_id, resources(category, details_sanitized, location_text, latitude, longitude, capacity_available, organizations(name)), requests(category, details_sanitized, urgency, location_text, latitude, longitude)')
          .in('request_id', myRequestIds)
          .eq('status', 'proposed')
          .order('match_score', { ascending: false });
        requestMatches = (data || []).map((m: any) => ({
          ...m,
          direction: 'i_need_help' as const,
          resource_category: m.resources?.category,
          resource_description: m.resources?.details_sanitized,
          resource_location: m.resources?.location_text,
          resource_lat: m.resources?.latitude,
          resource_lng: m.resources?.longitude,
          resource_capacity: m.resources?.capacity_available,
          resource_org_name: m.resources?.organizations?.name,
          request_category: m.requests?.category,
          request_description: m.requests?.details_sanitized,
          request_urgency: m.requests?.urgency,
          request_location: m.requests?.location_text,
          request_lat: m.requests?.latitude,
          request_lng: m.requests?.longitude,
        }));
      }

      // Step 3: Query matches referencing my resources (requests I could help with)
      let resourceMatches: any[] = [];
      if (myResourceIds.length > 0) {
        const { data } = await supabase
          .from('matches')
          .select('id, match_score, match_summary_masked, match_reasoning, status, created_at, request_id, resource_id, resources(category, details_sanitized, location_text, latitude, longitude, capacity_available, organizations(name)), requests(category, details_sanitized, urgency, location_text, latitude, longitude)')
          .in('resource_id', myResourceIds)
          .eq('status', 'proposed')
          .order('match_score', { ascending: false });
        resourceMatches = (data || []).map((m: any) => ({
          ...m,
          direction: 'i_can_help' as const,
          resource_category: m.resources?.category,
          resource_description: m.resources?.details_sanitized,
          resource_location: m.resources?.location_text,
          resource_lat: m.resources?.latitude,
          resource_lng: m.resources?.longitude,
          resource_capacity: m.resources?.capacity_available,
          resource_org_name: m.resources?.organizations?.name,
          request_category: m.requests?.category,
          request_description: m.requests?.details_sanitized,
          request_urgency: m.requests?.urgency,
          request_location: m.requests?.location_text,
          request_lat: m.requests?.latitude,
          request_lng: m.requests?.longitude,
        }));
      }

      // Step 4: Deduplicate and merge (a match could appear in both if citizen has both request & resource)
      const all = [...requestMatches, ...resourceMatches];
      const unique = Array.from(new Map(all.map(m => [m.id, m])).values());
      unique.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

      setProposals(unique);
      setCurrentIndex(0);

      // Also load accepted/connected matches for the bottom section
      const acceptedIds = [...myRequestIds, ...myResourceIds];
      if (acceptedIds.length > 0) {
        // Two queries for accepted matches
        const results: any[] = [];
        if (myRequestIds.length > 0) {
          const { data } = await supabase
            .from('matches')
            .select('id, match_score, match_summary_masked, status, created_at, request_id, resource_id, resources(category, details_sanitized, organizations(name)), requests(category)')
            .in('request_id', myRequestIds)
            .in('status', ['accepted', 'connected', 'fulfilled'])
            .order('created_at', { ascending: false })
            .limit(5);
          results.push(...(data || []));
        }
        if (myResourceIds.length > 0) {
          const { data } = await supabase
            .from('matches')
            .select('id, match_score, match_summary_masked, status, created_at, request_id, resource_id, resources(category, details_sanitized, organizations(name)), requests(category)')
            .in('resource_id', myResourceIds)
            .in('status', ['accepted', 'connected', 'fulfilled'])
            .order('created_at', { ascending: false })
            .limit(5);
          results.push(...(data || []));
        }
        const uniqueAccepted = Array.from(new Map(results.map(m => [m.id, m])).values());
        setAcceptedMatches(uniqueAccepted.slice(0, 10) as any);
      }
    } catch (err) {
      console.error('Failed to load match proposals:', err);
    }
    setLoading(false);
  }

  async function handleDecision(action: 'accept' | 'skip') {
    const proposal = filteredProposals[currentIndex];
    if (!proposal) return;

    if (action === 'accept') {
      // Call match-respond EF with the actual matches.id and correct field name
      try {
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const res = await fetch(`${SUPABASE_URL}/functions/v1/match-respond`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON,
            'Authorization': `Bearer ${SUPABASE_ANON}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            match_id: proposal.id,       // matches.id — NOT request_id or resource_id
            response: 'accept',          // EF reads 'response' — NOT 'action'
            actor_id: personId,
            channel: 'citizen_app',
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('match-respond error:', err);
        }
      } catch (err) {
        console.error('Match accept failed:', err);
      }
    }

    // Advance to next card (SwipeCard handles animation)
    setCurrentIndex(prev => prev + 1);
  }

  // Apply filter mode
  const filteredProposals = proposals.filter(p => {
    if (filterMode === 'for_me') return p.direction === 'i_need_help';
    if (filterMode === 'i_help') return p.direction === 'i_can_help';
    return true;
  });

  const currentProposal = filteredProposals[currentIndex];
  const remaining = filteredProposals.length - currentIndex;

  // Card display helpers
  function getCardCategory(p: MatchProposal): string {
    if (p.direction === 'i_need_help') return p.resource_category || p.request_category || 'general';
    return p.request_category || p.resource_category || 'general';
  }
  function getCardDescription(p: MatchProposal): string {
    if (p.match_summary_masked) return p.match_summary_masked;
    if (p.direction === 'i_need_help') return p.resource_description || 'Resource available for you';
    return p.request_description || 'Someone needs help';
  }
  function getCardLocation(p: MatchProposal): string {
    if (p.direction === 'i_need_help') return p.resource_location || p.request_location || '';
    return p.request_location || p.resource_location || '';
  }
  function getCardCoords(p: MatchProposal): { lat: number; lng: number } | null {
    if (p.direction === 'i_need_help' && p.resource_lat && p.resource_lng) return { lat: p.resource_lat, lng: p.resource_lng };
    if (p.direction === 'i_can_help' && p.request_lat && p.request_lng) return { lat: p.request_lat, lng: p.request_lng };
    return null;
  }

  return (
    <CitizenShell>
      <div className="flex flex-col h-full pb-[calc(56px+env(safe-area-inset-bottom,0px))] bg-[#0F1E2B]">
        {/* Header */}
        <CitizenHeader onAgentTap={() => setSheetOpen(true)} locationName="United States" status="safe" />
        {/* Spacer for absolutely-positioned header */}
        <div className="pt-[calc(env(safe-area-inset-top,0px)+72px)] flex-shrink-0" />

        {/* Filter chips */}
        <div className="flex gap-1.5 justify-center px-4 py-4 bg-[#0F1E2B] flex-shrink-0">
          {([
            { id: 'all', label: 'All' },
            { id: 'for_me', label: 'Requests' },
            { id: 'i_help', label: 'Resources' },
          ] as { id: FilterMode; label: string }[]).map(f => (
            <button key={f.id} onClick={() => { setFilterMode(f.id); setCurrentIndex(0); }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                filterMode === f.id ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Card Stack */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {!personId ? (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">👋</p>
              <p className="text-sm text-white/50">Submit a request or offer help to see match proposals.</p>
            </div>
          ) : loading ? (
            <div className="w-8 h-8 border-2 border-[#89CFF0] border-t-transparent rounded-full animate-spin" />
          ) : !currentProposal ? (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm text-white/50">
                {filteredProposals.length === 0 && proposals.length === 0
                  ? 'No match proposals yet. The matching engine will find matches as resources become available.'
                  : "You've reviewed all match proposals."}
              </p>
              <button onClick={() => { setCurrentIndex(0); loadProposals(); }}
                className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-sm text-white/70">Refresh</button>
            </div>
          ) : (
            <SwipeCard
              key={`citizen-match-${currentProposal.id}`}
              onAccept={() => handleDecision('accept')}
              onDecline={() => handleDecision('skip')}
              acceptLabel={currentProposal.direction === 'i_need_help' ? 'Accept ✓' : 'Help ✓'}
              declineLabel="Pass"
            >
              <div className={`border-l-4 ${
                currentProposal.request_urgency ? URGENCY_COLORS[currentProposal.request_urgency] || 'bg-white/5' : 'bg-white/5'
              }`}>
                {/* Mini map */}
                <div className="h-40 bg-[#1A3850] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0F1E2B]/80" />
                  {(() => {
                    const coords = getCardCoords(currentProposal);
                    const cat = getCardCategory(currentProposal);
                    const pinColor = currentProposal.direction === 'i_need_help' ? '89cff0' : 'ef4e4b';
                    return coords ? (
                      <img
                        src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+${pinColor}(${coords.lng},${coords.lat})/${coords.lng},${coords.lat},12,0/400x200@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                        alt="Location"
                        className="w-full h-full object-cover"
                      />
                    ) : null;
                  })()}
                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white/80 font-medium">
                    📍 {getCardLocation(currentProposal) || 'Location available'}
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white/50">
                    {currentIndex + 1} / {filteredProposals.length}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Direction badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${currentProposal.direction === 'i_can_help' ? 'bg-[#EF4E4B]' : 'bg-[#89CFF0]'}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${
                      currentProposal.direction === 'i_can_help' ? 'text-[#EF4E4B]' : 'text-[#89CFF0]'
                    }`}>
                      {currentProposal.direction === 'i_need_help' ? 'Help available for you' : 'Someone needs your help'}
                    </span>
                    <span className="text-[10px] text-white/30 ml-auto">{timeSince(currentProposal.created_at)}</span>
                  </div>

                  {/* Description */}
                  <p className="text-base text-white/80 leading-relaxed mb-4">
                    {getCardDescription(currentProposal)}
                  </p>

                  {/* Chips */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/60">
                      {CATEGORY_EMOJI[getCardCategory(currentProposal)] || '📋'} {getCardCategory(currentProposal).replace(/_/g, ' ')}
                    </span>
                    {currentProposal.request_urgency && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        currentProposal.request_urgency === 'critical' ? 'bg-[#EF4E4B]/20 text-[#EF4E4B]' : 'bg-amber-500/20 text-amber-400'
                      }`}>⚡ {currentProposal.request_urgency}</span>
                    )}
                    {currentProposal.resource_capacity && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/60">Capacity: {currentProposal.resource_capacity}</span>
                    )}
                    {currentProposal.resource_org_name && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[#89CFF0]/15 text-[#89CFF0]">{currentProposal.resource_org_name}</span>
                    )}
                  </div>

                  {/* Match score */}
                  {currentProposal.match_score > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-white/30">Match Score</span>
                        <span className="text-xs font-bold text-[#89CFF0]">{currentProposal.match_score}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#89CFF0] rounded-full" style={{ width: `${Math.min(currentProposal.match_score, 100)}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Reasoning (if available) */}
                  {currentProposal.match_reasoning && (
                    <p className="text-[10px] text-white/30 mt-2 line-clamp-2">{currentProposal.match_reasoning}</p>
                  )}
                </div>
              </div>
            </SwipeCard>
          )}
        </div>

        {/* Accepted Matches */}
        {acceptedMatches.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Your Active Matches</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {acceptedMatches.map(m => (
                <div key={m.id} className="bg-white/5 rounded-xl px-3 py-2 flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    m.status === 'fulfilled' ? 'bg-green-400' : m.status === 'connected' ? 'bg-[#89CFF0]' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 truncate">
                      {(m as any).resources?.organizations?.name || (m as any).requests?.category?.replace(/_/g, ' ') || 'Match'}
                    </p>
                    <p className="text-[10px] text-white/30">{m.status} · Score: {m.match_score}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <SOSBottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} context="map" />
    </CitizenShell>
  );
}
