// TODO: migrate all queries to use taxonomy_code as primary filter, category as fallback
/**
 * Citizen API helpers — calls Supabase edge functions.
 * Never calls Supabase directly for operational data.
 */

import { api } from './api';

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
  const data = await api.getAlerts(lat, lng) as any;
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
  const data = await api.getScore(personId) as any;
  return data || {
    total: 0, readiness: 0, community: 0, impact: 0,
    readiness_max: 40, community_max: 30, impact_max: 30,
    next_action: 'Add your first emergency contact', next_points: 10,
    checklist: {},
  };
}

// --- 211 Resources ---

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
  const data = await api.searchResources(keyword, lat, lng) as any;
  return data?.results || [];
}

// --- Taxonomy-aware query helper ---

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
  const [msgData, memberData, helperData] = await Promise.all([
    api.getMessages('local') as Promise<any>,
    api.queryInventory({ table: 'persons', count: true }) as Promise<any>,
    api.queryInventory({ table: 'resources', source: 'citizen_offer', count: true }) as Promise<any>,
  ]);

  return {
    messages: (msgData?.messages || []).slice(0, 2),
    memberCount: memberData?.count || 0,
    helperCount: helperData?.count || 0,
  };
}

// --- External Resources for Map ---

export async function getExternalResources(lat: number, lng: number, radiusKm: number = 50, category?: string, taxonomyCode?: string): Promise<ExternalResource[]> {
  const data = await api.searchResources(category || '', lat, lng, radiusKm) as any;
  const results: ExternalResource[] = data?.results || [];

  return results
    .map(r => ({ ...r, distance_km: haversine(lat, lng, r.latitude, r.longitude) }))
    .filter(r => r.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km);
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
  return api.checkFema(state);
}
