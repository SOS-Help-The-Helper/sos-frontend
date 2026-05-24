// Display constants — taxonomy labels, status types, urgency metadata, bucket definitions.
// Import from here instead of prototype-data.ts to avoid pulling in mock data.

export type Taxonomy =
  | "HOUSING.TEMPORARY"
  | "HOUSING.REPAIR"
  | "FOOD.PANTRY"
  | "FOOD.HOT_MEAL"
  | "CHILDCARE"
  | "TRANSPORT"
  | "MEDICAL.SUPPLIES"
  | "MENTAL_HEALTH";

export const TAXONOMY_LABEL: Record<Taxonomy, string> = {
  "HOUSING.TEMPORARY": "Temporary Housing",
  "HOUSING.REPAIR": "Home Repair",
  "FOOD.PANTRY": "Food Pantry",
  "FOOD.HOT_MEAL": "Hot Meals",
  "CHILDCARE": "Childcare",
  "TRANSPORT": "Transport",
  "MEDICAL.SUPPLIES": "Medical Supplies",
  "MENTAL_HEALTH": "Mental Health",
};

export type County = "Buncombe" | "Henderson" | "McDowell" | "Madison" | "Catawba" | "Burke";

export type Urgency = "critical" | "high" | "medium" | "low";

// Full request status set
export type RequestStatus =
  | "active"
  | "under_review"
  | "matched"
  | "in_progress"
  | "fulfilled"
  | "closed";

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
