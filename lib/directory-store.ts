import { useSyncExternalStore } from "react";
import { people as seedPeople, type Person, type HistoryEntry } from "./directory-data";

// Mock identity of the currently signed-in org.
// In the real app this comes from auth context.
export const CURRENT_ORG_ID = "emergency-rv";

// Orgs your org is connected to (network scope).
export const CONNECTED_ORG_IDS = new Set<string>([
  "blueridge-mutual",
  "wnc-foodbank",
  "mountain-medics",
]);

export type Visibility = "public" | "network" | "private";

export type Stewardship = {
  ownerOrgId: string;
  visibility: Visibility;
  sharedWith: string[];
};

export type Scope = "yours" | "shared" | "public";

export function scopeForOrg(ownerOrgId: string, visibility: Visibility = "network"): Scope {
  if (ownerOrgId === CURRENT_ORG_ID) return "yours";
  if (visibility === "public") return "public";
  if (CONNECTED_ORG_IDS.has(ownerOrgId)) return "shared";
  return "public";
}

export function canEdit(ownerOrgId: string): boolean {
  return ownerOrgId === CURRENT_ORG_ID;
}

// People are owned by their org by default. Bump WNC Food Bank's housing status
// to "Stable" stewardship for demo purposes — everything else inferred from p.org.id.
function personStewardship(p: Person): Stewardship {
  return { ownerOrgId: p.org.id, visibility: "network", sharedWith: [] };
}

// ---------- Writable mock store ----------

type State = { people: Person[] };
const state: State = { people: seedPeople.map((p) => ({ ...p, history: [...p.history] })) };
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version++;
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function usePeople(): Person[] {
  return useSyncExternalStore(
    subscribe,
    () => state.people,
    () => state.people,
  );
}

export function getPerson(id: string): Person | undefined {
  return state.people.find((p) => p.id === id);
}

export function usePerson(id: string): Person | undefined {
  useSyncExternalStore(subscribe, () => version, () => 0);
  return getPerson(id);
}

export function getStewardship(p: Person): Stewardship {
  return personStewardship(p);
}

export type EditableField = "role" | "county" | "email" | "phoneMask" | "housingStatus";

const FIELD_LABELS: Record<EditableField, string> = {
  role: "Role",
  county: "County",
  email: "Email",
  phoneMask: "Phone",
  housingStatus: "Housing status",
};

export function updatePerson(
  id: string,
  field: EditableField,
  value: string,
  editor: { kind: "user" | "agent"; label: string },
) {
  const idx = state.people.findIndex((p) => p.id === id);
  if (idx === -1) return;
  const prev = state.people[idx];
  if ((prev as unknown as Record<string, unknown>)[field] === value) return;
  const oldValue = String((prev as unknown as Record<string, unknown>)[field] ?? "");
  const next: Person = { ...prev, [field]: value } as Person;

  const entry: HistoryEntry = {
    id: `edit-${Date.now()}`,
    kind: "report",
    title: `${FIELD_LABELS[field]} changed: "${oldValue}" → "${value}" by ${editor.label}`,
    disaster: "—",
    status: {
      label: editor.kind === "agent" ? "Agent edit" : "Edited",
      tone: editor.kind === "agent" ? "blue" : "yellow",
    },
    date: new Date().toISOString().slice(0, 10),
  };
  next.history = [entry, ...next.history];

  state.people = [
    ...state.people.slice(0, idx),
    next,
    ...state.people.slice(idx + 1),
  ];
  emit();
}
