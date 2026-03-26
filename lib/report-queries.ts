import { supabase } from './supabase-client';

export async function getReportingData() {
  const [matches, requests, resources, orgs, learnings] = await Promise.all([
    supabase.from('matches').select('id, status, match_score, created_at, connected_at, resolved_at, resolution_type, disaster_id'),
    supabase.from('requests').select('id, status, category, urgency, created_at, disaster_id'),
    supabase.from('resources').select('id, status, category, org_id, created_at'),
    supabase.from('organizations').select('id, name, org_type'),
    supabase.from('system_learnings').select('id, pattern, confidence, category, status, evidence_count'),
  ]);

  const allMatches = matches.data || [];
  const allRequests = requests.data || [];
  const allResources = resources.data || [];
  const allOrgs = orgs.data || [];
  const allLearnings = learnings.data || [];

  // Fulfillment metrics
  const fulfilled = allMatches.filter((m: any) => m.status === 'fulfilled');
  const failed = allMatches.filter((m: any) => m.status === 'failed');
  const expired = allMatches.filter((m: any) => m.status === 'expired');
  const resolved = [...fulfilled, ...failed, ...expired];
  const fulfillmentRate = resolved.length > 0 ? Math.round((fulfilled.length / resolved.length) * 100) : 0;

  // Response time (connected_at - created_at for connected matches)
  const connectedMatches = allMatches.filter((m: any) => m.connected_at);
  const responseTimes = connectedMatches.map((m: any) => {
    const created = new Date(m.created_at).getTime();
    const connected = new Date(m.connected_at).getTime();
    return (connected - created) / (1000 * 60); // minutes
  });
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length)
    : 0;

  // Category distribution
  const categoryDist: Record<string, number> = {};
  allRequests.forEach((r: any) => {
    categoryDist[r.category] = (categoryDist[r.category] || 0) + 1;
  });

  // Urgency distribution
  const urgencyDist: Record<string, number> = {};
  allRequests.forEach((r: any) => {
    urgencyDist[r.urgency || 'standard'] = (urgencyDist[r.urgency || 'standard'] || 0) + 1;
  });

  // Per-org stats
  const orgStats = allOrgs.map((org: any) => {
    const orgResources = allResources.filter((o: any) => o.org_id === org.id);
    return {
      id: org.id,
      name: org.name,
      type: org.org_type,
      offers: orgResources.length,
    };
  });

  // Score distribution
  const scoreRanges = {
    '80+': allMatches.filter((m: any) => m.match_score >= 80).length,
    '60-79': allMatches.filter((m: any) => m.match_score >= 60 && m.match_score < 80).length,
    '40-59': allMatches.filter((m: any) => m.match_score >= 40 && m.match_score < 60).length,
    '<40': allMatches.filter((m: any) => m.match_score < 40).length,
  };

  return {
    // Headline stats
    totalMatches: allMatches.length,
    totalRequests: allRequests.length,
    totalOffers: allResources.length,
    fulfilled: fulfilled.length,
    failed: failed.length,
    expired: expired.length,
    fulfillmentRate,
    avgResponseTime,
    avgScore: allMatches.length > 0
      ? Math.round(allMatches.reduce((sum: number, m: any) => sum + (m.match_score || 0), 0) / allMatches.length)
      : 0,

    // Distributions
    categoryDist,
    urgencyDist,
    scoreRanges,

    // Per-org
    orgStats,

    // Learnings
    learnings: allLearnings,
  };
}
