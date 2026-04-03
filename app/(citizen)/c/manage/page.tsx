'use client';

import { useState, useEffect } from 'react';
import { CitizenShell } from '@/components/citizen-shell';
import { supabase } from '@/lib/supabase-client';
import { getSOSScore, type SOSScore } from '@/lib/citizen-api';

const CATEGORY_EMOJI: Record<string, string> = {
  housing: '🏠', food_water: '🍞', medical: '🏥', transportation: '🚗',
  utilities: '⚡', debris: '🌳', supplies: '📦', clothing: '👕',
  financial: '💰', legal: '⚖️', mental_health: '💚', welfare_check: '👋',
};

export default function ManagePage() {
  const [personId, setPersonId] = useState<string | null>(null);
  const [score, setScore] = useState<SOSScore | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [section, setSection] = useState<'overview' | 'requests' | 'resources' | 'matches'>('overview');

  useEffect(() => {
    const pid = localStorage.getItem('sos-person-id');
    setPersonId(pid);
    if (pid) loadData(pid);

    // Refresh on tab focus
    const onFocus = () => { if (pid) loadData(pid); };
    window.addEventListener('focus', onFocus);

    // Realtime subscription for matches
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
  }, []);

  async function loadData(pid: string) {
    // Load core citizen data
    const [scoreData, reqData, resData] = await Promise.all([
      getSOSScore(pid),
      supabase.from('requests').select('id, category, details_sanitized, urgency, status, created_at').eq('person_id', pid).order('created_at', { ascending: false }).limit(20),
      supabase.from('resources').select('id, category, details_sanitized, capacity_available, status, created_at').eq('person_id', pid).order('created_at', { ascending: false }).limit(20),
    ]);
    setScore(scoreData);
    setRequests(reqData.data || []);
    setResources(resData.data || []);

    // Load matches: two simple queries merged client-side (no PostgREST subqueries)
    const requestIds = (reqData.data || []).map((r: any) => r.id);
    const resourceIds = (resData.data || []).map((r: any) => r.id);

    const matchSelect = 'id, request_id, resource_id, status, match_score, created_at, resources(category, details_sanitized, organizations(name))';

    // Query 1: matches on my requests (I'm the requester)
    let requestMatches: any[] = [];
    if (requestIds.length > 0) {
      const { data } = await supabase
        .from('matches')
        .select(matchSelect)
        .in('request_id', requestIds)
        .not('status', 'in', '("cancelled","expired")')
        .order('created_at', { ascending: false })
        .limit(20);
      requestMatches = data || [];
    }

    // Query 2: matches on my resources (I'm the helper)
    let resourceMatches: any[] = [];
    if (resourceIds.length > 0) {
      const { data } = await supabase
        .from('matches')
        .select(matchSelect)
        .in('resource_id', resourceIds)
        .not('status', 'in', '("cancelled","expired")')
        .order('created_at', { ascending: false })
        .limit(20);
      resourceMatches = data || [];
    }

    // Deduplicate by match ID and sort
    const allMatches = [...requestMatches, ...resourceMatches];
    const unique = Array.from(new Map(allMatches.map(m => [m.id, m])).values());
    unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setMatches(unique.slice(0, 20));
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
        <div className="bg-[#1A3850] px-5 py-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex-shrink-0">
          <span className="text-sm font-bold text-white">Manage</span>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 px-4 py-3 bg-[#0F1E2B] flex-shrink-0 overflow-x-auto">
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                section === s.id ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40'
              }`}>
              {s.label}{s.count != null ? ` (${s.count})` : ''}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">

          {/* Overview */}
          {section === 'overview' && (
            <>
              {/* SOS Score */}
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

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-[#EF4E4B]">{requests.filter(r => r.status === 'active').length}</p>
                  <p className="text-[10px] text-white/40">Active Requests</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-[#89CFF0]">{resources.filter(r => r.status === 'active').length}</p>
                  <p className="text-[10px] text-white/40">Active Offers</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-white">{matches.length}</p>
                  <p className="text-[10px] text-white/40">Matches</p>
                </div>
              </div>

              {/* Recent Activity */}
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
                <div key={r.id} className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${r.status === 'active' ? 'bg-[#EF4E4B]' : 'bg-white/20'}`} />
                    <span className="text-[10px] font-bold text-[#EF4E4B] uppercase tracking-wider">{r.status}</span>
                    {r.urgency && <span className="text-[10px] text-amber-400 ml-auto">⚡ {r.urgency}</span>}
                  </div>
                  <p className="text-sm text-white/70">{r.details_sanitized || r.category}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">{CATEGORY_EMOJI[r.category] || ''} {r.category?.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-white/30">{new Date(r.created_at).toLocaleDateString()}</span>
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
                <div key={r.id} className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${r.status === 'active' ? 'bg-[#89CFF0]' : 'bg-white/20'}`} />
                    <span className="text-[10px] font-bold text-[#89CFF0] uppercase tracking-wider">{r.status}</span>
                    {r.capacity_available && <span className="text-[10px] text-white/40 ml-auto">Cap: {r.capacity_available}</span>}
                  </div>
                  <p className="text-sm text-white/70">{r.details_sanitized || r.category}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 mt-2 inline-block">{r.category?.replace(/_/g, ' ')}</span>
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
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${
                      m.status === 'fulfilled' ? 'bg-green-400' : m.status === 'accepted' ? 'bg-[#89CFF0]' : m.status === 'proposed' ? 'bg-amber-400' : 'bg-white/20'
                    }`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">{m.status}</span>
                    <span className="text-[10px] text-white/30 ml-auto">Score: {m.match_score}</span>
                  </div>
                  {m.resources?.organizations?.name && (
                    <p className="text-sm font-medium text-white/80">{m.resources.organizations.name}</p>
                  )}
                  <p className="text-xs text-white/50 mt-1">{m.resources?.details_sanitized || m.resources?.category || 'Pending match details'}</p>
                  <p className="text-[10px] text-white/30 mt-2">{new Date(m.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
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
