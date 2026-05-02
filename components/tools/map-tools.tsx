'use client';

import { useState } from 'react';
import { emitMapCommand } from '@/lib/map-commands';

export function categoryEmoji(cat: string): string {
  if (!cat) return '📍';
  const key = cat.toLowerCase().split('.').pop() || cat.toLowerCase();
  return CATEGORY_EMOJI[key] || CATEGORY_EMOJI[key.replace(/_/g, '')] || '📍';
}


export function sourceLabel(source: string): { text: string; cls: string } | null {
  switch (source) {
    case 'sos': case 'citizen': return { text: 'Community', cls: 'bg-green-500/20 text-green-400' };
    case 'partner': return { text: 'Partner', cls: 'bg-[#89CFF0]/20 text-[#89CFF0]' };
    case 'request': return { text: 'Request', cls: 'bg-amber-500/20 text-amber-400' };
    default: return null;
  }
}


export function SearchResults({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  const keyword = data.query || data.category || '';
  const results: MapResult[] = (data.results || []).map((r: any, i: number) => ({
    id: r.id || `r-${i}`, name: r.name, lat: r.lat || r.latitude, lng: r.lng || r.longitude,
    category: r.category || '', distance_km: r.distance_km || r.distance,
    description: r.description, address: r.address, phone: r.phone,
    source: r.source || '211',
  }));

  // Emit to map
  if (results.length > 0) {
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    results.forEach(r => {
      if (r.lat < minLat) minLat = r.lat; if (r.lat > maxLat) maxLat = r.lat;
      if (r.lng < minLng) minLng = r.lng; if (r.lng > maxLng) maxLng = r.lng;
    });
    const lp = Math.max(0.01, (maxLat - minLat) * 0.15);
    const lgp = Math.max(0.01, (maxLng - minLng) * 0.15);
    emitMapCommand({
      type: 'show_results', results,
      fitBounds: { sw: [minLat - lp, minLng - lgp], ne: [maxLat + lp, maxLng + lgp] },
      query: keyword,
      filterCategory: data.category || data.query || '',
    });
  }

  // No results
  if (results.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center space-y-2">
        <p className="text-sm text-white/60">No results found{keyword ? ` for "${keyword}"` : ''}.</p>
        <p className="text-[10px] text-white/40">Try a broader search or expand your area.</p>
        <button
          onClick={() => onSelect(`Search ${keyword || 'resources'} within 50 miles`)}
          className="mt-1 px-3 py-1.5 rounded-lg bg-[#89CFF0]/20 text-[#89CFF0] text-[11px] font-medium hover:bg-[#89CFF0]/30 transition-colors"
        >
          Expand search to 50 miles
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Result count header */}
      <p className="text-[11px] text-white/50">
        🔍 {results.length} result{results.length !== 1 ? 's' : ''}{keyword ? ` for "${keyword}"` : ''} on map
      </p>

      {/* Result cards */}
      {results.slice(0, 5).map((r) => {
        const distMi = r.distance_km != null ? Math.round(r.distance_km * 0.621 * 10) / 10 : null;
        const src = sourceLabel(r.source);
        return (
          <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1.5">
            {/* Top row: icon + name + badges */}
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5 flex-shrink-0">{categoryEmoji(r.category)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{r.name}</p>
                {r.description && (
                  <p className="text-[10px] text-white/40 truncate">{r.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {distMi != null && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#89CFF0]/15 text-[#89CFF0] font-medium whitespace-nowrap">
                    {distMi} mi
                  </span>
                )}
                {src && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${src.cls}`}>
                    {src.text}
                  </span>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-1.5 pl-6">
              <button
                onClick={() => {
                  emitMapCommand({ type: 'focus', center: [r.lng, r.lat], zoom: 15 });
                }}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
              >
                📍 Show on map
              </button>
              <button
                onClick={() => onSelect(`Tell me about ${r.name}`)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
              >
                Details
              </button>
            </div>
          </div>
        );
      })}

      {results.length > 5 && (
        <p className="text-[9px] text-white/30 text-center">+{results.length - 5} more on map</p>
      )}

      {/* Few results prompt */}
      {results.length > 0 && results.length < 3 && (
        <p className="text-[10px] text-white/40 text-center pt-1">
          Few results nearby.{' '}
          <button
            onClick={() => onSelect(`Search ${keyword || 'resources'} within 50 miles`)}
            className="text-[#89CFF0] hover:underline"
          >
            Expand your search area?
          </button>
        </p>
      )}
    </div>
  );
}


export function DangerCheck({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  return (
    <div>
      {data.prompt && <p className="text-xs text-white/60 mb-2">{data.prompt}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onSelect('Yes, someone is in danger')}
          className="py-4 rounded-xl bg-sos-red-500/20 border border-sos-red-500/30 text-center font-bold text-xs text-sos-red-400 active:scale-[0.97]">
          🚨 Yes
        </button>
        <button onClick={() => onSelect('No, just reporting')}
          className="py-4 rounded-xl bg-white/5 border border-white/10 text-center font-bold text-xs text-white/60 active:scale-[0.97]">
          ℹ️ No
        </button>
      </div>
    </div>
  );
}


