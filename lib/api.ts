/**
 * EF (Edge Function) client — single source of truth for all frontend data fetches.
 * Replaces direct Supabase PostgREST queries with typed wrappers around EF endpoints.
 */

const BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

async function efCall<T = unknown>(
  fn: string,
  body?: Record<string, unknown>,
  options: { method?: 'GET' | 'POST' } = {}
): Promise<T> {
  const method = options.method ?? (body === undefined ? 'GET' : 'POST');
  const url = method === 'GET' && body
    ? `${BASE_URL}/${fn}?${new URLSearchParams(body as Record<string, string>).toString()}`
    : `${BASE_URL}/${fn}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    ...(method === 'POST' && body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    throw new Error(`EF ${fn} failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// GeoJSON types
// ---------------------------------------------------------------------------

export interface GeoFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: number[] };
  properties: Record<string, unknown>;
}

export interface MapFeatures {
  requests: GeoFeature[];
  resources: GeoFeature[];
  organizations: GeoFeature[];
}

// ---------------------------------------------------------------------------
// Typed API surface
// ---------------------------------------------------------------------------

export const api = {
  // Matching
  queryMatches: (data: Record<string, unknown>) =>
    efCall('query-matches', data),

  respondMatch: (matchId: string, response: 'accept' | 'decline', note?: string) =>
    efCall('respond-match', { match_id: matchId, response, note }),

  fulfillMatch: (matchId: string, data: Record<string, unknown>) =>
    efCall('fulfill-match', { match_id: matchId, ...data }),

  consentFlow: (data: Record<string, unknown>) =>
    efCall('consent-flow', data),

  // ERV
  ervQuery: (queryType: string, params: Record<string, unknown>) =>
    efCall('erv-query', { query_type: queryType, ...params }),

  ervUpdate: (action: string, data: Record<string, unknown>) =>
    efCall('erv-update', { action, ...data }),

  ervMatchPropose: (data: Record<string, unknown>) =>
    efCall('erv-match-propose', data),

  // Intake
  submitIntake: (data: Record<string, unknown>) =>
    efCall('submit-intake', data),

  // Resources
  searchResources: (keyword: string, lat: number, lng: number, distance?: number) =>
    efCall('resource-search', { keyword, lat, lng, ...(distance !== undefined ? { distance } : {}) }),

  // Scores
  getScore: (personId: string) =>
    efCall('get-score', { person_id: personId }, { method: 'GET' }),

  // Reports
  submitSitrep: (data: Record<string, unknown>) =>
    efCall('submit-sitrep', data),

  // Partners
  queryPartner: (orgId: string, queryType: string) =>
    efCall('query-partner', { org_id: orgId, query_type: queryType }),

  onboardPartner: (data: Record<string, unknown>) =>
    efCall('onboard-partner', data),

  partnerReferral: (data: Record<string, unknown>) =>
    efCall('partner-referral', data),

  // Alerts — GET, params forwarded as query string
  getAlerts: (lat: number, lng: number) =>
    efCall('get-alerts', { lat: String(lat), lng: String(lng) }, { method: 'GET' }),

  // FEMA — GET
  checkFema: (state: string) =>
    efCall('check-fema', { state }, { method: 'GET' }),

  // Images
  analyzeImage: (imageBase64: string, context: string) =>
    efCall('analyze-image', { image_base64: imageBase64, context }),

  // Community
  getMessages: (channelId: string) =>
    efCall('get-messages', { channel_id: channelId }, { method: 'GET' }),

  postMessage: (channelId: string, text: string) =>
    efCall('post-message', { channel_id: channelId, text }),

  // Inventory
  queryInventory: (params: Record<string, unknown>) =>
    efCall('query-inventory', params),

  writeInventory: (data: Record<string, unknown>) =>
    efCall('write-inventory', data),

  // Notifications (replaces lib/notifications.ts direct DB queries)
  getNotifications: (orgId: string) =>
    efCall('get-notifications', { org_id: orgId }, { method: 'GET' }),

  // Raw EF caller — use for one-off queries until a named wrapper is added
  efCall,
};

// ---------------------------------------------------------------------------
// Map helper
// ---------------------------------------------------------------------------

export async function loadMapFeatures(
  lat: number,
  lng: number,
  keyword = ''
): Promise<MapFeatures> {
  const raw = await efCall<{
    requests?: GeoFeature[];
    resources?: GeoFeature[];
    organizations?: GeoFeature[];
  }>('resource-search', { keyword, lat: String(lat), lng: String(lng) }, { method: 'GET' });

  return {
    requests: raw.requests ?? [],
    resources: raw.resources ?? [],
    organizations: raw.organizations ?? [],
  };
}

// --- Generic read helpers (server-side via map-data EF or direct reads) ---
// These replace direct supabase.from() calls in frontend pages.
// Uses anon key + RLS (same security as before, but centralized).

import { createClient } from '@supabase/supabase-js';

const supabaseRead = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Scoped read-only queries (RLS-protected, anon key)
export const db = {
  from: (table: string) => supabaseRead.from(table),
  // Convenience wrappers for common patterns
  getMatches: async (filters: { person_id?: string; org_id?: string; status?: string; limit?: number }) => {
    let q = supabaseRead.from('matches').select('*, requests(id, category, urgency, location_text, household_size), resources(id, category, org_id, capacity_available)');
    if (filters.person_id) q = q.or(`requests.person_id.eq.${filters.person_id}`);
    if (filters.org_id) q = q.eq('resource_org_id', filters.org_id);
    if (filters.status) q = q.eq('status', filters.status);
    q = q.order('created_at', { ascending: false }).limit(filters.limit || 50);
    return q;
  },
  getRequests: async (filters: { org_id?: string; status?: string[]; limit?: number }) => {
    let q = supabaseRead.from('requests').select('id, category, urgency, status, location_text, latitude, longitude, household_size, has_children, has_elderly, has_disabled, has_pets, taxonomy_code, created_at, priority_score');
    if (filters.status) q = q.in('status', filters.status);
    if (filters.org_id) q = q.eq('org_id', filters.org_id);
    q = q.order('created_at', { ascending: false }).limit(filters.limit || 100);
    return q;
  },
  getResources: async (filters: { org_id?: string; status?: string[]; limit?: number }) => {
    let q = supabaseRead.from('resources').select('id, category, status, capacity_available, capacity_total, latitude, longitude, taxonomy_code, org_id, created_at');
    if (filters.status) q = q.in('status', filters.status);
    if (filters.org_id) q = q.eq('org_id', filters.org_id);
    q = q.order('created_at', { ascending: false }).limit(filters.limit || 100);
    return q;
  },
  getOrganizations: async (filters?: { status?: string }) => {
    let q = supabaseRead.from('organizations').select('id, name, org_type, status, latitude, longitude');
    if (filters?.status) q = q.eq('status', filters.status);
    return q;
  },
  getPersonById: async (personId: string) => {
    return supabaseRead.from('persons').select('id, display_name, sos_score, impact_score, community_score, readiness_score, score_data, phone_hash, created_at').eq('id', personId).single();
  },
  getCommunityMessages: async (filters?: { type?: string; limit?: number }) => {
    let q = supabaseRead.from('community_messages').select('id, message_text, message_type, latitude, longitude, created_at, flagged, person_id');
    if (filters?.type) q = q.eq('message_type', filters.type);
    q = q.order('created_at', { ascending: false }).limit(filters?.limit || 100);
    return q;
  },
  getReports: async (filters?: { status?: string; limit?: number }) => {
    let q = supabaseRead.from('reports').select('id, category, severity, description, latitude, longitude, status, verification_status, created_at');
    if (filters?.status) q = q.eq('status', filters.status);
    q = q.order('created_at', { ascending: false }).limit(filters?.limit || 100);
    return q;
  },
};
