// TODO: migrate all queries to use taxonomy_code as primary filter, category as fallback
/**
 * Citizen API helpers — calls Supabase edge functions.
 * Never calls Supabase directly for operational data.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function callEF(path: string, options?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) return null;
  return res.json();
}

// --- Alerts ---

export interface Alert {
  id: string;
  type: 'weather' | 'flood' | 'fire' | 'earthquake';
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  headline: string;
  description: string;
  area: string;
  expires: string;
  geometry?: any;
}

export async function getAlerts(lat: number, lng: number): Promise<Alert[]> {
  const data = await callEF(`alerts-feed?lat=${lat}&lng=${lng}`);
  return data?.alerts || [];
}

// --- SOS Score ---

export interface SOSScore {
  total: number;
  readiness: number;
  community: number;
  impact: number;
  readiness_max: number;
  community_max: number;
  impact_max: number;
  next_action: string;
  next_points: number;
  checklist: Record<string, boolean>;
}

export async function getSOSScore(personId: string): Promise<SOSScore> {
  const data = await callEF('score-compute', {
    method: 'POST',
    body: JSON.stringify({ person_id: personId }),
  });
  return data || {
    total: 0, readiness: 0, community: 0, impact: 0,
    readiness_max: 40, community_max: 30, impact_max: 30,
    next_action: 'Add your first emergency contact', next_points: 10,
    checklist: {},
  };
}

// --- 211 Resources ---

// TODO: rename to Resource211 in next refactor
export interface ExternalResource {
  id: string;
  organization_name: string;
  service_name: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
  hours_description: string;
  distance_km?: number;
}

export async function searchResources(keyword: string, lat: number, lng: number): Promise<ExternalResource[]> {
  const data = await callEF(`resource-search?keyword=${encodeURIComponent(keyword)}&lat=${lat}&lng=${lng}`);
  return data?.results || [];
}

// --- Taxonomy-aware query helper ---

import { supabase } from './supabase-client';

/**
 * Apply taxonomy-aware category filtering to a Supabase query.
 * Matches by flat `category` OR by `taxonomy_code` when provided.
 */
export function queryWithTaxonomy<T extends { eq: (col: string, val: string) => T; or: (filter: string) => T }>(
  query: T,
  category: string,
  taxonomyCode?: string,
): T {
  if (taxonomyCode) {
    return query.or(`category.eq.${category},taxonomy_code.eq.${taxonomyCode}`);
  }
  return query.eq('category', category);
}

// --- Community Messages ---

export interface CommunityMessage {
  id: string;
  person_id: string;
  message_text: string;
  message_type: string;
  photo_url: string | null;
  created_at: string;
  person_name?: string;
}

export async function getCommunityPreview(lat: number, lng: number, radius: number = 8): Promise<{ messages: CommunityMessage[]; memberCount: number; helperCount: number }> {
  // Community messages are read-only display — direct read is safe here
  const { data: messages } = await supabase
    .from('community_messages')
    .select('id, person_id, message_text, message_type, photo_url, created_at')
    .order('created_at', { ascending: false })
    .limit(2);

  // Approximate counts
  const { count: memberCount } = await supabase
    .from('persons')
    .select('id', { count: 'exact', head: true });

  const { count: helperCount } = await supabase
    .from('resources')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'citizen_offer');

  return {
    messages: messages || [],
    memberCount: memberCount || 0,
    helperCount: helperCount || 0,
  };
}

// --- External Resources for Map ---

export async function getExternalResources(lat: number, lng: number, radiusKm: number = 50, category?: string, taxonomyCode?: string): Promise<ExternalResource[]> {
  // Direct read — 211 resources for map display
  let query = supabase
    .from('resources')
    .select('id, organization_name, service_name, description, category, taxonomy_code, latitude, longitude, address, phone, hours_description')
    .not('latitude', 'is', null)
    .eq('status', 'active');

  if (category) {
    query = queryWithTaxonomy(query, category, taxonomyCode);
  }

  const { data } = await query.limit(200);

  return (data || []).map(r => ({
    ...r,
    distance_km: haversine(lat, lng, r.latitude, r.longitude),
  })).filter(r => r.distance_km <= radiusKm).sort((a, b) => a.distance_km - b.distance_km);
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- FEMA check ---

export async function checkFEMA(state: string): Promise<any> {
  return callEF(`fema-check?state=${state}`);
}
