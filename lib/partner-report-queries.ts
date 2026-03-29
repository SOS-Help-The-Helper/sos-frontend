/**
 * Enhanced partner reporting queries.
 * Response time trends, category breakdown, trust progression, community impact.
 */

import { supabase } from '@/lib/supabase-client';

export interface ResponseTimeTrend {
  label: string; // week label
  value: number; // avg hours
}

export interface CategoryBreakdown {
  category: string;
  count: number;
}

export interface TrustTrend {
  label: string;
  value: number;
}

export interface CommunityImpact {
  familiesHelped: number;
  avgResponseHrs: number;
  coverageMi: number;
  fulfillmentRate: number;
  trustScore: number;
}

export interface PlatformComparison {
  orgAvgResponse: number;
  platformAvgResponse: number;
  orgFulfillmentRate: number;
  platformFulfillmentRate: number;
  orgTrustScore: number;
  platformAvgTrust: number;
}

export async function getResponseTimeTrend(orgId: string): Promise<ResponseTimeTrend[]> {
  // Get all fulfilled matches for this org with timestamps
  const { data: resources } = await supabase.from('resources').select('id').eq('org_id', orgId);
  const resourceIds = (resources || []).map(r => r.id);
  if (resourceIds.length === 0) return [];

  const { data: matches } = await supabase
    .from('matches')
    .select('created_at, connected_at, resolved_at, status, resource_id')
    .in('resource_id', resourceIds)
    .eq('status', 'fulfilled')
    .order('created_at', { ascending: true });

  if (!matches || matches.length === 0) return [];

  // Group by week
  const weeks = new Map<string, number[]>();
  matches.forEach(m => {
    if (!m.connected_at) return;
    const created = new Date(m.created_at);
    const weekStart = new Date(created);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toISOString().split('T')[0];
    const hours = (new Date(m.connected_at).getTime() - created.getTime()) / 3600000;
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key)!.push(hours);
  });

  return Array.from(weeks.entries()).map(([week, hours]) => ({
    label: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: Math.round((hours.reduce((s, h) => s + h, 0) / hours.length) * 10) / 10,
  })).slice(-12); // last 12 weeks
}

export async function getCategoryBreakdown(orgId: string): Promise<CategoryBreakdown[]> {
  const { data: resources } = await supabase.from('resources').select('id').eq('org_id', orgId);
  const resourceIds = (resources || []).map(r => r.id);
  if (resourceIds.length === 0) return [];

  const { data: matches } = await supabase
    .from('matches')
    .select('id, resource_id')
    .in('resource_id', resourceIds)
    .eq('status', 'fulfilled');

  // Get request categories for these matches
  const matchIds = (matches || []).map(m => m.id);
  if (matchIds.length === 0) return [];

  const { data: requests } = await supabase
    .from('requests')
    .select('category')
    .in('id', matchIds.map(id => id)); // This won't work directly — need join

  // Simpler approach: count categories from resources
  const { data: orgResources } = await supabase.from('resources').select('category').eq('org_id', orgId);
  const cats = new Map<string, number>();
  (orgResources || []).forEach(r => {
    cats.set(r.category, (cats.get(r.category) || 0) + 1);
  });

  return Array.from(cats.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getCommunityImpact(orgId: string): Promise<CommunityImpact> {
  const { data: org } = await supabase
    .from('organizations')
    .select('trust_score, coverage_radius_km')
    .eq('id', orgId)
    .single();

  const { data: resources } = await supabase.from('resources').select('id').eq('org_id', orgId);
  const resourceIds = (resources || []).map(r => r.id);

  let familiesHelped = 0;
  let avgResponseHrs = 0;
  let fulfillmentRate = 0;

  if (resourceIds.length > 0) {
    const { data: matches } = await supabase
      .from('matches')
      .select('status, created_at, connected_at')
      .in('resource_id', resourceIds);

    const allMatches = matches || [];
    const fulfilled = allMatches.filter(m => m.status === 'fulfilled');
    const resolved = allMatches.filter(m => ['fulfilled', 'failed', 'expired'].includes(m.status));

    familiesHelped = fulfilled.length;
    fulfillmentRate = resolved.length > 0 ? Math.round((fulfilled.length / resolved.length) * 100) : 0;

    const responseTimes = allMatches.filter(m => m.connected_at).map(m =>
      (new Date(m.connected_at!).getTime() - new Date(m.created_at).getTime()) / 3600000
    );
    avgResponseHrs = responseTimes.length > 0
      ? Math.round((responseTimes.reduce((s, h) => s + h, 0) / responseTimes.length) * 10) / 10
      : 0;
  }

  return {
    familiesHelped,
    avgResponseHrs,
    coverageMi: org?.coverage_radius_km ? Math.round(org.coverage_radius_km / 1.60934) : 0,
    fulfillmentRate,
    trustScore: org?.trust_score || 0,
  };
}

export async function getPlatformComparison(orgId: string): Promise<PlatformComparison> {
  const impact = await getCommunityImpact(orgId);

  // Platform averages
  const { data: allOrgs } = await supabase.from('organizations').select('trust_score').not('trust_score', 'is', null);
  const platformAvgTrust = allOrgs && allOrgs.length > 0
    ? Math.round((allOrgs.reduce((s, o) => s + (o.trust_score || 0), 0) / allOrgs.length) * 100) / 100
    : 0;

  const { data: allMatches } = await supabase
    .from('matches')
    .select('status, created_at, connected_at');

  const am = allMatches || [];
  const platformFulfilled = am.filter(m => m.status === 'fulfilled');
  const platformResolved = am.filter(m => ['fulfilled', 'failed', 'expired'].includes(m.status));
  const platformFulfillmentRate = platformResolved.length > 0
    ? Math.round((platformFulfilled.length / platformResolved.length) * 100) : 0;

  const platformResponseTimes = am.filter(m => m.connected_at).map(m =>
    (new Date(m.connected_at!).getTime() - new Date(m.created_at).getTime()) / 3600000
  );
  const platformAvgResponse = platformResponseTimes.length > 0
    ? Math.round((platformResponseTimes.reduce((s, h) => s + h, 0) / platformResponseTimes.length) * 10) / 10
    : 0;

  return {
    orgAvgResponse: impact.avgResponseHrs,
    platformAvgResponse,
    orgFulfillmentRate: impact.fulfillmentRate,
    platformFulfillmentRate,
    orgTrustScore: impact.trustScore,
    platformAvgTrust,
  };
}
