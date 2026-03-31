'use client';

import { useState } from 'react';
import { type MapResult, clearMapCommand } from '@/lib/map-commands';

const CATEGORY_ICONS: Record<string, string> = {
  shelter: '🏠', housing: '🏠', food: '🍽️', medical: '🏥', health: '💊',
  transportation: '🚗', transport: '🚗', utilities: '⚡', supplies: '📦',
  coordination: '🤝', safety: '🆘', default: '📍',
};

interface MapResultsSheetProps {
  results: MapResult[];
  query: string;
  onSelectResult: (result: MapResult) => void;
  onClose: () => void;
}

/**
 * Slide-up results card — Watch Duty style.
 * Shows search results as scrollable list.
 * Tap a result → map centers on that pin.
 */
export function MapResultsSheet({ results, query, onSelectResult, onClose }: MapResultsSheetProps) {
  const [expanded, setExpanded] = useState(false);

  function handleClose() {
    clearMapCommand();
    onClose();
  }

  return (
    <div
      className={`fixed left-0 right-0 z-30 transition-all duration-300 max-w-lg mx-auto ${
        expanded ? 'top-20 bottom-[calc(56px+env(safe-area-inset-bottom,0px))]' : 'bottom-[calc(56px+env(safe-area-inset-bottom,0px))]'
      }`}
      style={!expanded ? { maxHeight: '45vh' } : undefined}
    >
      <div className="bg-[#1A3850] rounded-t-2xl h-full flex flex-col shadow-2xl border-t border-white/10">
        {/* Drag handle */}
        <button onClick={() => setExpanded(!expanded)} className="py-2 flex justify-center">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2">
          <div>
            <p className="text-xs font-bold text-white">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            {query && <p className="text-[10px] text-white/40">{query}</p>}
          </div>
          <button onClick={handleClose} className="text-white/40 hover:text-white text-sm px-2 py-1">✕</button>
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="space-y-1.5">
            {results.map((result, i) => {
              const icon = CATEGORY_ICONS[result.category] || CATEGORY_ICONS.default;
              return (
                <button key={result.id || i} onClick={() => onSelectResult(result)}
                  className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 transition-colors active:scale-[0.99]">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-white truncate">{result.name}</p>
                        {result.distance_km != null && (
                          <span className="text-[9px] text-white/40 flex-shrink-0">{result.distance_km < 1 ? `${Math.round(result.distance_km * 1000)}m` : `${result.distance_km.toFixed(1)}mi`}</span>
                        )}
                      </div>
                      {result.description && (
                        <p className="text-[10px] text-white/50 mt-0.5 line-clamp-1">{result.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {result.address && <p className="text-[9px] text-white/30 truncate">{result.address}</p>}
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          result.source === 'partner' ? 'bg-[#89CFF0]/20 text-[#89CFF0]' :
                          result.source === '211' ? 'bg-[#EDB200]/20 text-[#EDB200]' :
                          'bg-sos-red-500/20 text-sos-red-400'
                        }`}>
                          {result.source === 'partner' ? 'Partner' : result.source === '211' ? '211' : 'SOS'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
