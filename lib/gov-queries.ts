/**
 * Government dashboard queries.
 * ALL data is aggregated. Zero PII. Never returns person-level rows.
 * "23 shelter requests in Zone 4" — never "Maria needs shelter."
 */

import { supabase } from '@/lib/supabase-client';

// --- Types ---

export interface ZoneAggregate {
  zone: string;
  category: string;
  urgency: string;
  count: number;
  matched: number;
  fulfilled: number;
  unmet: number;
}

export interface GapAnalysis {
  zone: string;
  category: string;
  severity: string;
  unmet_count: number;
  nearest_partner: string | null;
  nearest_partner_type: string | null;
  nearest_partner_capacity: string | null;
  recommendation: string;
}

export interface MapLayer {
  type: 'need' | 'resource' | 'gap';
  lat: number;
  lng: number;
  category: string;
  count: number; // aggregated count at this location cluster
  severity?: string;
}

export interface SitrepSummary {
  disaster_name: string;
  generated_at: string;
  total_requests: number;
  total_resources: number;
  total_matches: number;
  fulfillment_rate: number;
  by_category: Record<string, { requests: number; matched: number; fulfilled: number; unmet: number }>;
  by_urgency: Record<string, number>;
  active_partners: number;
  partner_summary: Array<{ name: string; type: string; matches: number; fulfilled: number; capacity: string }>;
  zones: ZoneAggregate[];
}

// --- Queries ---

/**
 * Get aggregated map data — clustered by location grid (0.01 degree ≈ 1km).
 * Returns counts per grid cell, never individual points.
 */
export async function getGovMapData(disasterId?: string): Promise<MapLayer[]> {
  const layers: MapLayer[] = [];

  // Aggregate requests by location grid
  let reqQuery = supabase
    .from('requests')
    .select('latitude, longitude, category, urgency, status')
    .not('latitude', 'is', null);

  if (disasterId) reqQuery = reqQuery.eq('disaster_id', disasterId);

  const { data: requests } = await reqQuery;

  // Aggregate resources by location grid
  let resQuery = supabase
    .from('resources')
    .select('latitude, longitude, category, status')
    .not('latitude', 'is', null);

  const { data: resources } = await resQuery;

  // Grid-cluster requests (round to 0.01 degree)
  const reqClusters = new Map<string, { lat: number; lng: number; category: string; count: number; severity: string }>();
  (requests || []).forEach(r => {
    const gridLat = Math.round(r.latitude * 100) / 100;
    const gridLng = Math.round(r.longitude * 100) / 100;
    const key = `${gridLat},${gridLng},${r.category}`;
    const existing = reqClusters.get(key);
    if (existing) {
      existing.count++;
      if (r.urgency === 'critical' || (r.urgency === 'urgent' && existing.severity !== 'critical')) {
        existing.severity = r.urgency;
      }
    } else {
      reqClusters.set(key, { lat: gridLat, lng: gridLng, category: r.category, count: 1, severity: r.urgency || 'standard' });
    }
  });

  reqClusters.forEach(c => {
    layers.push({ type: 'need', lat: c.lat, lng: c.lng, category: c.category, count: c.count, severity: c.severity });
  });

  // Grid-cluster resources
  const resClusters = new Map<string, { lat: number; lng: number; category: string; count: number }>();
  (resources || []).forEach(r => {
    const gridLat = Math.round(r.latitude * 100) / 100;
    const gridLng = Math.round(r.longitude * 100) / 100;
    const key = `${gridLat},${gridLng},${r.category}`;
    const existing = resClusters.get(key);
    if (existing) existing.count++;
    else resClusters.set(key, { lat: gridLat, lng: gridLng, category: r.category, count: 1 });
  });

  resClusters.forEach(c => {
    layers.push({ type: 'resource', lat: c.lat, lng: c.lng, category: c.category, count: c.count });
  });

  // Gap detection: need clusters with no nearby resource cluster
  reqClusters.forEach((c, key) => {
    const hasResource = Array.from(resClusters.values()).some(r =>
      Math.abs(r.lat - c.lat) < 0.05 && Math.abs(r.lng - c.lng) < 0.05 && r.category === c.category
    );
    if (!hasResource) {
      layers.push({ type: 'gap', lat: c.lat, lng: c.lng, category: c.category, count: c.count, severity: c.severity });
    }
  });

  return layers;
}

/**
 * Get gap analysis — unmet needs by zone × category × severity.
 */
export async function getGapAnalysis(disasterId?: string): Promise<GapAnalysis[]> {
  let reqQuery = supabase
    .from('requests')
    .select('category, urgency, location_name, status, latitude, longitude')
    .in('status', ['open', 'matched']);

  if (disasterId) reqQuery = reqQuery.eq('disaster_id', disasterId);

  const { data: requests } = await reqQuery;
  const { data: orgs } = await supabase.from('organizations').select('name, org_type, capabilities, latitude, longitude');

  // Group by zone (location_name or grid)
  const gapMap = new Map<string, GapAnalysis>();

  (requests || []).forEach(r => {
    const zone = r.location_name || `Zone ${Math.round((r.latitude || 0) * 10) / 10}`;
    const key = `${zone}|${r.category}|${r.urgency}`;
    const existing = gapMap.get(key);
    if (existing) {
      existing.unmet_count++;
    } else {
      // Find nearest partner for this category
      let nearest: any = null;
      let nearestDist = Infinity;
      (orgs || []).forEach(org => {
        if (!org.latitude || !org.longitude) return;
        const dist = Math.sqrt(Math.pow((org.latitude - (r.latitude || 0)), 2) + Math.pow((org.longitude - (r.longitude || 0)), 2));
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = org;
        }
      });

      const recommendation = r.urgency === 'critical'
        ? `Activate mutual aid for ${r.category} in ${zone}. ${nearest ? `Nearest partner: ${nearest.name}` : 'No partner in range — request external resources.'}`
        : `${nearest ? `${nearest.name} may be able to help.` : 'Consider activating mutual aid.'} ${r.urgency === 'urgent' ? 'Escalate if unresolved in 4 hours.' : ''}`;

      gapMap.set(key, {
        zone,
        category: r.category,
        severity: r.urgency || 'standard',
        unmet_count: 1,
        nearest_partner: nearest?.name || null,
        nearest_partner_type: nearest?.org_type || null,
        nearest_partner_capacity: null,
        recommendation,
      });
    }
  });

  return Array.from(gapMap.values()).sort((a, b) => {
    const sev = { critical: 0, urgent: 1, standard: 2, can_wait: 3 };
    return (sev[a.severity as keyof typeof sev] ?? 4) - (sev[b.severity as keyof typeof sev] ?? 4) || b.unmet_count - a.unmet_count;
  });
}

/**
 * Generate situation report — fully aggregated.
 */
export async function getSitrepSummary(disasterId?: string): Promise<SitrepSummary> {
  let reqQuery = supabase.from('requests').select('id, category, urgency, status, disaster_id, location_name');
  let matchQuery = supabase.from('matches').select('id, status, match_score, resource_id, disaster_id');

  if (disasterId) {
    reqQuery = reqQuery.eq('disaster_id', disasterId);
    matchQuery = matchQuery.eq('disaster_id', disasterId);
  }

  const [{ data: requests }, { data: matches }, { data: resources }, { data: orgs }, { data: disasters }] = await Promise.all([
    reqQuery,
    matchQuery,
    supabase.from('resources').select('id, category, status, org_id'),
    supabase.from('organizations').select('id, name, org_type'),
    supabase.from('disasters').select('id, name, status').in('status', ['active', 'watch', 'recovery']).limit(1),
  ]);

  const allReqs = requests || [];
  const allMatches = matches || [];
  const allRes = resources || [];
  const allOrgs = orgs || [];
  const disaster = disasters?.[0];

  const fulfilled = allMatches.filter(m => m.status === 'fulfilled').length;
  const resolved = allMatches.filter(m => ['fulfilled', 'failed', 'expired'].includes(m.status)).length;

  // By category
  const byCategory: SitrepSummary['by_category'] = {};
  allReqs.forEach(r => {
    if (!byCategory[r.category]) byCategory[r.category] = { requests: 0, matched: 0, fulfilled: 0, unmet: 0 };
    byCategory[r.category].requests++;
    if (r.status === 'matched' || r.status === 'fulfilled') byCategory[r.category].matched++;
    if (r.status === 'fulfilled') byCategory[r.category].fulfilled++;
    if (r.status === 'open') byCategory[r.category].unmet++;
  });

  // By urgency
  const byUrgency: Record<string, number> = {};
  allReqs.forEach(r => { byUrgency[r.urgency || 'standard'] = (byUrgency[r.urgency || 'standard'] || 0) + 1; });

  // Partner summary (aggregated, no PII)
  const resOrgMap = new Map(allRes.map(r => [r.id, r.org_id]));
  const partnerSummary = allOrgs.map(org => {
    const orgMatches = allMatches.filter(m => resOrgMap.get(m.resource_id) === org.id);
    const orgFulfilled = orgMatches.filter(m => m.status === 'fulfilled').length;
    return {
      name: org.name,
      type: org.org_type || 'partner',
      matches: orgMatches.length,
      fulfilled: orgFulfilled,
      capacity: 'active',
    };
  }).filter(p => p.matches > 0);

  // Zone aggregates
  const zoneMap = new Map<string, ZoneAggregate>();
  allReqs.forEach(r => {
    const zone = r.location_name || 'Unspecified';
    const key = `${zone}|${r.category}|${r.urgency}`;
    const existing = zoneMap.get(key);
    if (existing) {
      existing.count++;
      if (r.status === 'open') existing.unmet++;
    } else {
      zoneMap.set(key, {
        zone,
        category: r.category,
        urgency: r.urgency || 'standard',
        count: 1,
        matched: r.status === 'matched' ? 1 : 0,
        fulfilled: r.status === 'fulfilled' ? 1 : 0,
        unmet: r.status === 'open' ? 1 : 0,
      });
    }
  });

  return {
    disaster_name: disaster?.name || 'All Disasters',
    generated_at: new Date().toISOString(),
    total_requests: allReqs.length,
    total_resources: allRes.length,
    total_matches: allMatches.length,
    fulfillment_rate: resolved > 0 ? Math.round((fulfilled / resolved) * 100) : 0,
    by_category: byCategory,
    by_urgency: byUrgency,
    active_partners: partnerSummary.length,
    partner_summary: partnerSummary,
    zones: Array.from(zoneMap.values()),
  };
}
