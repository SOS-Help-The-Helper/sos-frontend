import { useSyncExternalStore } from "react";

// In-memory store mapping incidentId → array of pinned reportIds.
// Seeded with a couple defaults so the demo isn't empty.
const initial: Record<string, string[]> = {
  "I-01": ["REP-FLOOD-001", "REP-SHELTER-007"],
  "I-02": ["REP-WATER-031"],
  "I-03": ["REP-FOOD-022"],
};

let state: Record<string, string[]> = { ...initial };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function pinReport(incidentId: string, reportId: string) {
  const cur = state[incidentId] ?? [];
  if (cur.includes(reportId)) return;
  state = { ...state, [incidentId]: [...cur, reportId] };
  emit();
}

export function unpinReport(incidentId: string, reportId: string) {
  const cur = state[incidentId] ?? [];
  state = { ...state, [incidentId]: cur.filter((id) => id !== reportId) };
  emit();
}

export function getPinned(incidentId: string): string[] {
  return state[incidentId] ?? [];
}

export function useDashboard(incidentId: string): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state[incidentId] ?? initial[incidentId] ?? [],
    () => state[incidentId] ?? initial[incidentId] ?? [],
  );
}

export function useAllDashboards(): Record<string, string[]> {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
