/**
 * EF (Edge Function) client — single source of truth for all frontend data fetches.
 * Replaces direct Supabase PostgREST queries with typed wrappers around EF endpoints.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// SOS DB connection — the one and only database the frontend ever talks to.
// ---------------------------------------------------------------------------
// There is exactly one database: SOS. "Which org am I looking at" travels as an
// `org_id` parameter in the EF body / read filter — never as a different
// connection string, anon key, or x-partner-key. The connection is pinned to
// SOS and never reassigned at runtime.

const SOS_URL =
  process.env.NEXT_PUBLIC_SOS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SOS_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Connection is permanently SOS. Org scope is a parameter, not a URL.
const efBaseUrl = `${SOS_URL}/functions/v1`;
const efAnonKey = SOS_ANON_KEY;

async function callEf<T = unknown>(
  base: string,
  authKey: string,
  fn: string,
  body?: Record<string, unknown>,
  options: { method?: 'GET' | 'POST' } = {}
): Promise<T> {
  const method = options.method ?? (body === undefined ? 'GET' : 'POST');
  const url = method === 'GET' && body
    ? `${base}/${fn}?${new URLSearchParams(body as Record<string, string>).toString()}`
    : `${base}/${fn}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authKey}`,
    },
    ...(method === 'POST' && body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.error || body?.message || `EF ${fn} failed: ${res.status} ${res.statusText}`
    );
  }

  return res.json() as Promise<T>;
}

/** Call an edge function on the SOS DB. */
async function efCall<T = unknown>(
  fn: string,
  body?: Record<string, unknown>,
  options: { method?: 'GET' | 'POST' } = {}
): Promise<T> {
  return callEf<T>(efBaseUrl, efAnonKey, fn, body, options);
}

/**
 * Backward-compatible alias. Everything points at SOS now, so this is identical
 * to efCall — kept so existing `api.sosEfCall(...)` callers keep working.
 */
const sosEfCall = efCall;

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

  // Portal Config
  getPortalConfig: (orgId: string) =>
    efCall<{ org_id: string; org_name: string; org_type: string; portal_config: Record<string, unknown> }>(
      'partner-read', { query_type: 'portal_config', org_id: orgId }
    ),

  updatePortalConfig: (orgId: string, config: Record<string, unknown>) =>
    efCall('partner-update', { update_type: 'update_portal_config', data: { org_id: orgId, config } }),

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

  // Raw EF caller pinned to the SOS DB (cross-partner / coordination ops).
  sosEfCall,

  // CRM — Cases
  crmCasesList: (orgId: string, filters?: { status?: string; urgency?: string; county?: string; assigned_to?: string; category?: string }) =>
    efCall("crm-cases", { action: "list", org_id: orgId, ...filters }),

  crmSosesList: (filters?: { status?: string; limit?: number; offset?: number; org_id?: string }) =>
    efCall("crm-cases", { action: "list_soses", ...filters }),

  crmCasesDetail: (params: { person_id?: string; request_id?: string }) =>
    efCall("crm-cases", { action: "detail", ...params }),

  // CRM — Case Actions (write path)
  crmCaseAction: (action: string, data: Record<string, unknown>) =>
    efCall("crm-case-action", { action, ...data }),

  // CRM — Requests and Resources (via partner-read)
  crmRequestsList: (orgId: string, filters?: Record<string, unknown>) =>
    efCall("partner-read", { query_type: "request_summary", org_id: orgId, ...filters }),
  crmResourcesList: (orgId: string, filters?: Record<string, unknown>) =>
    efCall("partner-read", { query_type: "resource_summary", org_id: orgId, ...filters }),

  // CRM — Matches board (direct Supabase read with joins)
  crmMatchesList: async (orgId: string) => {
    if (!orgId) return { matches: [] };
    const { data, error } = await supabaseRead
      .from('matches')
      .select(`
        id, request_id, resource_id, match_score, match_reasoning, status, committed_by, chain_id, created_at,
        requests!request_id(taxonomy_code, category, county, urgency, contact_name, persons:person_id(display_name)),
        resources!resource_id(taxonomy_code, contact_name, category, description, org_id, organizations:org_id(name))
      `)
      .eq('provider_org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;

    return {
      matches: (data || []).map((m: any) => ({
        ...m,
        score: m.match_score ?? 0,
        reasoning: m.match_reasoning,
        request_person_name: m.requests?.persons?.display_name ?? m.requests?.contact_name ?? null,
        request_taxonomy: m.requests?.taxonomy_code ?? m.requests?.category ?? null,
        request_county: m.requests?.county ?? null,
        request_urgency: m.requests?.urgency ?? null,
        resource_name: m.resources?.description ?? m.resources?.contact_name ?? null,
        resource_taxonomy: m.resources?.taxonomy_code ?? m.resources?.category ?? null,
        org_name: m.resources?.organizations?.name ?? null,
      })),
    };
  },

  // CRM — Search
  crmSearch: (query: string, orgId: string, filters?: Record<string, unknown>) =>
    efCall("crm-search", { query, org_id: orgId, ...filters }),

  // CRM — Directory
  crmBrowsePersons: (orgId: string, params?: { limit?: number; offset?: number; sort?: string }) =>
    efCall("crm-directory", { action: "browse_persons", org_id: orgId, ...params }),

  crmBrowseOrgs: (orgId: string, params?: { limit?: number; offset?: number }) =>
    efCall("crm-directory", { action: "browse_orgs", org_id: orgId, ...params }),

  crmOrgMembers: (orgId: string) =>
    efCall("crm-directory", { action: "list_org_members", org_id: orgId }),

  // CRM — Events / Calendar
  crmEventsList: (orgId: string, params?: { from?: string; to?: string; event_type?: string }) =>
    efCall("crm-events", { action: "list", org_id: orgId, ...params }),

  crmEventsCreate: (orgId: string, data: Record<string, unknown>) =>
    efCall("crm-events", { action: "create", org_id: orgId, ...data }),

  crmEventsUpdate: (eventId: string, data: Record<string, unknown>) =>
    efCall("crm-events", { action: "update", event_id: eventId, ...data }),

  crmEventsDelete: (eventId: string) =>
    efCall("crm-events", { action: "delete", event_id: eventId }),

  // CRM — Delivery
  crmDeliveryList: (matchId: string) =>
    efCall("crm-delivery", { action: "list", match_id: matchId }),

  crmDeliveryUpdate: (deliveryId: string, status: string, data?: Record<string, unknown>) =>
    efCall("crm-delivery", { action: "update_status", delivery_id: deliveryId, status, ...data }),

  // CRM — Volunteers
  crmVolunteersAvailable: (orgId: string, params?: { day?: number; skill?: string; lat?: number; lng?: number; radius?: number }) =>
    efCall("crm-volunteers", { action: "query_available", org_id: orgId, ...params }),

  // CRM — Reports
  crmImpactDashboard: (orgId: string, params?: { disaster_id?: string; days?: number }) =>
    efCall("crm-reports", { action: "impact_dashboard", org_id: orgId, ...params }),

  // CRM — Facilities
  crmFacilitiesList: (orgId: string) =>
    efCall("crm-facilities", { action: "list_by_org", org_id: orgId }),

  // CRM — Credentials
  crmCredentialsList: (personId: string) =>
    efCall("crm-credentials", { action: "list_by_person", person_id: personId }),

  // CRM — Onboard
  crmOnboardOrg: (data: Record<string, unknown>) =>
    efCall("crm-onboard", { action: "create_org", ...data }),

  crmSetModules: (orgId: string, modules: string[]) =>
    efCall("crm-onboard", { action: "set_modules", org_id: orgId, modules }),

  // Transport — list + create
  transportList: (orgId: string, filters?: Record<string, unknown>) =>
    efCall("partner-read", { query_type: "transport_assignments", org_id: orgId, ...filters }),

  transportCreate: (data: Record<string, unknown>) =>
    efCall("partner-update", { action: "create_transport_assignment", ...data }),

  // Transport / Driver
  transportUpdateStatus: (assignmentId: string, status: string, data?: Record<string, unknown>) =>
    efCall("partner-update", { action: "update_transport_status", transport_id: assignmentId, status, ...data }),
  transportReportIssue: (assignmentId: string, issueType: string, description: string) =>
    efCall("partner-update", { action: "report_transport_issue", transport_id: assignmentId, issue_type: issueType, description }),
  transportUpdateLocation: (assignmentId: string, lat: number, lng: number) =>
    efCall("partner-update", { action: "update_transport_location", transport_id: assignmentId, latitude: lat, longitude: lng }),

  inventoryUpdateCondition: (resourceId: string, condition: number, notes?: string) =>
    efCall("partner-update", { action: "update_resource_condition", resource_id: resourceId, condition_rating: condition, notes }),
  inventoryMoveToFacility: (resourceId: string, facilityId: string) =>
    efCall("partner-update", { action: "move_to_facility", resource_id: resourceId, facility_id: facilityId }),

  // CRM — Map
  crmMapFeatures: (orgId: string, filters?: Record<string, unknown>) =>
    efCall("crm-map", { action: "get_features", org_id: orgId, ...filters }),

  // CRM — Command
  crmCommandIncidents: () =>
    efCall("crm-command", { action: "list_incidents" }),

  crmCommandSummary: (disasterId: string) =>
    efCall("crm-command", { action: "incident_summary", disaster_id: disasterId }),

  // Person/Org detail
  crmGetOrg: (orgId: string) =>
    efCall("crm-directory", { action: "get_org", org_id: orgId }),
  crmGetPerson: (personId: string) =>
    efCall("crm-directory", { action: "get_person", person_id: personId }),
  crmUpdatePerson: (personId: string, field: string, value: string) =>
    efCall("crm-directory", { action: "update_person", person_id: personId, field, value }),
  crmOrgStats: (orgId: string) =>
    efCall("crm-directory", { action: "org_stats", org_id: orgId }),

  // Notes
  crmGetNotes: (entityType: string, entityId: string) =>
    efCall("crm-case-action", { action: "get_notes", entity_type: entityType, entity_id: entityId }),
  crmGetCaseNotes: (sosId: string) =>
    efCall("crm-case-action", { action: "get_case_notes", sos_id: sosId }),

  // Detail reads  
  crmResourceDetail: (resourceId: string, orgId?: string) =>
    efCall("partner-read", { query_type: "resource_detail", resource_id: resourceId, org_id: orgId }),
  crmReportDetail: (reportId: string) =>
    efCall("crm-reports", { report_type: "report_detail", report_id: reportId }),
};

// --- Generic read helpers (server-side via map-data EF or direct reads) ---
// These replace direct supabase.from() calls in frontend pages.
// Uses anon key + RLS (same security as before, but centralized).

// Direct PostgREST read client (RLS-protected, anon key). Pinned to SOS and
// created once — org scope is applied via `.eq('...org_id', ...)` filters in
// the queries below, never by repointing the connection.
const supabaseRead: SupabaseClient = createClient(SOS_URL, SOS_ANON_KEY);

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
