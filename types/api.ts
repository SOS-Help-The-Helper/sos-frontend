/**
 * Shared API contract types — frontend ↔ edge functions (Wave 6 seed).
 *
 * Source of truth for the citizen surface (sos-read `my_records`,
 * sos-update record/match verbs). The portal CRM action types migrate here
 * domain-by-domain as the ADR-007 → domain-EF consolidation proceeds; new
 * call sites must type their payloads from this module instead of `any`.
 */

// ── sos-read: scope=my_records ────────────────────────────────────────────

export interface MyRecordsMatchSide {
  category: string | null;
  details_sanitized: string | null;
  description?: string | null;
  location_text?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity_available?: number | null;
  urgency?: string | null;
  organizations?: { name: string | null } | null;
}

export interface MyRecordsMatch {
  id: string;
  request_id: string | null;
  resource_id: string | null;
  status: string;
  match_score: number | null;
  match_summary_masked: string | null;
  created_at: string;
  partner_name: string | null;
  resources: MyRecordsMatchSide | null;
  requests: MyRecordsMatchSide | null;
}

export interface MyRecordsRequest {
  id: string;
  taxonomy_code: string | null;
  category: string | null;
  urgency: string | null;
  status: string;
  description: string | null;
  details_sanitized: string | null;
  location_text: string | null;
  city: string | null;
  county: string | null;
  household_size: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  matches?: MyRecordsMatch[];
  map_pin?: string;
}

export interface MyRecordsResource {
  id: string;
  taxonomy_code: string | null;
  category: string | null;
  status: string;
  description: string | null;
  details_sanitized: string | null;
  location_text: string | null;
  capacity_available: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  matches?: MyRecordsMatch[];
  map_pin?: string;
}

export interface MyRecordsReport {
  id: string;
  taxonomy_code: string | null;
  category: string | null;
  status: string;
  description: string | null;
  verification_status: string | null;
  created_at: string;
  map_pin?: string;
}

export interface SosRecord {
  sos_id: string;
  status: string;
  household_size: number | null;
  created_at: string;
  all_needs_met: boolean;
  request_count: number;
  fulfilled_count: number;
  requests: MyRecordsRequest[];
  resources: MyRecordsResource[];
  reports: MyRecordsReport[];
}

export interface MyRecordsResponse {
  sos_records: SosRecord[];
  portal_links: { manage: string; match: string; map: string };
}

// ── sos-update: record + match verbs ─────────────────────────────────────

export type CitizenRecordType = 'request' | 'resource' | 'report' | 'match';

export type CitizenAction =
  | 'cancel' | 'pause' | 'resume' | 'update'
  | 'confirm_received' | 'rate' | 'accept' | 'decline' | 'consent';

export interface UpdateDetails {
  rating?: number;
  feedback?: string;
  reason?: string;
  description?: string;
  capacity_available?: number | null;
  consent?: boolean;
  channel?: string;
  details_sanitized?: string;
  urgency?: string;
  household_size?: number | null;
}

export interface UpdateResponse {
  record_id: string;
  record_type: CitizenRecordType;
  action: CitizenAction;
  new_status: string | null;
  success: boolean;
}
