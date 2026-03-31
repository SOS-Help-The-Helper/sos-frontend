'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { emitMapCommand, type MapResult } from '@/lib/map-commands';
import { searchResources, getExternalResources } from '@/lib/citizen-api';
import { supabase } from '@/lib/supabase-client';

interface SOSBottomSheetProps {
  open: boolean;
  onClose: () => void;
  context: 'map' | 'feed' | 'profile';
  userLat?: number;
  userLng?: number;
}

export function SOSBottomSheet({ open, onClose, context, userLat = 35.5951, userLng = -82.5515 }: SOSBottomSheetProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [searching, setSearching] = useState(false);

  if (!open) return null;

  const contextChips: Record<string, Array<{ id: string; label: string; icon: string }>> = {
    map: [
      { id: 'resources', label: 'Resources near me', icon: '📍' },
      { id: 'shelters', label: 'Shelters within 25mi', icon: '🏠' },
      { id: 'food', label: 'Food banks nearby', icon: '🍽️' },
      { id: 'partners', label: 'Show all partners', icon: '🔵' },
      { id: 'help', label: 'I Need Help', icon: '🔴' },
      { id: 'offer', label: 'I Can Help', icon: '🤝' },
    ],
    feed: [
      { id: 'report', label: 'Report Something', icon: '📢' },
      { id: 'question', label: 'Ask a Question', icon: '❓' },
    ],
    profile: [
      { id: 'readiness', label: 'Improve Readiness', icon: '🛡️' },
      { id: 'score', label: 'My Score', icon: '📊' },
    ],
  };

  const contextTitle: Record<string, string> = {
    map: 'Search or ask for help',
    feed: 'Want to report something?',
    profile: 'How can I help?',
  };

  // Search and push results to map
  async function handleMapSearch(keyword: string, query: string) {
    setSearching(true);

    const results: MapResult[] = [];

    // Search external resources (211)
    const extResults = await searchResources(keyword, userLat, userLng);
    extResults.forEach(r => {
      if (r.latitude && r.longitude) {
        results.push({
          id: r.id, name: r.organization_name, lat: r.latitude, lng: r.longitude,
          category: r.category || keyword, distance_km: r.distance_km,
          description: r.description || r.service_name, address: r.address,
          phone: r.phone, source: '211',
        });
      }
    });

    // Also search SOS partners
    const { data: partners } = await supabase
      .from('organizations')
      .select('id, name, org_type, latitude, longitude, capabilities')
      .not('latitude', 'is', null)
      .eq('status', 'active');

    (partners || []).forEach(p => {
      if (!p.latitude || !p.longitude) return;
      // Filter by keyword match on name, org_type, or capabilities
      const matchesKeyword = !keyword ||
        p.name.toLowerCase().includes(keyword.toLowerCase()) ||
        p.org_type?.toLowerCase().includes(keyword.toLowerCase()) ||
        (p.capabilities || []).some((c: string) => c.toLowerCase().includes(keyword.toLowerCase()));
      if (!matchesKeyword) return;

      const dist = haversine(userLat, userLng, p.latitude, p.longitude);
      results.push({
        id: p.id, name: p.name, lat: p.latitude, lng: p.longitude,
        category: p.org_type || 'partner', distance_km: Math.round(dist * 10) / 10,
        description: p.org_type?.replace(/_/g, ' '), source: 'partner',
      });
    });

    // Sort by distance
    results.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));

    // Calculate bounds
    if (results.length > 0) {
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
      results.forEach(r => {
        if (r.lat < minLat) minLat = r.lat;
        if (r.lat > maxLat) maxLat = r.lat;
        if (r.lng < minLng) minLng = r.lng;
        if (r.lng > maxLng) maxLng = r.lng;
      });
      // Add padding
      const latPad = Math.max(0.01, (maxLat - minLat) * 0.15);
      const lngPad = Math.max(0.01, (maxLng - minLng) * 0.15);

      emitMapCommand({
        type: 'show_results',
        results,
        fitBounds: { sw: [minLat - latPad, minLng - lngPad], ne: [maxLat + latPad, maxLng + lngPad] },
        query,
      });
    }

    setSearching(false);
    onClose();
  }

  async function handleChip(id: string) {
    // Map-specific search chips
    if (context === 'map') {
      switch (id) {
        case 'resources': return handleMapSearch('', 'Resources near me');
        case 'shelters': return handleMapSearch('shelter', 'Shelters within 25mi');
        case 'food': return handleMapSearch('food', 'Food banks nearby');
        case 'partners': return handleMapSearch('', 'All partners');
        case 'help':
          onClose();
          router.push('/c/agent?q=I%20need%20help');
          return;
        case 'offer':
          onClose();
          router.push('/c/agent?q=I%20can%20help');
          return;
      }
    }

    // Non-map chips → agent
    onClose();
    const prompts: Record<string, string> = {
      report: 'I want to report something',
      question: 'I have a question',
      readiness: 'Help me improve my readiness score',
      score: 'Show me my SOS score breakdown',
    };
    router.push(`/c/agent?q=${encodeURIComponent(prompts[id] || id)}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    // If on map context, try to parse as a resource search
    if (context === 'map') {
      const text = input.trim().toLowerCase();
      // Detect search intent
      const isSearch = text.includes('show') || text.includes('find') || text.includes('near') ||
        text.includes('within') || text.includes('search') || text.includes('where') ||
        text.includes('resource') || text.includes('shelter') || text.includes('food') ||
        text.includes('partner') || text.includes('help with');

      if (isSearch) {
        // Extract keyword: remove common prefixes
        const keyword = text
          .replace(/show me|find|search for|where can i|resources|within \d+ ?mi(les)?|near me|nearby|help with/gi, '')
          .trim();
        return handleMapSearch(keyword || '', input.trim());
      }
    }

    // Default: route to agent
    onClose();
    router.push(`/c/agent?q=${encodeURIComponent(input.trim())}`);
  }

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-[#1A3850] rounded-t-2xl p-5 pb-[calc(env(safe-area-inset-bottom,0px)+80px)]">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

          <div className="flex items-center gap-2 mb-4">
            <img src="/logomark.svg" alt="SOS" className="h-7 w-7" />
            <p className="text-sm font-bold text-white">{contextTitle[context]}</p>
            {searching && <div className="w-4 h-4 border-2 border-sos-accent-400 border-t-transparent rounded-full animate-spin ml-auto" />}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {(contextChips[context] || []).map(chip => (
              <button key={chip.id} onClick={() => handleChip(chip.id)} disabled={searching}
                className="text-xs font-bold px-4 py-2.5 rounded-full bg-white/10 border border-white/10 text-white hover:bg-white/20 active:scale-[0.97] transition-all disabled:opacity-50">
                {chip.icon} {chip.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder={context === 'map' ? 'Search resources or ask anything...' : 'Or tell me anything...'}
              disabled={searching}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-sos-accent-400 disabled:opacity-50" />
            <button type="submit" disabled={!input.trim() || searching}
              className="w-10 h-10 rounded-xl bg-sos-red-500 text-white flex items-center justify-center disabled:opacity-30 transition-colors flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </form>

          <button onClick={() => { onClose(); router.push('/c/agent'); }}
            className="w-full text-center text-[10px] text-white/30 mt-3 hover:text-white/50">
            Open full agent ↑
          </button>
        </div>
      </div>
    </div>
  );
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
