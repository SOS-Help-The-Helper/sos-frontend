/**
 * Parses agent responses for map commands.
 * 
 * Two detection modes:
 * 1. Explicit tags: [MAP:show_results]{...json...}[/MAP]
 * 2. Keyword detection: if response mentions finding/showing resources → auto-search
 * 
 * Returns: { text (cleaned), mapCommand? }
 */

import { type MapCommand, type MapResult } from './map-commands';
import { searchResources } from './citizen-api';
import { supabase } from './supabase-client';

interface ParsedResponse {
  text: string;
  mapCommand?: MapCommand;
}

// Explicit tag pattern: [MAP:type]{json}[/MAP]
const MAP_TAG_REGEX = /\[MAP:(\w+)\]([\s\S]*?)\[\/MAP\]/g;

export function parseAgentResponse(text: string): ParsedResponse {
  let cleanText = text;
  let mapCommand: MapCommand | undefined;

  // Check for explicit MAP tags
  const match = MAP_TAG_REGEX.exec(text);
  if (match) {
    const type = match[1] as MapCommand['type'];
    try {
      const data = JSON.parse(match[2]);
      mapCommand = { type, ...data };
    } catch { /* invalid JSON, ignore tag */ }
    cleanText = text.replace(MAP_TAG_REGEX, '').trim();
  }

  return { text: cleanText, mapCommand };
}

/**
 * Detect if agent response implies a resource search result.
 * Keywords: "found X", "showing", "results", "within X miles", "near you"
 */
export function detectSearchIntent(text: string): { isSearch: boolean; keyword: string } {
  const lower = text.toLowerCase();
  const searchPatterns = [
    /found (\d+) ([\w\s]+?)(?:\s+within|\s+near|\s+in)/i,
    /showing ([\w\s]+?)(?:\s+near|\s+within)/i,
    /here are (\d+|the|some) ([\w\s]+)/i,
  ];

  for (const pat of searchPatterns) {
    const m = pat.exec(lower);
    if (m) {
      const keyword = (m[2] || m[1] || '').replace(/\d+/g, '').trim();
      return { isSearch: true, keyword };
    }
  }

  return { isSearch: false, keyword: '' };
}

/**
 * Auto-search: given a keyword from agent response, search resources and build map command.
 */
export async function autoSearchForMap(keyword: string, lat: number, lng: number): Promise<MapCommand | null> {
  const results: MapResult[] = [];

  // Search 211
  const extResults = await searchResources(keyword, lat, lng);
  extResults.forEach(r => {
    if (r.latitude && r.longitude) {
      results.push({
        id: r.id, name: r.organization_name, lat: r.latitude, lng: r.longitude,
        category: r.category || keyword, distance_km: r.distance_km,
        description: r.description || r.service_name, address: r.address,
        phone: r.phone, source: '211',
      });
    }
  });

  // Search partners
  const { data: partners } = await supabase
    .from('organizations')
    .select('id, name, org_type, latitude, longitude, capabilities')
    .not('latitude', 'is', null).eq('status', 'active');

  (partners || []).forEach(p => {
    if (!p.latitude || !p.longitude) return;
    const matches = !keyword || p.name.toLowerCase().includes(keyword.toLowerCase()) ||
      p.org_type?.toLowerCase().includes(keyword.toLowerCase()) ||
      (p.capabilities || []).some((c: string) => c.toLowerCase().includes(keyword.toLowerCase()));
    if (!matches) return;
    const dist = haversine(lat, lng, p.latitude, p.longitude);
    results.push({ id: p.id, name: p.name, lat: p.latitude, lng: p.longitude,
      category: p.org_type || 'partner', distance_km: Math.round(dist * 10) / 10,
      description: p.org_type?.replace(/_/g, ' '), source: 'partner' });
  });

  if (results.length === 0) return null;

  results.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  results.forEach(r => {
    if (r.lat < minLat) minLat = r.lat; if (r.lat > maxLat) maxLat = r.lat;
    if (r.lng < minLng) minLng = r.lng; if (r.lng > maxLng) maxLng = r.lng;
  });
  const lp = Math.max(0.01, (maxLat - minLat) * 0.15);
  const lgp = Math.max(0.01, (maxLng - minLng) * 0.15);

  return {
    type: 'show_results',
    results,
    fitBounds: { sw: [minLat - lp, minLng - lgp], ne: [maxLat + lp, maxLng + lgp] },
    query: keyword,
  };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
