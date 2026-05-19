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
  needs: [
    { tag: "FOOD.PANTRY", state: "active" as const, caseId: "C-1041" },
    { tag: "CHILDCARE", state: "active" as const, caseId: "C-1040" },
    { tag: "HOUSING.REPAIR", state: "in_progress" as const, caseId: "C-1039" },
    { tag: "TRANSPORT", state: "unmet" as const, caseId: null as string | null },
  ],
  timeline: [
    { t: "9:14am", date: "Mar 12", who: "Citizen", actor: "marcus-h", kind: "filed" as const, msg: "Filed multi-need request via /c", caseId: null as string | null },
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

export const shifts = [
  { id: "S-1", title: "Shelter intake", date: "Mar 18", time: "8a–2p", slots: 4, filled: 3, org: "emergency-rv" },
  { id: "S-2", title: "Food pantry", date: "Mar 18", time: "10a–4p", slots: 6, filled: 6, org: "wnc-food" },
  { id: "S-3", title: "Repair crew", date: "Mar 19", time: "7a–5p", slots: 5, filled: 2, org: "blue-ridge" },
  { id: "S-4", title: "Childcare", date: "Mar 19", time: "8a–6p", slots: 3, filled: 3, org: "mountain-area-aid" },
  { id: "S-5", title: "Hot meals", date: "Mar 20", time: "11a–2p", slots: 4, filled: 1, org: "wnc-food" },
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
