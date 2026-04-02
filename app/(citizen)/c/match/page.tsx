'use client';

import { useState, useEffect, useRef } from 'react';
import { CitizenShell } from '@/components/citizen-shell';
import { supabase } from '@/lib/supabase-client';

interface MatchCard {
  id: string;
  type: 'request' | 'resource';
  category: string;
  description: string;
  location_text: string;
  latitude: number;
  longitude: number;
  urgency?: string;
  capacity?: number;
  match_score?: number;
  person_name?: string;
  org_name?: string;
  created_at: string;
  source_id: string; // request_id or resource_id
}

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
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [decision, setDecision] = useState<'accept' | 'skip' | null>(null);
  const [existingMatches, setExistingMatches] = useState<any[]>([]);
  const startX = useRef(0);
  const personId = typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : null;

  useEffect(() => {
    loadCards();
    loadExistingMatches();
  }, []);

  async function loadCards() {
    setLoading(true);
    try {
      // Load resources near the user (things they could request)
      const { data: resources } = await supabase
        .from('resources')
        .select('id, category, taxonomy_code, details_sanitized, capacity_available, latitude, longitude, location_text, org_id, status, created_at, source, organizations(name)')
        .eq('status', 'active')
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      // Load active requests (things they could help with)
      const { data: requests } = await supabase
        .from('requests')
        .select('id, category, taxonomy_code, details_sanitized, urgency, household_size, latitude, longitude, location_text, status, created_at')
        .eq('status', 'active')
        .not('latitude', 'is', null)
        .order('triage_score', { ascending: false })
        .limit(20);

      const resourceCards: MatchCard[] = (resources || []).map((r: any) => ({
        id: `res-${r.id}`,
        type: 'resource' as const,
        category: r.category || 'general',
        description: r.details_sanitized || `${r.category} resource available`,
        location_text: r.location_text || '',
        latitude: r.latitude,
        longitude: r.longitude,
        capacity: r.capacity_available,
        org_name: r.organizations?.name,
        created_at: r.created_at,
        source_id: r.id,
      }));

      const requestCards: MatchCard[] = (requests || []).map((r: any) => ({
        id: `req-${r.id}`,
        type: 'request' as const,
        category: r.category || 'general',
        description: r.details_sanitized || `${r.category} needed`,
        location_text: r.location_text || '',
        latitude: r.latitude,
        longitude: r.longitude,
        urgency: r.urgency,
        created_at: r.created_at,
        source_id: r.id,
      }));

      // Interleave: resource, request, resource, request...
      const merged: MatchCard[] = [];
      const maxLen = Math.max(resourceCards.length, requestCards.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < resourceCards.length) merged.push(resourceCards[i]);
        if (i < requestCards.length) merged.push(requestCards[i]);
      }

      setCards(merged);
    } catch (err) {
      console.error('Failed to load match cards:', err);
    }
    setLoading(false);
  }

  async function loadExistingMatches() {
    if (!personId) return;
    const { data } = await supabase
      .from('matches')
      .select('id, request_id, resource_id, status, match_score, created_at, requests(category, details_sanitized, person_id), resources(category, details_sanitized, org_id, organizations(name))')
      .or(`requests.person_id.eq.${personId},resources.person_id.eq.${personId}`)
      .order('created_at', { ascending: false })
      .limit(10);
    setExistingMatches(data || []);
  }

  function handleDragStart(clientX: number) {
    startX.current = clientX;
    setIsDragging(true);
  }

  function handleDragMove(clientX: number) {
    if (!isDragging) return;
    setDragX(clientX - startX.current);
  }

  function handleDragEnd() {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX > 100) {
      handleDecision('accept');
    } else if (dragX < -100) {
      handleDecision('skip');
    } else {
      setDragX(0);
    }
  }

  async function handleDecision(action: 'accept' | 'skip') {
    const card = cards[currentIndex];
    if (!card) return;

    setDecision(action);

    if (action === 'accept') {
      // Create match via match-respond EF or direct write
      try {
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        await fetch(`${SUPABASE_URL}/functions/v1/match-respond`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            match_id: card.source_id,
            action: 'accept',
            notes: `Swiped right from match tab (${card.type})`,
          }),
        });
      } catch (err) {
        console.error('Match accept failed:', err);
      }
    }

    // Animate out then advance
    setTimeout(() => {
      setDragX(0);
      setDecision(null);
      setCurrentIndex(prev => prev + 1);
    }, 300);
  }

  const currentCard = cards[currentIndex];
  const remaining = cards.length - currentIndex;

  return (
    <CitizenShell>
      <div className="flex flex-col h-full pb-[calc(56px+env(safe-area-inset-bottom,0px))] bg-[#0F1E2B]">
        {/* Header */}
        <div className="bg-[#1A3850] px-5 py-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-sm font-bold text-white">Match</span>
            {remaining > 0 && <span className="text-[10px] text-white/40 ml-2">{remaining} available</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setCurrentIndex(0); loadCards(); }} className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/50">Refresh</button>
          </div>
        </div>

        {/* Card Stack */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {loading ? (
            <div className="w-8 h-8 border-2 border-[#89CFF0] border-t-transparent rounded-full animate-spin" />
          ) : !currentCard ? (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm text-white/50">You've seen all available matches.</p>
              <button onClick={() => { setCurrentIndex(0); loadCards(); }}
                className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-sm text-white/70">Refresh</button>
            </div>
          ) : (
            <div
              className="w-full max-w-sm relative cursor-grab active:cursor-grabbing select-none"
              style={{
                transform: `translateX(${decision === 'accept' ? 300 : decision === 'skip' ? -300 : dragX}px) rotate(${(decision === 'accept' ? 15 : decision === 'skip' ? -15 : dragX * 0.05)}deg)`,
                transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: decision ? 0.5 : 1,
              }}
              onMouseDown={e => handleDragStart(e.clientX)}
              onMouseMove={e => handleDragMove(e.clientX)}
              onMouseUp={handleDragEnd}
              onMouseLeave={() => { if (isDragging) handleDragEnd(); }}
              onTouchStart={e => handleDragStart(e.touches[0].clientX)}
              onTouchMove={e => handleDragMove(e.touches[0].clientX)}
              onTouchEnd={handleDragEnd}
            >
              {/* Swipe indicators */}
              {dragX > 40 && (
                <div className="absolute top-6 right-6 z-10 px-3 py-1 rounded-full bg-green-500/20 border-2 border-green-500 text-green-400 text-sm font-bold rotate-12">
                  HELP ✓
                </div>
              )}
              {dragX < -40 && (
                <div className="absolute top-6 left-6 z-10 px-3 py-1 rounded-full bg-red-500/20 border-2 border-red-500 text-red-400 text-sm font-bold -rotate-12">
                  SKIP ✕
                </div>
              )}

              {/* Card */}
              <div className={`rounded-2xl overflow-hidden border border-white/10 ${
                currentCard.urgency ? URGENCY_COLORS[currentCard.urgency] || 'bg-white/5' : 'bg-white/5'
              } border-l-4`}>
                {/* Mini map area */}
                <div className="h-40 bg-[#1A3850] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0F1E2B]/80" />
                  {/* Mapbox static image */}
                  {currentCard.latitude && currentCard.longitude && (
                    <img
                      src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+${currentCard.type === 'request' ? 'ef4e4b' : '89cff0'}(${currentCard.longitude},${currentCard.latitude})/${currentCard.longitude},${currentCard.latitude},12,0/400x200@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                      alt="Location"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Distance badge */}
                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white/80 font-medium">
                    📍 {currentCard.location_text || 'Location available'}
                  </div>
                  {/* Stack counter */}
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white/50">
                    {currentIndex + 1} / {cards.length}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Type badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${currentCard.type === 'request' ? 'bg-[#EF4E4B]' : 'bg-[#89CFF0]'}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${currentCard.type === 'request' ? 'text-[#EF4E4B]' : 'text-[#89CFF0]'}`}>
                      {currentCard.type === 'request' ? 'Someone needs help' : 'Help available'}
                    </span>
                    <span className="text-[10px] text-white/30 ml-auto">{timeSince(currentCard.created_at)}</span>
                  </div>

                  {/* Description */}
                  <p className="text-base text-white/80 leading-relaxed mb-4">
                    {currentCard.description}
                  </p>

                  {/* Chips */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/60">
                      {CATEGORY_EMOJI[currentCard.category] || '📋'} {currentCard.category.replace(/_/g, ' ')}
                    </span>
                    {currentCard.urgency && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        currentCard.urgency === 'critical' ? 'bg-[#EF4E4B]/20 text-[#EF4E4B]' : 'bg-amber-500/20 text-amber-400'
                      }`}>⚡ {currentCard.urgency}</span>
                    )}
                    {currentCard.capacity && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/60">Capacity: {currentCard.capacity}</span>
                    )}
                    {currentCard.org_name && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[#89CFF0]/15 text-[#89CFF0]">{currentCard.org_name}</span>
                    )}
                  </div>

                  {/* Match score bar (if available) */}
                  {currentCard.match_score && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-white/30">Match Score</span>
                        <span className="text-xs font-bold text-[#89CFF0]">{currentCard.match_score}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#89CFF0] rounded-full" style={{ width: `${currentCard.match_score}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons (below card) */}
          {currentCard && (
            <div className="flex gap-6 mt-6">
              <button
                onClick={() => handleDecision('skip')}
                className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
              <button
                onClick={() => handleDecision('accept')}
                className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-all active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </button>
            </div>
          )}
        </div>

        {/* Existing Matches */}
        {existingMatches.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Your Active Matches</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {existingMatches.map(m => (
                <div key={m.id} className="bg-white/5 rounded-xl px-3 py-2 flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    m.status === 'fulfilled' ? 'bg-green-400' : m.status === 'accepted' ? 'bg-[#89CFF0]' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 truncate">
                      {m.resources?.organizations?.name || m.requests?.category?.replace(/_/g, ' ') || 'Match'}
                    </p>
                    <p className="text-[10px] text-white/30">{m.status} · Score: {m.match_score}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CitizenShell>
  );
}
