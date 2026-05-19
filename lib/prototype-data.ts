// Shared sample data for all prototypes — small, coherent across screens.

export type Taxonomy =
  | "HOUSING.TEMPORARY"
  | "HOUSING.REPAIR"
  | "FOOD.PANTRY"
  | "FOOD.HOT_MEAL"
  | "CHILDCARE"
  | "TRANSPORT"
  | "MEDICAL.SUPPLIES"
  | "MENTAL_HEALTH";

export type County = "Buncombe" | "Henderson" | "McDowell" | "Madison" | "Catawba" | "Burke";

export const orgs = [
  {
    id: "emergency-rv",
    name: "Emergency RV",
    counties: ["Buncombe", "Henderson"] as County[],
    services: ["HOUSING.TEMPORARY"] as Taxonomy[],
    color: "#89CFF0",
    people: 14,
    open: 6,
  },
  {
    id: "blue-ridge",
    name: "Blue Ridge Mutual Aid",
    counties: ["Buncombe", "Madison", "McDowell"] as County[],
    services: ["FOOD.PANTRY", "HOUSING.REPAIR", "TRANSPORT"] as Taxonomy[],
    color: "#EF4E4B",
    people: 32,
    open: 11,
  },
  {
    id: "wnc-food",
    name: "WNC Food Bank",
    counties: ["Buncombe", "Henderson", "Catawba", "Burke"] as County[],
    services: ["FOOD.PANTRY", "FOOD.HOT_MEAL"] as Taxonomy[],
    color: "#F5EBD6",
    people: 48,
    open: 4,
  },
  {
    id: "mountain-area-aid",
    name: "Mountain Area Aid",
    counties: ["Burke", "McDowell"] as County[],
    services: ["CHILDCARE", "MENTAL_HEALTH", "MEDICAL.SUPPLIES"] as Taxonomy[],
    color: "#34D399",
    people: 9,
    open: 3,
  },
];

export const people = [
  { id: "maria-rodriguez", name: "Maria Rodriguez", role: "Coordinator", org: "emergency-rv", credentials: ["FEMA IS-100", "Red Cross Shelter"] },
  { id: "james-bell", name: "James Bell", role: "Driver", org: "blue-ridge", credentials: ["CDL Class B"] },
  { id: "alicia-ng", name: "Alicia Ng", role: "Nurse", org: "mountain-area-aid", credentials: ["RN", "Mental Health First Aid"] },
  { id: "sara-whitley", name: "Sara Whitley", role: "Volunteer", org: "wnc-food", credentials: ["Food Handler"] },
  { id: "derek-pope", name: "Derek Pope", role: "Director", org: "blue-ridge", credentials: ["FEMA IS-300", "IS-700"] },
  { id: "elena-cho", name: "Elena Cho", role: "Case Manager", org: "emergency-rv", credentials: ["MSW"] },
  { id: "ben-okafor", name: "Ben Okafor", role: "Logistics", org: "wnc-food", credentials: ["Forklift"] },
];

// Full 10-value request status set
export type RequestStatus =
  | "active"
  | "under_review"
  | "matched"
  | "in_progress"
  | "fulfilled"
  | "closed";

export type Urgency = "critical" | "high" | "medium" | "low";

// 4-bucket Kanban grouping
export type Bucket = "needs_attention" | "active_work" | "delivering" | "resolved";

export const BUCKETS: { id: Bucket; label: string; accent: string; statuses: RequestStatus[] }[] = [
  { id: "needs_attention", label: "Needs Attention", accent: "#EF4E4B", statuses: ["active", "under_review"] },
  { id: "active_work", label: "Active Work", accent: "#F5EBD6", statuses: ["matched"] },
  { id: "delivering", label: "Delivering", accent: "#89CFF0", statuses: ["in_progress"] },
  { id: "resolved", label: "Resolved", accent: "#34D399", statuses: ["fulfilled", "closed"] },
];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  active: "active",
  under_review: "under review",
  matched: "matched",
  in_progress: "in progress",
  fulfilled: "fulfilled",
  closed: "closed",
};

export function bucketOf(status: RequestStatus): Bucket {
  return BUCKETS.find((b) => b.statuses.includes(status))!.id;
}

export const cases: {
  id: string;
  citizen: string;
  county: County;
  taxonomy: Taxonomy[];
  status: RequestStatus;
  urgency: Urgency;
  org: string;
  opened: string;
  daysOpen: number;
  umbrella: string | null;
  assignedTo: string | null;
  matchCount: number;
}[] = [
  { id: "C-1042", citizen: "Janet T.", county: "Buncombe", taxonomy: ["HOUSING.TEMPORARY"], status: "under_review", urgency: "critical", org: "emergency-rv", opened: "2h ago", daysOpen: 0, umbrella: null, assignedTo: "elena-cho", matchCount: 3 },
  { id: "C-1043", citizen: "Maria Rodriguez", county: "Catawba", taxonomy: ["HOUSING.TEMPORARY"], status: "matched", urgency: "high", org: "emergency-rv", opened: "6d ago", daysOpen: 6, umbrella: "U-MARIA", assignedTo: "elena-cho", matchCount: 3 },
  { id: "C-1041", citizen: "Marcus H.", county: "Madison", taxonomy: ["FOOD.PANTRY", "TRANSPORT"], status: "active", urgency: "medium", org: "blue-ridge", opened: "5h ago", daysOpen: 0, umbrella: "U-204", assignedTo: "derek-pope", matchCount: 2 },
  { id: "C-1040", citizen: "Linda P.", county: "McDowell", taxonomy: ["CHILDCARE"], status: "active", urgency: "high", org: "mountain-area-aid", opened: "1d ago", daysOpen: 1, umbrella: "U-204", assignedTo: "alicia-ng", matchCount: 1 },
  { id: "C-1039", citizen: "Marcus H.", county: "Madison", taxonomy: ["HOUSING.REPAIR"], status: "in_progress", urgency: "medium", org: "blue-ridge", opened: "1d ago", daysOpen: 1, umbrella: "U-204", assignedTo: "derek-pope", matchCount: 1 },
  { id: "C-1038", citizen: "Rosa V.", county: "Henderson", taxonomy: ["FOOD.HOT_MEAL"], status: "in_progress", urgency: "low", org: "wnc-food", opened: "2d ago", daysOpen: 2, umbrella: null, assignedTo: "ben-okafor", matchCount: 1 },
  { id: "C-1037", citizen: "Dale R.", county: "Burke", taxonomy: ["MEDICAL.SUPPLIES"], status: "fulfilled", urgency: "low", org: "mountain-area-aid", opened: "3d ago", daysOpen: 3, umbrella: null, assignedTo: "alicia-ng", matchCount: 1 },
  { id: "C-1036", citizen: "Pat K.", county: "Burke", taxonomy: ["MENTAL_HEALTH"], status: "closed", urgency: "low", org: "mountain-area-aid", opened: "8d ago", daysOpen: 8, umbrella: null, assignedTo: "alicia-ng", matchCount: 1 },
  { id: "C-1035", citizen: "Lou A.", county: "Buncombe", taxonomy: ["HOUSING.REPAIR"], status: "fulfilled", urgency: "medium", org: "blue-ridge", opened: "10d ago", daysOpen: 10, umbrella: null, assignedTo: "derek-pope", matchCount: 2 },
];

// ============================================================
// Maria narrative spine — wired across requests/resources/reports/matches/delivery
// ============================================================

export type ReqDetail = {
  id: string;
  caseId: string;
  taxonomy: Taxonomy;
  airs: string;
  ocha: string;
  status: RequestStatus;
  urgency: Urgency;
  personId: string;
  personName: string;
  household: { adults: number; children: number; pets: number };
  county: County;
  disaster: string;
  createdAt: string;
  daysOpen: number;
  assignedTo: string;
  matchIds: string[];
  notes: { ts: string; who: string; msg: string; system?: boolean }[];
  deliveryId?: string;
};

export const requests: ReqDetail[] = [
  {
    id: "R-MARIA-HOUSING",
    caseId: "C-1043",
    taxonomy: "HOUSING.TEMPORARY",
    airs: "BH-8600",
    ocha: "SHL",
    status: "matched",
    urgency: "high",
    personId: "maria-rodriguez",
    personName: "Maria Rodriguez",
    household: { adults: 2, children: 2, pets: 1 },
    county: "Catawba",
    disaster: "Hurricane Helene",
    createdAt: "Sep 28, 2024",
    daysOpen: 6,
    assignedTo: "elena-cho",
    matchIds: ["M-RV-247", "M-SP-TEMP", "M-RC-SHELTER"],
    deliveryId: "D-RV-247",
    notes: [
      { ts: "May 12", who: "System", msg: "Assigned to Elena Cho", system: true },
      { ts: "May 13", who: "Elena Cho", msg: "Spoke with Maria, needs pet-friendly option" },
      { ts: "May 14", who: "System", msg: "Match approved: ERV RV #247", system: true },
    ],
  },
  {
    id: "R-JANET-HOUSING",
    caseId: "C-1042",
    taxonomy: "HOUSING.TEMPORARY",
    airs: "BH-8600",
    ocha: "SHL",
    status: "under_review",
    urgency: "critical",
    personId: "maria-rodriguez",
    personName: "Janet T.",
    household: { adults: 1, children: 0, pets: 0 },
    county: "Buncombe",
    disaster: "Hurricane Helene",
    createdAt: "2h ago",
    daysOpen: 0,
    assignedTo: "elena-cho",
    matchIds: ["M-RV-247", "M-SP-TEMP", "M-RC-SHELTER"],
    notes: [
      { ts: "2h ago", who: "System", msg: "Routed to Emergency RV", system: true },
      { ts: "1h ago", who: "Elena Cho", msg: "Reviewing displacement intake" },
    ],
  },
];

export type MatchCandidate = {
  id: string;
  title: string;
  blurb: string;
  score: number;
  breakdown: { category: number; distance: number; urgency: number; capacity: number; trust: number };
  approved?: boolean;
  rationale: string;
};

export const matches: Record<string, MatchCandidate> = {
  "M-RV-247": {
    id: "M-RV-247",
    title: "ERV RV #247",
    blurb: "2019 Jayco 28ft, sleeps 6, pet-friendly, staged 120mi away",
    score: 87,
    breakdown: { category: 30, distance: 22, urgency: 15, capacity: 10, trust: 10 },
    approved: true,
    rationale: "Matches household size (6 ≥ 4), pet-friendly, within rapid-deploy radius.",
  },
  "M-SP-TEMP": {
    id: "M-SP-TEMP",
    title: "Samaritan's Purse temporary housing",
    blurb: "Bunk-style cabin, 7-night stay, on-site meals",
    score: 72,
    breakdown: { category: 30, distance: 18, urgency: 10, capacity: 8, trust: 6 },
    rationale: "Good fit on category but not pet-friendly.",
  },
  "M-RC-SHELTER": {
    id: "M-RC-SHELTER",
    title: "Red Cross congregate shelter bed",
    blurb: "Gym-floor cot in regional shelter",
    score: 65,
    breakdown: { category: 25, distance: 20, urgency: 8, capacity: 6, trust: 6 },
    rationale: "Available immediately but lower dignity-of-care.",
  },
};

export type ResourceDetail = {
  id: string;
  taxonomy: Taxonomy | "SUPPLIES.TOOLS" | "TRANSPORT.RV";
  title: string;
  status: "available" | "matched" | "deployed";
  ownerId: string;
  ownerName: string;
  org?: string;
  capacity: string;
  location: string;
  matchedTo?: { caseId: string; personName: string };
  history: { date: string; event: string }[];
};

export const resources: ResourceDetail[] = [
  {
    id: "RES-RV-247",
    taxonomy: "TRANSPORT.RV",
    title: "ERV RV #247 — 2019 Jayco 28ft",
    status: "deployed",
    ownerId: "james-okafor",
    ownerName: "Jim Walters",
    org: "emergency-rv",
    capacity: "Sleeps 6, pet-friendly, 5th-wheel hitch",
    location: "Ocala, FL → Catawba County, NC",
    matchedTo: { caseId: "C-1043", personName: "Maria Rodriguez" },
    history: [
      { date: "May 10", event: "Donated by Jim Walters" },
      { date: "May 14", event: "Matched to Maria Rodriguez" },
      { date: "May 15", event: "Picked up by driver Sarah Thompson" },
      { date: "May 17", event: "Delivered to staging site" },
      { date: "May 18", event: "Confirmed by Maria" },
    ],
  },
  {
    id: "RES-CHAINSAW",
    taxonomy: "SUPPLIES.TOOLS",
    title: "Chainsaw crew (3 people, weekends)",
    status: "matched",
    ownerId: "maria-rodriguez",
    ownerName: "Maria Rodriguez",
    capacity: "3 people, weekends, certified chainsaw safety",
    location: "Weaverville, NC",
    matchedTo: { caseId: "C-1040", personName: "Betty Johnson" },
    history: [
      { date: "Oct 5", event: "Offered by Maria Rodriguez" },
      { date: "Oct 8", event: "Matched to Betty Johnson debris removal" },
      { date: "Oct 12", event: "Session 1 completed (3 hrs)" },
    ],
  },
];

export type ReportDetail = {
  id: string;
  taxonomy: string;
  severity: "Critical" | "Elevated" | "Routine";
  reporterId: string;
  reporterName: string;
  location: string;
  disaster: string;
  date: string;
  verifiedBy?: string;
  corroborators: number;
  resolution?: string;
};

export const reports: ReportDetail[] = [
  {
    id: "REP-FLOOD-001",
    taxonomy: "SAFETY.FLOODING",
    severity: "Critical",
    reporterId: "maria-rodriguez",
    reporterName: "Maria Rodriguez",
    location: "French Broad River — Mile 14",
    disaster: "Hurricane Helene",
    date: "Sep 29, 2024",
    verifiedBy: "Buncombe EMS",
    corroborators: 2,
    resolution: "Resolved — Oct 3, 2024",
  },
  {
    id: "REP-ROAD-014",
    taxonomy: "INFRA.ROAD_CLOSURE",
    severity: "Elevated",
    reporterId: "blue-ridge",
    reporterName: "Blue Ridge Mutual Aid",
    location: "US-70 east of Marion",
    disaster: "Hurricane Helene",
    date: "Mar 14, 2026",
    verifiedBy: "NCDOT",
    corroborators: 4,
  },
  {
    id: "REP-SHELTER-007",
    taxonomy: "SHELTER.OVERFLOW",
    severity: "Critical",
    reporterId: "emergency-rv",
    reporterName: "Emergency RV",
    location: "Asheville civic center",
    disaster: "Hurricane Helene",
    date: "Mar 13, 2026",
    corroborators: 1,
  },
  {
    id: "REP-FOOD-022",
    taxonomy: "SUPPLY.SHORTAGE",
    severity: "Elevated",
    reporterId: "wnc-food",
    reporterName: "WNC Food Bank",
    location: "Madison County",
    disaster: "Madison food shortage",
    date: "Mar 12, 2026",
    corroborators: 2,
  },
  {
    id: "REP-WATER-031",
    taxonomy: "INFRA.WATER",
    severity: "Routine",
    reporterId: "mountain-area-aid",
    reporterName: "Mountain Area Aid",
    location: "Burke county boil-water advisory",
    disaster: "Burke flooding",
    date: "Mar 11, 2026",
    corroborators: 3,
    resolution: "Lifted — Mar 15, 2026",
  },
];

export type Incident = {
  id: string;
  name: string;
  county: string;
  cases: number;
  priority: "urgent" | "normal";
  status: "active" | "monitoring" | "closed";
  declared: string;
  lead: string;
};

export const incidents: Incident[] = [
  { id: "I-01", name: "Helene aftermath", county: "Buncombe", cases: 8, priority: "urgent", status: "active", declared: "Sep 28, 2024", lead: "Melissa Hart" },
  { id: "I-02", name: "Burke flooding", county: "Burke", cases: 3, priority: "normal", status: "active", declared: "Mar 10, 2026", lead: "Carlos Mendez" },
  { id: "I-03", name: "Madison food shortage", county: "Madison", cases: 2, priority: "normal", status: "monitoring", declared: "Mar 8, 2026", lead: "Priya Rao" },
];


export type DeliveryStep = {
  key: "pending" | "picked_up" | "in_transit" | "delivered" | "confirmed";
  label: string;
  timestamp?: string;
  location?: string;
  photo?: string;
};

export type DeliveryDetail = {
  id: string;
  resourceId: string;
  caseId: string;
  origin: string;
  destination: string;
  current: DeliveryStep["key"];
  steps: DeliveryStep[];
};

export const deliveries: DeliveryDetail[] = [
  {
    id: "D-RV-247",
    resourceId: "RES-RV-247",
    caseId: "C-1043",
    origin: "Ocala, FL",
    destination: "Catawba County, NC",
    current: "confirmed",
    steps: [
      { key: "pending", label: "Pending", timestamp: "May 14" },
      { key: "picked_up", label: "Picked up", timestamp: "May 15", location: "Ocala, FL", photo: "yes" },
      { key: "in_transit", label: "In transit", timestamp: "May 16" },
      { key: "delivered", label: "Delivered", timestamp: "May 17", location: "Catawba County, NC", photo: "yes" },
      { key: "confirmed", label: "Confirmed by Maria", timestamp: "May 18" },
    ],
  },
];

export const umbrella = {
  id: "U-204",
  status: "active" as "active" | "resolved" | "escalated",
  urgency: "high" as "critical" | "high" | "medium" | "low",
  citizen: { id: "marcus-h", name: "Marcus H.", phone: "(828) 555-0144", county: "Madison" as County, household: 4, notes: "Flood damage to home; two kids under 8; needs food + childcare while repairs underway." },
  filedAt: "Mar 12, 2026 · 9:14am",
  children: ["C-1041", "C-1040", "C-1039"],
  requests: [
    { tag: "FOOD.PANTRY", state: "active" as const, caseId: "C-1041" },
    { tag: "CHILDCARE", state: "active" as const, caseId: "C-1040" },
    { tag: "HOUSING.REPAIR", state: "in_progress" as const, caseId: "C-1039" },
    { tag: "TRANSPORT", state: "unmet" as const, caseId: null as string | null },
  ],
  timeline: [
    { t: "9:14am", date: "Mar 12", who: "Citizen", actor: "marcus-h", kind: "filed" as const, msg: "Filed multi-request via /c", caseId: null as string | null },
    { t: "9:16am", date: "Mar 12", who: "Agent", actor: "system", kind: "routed" as const, msg: "Routed to 3 orgs based on taxonomy + coverage", caseId: null },
    { t: "10:02am", date: "Mar 12", who: "Blue Ridge", actor: "blue-ridge", kind: "accepted" as const, msg: "Accepted food + repair", caseId: "C-1041" },
    { t: "10:11am", date: "Mar 12", who: "Mountain Area Aid", actor: "mountain-area-aid", kind: "accepted" as const, msg: "Accepted childcare", caseId: "C-1040" },
    { t: "11:30am", date: "Mar 12", who: "Blue Ridge", actor: "blue-ridge", kind: "scheduled" as const, msg: "Repair scheduled for Mar 14", caseId: "C-1039" },
    { t: "2:45pm", date: "Mar 13", who: "Mountain Area Aid", actor: "mountain-area-aid", kind: "delivered" as const, msg: "Childcare delivered, 4 hrs", caseId: "C-1040" },
    { t: "9:02am", date: "Mar 14", who: "Blue Ridge", actor: "blue-ridge", kind: "note" as const, msg: "On-site, demo started", caseId: "C-1039" },
  ],
};

export const inventory = [
  { id: "INV-001", item: "Cots", qty: 42, threshold: 20, org: "emergency-rv", location: "Asheville warehouse" },
  { id: "INV-002", item: "MREs (case)", qty: 8, threshold: 25, org: "wnc-food", location: "Hickory hub" },
  { id: "INV-003", item: "Diapers (size 4)", qty: 6, threshold: 15, org: "mountain-area-aid", location: "Marion office" },
  { id: "INV-004", item: "Bottled water (pallet)", qty: 18, threshold: 10, org: "wnc-food", location: "Hickory hub" },
  { id: "INV-005", item: "First-aid kits", qty: 30, threshold: 12, org: "mountain-area-aid", location: "Marion office" },
  { id: "INV-006", item: "Generators", qty: 4, threshold: 6, org: "blue-ridge", location: "Burnsville depot" },
  { id: "INV-007", item: "Tarps", qty: 120, threshold: 50, org: "blue-ridge", location: "Burnsville depot" },
  { id: "INV-008", item: "Baby formula", qty: 2, threshold: 10, org: "mountain-area-aid", location: "Marion office" },
];

export const events = [
  { id: "E-1", title: "Shelter intake", date: "Mar 18", time: "8a–2p", slots: 4, filled: 3, org: "emergency-rv" },
  { id: "E-2", title: "Food pantry", date: "Mar 18", time: "10a–4p", slots: 6, filled: 6, org: "wnc-food" },
  { id: "E-3", title: "Repair crew", date: "Mar 19", time: "7a–5p", slots: 5, filled: 2, org: "blue-ridge" },
  { id: "E-4", title: "Childcare", date: "Mar 19", time: "8a–6p", slots: 3, filled: 3, org: "mountain-area-aid" },
  { id: "E-5", title: "Hot meals", date: "Mar 20", time: "11a–2p", slots: 4, filled: 1, org: "wnc-food" },
];

export const volunteers = [
  { id: "V-01", name: "Tina Park", skills: ["Driving", "Intake"], hours: 42, status: "active" },
  { id: "V-02", name: "Carlos Mendez", skills: ["Repair", "Bilingual"], hours: 88, status: "active" },
  { id: "V-03", name: "Joan Harlow", skills: ["Childcare"], hours: 12, status: "new" },
  { id: "V-04", name: "Ahmed Said", skills: ["Logistics"], hours: 64, status: "active" },
  { id: "V-05", name: "Beth Carlin", skills: ["Nursing"], hours: 156, status: "active" },
  { id: "V-06", name: "Marcus Lee", skills: ["Driving"], hours: 28, status: "active" },
  { id: "V-07", name: "Priya Rao", skills: ["Intake", "Bilingual"], hours: 19, status: "active" },
  { id: "V-08", name: "Jules Knox", skills: ["Repair"], hours: 71, status: "inactive" },
  { id: "V-09", name: "Mei Tran", skills: ["Childcare", "First Aid"], hours: 34, status: "active" },
  { id: "V-10", name: "Owen Diaz", skills: ["Driving"], hours: 9, status: "new" },
  { id: "V-11", name: "Sami Ostrowski", skills: ["Logistics", "Forklift"], hours: 110, status: "active" },
  { id: "V-12", name: "Kira Boone", skills: ["Mental Health"], hours: 22, status: "active" },
];

export const kpis = [
  { label: "Open cases", value: 14, delta: "+3 this week" },
  { label: "Avg time to match", value: "42m", delta: "−8m vs last week" },
  { label: "Active volunteers", value: 47, delta: "+5" },
  { label: "Resources matched", value: 218, delta: "+34" },
];

// Citizen-facing programs (Match deck)
export const programs = [
  { id: "P-1", org: "Emergency RV", taxonomy: "HOUSING.TEMPORARY" as Taxonomy, title: "Temporary RV housing", blurb: "Stay in an RV on safe ground while your home is repaired.", eligibility: "Displaced by flood/storm in Buncombe or Henderson", responseHrs: 24, color: "#89CFF0" },
  { id: "P-2", org: "WNC Food Bank", taxonomy: "FOOD.PANTRY" as Taxonomy, title: "Family food box", blurb: "7-day food box, pickup or delivery within 50 miles.", eligibility: "Any WNC resident", responseHrs: 4, color: "#F5EBD6" },
  { id: "P-3", org: "Mountain Area Aid", taxonomy: "CHILDCARE" as Taxonomy, title: "Drop-in childcare", blurb: "Free childcare while parents handle FEMA, repairs, or medical.", eligibility: "Kids 1–10, McDowell/Burke", responseHrs: 8, color: "#34D399" },
  { id: "P-4", org: "Blue Ridge Mutual Aid", taxonomy: "HOUSING.REPAIR" as Taxonomy, title: "Volunteer home repair", blurb: "Crew of 3–5 for muck-outs, drywall, roofing patches.", eligibility: "Income-qualified, 3 western counties", responseHrs: 72, color: "#EF4E4B" },
  { id: "P-5", org: "Mountain Area Aid", taxonomy: "MENTAL_HEALTH" as Taxonomy, title: "Crisis counseling", blurb: "Same-day phone or in-person session with a licensed counselor.", eligibility: "Open to all", responseHrs: 2, color: "#34D399" },
];

export const myRequests = [
  { id: "R-22", program: "Temporary RV housing", org: "Emergency RV", status: "accepted", updated: "2h ago" },
  { id: "R-21", program: "Family food box", org: "WNC Food Bank", status: "scheduled", updated: "1d ago" },
  { id: "R-20", program: "Drop-in childcare", org: "Mountain Area Aid", status: "completed", updated: "3d ago" },
];

// ============================================================
// Logistics layer — Facilities, Transport, Convoys, Asset events, Volunteer detail
// ============================================================

export type Facility = {
  id: string;
  name: string;
  type: "staging_lot" | "warehouse" | "distribution_hub" | "satellite";
  org: string;
  address: string;
  lat: number;
  lng: number;
  capacity: number;
  currentCount: number;
  status: "active" | "full" | "closed";
};

export const facilities: Facility[] = [
  { id: "FAC-OCALA", name: "Ocala Staging Lot", type: "staging_lot", org: "emergency-rv", address: "Ocala, FL", lat: 29.187, lng: -82.14, capacity: 40, currentCount: 28, status: "active" },
  { id: "FAC-WAYCROSS", name: "Georgia Staging", type: "staging_lot", org: "emergency-rv", address: "Waycross, GA", lat: 31.213, lng: -82.354, capacity: 15, currentCount: 12, status: "active" },
  { id: "FAC-ASH-WH", name: "Asheville Warehouse", type: "warehouse", org: "blue-ridge", address: "Asheville, NC", lat: 35.595, lng: -82.551, capacity: 200, currentCount: 142, status: "active" },
  { id: "FAC-HICKORY", name: "Hickory Distribution Hub", type: "distribution_hub", org: "wnc-food", address: "Hickory, NC", lat: 35.733, lng: -81.341, capacity: 500, currentCount: 380, status: "active" },
  { id: "FAC-MARION", name: "Marion Office", type: "satellite", org: "mountain-area-aid", address: "Marion, NC", lat: 35.684, lng: -82.009, capacity: 50, currentCount: 38, status: "active" },
  { id: "FAC-BURNSVILLE", name: "Burnsville Depot", type: "warehouse", org: "blue-ridge", address: "Burnsville, NC", lat: 35.917, lng: -82.300, capacity: 180, currentCount: 124, status: "active" },
];

export type TransportStatus =
  | "assigned"
  | "accepted"
  | "en_route_pickup"
  | "at_pickup"
  | "hooked_up"
  | "loaded"
  | "in_transit"
  | "at_staging"
  | "delivered"
  | "verified"
  | "completed";

export type TransportAssignment = {
  id: string;
  resourceId: string;
  resourceSummary: string;
  driverName: string;
  driverPhone: string;
  driverVehicle: string;
  origin: string;
  originLat: number;
  originLng: number;
  destination: string;
  destinationLat: number;
  destinationLng: number;
  status: TransportStatus;
  statusHistory: { status: TransportStatus; timestamp: string; note?: string; photo?: boolean }[];
  currentLat?: number;
  currentLng?: number;
  lastLocationAt?: string;
  distanceMiles: number;
  estimatedArrival?: string;
  org: string;
  priority: "normal" | "urgent" | "critical";
  convoyId?: string;
  convoyPosition?: number;
  photos: { url: string; stage: string; timestamp: string }[];
  issues: { type: string; description: string; timestamp: string; resolved: boolean }[];
  coordinatorName: string;
  coordinatorPhone: string;
  notes?: string;
  createdAt: string;
};

export const transportAssignments: TransportAssignment[] = [
  {
    id: "TA-001",
    resourceId: "RES-RV-247",
    resourceSummary: "2019 Jayco 28ft — VIN: 1UJBJ0BR3H1T70222",
    driverName: "James Bell",
    driverPhone: "(828) 555-0188",
    driverVehicle: "2015 Toyota Tundra SR5, V8, bumper pull",
    origin: "Ocala, FL",
    originLat: 29.187,
    originLng: -82.14,
    destination: "Catawba County, NC",
    destinationLat: 35.66,
    destinationLng: -81.22,
    status: "delivered",
    statusHistory: [
      { status: "assigned", timestamp: "May 14, 8:00am" },
      { status: "accepted", timestamp: "May 14, 8:15am" },
      { status: "en_route_pickup", timestamp: "May 15, 6:30am" },
      { status: "at_pickup", timestamp: "May 15, 7:45am" },
      { status: "hooked_up", timestamp: "May 15, 8:10am", photo: true },
      { status: "loaded", timestamp: "May 15, 8:30am", photo: true },
      { status: "in_transit", timestamp: "May 15, 9:00am" },
      { status: "delivered", timestamp: "May 17, 2:30pm", photo: true },
    ],
    currentLat: 35.66,
    currentLng: -81.22,
    lastLocationAt: "May 17, 2:30pm",
    distanceMiles: 612,
    org: "emergency-rv",
    priority: "urgent",
    convoyId: "GA-2026-05",
    convoyPosition: 1,
    photos: [
      { url: "#", stage: "hooked_up", timestamp: "May 15, 8:10am" },
      { url: "#", stage: "loaded", timestamp: "May 15, 8:30am" },
      { url: "#", stage: "delivered", timestamp: "May 17, 2:30pm" },
    ],
    issues: [],
    coordinatorName: "Elena Cho",
    coordinatorPhone: "(828) 555-0122",
    notes: "Maria's family needs pet-friendly setup. Generator already serviced.",
    createdAt: "May 14",
  },
  {
    id: "TA-002",
    resourceId: "RES-RV-310",
    resourceSummary: "2020 Forest River 32ft — VIN: 4X4TSMB29NA044810",
    driverName: "Marcus Lee",
    driverPhone: "(828) 555-0199",
    driverVehicle: "2018 Ford F-250, 5th wheel hitch",
    origin: "Ocala, FL",
    originLat: 29.187,
    originLng: -82.14,
    destination: "Buncombe County, NC",
    destinationLat: 35.595,
    destinationLng: -82.551,
    status: "in_transit",
    statusHistory: [
      { status: "assigned", timestamp: "May 16, 9:00am" },
      { status: "accepted", timestamp: "May 16, 9:30am" },
      { status: "en_route_pickup", timestamp: "May 17, 5:00am" },
      { status: "at_pickup", timestamp: "May 17, 6:15am" },
      { status: "hooked_up", timestamp: "May 17, 6:45am", photo: true },
      { status: "in_transit", timestamp: "May 17, 7:30am" },
    ],
    currentLat: 32.08,
    currentLng: -81.09,
    lastLocationAt: "10 min ago",
    distanceMiles: 648,
    estimatedArrival: "May 18, 4:00pm",
    org: "emergency-rv",
    priority: "normal",
    convoyId: "GA-2026-05",
    convoyPosition: 2,
    photos: [{ url: "#", stage: "hooked_up", timestamp: "May 17, 6:45am" }],
    issues: [],
    coordinatorName: "Elena Cho",
    coordinatorPhone: "(828) 555-0122",
    notes: "Family of 4 waiting at receiving site. Setup crew on standby.",
    createdAt: "May 16",
  },
  {
    id: "TA-003",
    resourceId: "RES-RV-415",
    resourceSummary: "2018 Coachmen 24ft — VIN: 1FDXE4FS3JDC42115",
    driverName: "Owen Diaz",
    driverPhone: "(828) 555-0155",
    driverVehicle: "2020 Chevy Silverado 2500HD, gooseneck",
    origin: "Ocala, FL",
    originLat: 29.187,
    originLng: -82.14,
    destination: "Henderson County, NC",
    destinationLat: 35.318,
    destinationLng: -82.461,
    status: "assigned",
    statusHistory: [
      { status: "assigned", timestamp: "May 18, 10:00am" },
    ],
    distanceMiles: 590,
    org: "emergency-rv",
    priority: "normal",
    convoyId: "GA-2026-05",
    convoyPosition: 3,
    photos: [],
    issues: [],
    coordinatorName: "Elena Cho",
    coordinatorPhone: "(828) 555-0122",
    createdAt: "May 18",
  },
  {
    id: "TA-004",
    resourceId: "RES-SUPPLIES-01",
    resourceSummary: "Emergency supply pallet — 200 MREs + water",
    driverName: "Ahmed Said",
    driverPhone: "(828) 555-0177",
    driverVehicle: "Box truck",
    origin: "Hickory, NC",
    originLat: 35.733,
    originLng: -81.341,
    destination: "Madison County, NC",
    destinationLat: 35.797,
    destinationLng: -82.688,
    status: "at_pickup",
    statusHistory: [
      { status: "assigned", timestamp: "May 18, 7:00am" },
      { status: "accepted", timestamp: "May 18, 7:15am" },
      { status: "en_route_pickup", timestamp: "May 18, 8:00am" },
      { status: "at_pickup", timestamp: "May 18, 9:30am" },
    ],
    distanceMiles: 85,
    estimatedArrival: "May 18, 1:00pm",
    org: "wnc-food",
    priority: "urgent",
    photos: [],
    issues: [{ type: "delay", description: "Warehouse loading dock busy, 30 min wait", timestamp: "May 18, 9:35am", resolved: false }],
    coordinatorName: "Ben Okafor",
    coordinatorPhone: "(828) 555-0166",
    createdAt: "May 18",
  },
];

export type Convoy = {
  id: string;
  name: string;
  org: string;
  assignmentIds: string[];
  status: "forming" | "in_progress" | "completed";
  createdAt: string;
};

export const convoys: Convoy[] = [
  { id: "GA-2026-05", name: "Georgia Convoy — May 2026", org: "emergency-rv", assignmentIds: ["TA-001", "TA-002", "TA-003"], status: "in_progress", createdAt: "May 14" },
];

export type AssetEvent = {
  id: string;
  resourceId: string;
  eventType: "status_change" | "location_move" | "condition_update" | "assignment" | "photo";
  fromStatus?: string;
  toStatus?: string;
  fromLocation?: string;
  toLocation?: string;
  performedBy: string;
  actorType: "driver" | "coordinator" | "agent" | "system";
  notes?: string;
  timestamp: string;
};

export const assetEvents: AssetEvent[] = [
  { id: "AE-001", resourceId: "RES-RV-247", eventType: "status_change", fromStatus: "available", toStatus: "matched", performedBy: "System", actorType: "system", timestamp: "May 14, 8:00am" },
  { id: "AE-002", resourceId: "RES-RV-247", eventType: "assignment", toStatus: "assigned", performedBy: "Elena Cho", actorType: "coordinator", notes: "Assigned to James Bell for Catawba delivery", timestamp: "May 14, 8:05am" },
  { id: "AE-003", resourceId: "RES-RV-247", eventType: "location_move", fromLocation: "Ocala, FL", toLocation: "Catawba County, NC", performedBy: "James Bell", actorType: "driver", timestamp: "May 17, 2:30pm" },
  { id: "AE-004", resourceId: "RES-RV-247", eventType: "status_change", fromStatus: "in_transit", toStatus: "deployed", performedBy: "System", actorType: "system", notes: "Auto-synced from transport delivery", timestamp: "May 17, 2:30pm" },
  { id: "AE-005", resourceId: "RES-RV-247", eventType: "condition_update", performedBy: "Maria Rodriguez", actorType: "coordinator", notes: "Confirmed setup complete, generator working, water connected", timestamp: "May 18, 10:00am" },
  { id: "AE-006", resourceId: "RES-CHAINSAW", eventType: "status_change", fromStatus: "available", toStatus: "matched", performedBy: "System", actorType: "system", timestamp: "Oct 8" },
  { id: "AE-007", resourceId: "RES-CHAINSAW", eventType: "assignment", toStatus: "assigned", performedBy: "Derek Pope", actorType: "coordinator", notes: "Matched to Betty Johnson debris removal", timestamp: "Oct 8" },
  { id: "AE-008", resourceId: "RES-CHAINSAW", eventType: "condition_update", performedBy: "Carlos Mendez", actorType: "coordinator", notes: "Session 1 completed — 3 hours of debris clearing", timestamp: "Oct 12" },
];

export type Credential = {
  name: string;
  type: "license" | "certification" | "training";
  expires?: string;
  verified: boolean;
};

export type VolunteerDetail = {
  id: string;
  name: string;
  phone: string;
  org: string;
  skills: string[];
  credentials: Credential[];
  status: "new" | "active" | "assigned" | "inactive";
  hours: number;
  completedMissions: number;
  rating: number;
  availability: { day: string; slots: ("morning" | "afternoon" | "evening")[] }[];
  towCapacity?: { hitchTypes: string[]; maxWeight: number };
  deployments: { date: string; mission: string; hours: number; role: string }[];
};

export const volunteerDetails: VolunteerDetail[] = [
  {
    id: "V-01", name: "Tina Park", phone: "(828) 555-0101", org: "blue-ridge",
    skills: ["Driving", "Intake", "Bilingual (Korean)"],
    credentials: [
      { name: "CDL Class B", type: "license", expires: "2027-03", verified: true },
      { name: "FEMA IS-100", type: "training", verified: true },
    ],
    status: "active", hours: 42, completedMissions: 8, rating: 4.8,
    availability: [
      { day: "Mon", slots: ["morning", "afternoon"] },
      { day: "Wed", slots: ["morning", "afternoon"] },
      { day: "Fri", slots: ["morning", "afternoon", "evening"] },
      { day: "Sat", slots: ["morning", "afternoon", "evening"] },
    ],
    towCapacity: { hitchTypes: ["bumper_pull"], maxWeight: 8000 },
    deployments: [
      { date: "May 10", mission: "RV delivery — Ocala to Asheville", hours: 14, role: "Driver" },
      { date: "May 3", mission: "Supply run — Hickory to Marion", hours: 6, role: "Driver" },
      { date: "Apr 28", mission: "Shelter intake event", hours: 8, role: "Intake" },
    ],
  },
  {
    id: "V-02", name: "Carlos Mendez", phone: "(828) 555-0102", org: "blue-ridge",
    skills: ["Repair", "Bilingual (Spanish)", "Chainsaw"],
    credentials: [
      { name: "Chainsaw Safety", type: "certification", verified: true },
      { name: "OSHA 10-Hour", type: "training", verified: true },
      { name: "Mental Health First Aid", type: "certification", expires: "2026-11", verified: true },
    ],
    status: "assigned", hours: 88, completedMissions: 15, rating: 4.9,
    availability: [
      { day: "Sat", slots: ["morning", "afternoon", "evening"] },
      { day: "Sun", slots: ["morning", "afternoon"] },
    ],
    deployments: [
      { date: "May 15", mission: "Debris clearing — Madison County", hours: 10, role: "Crew lead" },
      { date: "May 8", mission: "Home repair — roof tarping", hours: 8, role: "Repair" },
    ],
  },
  {
    id: "V-06", name: "Marcus Lee", phone: "(828) 555-0106", org: "emergency-rv",
    skills: ["Driving", "RV hookup", "Generator maintenance"],
    credentials: [
      { name: "CDL Class A", type: "license", expires: "2027-08", verified: true },
      { name: "NIMS IS-700", type: "training", verified: true },
    ],
    status: "assigned", hours: 28, completedMissions: 4, rating: 4.7,
    availability: [
      { day: "Mon", slots: ["morning", "afternoon", "evening"] },
      { day: "Tue", slots: ["morning", "afternoon", "evening"] },
      { day: "Wed", slots: ["morning", "afternoon", "evening"] },
      { day: "Thu", slots: ["morning", "afternoon", "evening"] },
      { day: "Fri", slots: ["morning", "afternoon", "evening"] },
    ],
    towCapacity: { hitchTypes: ["bumper_pull", "5th_wheel", "gooseneck"], maxWeight: 18000 },
    deployments: [
      { date: "May 17", mission: "GA Convoy — Forest River 32ft to Buncombe", hours: 0, role: "Driver (active)" },
      { date: "May 5", mission: "RV delivery — Ocala to Henderson", hours: 12, role: "Driver" },
    ],
  },
  {
    id: "V-11", name: "Sami Ostrowski", phone: "(828) 555-0111", org: "wnc-food",
    skills: ["Logistics", "Forklift", "Inventory management"],
    credentials: [
      { name: "Forklift Certified", type: "certification", expires: "2026-09", verified: true },
      { name: "Food Handler", type: "certification", verified: true },
    ],
    status: "active", hours: 110, completedMissions: 22, rating: 4.6,
    availability: [
      { day: "Mon", slots: ["morning"] },
      { day: "Tue", slots: ["morning"] },
      { day: "Wed", slots: ["morning"] },
      { day: "Thu", slots: ["morning"] },
      { day: "Fri", slots: ["morning"] },
    ],
    deployments: [
      { date: "May 18", mission: "Supply pallet loading — Hickory hub", hours: 4, role: "Logistics" },
      { date: "May 12", mission: "Inventory count — Hickory hub", hours: 3, role: "Inventory" },
    ],
  },
];

export type TransportConfig = {
  enabled: boolean;
  statusPipeline: TransportStatus[];
  requirePhotosAt: TransportStatus[];
  branding: { name: string; color: string };
};

export const orgTransportConfig: Record<string, TransportConfig> = {
  "emergency-rv": {
    enabled: true,
    statusPipeline: ["assigned", "accepted", "en_route_pickup", "at_pickup", "hooked_up", "loaded", "in_transit", "at_staging", "delivered", "verified"],
    requirePhotosAt: ["hooked_up", "loaded", "delivered"],
    branding: { name: "Emergency RV", color: "#FF6B00" },
  },
  "blue-ridge": {
    enabled: true,
    statusPipeline: ["assigned", "accepted", "en_route_pickup", "loaded", "in_transit", "delivered", "verified"],
    requirePhotosAt: ["delivered"],
    branding: { name: "Blue Ridge Mutual Aid", color: "#EF4E4B" },
  },
  "wnc-food": {
    enabled: true,
    statusPipeline: ["assigned", "accepted", "loaded", "in_transit", "delivered"],
    requirePhotosAt: ["delivered"],
    branding: { name: "WNC Food Bank", color: "#F5EBD6" },
  },
};

export const TRANSPORT_STATUS_LABEL: Record<TransportStatus, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  en_route_pickup: "En route to pickup",
  at_pickup: "At pickup",
  hooked_up: "Hooked up",
  loaded: "Loaded",
  in_transit: "In transit",
  at_staging: "At staging",
  delivered: "Delivered",
  verified: "Verified",
  completed: "Completed",
};

export function transportStatusColor(s: TransportStatus): string {
  if (s === "delivered" || s === "verified" || s === "completed") return "#34D399";
  if (s === "in_transit" || s === "at_staging") return "#89CFF0";
  if (s === "loaded" || s === "hooked_up" || s === "at_pickup") return "#F5EBD6";
  return "rgba(245,235,214,0.5)";
}

// Enhanced inventory items mapped to facilities (extends the existing flat list)
export type InventoryItem = {
  id: string;
  item: string;
  type: "supply" | "equipment" | "vehicle" | "tool";
  facilityId: string;
  qty: number;
  threshold: number;
  org: string;
  condition: 1 | 2 | 3 | 4 | 5;
  status: "registered" | "available" | "matched" | "assigned" | "in_transit" | "deployed" | "returned" | "retired";
  lastEvent: string;
};

export const inventoryDetailed: InventoryItem[] = [
  { id: "INV-001", item: "Cots", type: "supply", facilityId: "FAC-ASH-WH", qty: 42, threshold: 20, org: "emergency-rv", condition: 4, status: "available", lastEvent: "Restocked May 12" },
  { id: "INV-002", item: "MREs (case)", type: "supply", facilityId: "FAC-HICKORY", qty: 8, threshold: 25, org: "wnc-food", condition: 5, status: "available", lastEvent: "Dispatched 50 cases May 18" },
  { id: "INV-003", item: "Diapers (size 4)", type: "supply", facilityId: "FAC-MARION", qty: 6, threshold: 15, org: "mountain-area-aid", condition: 5, status: "available", lastEvent: "Distributed 12 May 17" },
  { id: "INV-004", item: "Bottled water (pallet)", type: "supply", facilityId: "FAC-HICKORY", qty: 18, threshold: 10, org: "wnc-food", condition: 5, status: "available", lastEvent: "Received May 15" },
  { id: "INV-005", item: "First-aid kits", type: "supply", facilityId: "FAC-MARION", qty: 30, threshold: 12, org: "mountain-area-aid", condition: 4, status: "available", lastEvent: "Counted May 14" },
  { id: "INV-006", item: "Generators", type: "equipment", facilityId: "FAC-BURNSVILLE", qty: 4, threshold: 6, org: "blue-ridge", condition: 3, status: "available", lastEvent: "Serviced May 10" },
  { id: "INV-007", item: "Tarps", type: "supply", facilityId: "FAC-BURNSVILLE", qty: 120, threshold: 50, org: "blue-ridge", condition: 5, status: "available", lastEvent: "Stocked Apr 30" },
  { id: "INV-008", item: "Baby formula", type: "supply", facilityId: "FAC-MARION", qty: 2, threshold: 10, org: "mountain-area-aid", condition: 5, status: "available", lastEvent: "Distributed 8 May 18" },
  { id: "RES-RV-247", item: "ERV RV #247 — 2019 Jayco 28ft", type: "vehicle", facilityId: "FAC-OCALA", qty: 1, threshold: 0, org: "emergency-rv", condition: 4, status: "deployed", lastEvent: "Delivered to Catawba May 17" },
  { id: "RES-RV-310", item: "ERV RV #310 — 2020 Forest River 32ft", type: "vehicle", facilityId: "FAC-OCALA", qty: 1, threshold: 0, org: "emergency-rv", condition: 5, status: "in_transit", lastEvent: "In transit since May 17" },
  { id: "RES-RV-415", item: "ERV RV #415 — 2018 Coachmen 24ft", type: "vehicle", facilityId: "FAC-OCALA", qty: 1, threshold: 0, org: "emergency-rv", condition: 4, status: "assigned", lastEvent: "Assigned to Owen Diaz May 18" },
  { id: "RES-CHAINSAW", item: "Chainsaw crew kit", type: "tool", facilityId: "FAC-BURNSVILLE", qty: 1, threshold: 0, org: "blue-ridge", condition: 4, status: "matched", lastEvent: "Session completed Oct 12" },
];
