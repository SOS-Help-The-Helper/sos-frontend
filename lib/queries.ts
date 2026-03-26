import { supabase } from './supabase-client';

export async function getCommandCenterStats() {
  const [requests, offers, matches, orgs, disasters, learnings] = await Promise.all([
    supabase.from('requests').select('id, status, category, urgency, created_at', { count: 'exact' }),
    supabase.from('resources').select('id, status, category, created_at', { count: 'exact' }),
    supabase.from('matches').select('id, status, match_score, created_at', { count: 'exact' }),
    supabase.from('organizations').select('id, name, org_type'),
    supabase.from('disasters').select('id, name, status, slug'),
    supabase.from('system_learnings').select('id, pattern, confidence, category, status'),
  ]);

  const openRequests = requests.data?.filter(r => r.status === 'open' || r.status === 'active' || r.status === 'matched') || [];
  const activeMatches = matches.data?.filter(m => !['fulfilled', 'failed', 'expired', 'cancelled'].includes(m.status)) || [];
  const fulfilledMatches = matches.data?.filter(m => m.status === 'fulfilled') || [];
  const activeDisasters = disasters.data?.filter(d => d.status === 'active') || [];

  return {
    openRequests: openRequests.length,
    totalRequests: requests.count || 0,
    activeMatches: activeMatches.length,
    totalMatches: matches.count || 0,
    fulfilledMatches: fulfilledMatches.length,
    fulfillmentRate: matches.count && matches.count > 0
      ? Math.round((fulfilledMatches.length / matches.count) * 100)
      : 0,
    partnersOnline: orgs.data?.length || 0,
    partnerNames: orgs.data?.map(o => o.name).join(', ') || '',
    activeDisasters,
    totalOffers: offers.count || 0,
    learnings: learnings.data || [],
    recentRequests: requests.data?.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 5) || [],
    recentMatches: matches.data?.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 5) || [],
  };
}

export async function getRecentActivity() {
  const [recentRequests, recentMatches, recentOffers] = await Promise.all([
    supabase.from('requests').select('id, category, urgency, status, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('matches').select('id, match_score, status, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('resources').select('id, category, status, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  const activity: Array<{ time: string; text: string; type: string; created_at: string }> = [];

  recentRequests.data?.forEach((r: any) => {
    activity.push({
      time: timeAgo(r.created_at),
      text: `New request: ${r.category} (${r.urgency})`,
      type: 'request',
      created_at: r.created_at,
    });
  });

  recentMatches.data?.forEach((m: any) => {
    activity.push({
      time: timeAgo(m.created_at),
      text: `Match ${m.status}: score ${m.match_score}`,
      type: 'match',
      created_at: m.created_at,
    });
  });

  recentOffers.data?.forEach((o: any) => {
    activity.push({
      time: timeAgo(o.created_at),
      text: `Offer: ${o.category} (${o.status})`,
      type: 'offer',
      created_at: o.created_at,
    });
  });

  return activity
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
