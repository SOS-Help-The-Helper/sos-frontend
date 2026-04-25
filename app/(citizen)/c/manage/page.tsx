'use client';

import { useState, useEffect, useCallback } from 'react';
import { CitizenShell } from '@/components/citizen-shell';
import { SOSBottomSheet } from '@/components/sos-bottom-sheet';
import { CitizenHeader } from '@/components/citizen-header';
import { supabase } from '@/lib/supabase-client';
import { getSOSScore, type SOSScore } from '@/lib/citizen-api';
import { api } from '@/lib/api';
import { getPersonId } from '@/lib/person-cookie';

const CATEGORY_EMOJI: Record<string, string> = {
  housing: '🏠', food_water: '🍞', medical: '🏥', transportation: '🚗',
  utilities: '⚡', debris: '🌳', supplies: '📦', clothing: '👕',
  financial: '💰', legal: '⚖️', mental_health: '💚', welfare_check: '👋',
};

const URGENCY_OPTIONS = ['critical', 'high', 'medium', 'low'] as const;

interface EditRequestForm {
  id: string;
  details_sanitized: string;
  urgency: string;
  household_size: number | null;
}

interface EditResourceForm {
  id: string;
  details_sanitized: string;
  capacity_available: number | null;
}

export default function ManagePage() {
  const [personId, setPersonId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [score, setScore] = useState<SOSScore | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [section, setSection] = useState<'overview' | 'requests' | 'resources' | 'matches'>('overview');

  // Action states
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<EditRequestForm | null>(null);
  const [editingResource, setEditingResource] = useState<EditResourceForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async (pid: string) => {
    const [scoreData, reqData, resData] = await Promise.all([
      getSOSScore(pid),
      // KEEP: needs dedicated EF
      supabase.from('requests').select('id, category, details_sanitized, urgency, status, household_size, created_at').eq('person_id', pid).order('created_at', { ascending: false }).limit(20),
      // KEEP: needs dedicated EF
      supabase.from('resources').select('id, category, details_sanitized, capacity_available, status, created_at').eq('person_id', pid).order('created_at', { ascending: false }).limit(20),
    ]);
    setScore(scoreData);
    setRequests(reqData.data || []);
    setResources(resData.data || []);

    const requestIds = (reqData.data || []).map((r: any) => r.id);
    const resourceIds = (resData.data || []).map((r: any) => r.id);

    let requestMatches: any[] = [];
    if (requestIds.length > 0) {
      requestMatches = (await api.queryMatches({ request_ids: requestIds, status_exclude: ['cancelled', 'expired'] }) as any[]) || [];
    }

    let resourceMatches: any[] = [];
    if (resourceIds.length > 0) {
      resourceMatches = (await api.queryMatches({ resource_ids: resourceIds, status_exclude: ['cancelled', 'expired'] }) as any[]) || [];
    }

    const allMatches = [...requestMatches, ...resourceMatches];
    const unique = Array.from(new Map(allMatches.map(m => [m.id, m])).values());
    unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setMatches(unique.slice(0, 20));
  }, []);

  useEffect(() => {
    const pid = getPersonId();
    setPersonId(pid);
    if (pid) loadData(pid);

    const onFocus = () => { if (pid) loadData(pid); };
    window.addEventListener('focus', onFocus);

    if (pid) {
      const channel = supabase
        .channel('manage-matches')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
          if (pid) loadData(pid);
        })
        .subscribe();
      return () => { window.removeEventListener('focus', onFocus); supabase.removeChannel(channel); };
    }
    return () => { window.removeEventListener('focus', onFocus); };
  }, [loadData]);

  function showFlash(id: string) {
    setFlashId(id);
    setTimeout(() => setFlashId(null), 1200);
  }

  function showError(id: string) {
    setErrorId(id);
    setTimeout(() => setErrorId(null), 3000);
  }

  async function updateStatus(table: 'requests' | 'resources', id: string, newStatus: string) {
    setUpdatingId(id);
    setErrorId(null);
    // KEEP: needs dedicated EF
    const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', id);
    setUpdatingId(null);
    if (error) {
      showError(id);
    } else {
      showFlash(id);
      if (personId) loadData(personId);
    }
  }

  async function saveRequestEdit() {
    if (!editingRequest) return;
    setSaving(true);
    // KEEP: needs dedicated EF
    const { error } = await supabase.from('requests').update({
      details_sanitized: editingRequest.details_sanitized,
      urgency: editingRequest.urgency,
      household_size: editingRequest.household_size,
    }).eq('id', editingRequest.id);
    setSaving(false);
    if (error) {
      showError(editingRequest.id);
    } else {
      showFlash(editingRequest.id);
      setEditingRequest(null);
      if (personId) loadData(personId);
    }
  }

  async function saveResourceEdit() {
    if (!editingResource) return;
    setSaving(true);
    // KEEP: needs dedicated EF
    const { error } = await supabase.from('resources').update({
      details_sanitized: editingResource.details_sanitized,
      capacity_available: editingResource.capacity_available,
    }).eq('id', editingResource.id);
    setSaving(false);
    if (error) {
      showError(editingResource.id);
    } else {
      showFlash(editingResource.id);
      setEditingResource(null);
      if (personId) loadData(personId);
    }
  }

  const sections = [
    { id: 'overview' as const, label: 'Overview', count: null },
    { id: 'requests' as const, label: 'My Requests', count: requests.length },
    { id: 'resources' as const, label: 'My Resources', count: resources.length },
    { id: 'matches' as const, label: 'My Matches', count: matches.length },
  ];

  return (
    <CitizenShell>
      <div className="flex flex-col h-full pb-[calc(56px+env(safe-area-inset-bottom,0px))] bg-[#0F1E2B]">
        {/* Header */}
        <CitizenHeader onAgentTap={() => setSheetOpen(true)} locationName="United States" status="safe" />
        {/* Spacer for absolutely-positioned header */}
        <div className="pt-[calc(env(safe-area-inset-top,0px)+72px)] flex-shrink-0" />

        {/* Section tabs — only show when drilled into a section */}
        {section !== 'overview' && (
          <div className="flex gap-1 px-4 py-3 bg-[#0F1E2B] flex-shrink-0 overflow-x-auto">
            <button onClick={() => setSection('overview')}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap bg-white/5 text-white/40">
              ← Back
            </button>
            <span className="px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap bg-white/15 text-white">
              {sections.find(s => s.id === section)?.label}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">

          {/* Overview */}
          {section === 'overview' && (
            <>
              {score && (
                <div className="bg-white/5 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-wider">SOS Score</span>
                    <span className="text-2xl font-bold text-white">{score.total}</span>
                  </div>
                  <div className="space-y-2">
                    <ScoreBar label="Readiness" value={score.readiness} max={score.readiness_max} color="#89CFF0" />
                    <ScoreBar label="Community" value={score.community} max={score.community_max} color="#34d399" />
                    <ScoreBar label="Impact" value={score.impact} max={score.impact_max} color="#EF4E4B" />
                  </div>
                  {score.next_action && (
                    <p className="text-[10px] text-white/30 mt-3">Next: {score.next_action} (+{score.next_points} pts)</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setSection('requests')} className="bg-white/5 rounded-xl p-3 text-center hover:bg-white/10 transition-colors">
                  <p className="text-lg font-bold text-[#EF4E4B]">{requests.filter(r => r.status === 'active').length}</p>
                  <p className="text-[10px] text-white/40">Active Requests</p>
                </button>
                <button onClick={() => setSection('resources')} className="bg-white/5 rounded-xl p-3 text-center hover:bg-white/10 transition-colors">
                  <p className="text-lg font-bold text-[#89CFF0]">{resources.filter(r => r.status === 'active').length}</p>
                  <p className="text-[10px] text-white/40">Active Offers</p>
                </button>
                <button onClick={() => setSection('matches')} className="bg-white/5 rounded-xl p-3 text-center hover:bg-white/10 transition-colors">
                  <p className="text-lg font-bold text-white">{matches.length}</p>
                  <p className="text-[10px] text-white/40">Matches</p>
                </button>
              </div>

              <div>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Recent Activity</p>
                {[...requests.slice(0, 2), ...resources.slice(0, 2)].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4).map(item => (
                  <div key={item.id} className="bg-white/5 rounded-xl px-4 py-3 mb-2 flex items-center gap-3">
                    <span className="text-lg">{CATEGORY_EMOJI[item.category] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 truncate">{item.details_sanitized || item.category}</p>
                      <p className="text-[10px] text-white/30">{item.status} · {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${item.status === 'active' ? 'bg-green-400' : item.status === 'fulfilled' ? 'bg-[#89CFF0]' : 'bg-white/20'}`} />
                  </div>
                ))}
                {requests.length === 0 && resources.length === 0 && (
                  <p className="text-xs text-white/30 text-center py-4">No activity yet. Use the Map to submit a request or offer help.</p>
                )}
              </div>
            </>
          )}

          {/* Requests */}
          {section === 'requests' && (
            <>
              {requests.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">No requests yet.</p>
              ) : requests.map(r => (
                <div key={r.id} className={`bg-white/5 rounded-xl p-4 transition-all duration-300 ${
                  flashId === r.id ? 'ring-2 ring-green-400/60' : ''
                }`}>
                  <div className="cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${
                        r.status === 'active' ? 'bg-[#EF4E4B]' : r.status === 'paused' ? 'bg-amber-400' : 'bg-white/20'
                      }`} />
                      <span className="text-[10px] font-bold text-[#EF4E4B] uppercase tracking-wider">{r.status}</span>
                      {r.urgency && <span className="text-[10px] text-amber-400 ml-auto">⚡ {r.urgency}</span>}
                      <span className="text-white/30 text-xs ml-1">{expandedId === r.id ? '▾' : '▸'}</span>
                    </div>
                    <p className="text-sm text-white/70">{r.details_sanitized || r.category?.replace(/_/g, ' ')}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">{CATEGORY_EMOJI[r.category] || ''} {r.category?.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-white/30">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedId === r.id && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      {r.household_size && <p className="text-[11px] text-white/50">👥 Household: {r.household_size} people</p>}
                      {r.urgency && <p className="text-[11px] text-white/50">⚡ Urgency: {r.urgency}</p>}
                      <p className="text-[11px] text-white/50">📅 Submitted: {new Date(r.created_at).toLocaleString()}</p>
                      <p className="text-[11px] text-white/50">📋 Status: {r.status}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  {errorId === r.id && (
                    <p className="text-[10px] text-red-400 mt-2">Update failed. Try again.</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setEditingRequest({
                        id: r.id,
                        details_sanitized: r.details_sanitized || '',
                        urgency: r.urgency || 'medium',
                        household_size: r.household_size ?? null,
                      })}
                      className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-[10px] font-medium hover:bg-white/15 transition-colors"
                    >
                      Edit
                    </button>
                    {r.status === 'active' && (
                      <button
                        disabled={updatingId === r.id}
                        onClick={() => updateStatus('requests', r.id, 'paused')}
                        className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-40"
                      >
                        {updatingId === r.id ? '...' : 'Pause'}
                      </button>
                    )}
                    {r.status === 'paused' && (
                      <button
                        disabled={updatingId === r.id}
                        onClick={() => updateStatus('requests', r.id, 'active')}
                        className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px] font-medium hover:bg-green-500/30 transition-colors disabled:opacity-40"
                      >
                        {updatingId === r.id ? '...' : 'Resume'}
                      </button>
                    )}
                    {r.status !== 'closed' && (
                      <button
                        disabled={updatingId === r.id}
                        onClick={() => updateStatus('requests', r.id, 'closed')}
                        className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-[10px] font-medium hover:bg-red-500/30 transition-colors disabled:opacity-40"
                      >
                        {updatingId === r.id ? '...' : 'Close'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Resources */}
          {section === 'resources' && (
            <>
              {resources.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">No resources offered yet.</p>
              ) : resources.map(r => (
                <div key={r.id} className={`bg-white/5 rounded-xl p-4 transition-all duration-300 ${
                  flashId === r.id ? 'ring-2 ring-green-400/60' : ''
                }`}>
                  <div className="cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${
                        r.status === 'active' ? 'bg-[#89CFF0]' : r.status === 'paused' ? 'bg-amber-400' : 'bg-white/20'
                      }`} />
                      <span className="text-[10px] font-bold text-[#89CFF0] uppercase tracking-wider">{r.status}</span>
                      {r.capacity_available && <span className="text-[10px] text-white/40 ml-auto">Cap: {r.capacity_available}</span>}
                      <span className="text-white/30 text-xs ml-1">{expandedId === r.id ? '▾' : '▸'}</span>
                    </div>
                    <p className="text-sm text-white/70">{r.details_sanitized || r.category?.replace(/_/g, ' ')}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 mt-2 inline-block">{r.category?.replace(/_/g, ' ')}</span>
                  </div>

                  {/* Expanded details */}
                  {expandedId === r.id && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      {r.capacity_available && <p className="text-[11px] text-white/50">📦 Capacity: {r.capacity_available}</p>}
                      <p className="text-[11px] text-white/50">📅 Created: {new Date(r.created_at).toLocaleString()}</p>
                      <p className="text-[11px] text-white/50">📋 Status: {r.status}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  {errorId === r.id && (
                    <p className="text-[10px] text-red-400 mt-2">Update failed. Try again.</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setEditingResource({
                        id: r.id,
                        details_sanitized: r.details_sanitized || '',
                        capacity_available: r.capacity_available ?? null,
                      })}
                      className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-[10px] font-medium hover:bg-white/15 transition-colors"
                    >
                      Edit
                    </button>
                    {r.status === 'active' && (
                      <button
                        disabled={updatingId === r.id}
                        onClick={() => updateStatus('resources', r.id, 'paused')}
                        className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-40"
                      >
                        {updatingId === r.id ? '...' : 'Pause'}
                      </button>
                    )}
                    {r.status === 'paused' && (
                      <button
                        disabled={updatingId === r.id}
                        onClick={() => updateStatus('resources', r.id, 'active')}
                        className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px] font-medium hover:bg-green-500/30 transition-colors disabled:opacity-40"
                      >
                        {updatingId === r.id ? '...' : 'Resume'}
                      </button>
                    )}
                    {r.status !== 'closed' && (
                      <button
                        disabled={updatingId === r.id}
                        onClick={() => updateStatus('resources', r.id, 'closed')}
                        className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-[10px] font-medium hover:bg-red-500/30 transition-colors disabled:opacity-40"
                      >
                        {updatingId === r.id ? '...' : 'Close'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Matches */}
          {section === 'matches' && (
            <>
              {matches.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">No matches yet. Submit a request or offer help to get matched.</p>
              ) : matches.map(m => (
                <div key={m.id} className="bg-white/5 rounded-xl p-4">
                  <div className="cursor-pointer" onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${
                        m.status === 'fulfilled' ? 'bg-green-400' : m.status === 'accepted' ? 'bg-[#89CFF0]' : m.status === 'proposed' ? 'bg-amber-400' : 'bg-white/20'
                      }`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">{m.status}</span>
                      <span className="text-[10px] text-white/30 ml-auto">Score: {m.match_score}</span>
                      <span className="text-white/30 text-xs ml-1">{expandedId === m.id ? '▾' : '▸'}</span>
                    </div>
                    {m.resources?.organizations?.name && (
                      <p className="text-sm font-medium text-white/80">{m.resources.organizations.name}</p>
                    )}
                    <p className="text-xs text-white/50 mt-1">{m.resources?.details_sanitized || m.resources?.category || 'Pending match details'}</p>
                    <p className="text-[10px] text-white/30 mt-2">{new Date(m.created_at).toLocaleDateString()}</p>
                  </div>

                  {/* Expanded match details */}
                  {expandedId === m.id && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      <p className="text-[11px] text-white/50">🎯 Match Score: {m.match_score}/100</p>
                      {m.requests?.category && <p className="text-[11px] text-white/50">📋 Request: {m.requests.category.replace(/_/g, ' ')}{m.requests.urgency ? ` · ${m.requests.urgency}` : ''}</p>}
                      {m.requests?.details_sanitized && <p className="text-[11px] text-white/40">{m.requests.details_sanitized}</p>}
                      {m.resources?.category && <p className="text-[11px] text-white/50">📦 Resource: {m.resources.category.replace(/_/g, ' ')}</p>}
                      {m.resources?.details_sanitized && <p className="text-[11px] text-white/40">{m.resources.details_sanitized}</p>}

                      {m.status === 'proposed' && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={async () => {
                              const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                              const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
                              await fetch(`${url}/functions/v1/match-respond`, {
                                method: 'POST',
                                headers: { 'apikey': anon, 'Authorization': `Bearer ${anon}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ match_id: m.id, response: 'accept', actor_id: personId, channel: 'citizen_app' }),
                              });
                              setExpandedId(null);
                              if (personId) loadData(personId);
                            }}
                            className="flex-1 py-2 rounded-xl bg-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/30"
                          >
                            ✓ Accept Match
                          </button>
                          <button
                            onClick={async () => {
                              const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                              const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
                              await fetch(`${url}/functions/v1/match-respond`, {
                                method: 'POST',
                                headers: { 'apikey': anon, 'Authorization': `Bearer ${anon}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ match_id: m.id, response: 'decline', actor_id: personId, channel: 'citizen_app' }),
                              });
                              setExpandedId(null);
                              if (personId) loadData(personId);
                            }}
                            className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30"
                          >
                            ✕ Decline
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Edit Request Modal */}
        {editingRequest && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setEditingRequest(null)}>
            <div className="bg-[#1A3850] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Edit Request</span>
                <button onClick={() => setEditingRequest(null)} className="text-white/40 hover:text-white/60 text-lg leading-none">&times;</button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Details</label>
                <textarea
                  value={editingRequest.details_sanitized}
                  onChange={e => setEditingRequest({ ...editingRequest, details_sanitized: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 p-3 resize-none focus:outline-none focus:border-white/25"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Urgency</label>
                  <select
                    value={editingRequest.urgency}
                    onChange={e => setEditingRequest({ ...editingRequest, urgency: e.target.value })}
                    className="w-full rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 p-2.5 focus:outline-none focus:border-white/25 appearance-none"
                  >
                    {URGENCY_OPTIONS.map(u => (
                      <option key={u} value={u} className="bg-[#1A3850] text-white">{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Household</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={editingRequest.household_size ?? ''}
                    onChange={e => setEditingRequest({ ...editingRequest, household_size: e.target.value ? Number(e.target.value) : null })}
                    className="w-full rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 p-2.5 focus:outline-none focus:border-white/25"
                    placeholder="#"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditingRequest(null)}
                  className="flex-1 py-2.5 rounded-full bg-white/5 text-white/50 text-xs font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={saveRequestEdit}
                  className="flex-1 py-2.5 rounded-full bg-[#89CFF0]/20 text-[#89CFF0] text-xs font-medium hover:bg-[#89CFF0]/30 transition-colors disabled:opacity-40"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Resource Modal */}
        {editingResource && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setEditingResource(null)}>
            <div className="bg-[#1A3850] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Edit Resource</span>
                <button onClick={() => setEditingResource(null)} className="text-white/40 hover:text-white/60 text-lg leading-none">&times;</button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  value={editingResource.details_sanitized}
                  onChange={e => setEditingResource({ ...editingResource, details_sanitized: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 p-3 resize-none focus:outline-none focus:border-white/25"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Capacity</label>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={editingResource.capacity_available ?? ''}
                  onChange={e => setEditingResource({ ...editingResource, capacity_available: e.target.value ? Number(e.target.value) : null })}
                  className="w-full rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 p-2.5 focus:outline-none focus:border-white/25"
                  placeholder="Available capacity"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditingResource(null)}
                  className="flex-1 py-2.5 rounded-full bg-white/5 text-white/50 text-xs font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={saveResourceEdit}
                  className="flex-1 py-2.5 rounded-full bg-[#89CFF0]/20 text-[#89CFF0] text-xs font-medium hover:bg-[#89CFF0]/30 transition-colors disabled:opacity-40"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <SOSBottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} context="map" />
    </CitizenShell>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-white/40">{label}</span>
        <span className="text-[10px] text-white/50">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
