import { supabase } from './supabase-client';

/**
 * All queries in this file are org-scoped when orgId is provided.
 * Admin (orgId = null) sees everything.
 * Partner (orgId = 'abc123') sees only their org's data.
 */

export async function getScopedMatches(orgId: string | null, filter?: { status?: string }) {
  let query = supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter?.status && filter.status !== 'all') {
    query = query.eq('status', filter.status);
  }

  // Partner scoping: matches where the offer belongs to their org
  // For now we filter client-side since matches don't have org_id directly
  const { data } = await query;
  
  if (!orgId || !data) return data || [];

  // Get org's offer IDs
  const { data: orgOffers } = await supabase
    .from('offers')
    .select('id')
    .eq('org_id', orgId);

  const orgOfferIds = new Set((orgOffers || []).map((o: any) => o.id));
  return data.filter((m: any) => orgOfferIds.has(m.offer_id));
}

export async function getScopedRequests(orgId: string | null) {
  let query = supabase
    .from('requests')
    .select('id, status, category, urgency, created_at, disaster_id')
    .order('created_at', { ascending: false });

  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  const { data, count } = await query;
  return { data: data || [], count };
}

export async function getScopedOffers(orgId: string | null) {
  let query = supabase
    .from('offers')
    .select('id, status, category, org_id, capacity_available, created_at')
    .order('created_at', { ascending: false });

  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  const { data, count } = await query;
  return { data: data || [], count };
}

export async function getScopedStats(orgId: string | null) {
  const [requests, offers, matchData, orgs, disasters, learnings] = await Promise.all([
    getScopedRequests(orgId),
    getScopedOffers(orgId),
    getScopedMatches(orgId),
    supabase.from('organizations').select('id, name, org_type'),
    supabase.from('disasters').select('id, name, status, slug'),
    supabase.from('system_learnings').select('id, pattern, confidence, category, status'),
  ]);

  const allMatches = matchData || [];
  const openRequests = (requests.data || []).filter((r: any) => 
    r.status === 'open' || r.status === 'active' || r.status === 'matched'
  );
  const activeMatches = allMatches.filter((m: any) => 
    !['fulfilled', 'failed', 'expired', 'cancelled'].includes(m.status)
  );
  const fulfilledMatches = allMatches.filter((m: any) => m.status === 'fulfilled');
  const activeDisasters = (disasters.data || []).filter((d: any) => d.status === 'active');

  return {
    openRequests: openRequests.length,
    totalRequests: requests.data?.length || 0,
    activeMatches: activeMatches.length,
    totalMatches: allMatches.length,
    fulfilledMatches: fulfilledMatches.length,
    fulfillmentRate: allMatches.length > 0
      ? Math.round((fulfilledMatches.length / allMatches.length) * 100)
      : 0,
    partnersOnline: orgId ? 1 : (orgs.data?.length || 0),
    partnerNames: orgId
      ? orgs.data?.find((o: any) => o.id === orgId)?.name || ''
      : orgs.data?.map((o: any) => o.name).join(', ') || '',
    activeDisasters,
    totalOffers: offers.data?.length || 0,
    learnings: learnings.data || [],
  };
}
