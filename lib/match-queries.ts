import { supabase } from './supabase-client';

export interface Match {
  id: string;
  request_id: string;
  resource_id: string;
  disaster_id: string;
  match_score: number;
  match_summary_masked: string | null;
  match_reasoning: string | null;
  status: string;
  chain_id: string | null;
  chain_sequence: number | null;
  chain_role: string | null;
  created_at: string;
  consent_request_at: string | null;
  consent_offer_at: string | null;
  connected_at: string | null;
  resolved_at: string | null;
  resolution_type: string | null;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  details: Record<string, any>;
  channel: string | null;
  created_at: string;
}

export async function getMatches(filter?: { status?: string; category?: string }) {
  let query = supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter?.status && filter.status !== 'all') {
    query = query.eq('status', filter.status);
  }

  const { data, error } = await query;
  if (error) console.error('Error fetching matches:', error);
  return data || [];
}

export async function getMatchEvents(matchId: string) {
  const { data, error } = await supabase
    .from('match_events')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });

  if (error) console.error('Error fetching match events:', error);
  return data || [];
}

export async function getChainMatches(chainId: string) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('chain_id', chainId)
    .order('chain_sequence', { ascending: true });

  if (error) console.error('Error fetching chain:', error);
  return data || [];
}

export async function getMatchStats() {
  const { data, count } = await supabase
    .from('matches')
    .select('id, status, match_score, chain_id', { count: 'exact' });

  const matches = data || [];
  const statuses: Record<string, number> = {};
  let chainCount = 0;
  const chainIds = new Set<string>();

  matches.forEach((m: any) => {
    statuses[m.status] = (statuses[m.status] || 0) + 1;
    if (m.chain_id && !chainIds.has(m.chain_id)) {
      chainIds.add(m.chain_id);
      chainCount++;
    }
  });

  return {
    total: count || 0,
    byStatus: statuses,
    avgScore: matches.length > 0
      ? Math.round(matches.reduce((sum: number, m: any) => sum + (m.match_score || 0), 0) / matches.length)
      : 0,
    chains: chainCount,
  };
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    proposed: 'bg-sos-gray-200 text-sos-gray-700',
    viewed: 'bg-sos-accent-50 text-sos-accent-800',
    accepted: 'bg-sos-accent-100 text-sos-accent-800',
    declined: 'bg-sos-red-50 text-sos-red-700',
    counter_proposed: 'bg-yellow-50 text-yellow-700',
    citizen_consented: 'bg-sos-accent-100 text-sos-accent-800',
    partner_consented: 'bg-sos-accent-200 text-sos-accent-900',
    connected: 'bg-green-50 text-green-700',
    in_progress: 'bg-green-100 text-green-800',
    fulfilled: 'bg-green-100 text-green-800',
    failed: 'bg-sos-red-100 text-sos-red-800',
    expired: 'bg-sos-gray-200 text-sos-gray-600',
    cancelled: 'bg-sos-gray-200 text-sos-gray-600',
    escalated: 'bg-yellow-100 text-yellow-800',
    reassigned: 'bg-sos-accent-50 text-sos-accent-700',
  };
  return colors[status] || 'bg-sos-gray-200 text-sos-gray-700';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 60) return 'text-sos-accent-700 bg-sos-accent-50 border-sos-accent-200';
  return 'text-sos-gray-600 bg-sos-gray-100 border-sos-gray-300';
}

export function getChainRoleIcon(role: string): string {
  const icons: Record<string, string> = {
    labor: '👷',
    materials: '📦',
    transport: '🚛',
    equipment: '⚙️',
    food: '🍽️',
    shelter: '🏠',
    coordination: '📋',
  };
  return icons[role] || '•';
}
