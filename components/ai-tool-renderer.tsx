'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { emitMapCommand, type MapResult } from '@/lib/map-commands';
import { getSOSScore } from '@/lib/citizen-api';
import { setPersonId } from '@/lib/person-cookie';
import { CategoryCards, CounterSelection, CircumstanceChips, LocationInput } from './tools/intake-tools';
import { SearchResults, DangerCheck } from './tools/map-tools';
import { PhoneInput, PhotoCapture, ScoreDisplay, FEMACard, ReferralCard } from './tools/identity-tools';
import { SubmitConfirmation, SOSConfirmationCard, ToggleChipWrapper } from './tools/confirmation-tools';

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

