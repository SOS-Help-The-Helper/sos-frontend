'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TapCardGrid, QuickChips, CounterCards, ToggleChips } from './agent-tap-cards';
import { emitMapCommand, type MapResult } from '@/lib/map-commands';
import { getSOSScore } from '@/lib/citizen-api';
import { setPersonId } from '@/lib/person-cookie';

interface ToolRendererProps {
  toolData: any; // parsed JSON from tool result
  onUserAction: (message: string) => void; // sends user's selection as next message
}

/**
 * Renders interactive UI components from AI SDK tool results.
 * Each tool yields JSON with __tool field indicating which component to render.
 * User taps → calls onUserAction which appends a user message to the chat.
 */
export function AIToolRenderer({ toolData, onUserAction }: ToolRendererProps) {
  const tool = toolData?.__tool;
  if (!tool) return null;

  // Generic map command emitter — any tool with __mapCommand updates the map
  // Skip for submit_confirmation — it fires the map command after its overlay fades
  const mapCmd = toolData?.__mapCommand;
  if (mapCmd && tool !== 'submit_confirmation' && typeof window !== 'undefined') {
    // Emit once (use a ref-like check via data attribute)
    const cmdKey = JSON.stringify(mapCmd).substring(0, 100);
    if (!(window as any).__lastMapCmd || (window as any).__lastMapCmd !== cmdKey) {
      (window as any).__lastMapCmd = cmdKey;
      emitMapCommand(mapCmd);
    }
  }

  switch (tool) {
    case 'show_categories':
      return <CategoryCards data={toolData} onSelect={onUserAction} />;
    case 'show_counter':
      return <CounterSelection data={toolData} onSelect={onUserAction} />;
    case 'show_circumstances':
      return <CircumstanceChips data={toolData} onSelect={onUserAction} />;
    case 'get_location':
      return <LocationInput data={toolData} onSelect={onUserAction} />;
    case 'show_helper_type':
      return <HelperTypeChips data={toolData} onSelect={onUserAction} />;
    case 'show_availability':
      return <AvailabilityChips data={toolData} onSelect={onUserAction} />;
    case 'search_results':
      return <SearchResults data={toolData} onSelect={onUserAction} />;
    case 'show_score':
      return <ScoreDisplay data={toolData} />;
    case 'show_phone_input':
      return <PhoneInput data={toolData} onSelect={onUserAction} />;
    case 'submit_confirmation':
      return <SubmitConfirmation data={toolData} />;
    case 'capture_photo':
      return <PhotoCapture data={toolData} onSelect={onUserAction} />;
    case 'show_danger_check':
      return <DangerCheck data={toolData} onSelect={onUserAction} />;
    case 'fema_status':
      return <FEMACard data={toolData} />;
    case 'escalation_confirmed':
      return <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4"><p className="text-amber-200 text-sm font-medium">⚡ {toolData.message || 'Escalated to coordination team.'}</p></div>;
    case 'match_confirmed':
      return <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4"><p className="text-green-200 text-sm font-medium">✅ {toolData.message || 'Match confirmed!'}</p></div>;

    case 'show_chips':
      return <div className="space-y-2">
        {toolData.prompt && <p className="text-xs text-white/60 mb-1">{toolData.prompt}</p>}
        <TapCardGrid
          options={(toolData.chips || []).map((c: any) => ({ id: c.id, icon: c.icon || '', label: c.label || c.id }))}
          columns={toolData.chips?.length <= 2 ? 2 : 3}
          onSelect={(id) => {
            const chip = (toolData.chips || []).find((c: any) => c.id === id);
            onUserAction(chip?.label || id);
          }}
        />
      </div>;

    case 'show_toggle_chips':
      return <ToggleChipWrapper options={toolData.options || []} prompt={toolData.prompt} onAction={onUserAction} />;

    case 'show_sos_confirmation':
      return <SOSConfirmationCard summary={toolData.summary} type={toolData.type} details={toolData.details} onAction={onUserAction} />;

    // ── Map Intelligence Renderers ──
    case 'nearby_summary': {
      const cats = toolData.summary?.categories || {};
      const sortedCats = Object.entries(cats).sort((a: any, b: any) => b[1] - a[1]);
      const radiusMi = Math.round((toolData.summary?.radius || 8) * 0.621 * 10) / 10;
      const closestText = toolData.summary?.closest?.replace(/\d+(\.\d+)?km/, (m: string) => {
        const mi = Math.round(parseFloat(m) * 0.621 * 10) / 10;
        return `${mi}mi`;
      }) || toolData.summary?.closest;
      return (
        <div className="bg-white/5 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">📍 Nearby</p>
          <p className="text-sm text-white/70">{toolData.summary?.total || 0} resources within {radiusMi}mi</p>
          {closestText && <p className="text-xs text-[#89CFF0]">Closest: {closestText}</p>}
          {sortedCats.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {sortedCats.map(([cat, count]: [string, any]) => (
                <button key={cat} onClick={() => onUserAction(`Find ${cat.replace(/_/g, ' ')} near me`)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors cursor-pointer">
                  {cat.replace(/_/g, ' ')}: {count}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
    case 'route_result':
      return toolData.error ? (
        <div className="bg-red-500/10 rounded-xl p-3"><p className="text-xs text-red-400">{toolData.error}</p></div>
      ) : (
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">🗺️ Route</p>
          <p className="text-sm text-white/70 mt-1">To: {toolData.destName}</p>
          <div className="flex gap-3 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#89CFF0]/20 text-[#89CFF0]">{Math.round(toolData.distance_km * 0.621 * 10) / 10}mi</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#89CFF0]/20 text-[#89CFF0]">{toolData.duration_min} min</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{toolData.mode}</span>
          </div>
        </div>
      );
    case 'disaster_zone':
      return (
        <div className="bg-amber-900/20 border border-amber-500/20 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">⚠️ Disaster Zone</p>
          <p className="text-sm text-white/70 mt-1">{toolData.name}</p>
          <p className="text-xs text-white/40 mt-1">Status: {toolData.status}</p>
        </div>
      );
    case 'comparison_result':
      return (
        <div className="bg-white/5 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">📊 Comparison</p>
          {(toolData.results || []).map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
              <span className="text-sm font-bold text-[#89CFF0] w-6">#{r.rank}</span>
              <div className="flex-1">
                <p className="text-sm text-white/70">{r.name}</p>
                <p className="text-[10px] text-white/40">{r.reason?.replace(/\d+(\.\d+)?km/g, (m: string) => Math.round(parseFloat(m) * 0.621 * 10) / 10 + 'mi')}</p>
              </div>
            </div>
          ))}
          {toolData.recommendation && <p className="text-xs text-[#89CFF0] mt-1">→ {toolData.recommendation}</p>}
        </div>
      );
    case 'coverage_gaps':
      return (
        <div className={`rounded-xl p-4 ${toolData.gapCount > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: toolData.gapCount > 0 ? '#EF4E4B' : '#34d399' }}>
            {toolData.gapCount > 0 ? '⚠️ Coverage Gaps Found' : '✅ Good Coverage'}
          </p>
          <p className="text-sm text-white/70 mt-1">{toolData.message}</p>
          <div className="flex gap-3 mt-2 text-xs text-white/40">
            <span>Requests: {toolData.totalRequests}</span>
            <span>Resources: {toolData.totalResources}</span>
          </div>
        </div>
      );
    case 'activity_feed':
      return (
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">📡 Activity</p>
          <p className="text-sm text-white/70 mt-1">{toolData.message}</p>
        </div>
      );
    case 'risk_assessment':
      return (
        <div className={`rounded-xl p-4 ${toolData.safe ? 'bg-green-500/10 border border-green-500/20' : 'bg-amber-900/20 border border-amber-500/20'}`}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: toolData.safe ? '#34d399' : '#f59e0b' }}>
            {toolData.safe ? '✅ No Active Alerts' : `⚠️ ${toolData.alertCount} Alert(s)`}
          </p>
          <p className="text-sm text-white/70 mt-1">{toolData.message}</p>
          {(toolData.alerts || []).map((a: any, i: number) => (
            <div key={i} className="mt-2 text-xs text-white/50">{a.severity}: {a.label}</div>
          ))}
        </div>
      );
    case 'sos_tracker':
      return (
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">📍 Your SOS Status</p>
          <p className="text-sm text-white/70 mt-1">{toolData.message}</p>
          {toolData.hasMatch && (
            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-[#89CFF0]/20 text-[#89CFF0]">
              Match: {toolData.matchStatus}
            </span>
          )}
        </div>
      );
    case 'bookmark_confirmed':
      return (
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-sm text-white/70">⭐ {toolData.message}</p>
        </div>
      );
    case 'location_shared':
      return (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <p className="text-xs font-bold text-green-400 uppercase tracking-wider">📍 Location Shared</p>
          <p className="text-sm text-white/70 mt-1">{toolData.message}</p>
        </div>
      );
    case 'referral_card':
      return <ReferralCard data={toolData} />;
    default:
      return <p className="text-[10px] text-white/30">Unknown tool: {tool}</p>;
  }
}

// --- Individual tool components ---

function CategoryCards({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
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

function CounterSelection({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
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

function CircumstanceChips({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
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

function LocationInput({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
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
}

function HelperTypeChips({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  const options = data.options || [
    { id: 'skills', label: 'Skills & Equipment', icon: '🔧' },
    { id: 'time', label: 'My Time', icon: '🚶' },
    { id: 'both', label: 'Both', icon: '💪' },
  ];
  return (
    <div>
      {data.prompt && <p className="text-xs text-white/60 mb-2">{data.prompt}</p>}
      <QuickChips chips={options} onSelect={(id) => {
        const opt = options.find((o: any) => o.id === id);
        onSelect(`I can offer ${opt?.label || id}`);
      }} />
    </div>
  );
}

function AvailabilityChips({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  const options = data.options || [
    { id: 'now', label: 'Available now', icon: '⚡' },
    { id: 'scheduled', label: 'Scheduled', icon: '📅' },
    { id: 'ongoing', label: 'Ongoing', icon: '🔄' },
  ];
  return (
    <div>
      {data.prompt && <p className="text-xs text-white/60 mb-2">{data.prompt}</p>}
      <QuickChips chips={options} onSelect={(id) => {
        const opt = options.find((o: any) => o.id === id);
        onSelect(`Availability: ${opt?.label || id}`);
      }} />
    </div>
  );
}

const CATEGORY_EMOJI: Record<string, string> = {
  food_water: '🍽️', food: '🍽️', housing: '🏠', shelter: '🏠', health: '🏥', medical: '🏥',
  mental_health: '🧠', transport: '🚗', transportation: '🚗', clothing: '👕', utilities: '💡',
  legal: '⚖️', employment: '💼', education: '📚', childcare: '👶', financial: '💰',
  supplies: '📦', communication: '📱', pets: '🐾', debris: '🧹', volunteer: '🤝',
};

function categoryEmoji(cat: string): string {
  if (!cat) return '📍';
  const key = cat.toLowerCase().split('.').pop() || cat.toLowerCase();
  return CATEGORY_EMOJI[key] || CATEGORY_EMOJI[key.replace(/_/g, '')] || '📍';
}

function sourceLabel(source: string): { text: string; cls: string } | null {
  switch (source) {
    case 'sos': case 'citizen': return { text: 'Community', cls: 'bg-green-500/20 text-green-400' };
    case 'partner': return { text: 'Partner', cls: 'bg-[#89CFF0]/20 text-[#89CFF0]' };
    case 'request': return { text: 'Request', cls: 'bg-amber-500/20 text-amber-400' };
    default: return null;
  }
}

function SearchResults({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
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

function ScoreDisplay({ data }: { data: any }) {
  const s = data.score || data;
  const total = s.total || 0;
  const pct = total / 100;
  const color = pct >= 0.7 ? '#22C55E' : pct >= 0.4 ? '#89CFF0' : '#EF4E4B';

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${pct * 238.76} ${238.76 - pct * 238.76}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{total}</span>
        </div>
      </div>
      <div className="flex-1 space-y-1">
        {[{ l: '🛡️', v: s.readiness || 0, m: 40 }, { l: '🤝', v: s.community || 0, m: 30 }, { l: '⭐', v: s.impact || 0, m: 30 }].map(p => (
          <div key={p.l} className="flex items-center gap-1.5">
            <span className="text-[9px] w-8">{p.l} {p.v}</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full"><div className="h-full rounded-full bg-white/40" style={{ width: `${(p.v / p.m) * 100}%` }} /></div>
          </div>
        ))}
        {s.next_action && <p className="text-[9px] text-sos-red-400">Next: {s.next_action}</p>}
      </div>
    </div>
  );
}

function SubmitConfirmation({ data }: { data: any }) {
  const [visible, setVisible] = useState(data.success !== false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (data.personId) {
      setPersonId(data.personId);
    }
  }, [data.personId]);

  useEffect(() => {
    if (!visible) return;
    const fadeTimer = setTimeout(() => setFading(true), 2000);
    const removeTimer = setTimeout(() => {
      setVisible(false);
      // Close the agent sheet so map is visible
      window.dispatchEvent(new CustomEvent('sos-close-sheet'));
      // Fire map command after overlay clears
      if (data.__mapCommand) {
        emitMapCommand(data.__mapCommand);
      }
    }, 2500);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, [visible, data.__mapCommand]);

  if (data.success === false) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
        <span className="text-2xl">❌</span>
        <p className="text-xs font-bold text-red-400 mt-1">{data.title || 'Error'}</p>
        {data.message && <p className="text-[10px] text-white/50 mt-0.5">{data.message}</p>}
      </div>
    );
  }

  if (!visible) return null;

  const overlay = (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0F1E2B] transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sos-radar-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(3); opacity: 0; }
        }
      ` }} />
      {/* Logomark with radar rings */}
      <div className="relative flex items-center justify-center" style={{ width: 192, height: 192 }}>
        <span
          className="absolute rounded-full border-2 border-[#EF4E4B]"
          style={{ width: 96, height: 96, top: 48, left: 48, animation: 'sos-radar-ring 2.5s ease-out infinite' }}
        />
        <span
          className="absolute rounded-full border-2 border-[#EF4E4B]"
          style={{ width: 96, height: 96, top: 48, left: 48, animation: 'sos-radar-ring 2.5s ease-out 0.8s infinite' }}
        />
        <span
          className="absolute rounded-full border-2 border-[#EF4E4B]"
          style={{ width: 96, height: 96, top: 48, left: 48, animation: 'sos-radar-ring 2.5s ease-out 1.6s infinite' }}
        />
        <img src="/logomark.svg" alt="SOS" className="relative z-10" style={{ width: 96, height: 96 }} />
      </div>
      <p className="text-white text-xl font-bold mt-6">SOS Submitted</p>
      <p className="text-white/50 text-sm mt-3">Searching for help near you...</p>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(overlay, document.body);
}

function PhoneInput({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      onSelect(`+1${digits}`);
    } else if (digits.length === 11 && digits.startsWith('1')) {
      onSelect(`+${digits}`);
    } else {
      setError('Enter a valid 10-digit US phone number');
    }
  }

  return (
    <div className="space-y-2">
      {data.prompt && <p className="text-xs text-white/60 mb-1">{data.prompt}</p>}
      <div className="flex gap-2">
        <span className="flex items-center text-xs text-white/40 px-2 py-2 bg-white/5 rounded-lg border border-white/10">+1</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="(555) 123-4567"
          className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#89CFF0]"
        />
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      <button
        onClick={handleSubmit}
        className="w-full py-2.5 rounded-xl bg-[#EF4E4B] text-white text-xs font-bold active:scale-[0.97] hover:bg-[#d94340] transition-colors"
      >
        Continue
      </button>
    </div>
  );
}

function PhotoCapture({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
  return (
    <div>
      {data.prompt && <p className="text-xs text-white/60 mb-2">{data.prompt}</p>}
      <label className="block w-full py-4 rounded-xl border border-dashed border-white/20 text-center cursor-pointer hover:border-white/40 transition-colors">
        <span className="text-2xl block mb-1">📸</span>
        <span className="text-xs text-white/50">Tap to take a photo</span>
        <input type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(`[Photo captured: ${file.name}]`);
          }} />
      </label>
    </div>
  );
}

function DangerCheck({ data, onSelect }: { data: any; onSelect: (msg: string) => void }) {
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

function FEMACard({ data }: { data: any }) {
  const completeness = data.completeness || 0;
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-white">FEMA Assistance</p>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
          data.eligible ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
        }`}>{data.eligible ? 'Eligible' : 'Checking...'}</span>
      </div>
      {data.declaration && <p className="text-[10px] text-white/50">{data.declaration}</p>}
      <div className="mt-2">
        <div className="flex justify-between text-[9px] text-white/40 mb-0.5">
          <span>Application progress</span><span>{completeness}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full"><div className="h-full bg-sos-accent-500 rounded-full" style={{ width: `${completeness}%` }} /></div>
      </div>
      {data.link && (
        <a href={data.link} target="_blank" rel="noopener noreferrer"
          className="block mt-2 text-[10px] text-sos-accent-400 font-medium">Go to DisasterAssistance.gov →</a>
      )}
    </div>
  );
}

function ReferralCard({ data }: { data: any }) {
  const shareUrl = `https://sosconnect.org/join?ref=${data.code || ''}`;

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: 'Join SOS Connect', text: 'Be prepared. Help your neighbors.', url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <p className="text-xs font-bold text-white mb-1">🤝 Invite Neighbors</p>
      <code className="text-[10px] text-sos-accent-400 block bg-white/5 px-2 py-1 rounded mb-2 truncate">{shareUrl}</code>
      <button onClick={handleShare}
        className="w-full py-2 rounded-lg bg-sos-red-500 text-white text-xs font-bold active:scale-[0.97]">
        📤 Share Invite
      </button>
      {data.stats && (
        <p className="text-[9px] text-white/30 mt-1 text-center">{data.stats.invited || 0} invited · {data.stats.signed_up || 0} joined</p>
      )}
    </div>
  );
}

// ── Toggle Chip Wrapper (stateful multi-select) ──
function ToggleChipWrapper({ options, prompt, onAction }: { options: any[]; prompt?: string; onAction: (msg: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="space-y-2">
      {prompt && <p className="text-xs text-white/60">{prompt}</p>}
      <ToggleChips
        options={options}
        selected={selected}
        onToggle={(id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
        onDone={() => onAction(selected.join(', '))}
      />
    </div>
  );
}

// ── Send SOS Confirmation Card ──
function SOSConfirmationCard({ summary, type, details, onAction }: { summary: string; type: string; details?: any; onAction: (msg: string) => void }) {
  const [sent, setSent] = useState(false);
  const [animating, setAnimating] = useState(false);

  function handleSend() {
    if (sent || animating) return;
    setSent(true);
    onAction(`[SOS_CONFIRMED:${type}]`);
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <p className="text-xs text-white/50 uppercase tracking-wider font-bold">Confirm your SOS</p>
      <p className="text-sm text-white leading-relaxed">{summary}</p>
      {sent ? (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-3 text-center">
          <p className="text-green-200 text-sm font-bold">✅ SOS Sent!</p>
          <p className="text-green-200/60 text-[10px] mt-1">We're connecting you with help now.</p>
        </div>
      ) : (
        <button onClick={handleSend} disabled={animating}
          className={`relative w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.97] bg-[#EF4E4B] hover:bg-[#d94340] ${animating ? 'scale-[1.02]' : ''}`}>
          {animating && (
            <>
              <span className="absolute inset-0 rounded-xl bg-[#EF4E4B] animate-ping opacity-30" />
              <span className="absolute inset-0 rounded-xl bg-[#EF4E4B] animate-pulse opacity-50" />
            </>
          )}
          <span className="relative z-10">{animating ? '⚡ Sending...' : '⚡ Send SOS'}</span>
        </button>
      )}
    </div>
  );
}
