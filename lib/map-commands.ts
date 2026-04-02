/**
 * Shared state store for agent → map communication.
 * Agent writes MapCommands, map page subscribes and reacts.
 * Simple event emitter pattern — no external dependencies.
 */

export interface MapResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  distance_km?: number;
  description?: string;
  address?: string;
  phone?: string;
  source: 'partner' | '211' | 'sos' | string;
  capacity?: number;
  status?: string;
}

export interface RouteStep {
  instruction: string;
  distance_m: number;
  duration_s: number;
}

export interface Route {
  geometry: GeoJSON.LineString;
  distance_km: number;
  duration_min: number;
  steps?: RouteStep[];
  mode: 'driving' | 'walking' | 'cycling';
}

export interface CoverageGap {
  lat: number;
  lng: number;
  radius_km: number;
  request_count: number;
  resource_count: number;
  category: string;
}

export interface ActivityEvent {
  id: string;
  type: 'match' | 'report' | 'offer' | 'request';
  lat: number;
  lng: number;
  label: string;
  timestamp: string;
}

export interface RiskZone {
  type: 'flood' | 'fire' | 'power_outage' | 'road_closure' | 'weather_alert';
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  center?: [number, number];
  radius_km?: number;
  severity: 'low' | 'moderate' | 'severe' | 'extreme';
  label: string;
  source: string;
}

export interface MapCommand {
  type:
    | 'show_results'     // Search results → pins
    | 'clear'            // Clear overlays
    | 'focus'            // Fly to point
    | 'filter'           // Filter by category
    | 'show_nearby'      // Summarize nearby pins
    | 'show_route'       // Draw route to destination
    | 'show_disaster'    // Show disaster boundary/heatmap
    | 'compare'          // Highlight + rank multiple resources
    | 'show_gaps'        // Coverage gap circles
    | 'show_activity'    // Recent activity animation
    | 'show_risk'        // Risk overlay (alerts, floods, outages)
    | 'track_sos'        // Show your SOS + matched resource + connecting line
    | 'bookmark'         // Star a resource on map
    | 'share_location';  // Create temporary live share

  // Existing fields
  results?: MapResult[];
  fitBounds?: { sw: [number, number]; ne: [number, number] };
  zoom?: number;
  center?: [number, number]; // [lng, lat]
  query?: string;
  filterCategory?: string;

  // New fields
  route?: Route;
  destination?: { lat: number; lng: number; name: string };
  gaps?: CoverageGap[];
  activity?: ActivityEvent[];
  riskZones?: RiskZone[];
  trackingData?: {
    requestPin: { lat: number; lng: number; category: string; status: string };
    resourcePin?: { lat: number; lng: number; name: string; status: string };
    matchStatus: string;
    matchId: string;
  };
  bookmarkId?: string;
  shareUrl?: string;
  nearbyRadius?: number; // km
  nearbySummary?: {
    shelters: number;
    food: number;
    medical: number;
    supplies: number;
    requests: number;
    total: number;
    closest?: { name: string; distance_km: number; category: string };
  };
  disasterBoundary?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  disasterName?: string;
  comparedResults?: (MapResult & { rank: number; reason: string })[];
}

type Listener = (cmd: MapCommand) => void;

const listeners = new Set<Listener>();
let lastCommand: MapCommand | null = null;

export function emitMapCommand(cmd: MapCommand) {
  lastCommand = cmd;
  listeners.forEach(fn => fn(cmd));
}

export function onMapCommand(fn: Listener): () => void {
  listeners.add(fn);
  if (lastCommand) fn(lastCommand);
  return () => { listeners.delete(fn); };
}

export function clearMapCommand() {
  lastCommand = null;
  emitMapCommand({ type: 'clear' });
}

export function getLastCommand(): MapCommand | null {
  return lastCommand;
}
