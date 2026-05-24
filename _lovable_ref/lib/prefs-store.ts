import { useSyncExternalStore } from "react";
import {
  Briefcase, GitBranch, Map as MapIcon, Truck, Package, Users, Calendar,
  BarChart3, Radio, Network as NetworkIcon, type LucideIcon,
} from "lucide-react";

export type ModuleId =
  | "directory"
  | "cases"
  | "match"
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
  "match",
  "map",
  "transport",
  "inventory",
  "volunteers",
  "calendar",
  "reports",
  "command",
];

export type ModuleMeta = {
  label: string;
  to: string;
  group: "crm" | "ops" | "insights";
  desc: string;
  icon: LucideIcon;
  /** background tint for the dropdown icon tile */
  tint: string;
  /** icon foreground color */
  ink: string;
};

export const MODULE_META: Record<ModuleId, ModuleMeta> = {
  directory:  { label: "Directory",  to: "/directory",  group: "crm",      desc: "People, orgs, requests & resources", icon: NetworkIcon, tint: "rgba(137,207,240,0.20)", ink: "#0F1E2B" },
  cases:      { label: "Cases",      to: "/cases",      group: "crm",      desc: "Open requests & their workflow",     icon: Briefcase,   tint: "rgba(137,207,240,0.20)", ink: "#0F1E2B" },
  match:      { label: "Match",      to: "/match",      group: "crm",      desc: "Route requests to the best org",     icon: GitBranch,   tint: "rgba(239,78,75,0.10)",   ink: "#EF4E4B" },
  map:        { label: "Map",        to: "/map",        group: "crm",      desc: "Geographic operating picture",       icon: MapIcon,     tint: "#0F1E2B",                ink: "#FFFFFF" },
  transport:  { label: "Transport",  to: "/transport",  group: "ops",      desc: "Driver assignments & convoys",       icon: Truck,       tint: "rgba(239,78,75,0.10)",   ink: "#EF4E4B" },
  inventory:  { label: "Inventory",  to: "/inventory",  group: "ops",      desc: "Stock & tracked assets",             icon: Package,     tint: "rgba(137,207,240,0.20)", ink: "#0F1E2B" },
  volunteers: { label: "Volunteers", to: "/volunteers", group: "ops",      desc: "Roster & availability",              icon: Users,       tint: "#0F1E2B",                ink: "#FFFFFF" },
  calendar:   { label: "Calendar",   to: "/calendar",   group: "ops",      desc: "Shifts, call-ups & events",          icon: Calendar,    tint: "rgba(137,207,240,0.20)", ink: "#0F1E2B" },
  reports:    { label: "Reports",    to: "/reports",    group: "insights", desc: "Field reports & analytics",          icon: BarChart3,   tint: "rgba(239,78,75,0.10)",   ink: "#EF4E4B" },
  command:    { label: "Command",    to: "/command",    group: "insights", desc: "Active disaster dashboards",         icon: Radio,       tint: "#0F1E2B",                ink: "#FFFFFF" },
};


export type NavCategory = {
  key: string;
  label: string;
  modules: ModuleId[];
};

/** Top-nav hover categories. Command stays a direct link. */
export const NAV_CATEGORIES: NavCategory[] = [
  { key: "respond", label: "Respond", modules: ["cases", "match", "map"] },
  { key: "coordinate", label: "Coordinate", modules: ["calendar", "volunteers", "transport", "inventory"] },
  { key: "network", label: "Network", modules: ["directory", "reports"] },
];

const STORAGE_KEY = "sos.prefs.v1";

const defaultPrefs: Prefs = {
  orgType: "mid",
  enabled: ["command", "directory", "cases", "match", "map", "calendar", "inventory", "reports"],
  mobilePins: ["command", "cases", "map", "directory"],
};

export function defaultPinsFor(orgType: OrgType, enabled: ModuleId[]): ModuleId[] {
  const want: Record<OrgType, ModuleId[]> = {
    small: ["command", "cases", "map", "directory"],
    mid: ["command", "cases", "map", "directory"],
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
    const enabled = parsed.enabled ?? defaultPrefs.enabled;
    // Always ensure Command is enabled by default.
    const enabledWithCommand = enabled.includes("command") ? enabled : ["command", ...enabled];
    return {
      orgType: parsed.orgType ?? defaultPrefs.orgType,
      enabled: ALL_MODULES.filter((m) => enabledWithCommand.includes(m)),
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
