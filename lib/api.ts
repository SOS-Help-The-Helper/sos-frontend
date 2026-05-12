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
    efCall('sos-read', { actor: { type: 'citizen' }, scope: 'my_records', include: ['matches'], ...data }),

  respondMatch: (matchId: string, response: 'accept' | 'decline', note?: string) =>
    efCall('sos-update', { actor: { type: 'citizen' }, record_type: 'match', record_id: matchId, action: response, ...(note ? { data: { reason: note } } : {}) }),

  fulfillMatch: (matchId: string, data: Record<string, unknown>) =>
    efCall('sos-update', { actor: { type: 'citizen' }, record_type: 'match', record_id: matchId, action: 'deliver', data }),

  consentFlow: (data: Record<string, unknown>) =>
    efCall('sos-update', { actor: { type: 'citizen' }, record_type: 'match', record_id: data.match_id as string, action: 'consent', data }),

  // ERV
  ervQuery: (queryType: string, params: Record<string, unknown>) =>
    efCall('erv-query', { query_type: queryType, ...params }),

  ervUpdate: (action: string, data: Record<string, unknown>) =>
    efCall('erv-update', { action, ...data }),

  ervMatchPropose: (data: Record<string, unknown>) =>
    efCall('erv-match-propose', data),

  // Intake
  submitIntake: (data: Record<string, unknown>) =>
    efCall('sos-write', data),

  // Resources
  searchResources: (keyword: string, lat: number, lng: number, distance?: number) =>
    efCall('resource-search', { keyword, lat, lng, ...(distance !== undefined ? { distance } : {}) }),

  // Reports
  submitSitrep: (data: Record<string, unknown>) =>
    efCall('sitrep-write', data),

  // Partners
  queryPartner: (orgId: string, queryType: string) =>
    efCall('sos-read', { actor: { type: 'partner', id: orgId }, scope: 'org_records', query_type: queryType }),

  onboardPartner: (data: Record<string, unknown>) =>
    efCall('partner-onboard', data),

  partnerReferral: (data: Record<string, unknown>) =>
    efCall('referral-track', data),

  // Alerts — GET, params forwarded as query string
  getAlerts: (lat: number, lng: number) =>
    efCall('alerts-feed', { lat: String(lat), lng: String(lng) }, { method: 'GET' }),

  // FEMA — GET
  checkFema: (state: string) =>
    efCall('fema-check', { state }, { method: 'GET' }),

  // Images
  analyzeImage: (imageBase64: string, context: string) =>
    efCall('image-analyze', { image_base64: imageBase64, context }),

  // Community
  getMessages: (channelId: string) =>
    efCall('community-messages', { channel_id: channelId }, { method: 'GET' }),

  postMessage: (channelId: string, text: string) =>
    efCall('community-messages', { channel_id: channelId, text }),

  // Inventory
  queryInventory: (params: Record<string, unknown>) =>
    efCall('inventory-query', params),

  writeInventory: (data: Record<string, unknown>) =>
    efCall('inventory-write', data),

  getNotifications: (orgId: string) =>
    efCall('sos-notify', { org_id: orgId, action: 'list' }),

  getScore: (personId: string) =>
    efCall('score-compute', { person_id: personId }),

  // Raw EF caller — use for one-off queries until a named wrapper is added
  efCall,
};

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
    if (filters.person_id) q = q.eq('request_person_id', filters.person_id);
    if (filters.org_id) q = q.eq('resource_org_id', filters.org_id);
    if (filters.status) q = q.eq('status', filters.status);
    q = q.order('created_at', { ascending: false }).limit(filters.limit || 50);
    return q;
  },
  getRequests: async (filters: { org_id?: string; status?: string[]; limit?: number }) => {
    let q = supabaseRead.from('requests').select('id, category, urgency, status, location_text, latitude, longitude, household_size, has_children, has_elderly, has_disabled, has_pets, taxonomy_code, created_at, priority_score, locations:location_id(latitude, longitude, street_address, city, state, zip_code)');
    if (filters.status) q = q.in('status', filters.status);
    if (filters.org_id) q = q.eq('org_id', filters.org_id);
    q = q.order('created_at', { ascending: false }).limit(filters.limit || 100);
    return q;
  },
  getResources: async (filters: { org_id?: string; status?: string[]; limit?: number }) => {
    let q = supabaseRead.from('resources').select('id, category, status, capacity_available, capacity_total, latitude, longitude, taxonomy_code, org_id, created_at, locations:location_id(latitude, longitude, street_address, city, state, zip_code)');
    if (filters.status) q = q.in('status', filters.status);
    if (filters.org_id) q = q.eq('org_id', filters.org_id);
    q = q.order('created_at', { ascending: false }).limit(filters.limit || 100);
    return q;
  },
  getOrganizations: async (filters?: { status?: string }) => {
    let q = supabaseRead.from('organizations').select('id, name, org_type, status, latitude, longitude, locations:location_id(latitude, longitude, street_address, city, state, zip_code)');
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
