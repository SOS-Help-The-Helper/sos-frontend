/**
 * EMPTIED — 2026-05-24
 * All mock data removed. Types + empty arrays preserved for import compatibility.
 * Pages should fetch real data from lib/api.ts.
 * Display constants (types, labels, status maps) live in lib/display-constants.ts.
 * 
 * Backup: lib/prototype-data.backup.ts (for reference during Lovable port)
 */

// Re-export display constants so existing imports still resolve
export type {
  Taxonomy,
  County,
  Urgency,
  RequestStatus,
  Bucket,
  TransportStatus,
} from './display-constants';

export {
  TAXONOMY_LABEL,
  BUCKETS,
  STATUS_LABEL,
  bucketOf,
  TRANSPORT_STATUS_LABEL,
  transportStatusColor,
} from './display-constants';

// --- Types (preserved for import compatibility) ---

export type ReqDetail = {
  id: string; caseId: string; personId?: string; personName: string;
  taxonomy: string; county: string; urgency: string; status: string;
  household: { adults: number; children: number; pets?: number };
  daysOpen: number; airs?: string; ocha?: string; disaster?: string;
  assignedTo: string; matchIds: string[]; deliveryId?: string;
  notes: { system: boolean; ts: string; who: string; msg: string }[];
  candidates?: MatchCandidate[];
  delivery?: DeliveryDetail;
  transportAssignment?: TransportAssignment;
  relatedCases?: { id: string; citizen: string; taxonomy: string[]; status: string }[];
};

export type MatchCandidate = {
  id: string; title: string; blurb: string; score: number; approved: boolean;
  breakdown: { category: number; distance: number; urgency: number; capacity: number; trust: number };
  rationale: string;
};

export type ResourceDetail = {
  id: string; title: string; taxonomy: string; status: string; location: string;
  ownerName: string; ownerId?: string; org?: string; capacity: string;
  matchedTo?: { personName: string; caseId: string } | null;
  history: { event: string; date: string }[];
  petFriendly?: boolean; available?: string; county?: string; qty?: number;
};

export type AvailableResource = ResourceDetail;

export type ReportDetail = {
  id: string; taxonomy: string; severity: "Critical" | "Elevated" | "Routine";
  location: string; reporterName: string; reporterId: string; date: string;
  disaster: string; verifiedBy: string | null; resolution: string | null;
  corroborators: number;
};

export type Incident = {
  id: string; name: string; county: string; status: string; priority: string;
  cases: number; capacity: number; casesHistory: number[];
};

export type DeliveryStep = {
  key: string; label: string; timestamp: string; location?: string;
};

export type DeliveryDetail = {
  id: string; origin: string; destination: string; resourceId: string;
  current: string; steps: DeliveryStep[];
};

export type Facility = {
  id: string; name: string; type: string; org: string; address: string;
  capacity: number; currentCount: number; status: string;
};

export type TransportAssignment = {
  id: string; org: string; resourceId: string; status: string;
  origin: string; destination: string; driverName: string;
  driverPhone?: string; estimatedArrival?: string;
  statusHistory?: { status: string; timestamp: string; photo?: boolean }[];
  statusPipeline?: string[];
  convoy_id?: string;
};

export type Convoy = {
  id: string; name: string; assignmentIds: string[];
};

export type AssetEvent = {
  id: string; resourceId: string; eventType: string;
  fromStatus?: string; toStatus?: string;
  fromLocation?: string; toLocation?: string;
  notes?: string; performedBy: string; timestamp: string;
};

export type Credential = {
  id: string; name: string; issuer: string; status: string;
  expires?: string;
};

export type VolunteerDetail = {
  id: string; name: string; status: string; hours: number;
  skills: string[]; org: string;
  availability: Record<string, boolean[]>;
  assignments: { id: string; label: string; status: string }[];
  credentials: Credential[];
};

export type TransportConfig = {
  pipeline: string[];
  requirePhoto: string[];
};

export type InventoryItem = {
  id: string; name: string; qty: number; threshold: number;
  location: string; org: string;
};

// --- Empty data (all mock data removed) ---

export const orgs: { id: string; name: string; counties: string[]; services: string[]; color: string; people: number; open: number }[] = [];
export const people: { id: string; name: string; role: string; org: string; credentials: string[] }[] = [];
export const cases: any[] = [];
export const requests: ReqDetail[] = [];
export const matches: Record<string, MatchCandidate> = {};
export const resources: ResourceDetail[] = [];
export const availableResources: AvailableResource[] = [];
export const reports: ReportDetail[] = [];
export const incidents: Incident[] = [];
export const deliveries: DeliveryDetail[] = [];
export const umbrella: any = { id: "", citizen: "", county: "", requests: [], resources: [], matches: [] };
export const inventory: { id: string; name: string; qty: number; threshold: number; location: string; org: string }[] = [];
export const events: any[] = [];
export const volunteers: { id: string; name: string; status: string; hours: number; skills: string[] }[] = [];
export const kpis: any[] = [];
export const programs: any[] = [];
export const myRequests: any[] = [];
export const facilities: Facility[] = [];
export const transportAssignments: TransportAssignment[] = [];
export const convoys: Convoy[] = [];
export const assetEvents: AssetEvent[] = [];
export const volunteerDetails: VolunteerDetail[] = [];
export const orgTransportConfig: Record<string, TransportConfig> = {};
export const inventoryDetailed: InventoryItem[] = [];
