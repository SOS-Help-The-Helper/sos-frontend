import { supabase } from './supabase-client';

export interface SOSRecord {
  id: string;
  person_id: string;
  disaster_id: string;
  sos_type: string;
  category: string;
  status: string;
  created_at: string;
}

export interface SOSParticipant {
  id: string;
  sos_id: string;
  person_id: string | null;
  org_id: string | null;
  participant_type: string;
  role: string | null;
  consent_status: string;
  can_see_pii: boolean;
  messages_count: number;
  last_active_at: string | null;
}

export interface SOSMessage {
  id: string;
  sos_id: string;
  person_id: string | null;
  org_id: string | null;
  channel: string;
  role: string;
  participant_type: string | null;
  raw_content: string;
  message_text: string | null;
  created_at: string;
}

export async function getSOSDetail(sosId: string) {
  const [sos, requests, resources, participants, messages, matches] = await Promise.all([
    supabase.from('soses').select('*').eq('id', sosId).single(),
    supabase.from('requests').select('id, category, urgency, status, triage_score, details_sanitized').eq('sos_id', sosId),
    supabase.from('resources').select('id, category, status, capacity_available, details_sanitized').eq('sos_id', sosId),
    supabase.from('sos_participants').select('*').eq('sos_id', sosId).order('created_at'),
    supabase.from('verbatim_messages').select('*').eq('sos_id', sosId).order('created_at', { ascending: true }),
    supabase.from('matches').select('id, request_id, resource_id, status, match_score, match_summary_masked, chain_id, chain_sequence, chain_role').eq('disaster_id', sosId),
  ]);

  return {
    sos: sos.data,
    requests: requests.data || [],
    resources: resources.data || [],
    participants: participants.data || [],
    messages: messages.data || [],
    matches: matches.data || [],
  };
}

export async function postSOSMessage(sosId: string, content: string, orgId: string | null, participantType: string) {
  const { data, error } = await supabase.from('verbatim_messages').insert({
    sos_id: sosId,
    org_id: orgId,
    channel: 'web_chat',
    role: participantType === 'citizen' ? 'citizen' : 'partner',
    participant_type: participantType,
    raw_content: content,
    message_text: content,
  }).select().single();

  if (error) console.error('Error posting message:', error);
  return data;
}

export async function getNetworkStats(orgId: string) {
  const [members, matches] = await Promise.all([
    supabase.from('organizations').select('id, name, org_type, network_role, network_matches_total').eq('parent_org_id', orgId),
    supabase.from('matches').select('id, status, match_score, created_at, resolved_at'),
  ]);

  const memberOrgs = members.data || [];
  const allMatches = matches.data || [];

  return {
    memberCount: memberOrgs.length,
    members: memberOrgs,
    totalMatches: allMatches.length,
    fulfilled: allMatches.filter((m: any) => m.status === 'fulfilled').length,
    fulfillmentRate: allMatches.length > 0
      ? Math.round(allMatches.filter((m: any) => m.status === 'fulfilled').length / allMatches.length * 100)
      : 0,
  };
}

export function getParticipantColor(type: string): string {
  const colors: Record<string, string> = {
    citizen: 'bg-sos-accent-100 text-sos-accent-800',
    partner: 'bg-sos-blue-50 text-sos-blue-800',
    coordinator: 'bg-green-50 text-green-800',
    broker: 'bg-yellow-50 text-yellow-800',
    agent: 'bg-sos-gray-200 text-sos-gray-700',
  };
  return colors[type] || 'bg-sos-gray-200 text-sos-gray-600';
}

export function getParticipantIcon(type: string): string {
  const icons: Record<string, string> = {
    citizen: '👤',
    partner: '🤝',
    coordinator: '📋',
    broker: '🔗',
    agent: '🆘',
  };
  return icons[type] || '•';
}
