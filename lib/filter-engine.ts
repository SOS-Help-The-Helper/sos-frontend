/**
 * Filter engine for partner map — client-side filtering of requests & resources.
 * Persona filtering stays in the map page (controls layer visibility, not individual records).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterConfig {
  personas: ('survivor' | 'donor' | 'driver')[];
  statuses: string[];       // multi-select: active, matched, fulfilled, closed, etc.
  urgencies: string[];      // multi-select: critical, high, standard
  timeRange: '24h' | '7d' | '30d' | 'all';
  distanceKm: number | null;
  distanceCenter: { lat: number; lng: number } | null;
  categories: string[];     // taxonomy codes or flat categories
}

export const DEFAULT_FILTER: FilterConfig = {
  personas: ['survivor', 'donor', 'driver'],
  statuses: ['active', 'matched'],
  urgencies: [],            // empty = show all
  timeRange: 'all',
  distanceKm: null,
  distanceCenter: null,
  categories: [],           // empty = show all
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Haversine distance in km between two lat/lng points. */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Returns the cutoff Date for a given time range, or null for 'all'. */
function timeRangeCutoff(range: FilterConfig['timeRange']): Date | null {
  if (range === 'all') return null;
  const now = Date.now();
  const msMap: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return new Date(now - msMap[range]);
}

// ---------------------------------------------------------------------------
// Core record type — loose on purpose so both requests & resources work
// ---------------------------------------------------------------------------

interface Filterable {
  status?: string;
  urgency?: string;
  created_at?: string;
  category?: string;
  taxonomy_code?: string;
  latitude?: number;
  longitude?: number;
  persona_type?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Shared filter pipeline
// ---------------------------------------------------------------------------

function applyCommonFilters<T extends Filterable>(
  records: T[],
  config: FilterConfig,
): T[] {
  let result = records;

  // Status filter (non-empty = whitelist)
  if (config.statuses.length > 0) {
    result = result.filter(r => r.status != null && config.statuses.includes(r.status));
  }

  // Urgency filter (non-empty = whitelist)
  if (config.urgencies.length > 0) {
    result = result.filter(r => r.urgency != null && config.urgencies.includes(r.urgency));
  }

  // Time range filter
  const cutoff = timeRangeCutoff(config.timeRange);
  if (cutoff) {
    result = result.filter(r => {
      if (!r.created_at) return false;
      return new Date(r.created_at) >= cutoff;
    });
  }

  // Category filter — match flat category OR taxonomy_code
  if (config.categories.length > 0) {
    const cats = new Set(config.categories.map(c => c.toLowerCase()));
    result = result.filter(r => {
      const flat = (r.category || '').toLowerCase();
      const taxo = (r.taxonomy_code || '').toLowerCase();
      return cats.has(flat) || cats.has(taxo);
    });
  }

  // Distance filter (haversine from center)
  if (config.distanceKm != null && config.distanceCenter) {
    const { lat, lng } = config.distanceCenter;
    const maxKm = config.distanceKm;
    result = result.filter(r => {
      if (r.latitude == null || r.longitude == null) return false;
      return haversineKm(lat, lng, r.latitude, r.longitude) <= maxKm;
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Filter requests by status, urgency, time range, category, and distance.
 * Persona filtering is NOT applied here — it controls map layer visibility.
 */
export function filterRequests<T extends Filterable>(
  requests: T[],
  config: FilterConfig,
): T[] {
  return applyCommonFilters(requests, config);
}

/**
 * Filter resources by status, time range, category, distance, and persona_type.
 */
export function filterResources<T extends Filterable>(
  resources: T[],
  config: FilterConfig,
): T[] {
  return applyCommonFilters(resources, config);
}

/**
 * Count how many filter dimensions differ from defaults.
 * Used for the "Filters (N)" badge on the filter button.
 */
export function getActiveFilterCount(config: FilterConfig): number {
  let count = 0;

  // Personas — compare sorted arrays
  const sortedP = [...config.personas].sort();
  const defaultP = [...DEFAULT_FILTER.personas].sort();
  if (sortedP.join(',') !== defaultP.join(',')) count++;

  // Statuses
  const sortedS = [...config.statuses].sort();
  const defaultS = [...DEFAULT_FILTER.statuses].sort();
  if (sortedS.join(',') !== defaultS.join(',')) count++;

  // Urgencies (default is empty = show all)
  if (config.urgencies.length > 0) count++;

  // Time range
  if (config.timeRange !== DEFAULT_FILTER.timeRange) count++;

  // Distance
  if (config.distanceKm != null && config.distanceCenter != null) count++;

  // Categories (default is empty = show all)
  if (config.categories.length > 0) count++;

  return count;
}
