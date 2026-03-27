import { supabase } from './supabase-client';

export async function getMatchLines(orgId: string | null) {
  // Get matches with both request and resource lat/lng
  let query = supabase.from('matches').select(`
    id, status, match_score, match_summary_masked,
    request_id, resource_id,
    chain_id, chain_sequence
  `).order('match_score', { ascending: false });

  const { data: matches } = await query;
  if (!matches) return [];

  // Get request locations
  let reqQuery = supabase.from('requests').select('id, latitude, longitude, category, org_id').not('latitude', 'is', null);
  let resQuery = supabase.from('resources').select('id, latitude, longitude, category, org_id').not('latitude', 'is', null);
  
  if (orgId) {
    reqQuery = reqQuery.eq('org_id', orgId);
    resQuery = resQuery.eq('org_id', orgId);
  }

  const [reqData, resData] = await Promise.all([reqQuery, resQuery]);
  
  const reqMap = new Map((reqData.data || []).map((r: any) => [r.id, r]));
  const resMap = new Map((resData.data || []).map((r: any) => [r.id, r]));

  // Build lines with coordinates
  return matches.filter((m: any) => {
    const req = reqMap.get(m.request_id);
    const res = resMap.get(m.resource_id);
    return req && res;
  }).map((m: any) => ({
    ...m,
    request: reqMap.get(m.request_id),
    resource: resMap.get(m.resource_id),
  }));
}
