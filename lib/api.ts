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

  // Intake
  submitIntake: (data: Record<string, unknown>) =>
    efCall('sos-write', data),

  // Resources
  searchResources: (keyword: string, lat: number, lng: number, distance?: number) =>
    efCall('resource-search', { keyword, lat, lng, ...(distance !== undefined ? { distance } : {}) }),

  // Reports
  submitSitrep: (data: Record<string, unknown>) =>
    efCall('sos-write', { action: 'sitrep.create', ...data }),

  // Portal Config
  getPortalConfig: (orgId: string) =>
    efCall<{ org: Record<string, unknown>; modules: Record<string, unknown>; metadata: Record<string, unknown> }>(
      'sos-read', { action: 'settings.get', org_id: orgId }
    ),

  updatePortalConfig: (orgId: string, config: Record<string, unknown>, personId?: string) =>
    efCall('sos-update', { action: 'settings.update_profile', org_id: orgId, person_id: personId ?? '', patch: config }),

  // Partners
  queryPartner: (orgId: string, queryType: string) =>
    efCall('sos-read', { actor: { type: 'partner', id: orgId }, scope: 'org_records', query_type: queryType }),

  onboardPartner: (data: Record<string, unknown>) =>
    efCall('sos-write', { action: 'onboard.agent_register', ...data }),

  partnerReferral: (data: Record<string, unknown>) =>
    efCall('sos-write', { action: 'referral.generate', ...data }),

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
  queryInventory: (params: Record<string, unknown>) => {
    const { action: invAction, ...rest } = params;
    return efCall('sos-read', { action: `inventory.${invAction ?? 'query'}`, ...rest });
  },

  writeInventory: (data: Record<string, unknown>) => {
    const { action: invAction, ...rest } = data;
    return efCall('sos-update', { action: `inventory.${invAction ?? 'write'}`, ...rest });
  },

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
    efCall('sos-read', { action: 'cases.list', org_id: orgId, ...filters }),

  crmSosesList: (filters?: { status?: string; limit?: number; offset?: number; org_id?: string }) =>
    efCall('sos-read', { action: 'cases.list_soses', ...filters }),

  crmCasesDetail: (params: { person_id?: string; request_id?: string }) =>
    efCall('sos-read', { action: 'cases.detail', ...params }),

  // CRM — Case Actions (write path for mutations, read path for note fetches)
  crmCaseAction: (action: string, data: Record<string, unknown>) => {
    if (action === 'get_notes') return efCall('sos-read', { action: 'notes.get', ...data });
    if (action === 'get_case_notes') return efCall('sos-read', { action: 'notes.get_case', ...data });
    return efCall('sos-update', { action: `case_action.${action}`, ...data });
  },

  // CRM — Requests summary (with by_status counts)
  // Fetches all requests via sos-read cases.list + computes summary client-side
  crmRequestsList: async (orgId: string, filters?: Record<string, unknown>) => {
    const res = await efCall<{ cases: any[]; total: number }>('sos-read', {
      action: 'cases.list', org_id: orgId, limit: 200, ...filters,
    });
    const requests = res.cases || [];
    const total = res.total || requests.length;
    const by_status: Record<string, number> = {};
    const by_urgency: Record<string, number> = {};
    let veteran_count = 0;
    let first_responder_count = 0;
    let total_household_members = 0;
    for (const r of requests) {
      by_status[r.status] = (by_status[r.status] || 0) + 1;
      if (r.urgency) by_urgency[r.urgency] = (by_urgency[r.urgency] || 0) + 1;
      if (r.persons?.is_veteran) veteran_count++;
      if (r.persons?.is_first_responder) first_responder_count++;
      total_household_members += r.household_size || 0;
    }
    return { total, by_status, by_urgency, veteran_count, first_responder_count, total_household_members, requests };
  },

  // CRM — Resources summary (with by_status counts)
  // Fetches resources via sos-read org_records + computes summary client-side
  crmResourcesList: async (orgId: string, filters?: Record<string, unknown>) => {
    const res = await efCall<{ resources: any[] }>('sos-read', {
      actor: { type: 'partner', id: orgId }, scope: 'org_records', ...filters,
    });
    const resources = res.resources || [];
    const total = resources.length;
    const by_status: Record<string, number> = {};
    const by_taxonomy: Record<string, number> = {};
    for (const r of resources) {
      by_status[r.status] = (by_status[r.status] || 0) + 1;
      if (r.taxonomy_code) by_taxonomy[r.taxonomy_code] = (by_taxonomy[r.taxonomy_code] || 0) + 1;
    }
    return { total, by_status, by_taxonomy, resources };
  },

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
    efCall('sos-read', { action: 'search', query, org_id: orgId, ...filters }),

  // CRM — Directory
  crmBrowsePersons: (orgId: string, params?: { limit?: number; offset?: number; sort?: string }) =>
    efCall('sos-read', { action: 'directory.browse_persons', org_id: orgId, ...params }),

  crmBrowseOrgs: (orgId: string, params?: { limit?: number; offset?: number }) =>
    efCall('sos-read', { action: 'directory.browse_orgs', org_id: orgId, ...params }),

  crmOrgMembers: (orgId: string) =>
    efCall('sos-read', { action: 'directory.list_org_members', org_id: orgId }),

  // CRM — Events / Calendar
  crmEventsList: (orgId: string, params?: { from?: string; to?: string; event_type?: string }) =>
    efCall('sos-read', { action: 'events.list', org_id: orgId, ...params }),

  crmEventsCreate: (orgId: string, data: Record<string, unknown>) =>
    efCall('sos-update', { action: 'events.create', org_id: orgId, ...data }),

  crmEventsUpdate: (eventId: string, data: Record<string, unknown>) =>
    efCall('sos-update', { action: 'events.update', event_id: eventId, ...data }),

  crmEventsDelete: (eventId: string) =>
    efCall('sos-update', { action: 'events.delete', event_id: eventId }),

  // CRM — Delivery
  crmDeliveryList: (matchId: string) =>
    efCall('sos-read', { action: 'delivery.list', match_id: matchId }),

  crmDeliveryUpdate: (deliveryId: string, status: string, data?: Record<string, unknown>) =>
    efCall('sos-update', { action: 'delivery.update_status', delivery_id: deliveryId, status, ...data }),

  // CRM — Volunteers
  crmVolunteersAvailable: (orgId: string, params?: { day?: number; skill?: string; lat?: number; lng?: number; radius?: number }) =>
    efCall('sos-read', { action: 'volunteers.query_available', org_id: orgId, ...params }),

  // CRM — Reports
  crmImpactDashboard: (orgId: string, params?: { disaster_id?: string; days?: number }) =>
    efCall('sos-read', { action: 'reports.impact_dashboard', org_id: orgId, ...params }),

  // CRM — Facilities
  crmFacilitiesList: (orgId: string) =>
    efCall('sos-read', { action: 'facilities.list_by_org', org_id: orgId }),

  // CRM — Credentials
  crmCredentialsList: (personId: string) =>
    efCall('sos-read', { action: 'credentials.list_by_person', person_id: personId }),

  // CRM — Onboard
  crmOnboardOrg: (data: Record<string, unknown>) =>
    efCall('sos-write', { action: 'onboard.create_org', ...data }),

  crmSetModules: (orgId: string, modules: string[]) =>
    efCall('sos-write', { action: 'onboard.set_modules', org_id: orgId, modules }),

  // Transport — list transport-chain matches for an org
  transportList: async (orgId: string, _filters?: Record<string, unknown>) => {
    // Transport assignments = matches where provider_org_id matches and chain involves TRANSPORT resources
    const { data, error } = await supabaseRead
      .from('matches')
      .select(`
        id, status, chain_id, created_at, match_score,
        requests!request_id(id, taxonomy_code, latitude, longitude, location_text, persons:person_id(display_name, phone)),
        resources!resource_id(id, taxonomy_code, description, latitude, longitude, location_text, persons:person_id(display_name, phone))
      `)
      .eq('provider_org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    // Map to transport assignment shape expected by the page
    return {
      assignments: (data || []).map((m: any) => ({
        id: m.id,
        status: m.status,
        resource_id: m.resources?.id,
        resource_name: m.resources?.description,
        origin_address: m.resources?.location_text || '',
        destination_address: m.requests?.location_text || '',
        origin_lat: m.resources?.latitude,
        origin_lng: m.resources?.longitude,
        destination_lat: m.requests?.latitude,
        destination_lng: m.requests?.longitude,
        driver_name: m.resources?.persons?.display_name || '',
        driver_phone: m.resources?.persons?.phone || '',
        created_at: m.created_at,
      })),
    };
  },

  transportCreate: (data: Record<string, unknown>) =>
    efCall('sos-update', { action: 'delivery.create', ...data }),

  // Transport / Driver — update via sos-update (match lifecycle)
  transportUpdateStatus: (matchId: string, status: string, data?: Record<string, unknown>) =>
    efCall('sos-update', { actor: { type: 'partner' }, record_type: 'match', record_id: matchId, action: status === 'completed' ? 'deliver' : 'accept', data }),
  transportReportIssue: (matchId: string, issueType: string, description: string) =>
    efCall('sos-update', { action: 'case_action.add_note', entity_type: 'match', entity_id: matchId, note: `[${issueType}] ${description}` }),
  transportUpdateLocation: (_matchId: string, _lat: number, _lng: number) => {
    // Location updates go through delivery_tracking — no-op until delivery supports it
    return Promise.resolve({ ok: true });
  },

  // Inventory — condition update via sos-update on resource
  inventoryUpdateCondition: (resourceId: string, condition: number, notes?: string) =>
    efCall('sos-update', { actor: { type: 'partner' }, record_type: 'resource', record_id: resourceId, action: 'update', data: { condition_rating: condition, ...(notes ? { notes } : {}) } }),
  // Inventory — facility transfer
  inventoryMoveToFacility: (resourceId: string, facilityId: string) =>
    efCall('sos-update', { action: 'inventory.transfer', resource_id: resourceId, to_facility_id: facilityId, from_facility_id: 'current', quantity: 1 }),

  // CRM — Map
  crmMapFeatures: (orgId: string, filters?: Record<string, unknown>) =>
    efCall('sos-read', { action: 'map.features', org_id: orgId, ...filters }),

  // CRM — Command
  crmCommandIncidents: () =>
    efCall('sos-read', { action: 'command.list_incidents' }),

  crmCommandSummary: (disasterId: string) =>
    efCall('sos-read', { action: 'command.incident_summary', disaster_id: disasterId }),

  // Person/Org detail
  crmGetOrg: (orgId: string) =>
    efCall('sos-read', { action: 'directory.get_org', org_id: orgId }),
  crmGetPerson: (personId: string) =>
    efCall('sos-read', { action: 'directory.get_person', person_id: personId }),
  crmUpdatePerson: (personId: string, field: string, value: string) =>
    efCall('sos-read', { action: 'directory.update_person', person_id: personId, field, value }),
  crmOrgStats: (orgId: string) =>
    efCall('sos-read', { action: 'directory.org_stats', org_id: orgId }),

  // Notes
  crmGetNotes: (entityType: string, entityId: string) =>
    efCall('sos-read', { action: 'notes.get', entity_type: entityType, entity_id: entityId }),
  crmGetCaseNotes: (sosId: string) =>
    efCall('sos-read', { action: 'notes.get_case', sos_id: sosId }),

  // Detail reads
  // Resource detail: direct Supabase read with joins (same data as partner-read resource_detail)
  crmResourceDetail: async (resourceId: string, _orgId?: string) => {
    const { data, error } = await supabaseRead
      .from('resources')
      .select(`
        id, description, taxonomy_code, category, status, capacity_available, capacity_total,
        latitude, longitude, location_text, city, state, county, org_id, person_id, created_at,
        persons:person_id(display_name, phone),
        locations:location_id(street_address, city, state, zip_code, latitude, longitude),
        organizations:org_id(name)
      `)
      .eq('id', resourceId)
      .single();
    if (error) throw error;
    // Fetch related matches
    const { data: matches } = await supabaseRead
      .from('matches')
      .select('id, status, match_score, created_at, requests(id, taxonomy_code, urgency, persons:person_id(display_name))')
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })
      .limit(20);
    return { resource: data, matches: matches || [] };
  },
  crmReportDetail: (reportId: string) =>
    efCall('sos-read', { action: 'reports.report_detail', report_id: reportId }),
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
