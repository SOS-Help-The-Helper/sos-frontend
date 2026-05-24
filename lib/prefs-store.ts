import { useSyncExternalStore } from "react";

export type ModuleId =
  | "directory"
  | "cases"
  | "map"
  | "transport"
  | "inventory"
  | "volunteers"
  | "calendar"
  | "reports"
  | "command";

export type OrgType = "small" | "mid" | "large";

export type Prefs = {
  orgType: OrgType;
  enabled: ModuleId[];
  mobilePins: ModuleId[]; // ordered, length <= 4
};

export const ALL_MODULES: ModuleId[] = [
  "directory",
  "cases",
  "map",
  "transport",
  "inventory",
  "volunteers",
  "calendar",
  "reports",
  "command",
];

export const MODULE_META: Record<ModuleId, { label: string; to: string; group: "crm" | "ops" | "insights" }> = {
  directory: { label: "Directory", to: "/app/directory", group: "crm" },
  cases: { label: "Cases", to: "/app/cases", group: "crm" },
  map: { label: "Map", to: "/app/map", group: "crm" },
  transport: { label: "Transport", to: "/app/transport", group: "ops" },
  inventory: { label: "Inventory", to: "/app/inventory", group: "ops" },
  volunteers: { label: "Volunteers", to: "/app/volunteers", group: "ops" },
  calendar: { label: "Calendar", to: "/app/calendar", group: "ops" },
  reports: { label: "Reports", to: "/app/reports", group: "insights" },
  command: { label: "Command", to: "/app/command", group: "insights" },
};

const STORAGE_KEY = "sos.prefs.v1";

const defaultPrefs: Prefs = {
  orgType: "mid",
  enabled: ["directory", "cases", "map", "calendar", "volunteers", "reports"],
  mobilePins: ["cases", "map", "directory"],
};

export function defaultPinsFor(orgType: OrgType, enabled: ModuleId[]): ModuleId[] {
  const want: Record<OrgType, ModuleId[]> = {
    small: ["cases", "map", "calendar", "directory"],
    mid: ["cases", "map", "directory", "calendar"],
    large: ["command", "cases", "map", "reports"],
  };
  return want[orgType].filter((m) => enabled.includes(m)).slice(0, 4);
}

function load(): Prefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      orgType: parsed.orgType ?? defaultPrefs.orgType,
      enabled: parsed.enabled ?? defaultPrefs.enabled,
      mobilePins: parsed.mobilePins ?? defaultPrefs.mobilePins,
    };
  } catch {
    return defaultPrefs;
  }
}

let state: Prefs = load();
const listeners = new Set<() => void>();

function emit() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }
  listeners.forEach((l) => l());
}

function healPins(next: Prefs): Prefs {
  // Drop pins for disabled modules; backfill from defaults.
  const kept = next.mobilePins.filter((m) => next.enabled.includes(m));
  if (kept.length >= Math.min(4, next.enabled.length)) {
    return { ...next, mobilePins: kept.slice(0, 4) };
  }
  const fill = defaultPinsFor(next.orgType, next.enabled).filter((m) => !kept.includes(m));
  return { ...next, mobilePins: [...kept, ...fill].slice(0, 4) };
}

export function setOrgType(orgType: OrgType) {
  state = healPins({ ...state, orgType });
  emit();
}

export function setEnabled(enabled: ModuleId[]) {
  // Preserve canonical order.
  const ordered = ALL_MODULES.filter((m) => enabled.includes(m));
  state = healPins({ ...state, enabled: ordered });
  emit();
}

export function toggleModule(m: ModuleId) {
  const on = state.enabled.includes(m);
  setEnabled(on ? state.enabled.filter((x) => x !== m) : [...state.enabled, m]);
}

export function setMobilePins(pins: ModuleId[]) {
  const cleaned = pins.filter((m) => state.enabled.includes(m)).slice(0, 4);
  state = { ...state, mobilePins: cleaned };
  emit();
}

export function toggleMobilePin(m: ModuleId) {
  if (!state.enabled.includes(m)) return;
  const has = state.mobilePins.includes(m);
  if (has) {
    setMobilePins(state.mobilePins.filter((x) => x !== m));
  } else {
    if (state.mobilePins.length >= 4) return;
    setMobilePins([...state.mobilePins, m]);
  }
}

export function bulkSet(partial: Partial<Prefs>) {
  const next: Prefs = {
    orgType: partial.orgType ?? state.orgType,
    enabled: partial.enabled
      ? ALL_MODULES.filter((m) => partial.enabled!.includes(m))
      : state.enabled,
    mobilePins: partial.mobilePins ?? state.mobilePins,
  };
  state = healPins(next);
  emit();
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
