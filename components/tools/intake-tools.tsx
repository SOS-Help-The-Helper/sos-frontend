'use client';

import { useState } from 'react';
import { TapCardGrid, CounterCards, ToggleChips } from '../agent-tap-cards';

export function CategoryCards({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div className="space-y-2">
      {data.prompt && <p className="text-xs text-white/60 mb-1">{data.prompt}</p>}
      <TapCardGrid
        options={data.options || []}
        multiSelect
        selected={selected}
        onSelect={(id) => {
          const next = selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id];
          setSelected(next);
          // Single tap sends immediately for speed; multi-select needs a "done" action
          if (next.length === 1 && selected.length === 0) {
            const opt = (data.options || []).find((o: any) => o.id === id);
            onSelect(`I need help with ${opt?.label || id}`);
          }
        }}
      />
      {selected.length > 1 && (
        <button onClick={() => {
          const labels = selected.map(s => (data.options || []).find((o: any) => o.id === s)?.label || s);
          onSelect(`I need help with ${labels.join(' and ')}`);
        }} className="text-[10px] font-bold text-sos-red-400">
          Continue with {selected.length} selected →
        </button>
      )}
    </div>
  );
}


export function CounterSelection({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  return (
    <div>
      {data.prompt && <p className="text-xs text-white/60 mb-2">{data.prompt}</p>}
      <CounterCards
        options={data.options || [
          { id: '1', label: '1' }, { id: '2-3', label: '2-3' },
          { id: '4-6', label: '4-6' }, { id: '7+', label: '7+' },
        ]}
        onSelect={(id) => onSelect(`${id} people`)}
      />
    </div>
  );
}


export function CircumstanceChips({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const options = data.options || [
    { id: 'children', icon: '👶', label: 'Children' },
    { id: 'elderly', icon: '👴', label: 'Elderly' },
    { id: 'pets', icon: '🐕', label: 'Pets' },
    { id: 'accessibility', icon: '♿', label: 'Accessibility' },
  ];

  function handleConfirm() {
    const parts: string[] = [];
    if (selected.length > 0) {
      const labels = selected.map(s => options.find((o: any) => o.id === s)?.label || s);
      parts.push(`Special circumstances: ${labels.join(', ')}`);
    }
    if (freeText.trim()) {
      parts.push(freeText.trim());
    }
    if (parts.length === 0) {
      onSelect('None of these');
    } else {
      onSelect(parts.join('. '));
    }
  }

  return (
    <div>
      {data.prompt && <p className="text-xs text-white/60 mb-2">{data.prompt}</p>}
      <ToggleChips
        options={options}
        selected={selected}
        onToggle={(id) => setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])}
        onDone={handleConfirm}
      />
      {data.showFreeText && (
        <input
          type="text"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder={data.freeTextPlaceholder || 'Anything else you would like to add?'}
          className="w-full mt-2 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#89CFF0]"
        />
      )}
      <button onClick={() => onSelect('None of these')}
        className="text-[10px] text-white/30 mt-1 hover:text-white/50">None of these</button>
    </div>
  );
}


export function LocationInput({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  const [detecting, setDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  function detectGPS() {
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetecting(false);
        onSelect(`📍 My location: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      () => { setDetecting(false); onSelect('Unable to detect GPS — please type your address'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function searchPlaces(query: string) {
    setSearchQuery(query);
    if (query.length < 3) { setResults([]); return; }
    try {
      const KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY || '';
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${KEY}`);
      const json = await res.json();
      setResults((json.results || []).slice(0, 4).map((r: any) => ({
        name: r.formatted_address, lat: r.geometry.location.lat, lng: r.geometry.location.lng,
      })));
    } catch { setResults([]); }
  }

  return (
    <div className="space-y-2">
      {data.prompt && <p className="text-xs text-white/60 mb-1">{data.prompt}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={detectGPS} disabled={detecting}
          className="flex flex-col items-center gap-1 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-xs font-bold active:scale-[0.97] disabled:opacity-50">
          {detecting ? <div className="w-4 h-4 border-2 border-sos-accent-400 border-t-transparent rounded-full animate-spin" /> : <span className="text-lg">📍</span>}
          {detecting ? 'Detecting...' : 'My Location'}
        </button>
        <button onClick={() => document.getElementById('loc-search')?.focus()}
          className="flex flex-col items-center gap-1 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-xs font-bold active:scale-[0.97]">
          <span className="text-lg">🔍</span>
          Type Address
        </button>
      </div>
      <div className="relative">
        <input id="loc-search" type="text" value={searchQuery} onChange={e => searchPlaces(e.target.value)}
          placeholder="Search address..."
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-sos-accent-400" />
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A3850] rounded-lg border border-white/10 shadow-lg z-10 overflow-hidden">
            {results.map((p, i) => (
              <button key={i} onClick={() => { onSelect(`📍 ${p.name}`); setResults([]); setSearchQuery(''); }}
                className="w-full text-left px-3 py-2 text-[10px] text-white/80 hover:bg-white/10 border-b border-white/5 last:border-0">
                📍 {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );


