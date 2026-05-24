'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModuleId =
  | 'directory'
  | 'cases'
  | 'match'
  | 'map'
  | 'transport'
  | 'inventory'
  | 'volunteers'
  | 'calendar'
  | 'reports'
  | 'command';

export const ALL_MODULES: ModuleId[] = [
  'directory', 'cases', 'match', 'map', 'transport',
  'inventory', 'volunteers', 'calendar', 'reports', 'command',
];

export const MODULE_META: Record<ModuleId, { label: string; to: string; group: 'crm' | 'ops' | 'insights' }> = {
  directory: { label: 'Directory', to: '/app/directory', group: 'crm' },
  cases:     { label: 'Cases',     to: '/app/cases',     group: 'crm' },
  match:     { label: 'Match',     to: '/app/match',     group: 'crm' },
  map:       { label: 'Map',       to: '/app/map',       group: 'crm' },
  transport: { label: 'Transport', to: '/app/transport',  group: 'ops' },
  inventory: { label: 'Inventory', to: '/app/inventory',  group: 'ops' },
  volunteers:{ label: 'Volunteers',to: '/app/volunteers', group: 'ops' },
  calendar:  { label: 'Calendar',  to: '/app/calendar',   group: 'ops' },
  reports:   { label: 'Reports',   to: '/app/reports',    group: 'insights' },
  command:   { label: 'Command',   to: '/app/command',    group: 'insights' },
};

export interface MatchCardConfig {
  type: 'single' | 'multi_step' | 'chain' | 'bid' | 'citizen';
  accept_label: string;
  decline_label: string;
  show_serving_window?: boolean;
  steps?: string[];
}

export interface AgentConfig {
  welcome: string;
  suggestions: string[];
}

export interface FeatureFlags {
  chains: boolean;
  bidding: boolean;
  coordination: boolean;
  network_view: boolean;
  serving_windows: boolean;
  admin_assign: boolean;
  batch_actions: boolean;
}

export interface PortalConfig {
  modules: ModuleId[];
  mobile_pins: ModuleId[];
  org_size: 'small' | 'mid' | 'large';
  labels: Partial<Record<ModuleId, string>>;
  match_card: MatchCardConfig;
  agent: AgentConfig;
  features: FeatureFlags;
  theme: { pin_icon: string };
}

// ---------------------------------------------------------------------------
// Defaults by org type
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: PortalConfig = {
  modules: ['command', 'directory', 'cases', 'match', 'map', 'calendar', 'reports'],
  mobile_pins: ['command', 'cases', 'map', 'directory'],
  org_size: 'mid',
  labels: {},
  match_card: { type: 'single', accept_label: 'Accept', decline_label: 'Decline' },
  agent: { welcome: 'Welcome to SOS Connect.', suggestions: ['Show open requests', 'Match status'] },
  features: { chains: false, bidding: false, coordination: false, network_view: false, serving_windows: false, admin_assign: false, batch_actions: false },
  theme: { pin_icon: '🆘' },
};

const ORG_TYPE_DEFAULTS: Record<string, Partial<PortalConfig>> = {
  transport_housing: {
    modules: ['command', 'directory', 'cases', 'match', 'map', 'transport', 'inventory', 'reports'],
    mobile_pins: ['command', 'cases', 'map', 'inventory'],
    labels: { map: 'Deployments', inventory: 'Fleet', transport: 'Logistics' },
    match_card: { type: 'multi_step', accept_label: 'Assign Unit', decline_label: 'Decline', steps: ['request', 'unit', 'driver'] },
    agent: { welcome: 'Your fleet dashboard.', suggestions: ['Fleet status', 'Open housing matches', 'Assign a unit'] },
    features: { ...DEFAULT_CONFIG.features, chains: true },
    theme: { pin_icon: '🚐' },
  },
  food_service: {
    labels: { map: 'Sites', inventory: 'Meal Sites', reports: 'Meals Served' },
    match_card: { type: 'single', accept_label: 'Send to Site', decline_label: 'Skip', show_serving_window: true },
    agent: { welcome: 'Meal site coordination.', suggestions: ["Today's meal schedule", 'Site capacity', 'Open food matches'] },
    features: { ...DEFAULT_CONFIG.features, serving_windows: true },
    theme: { pin_icon: '🍽️' },
  },
  coordination: {
    modules: ['command', 'directory', 'cases', 'match', 'map', 'volunteers', 'reports'],
    mobile_pins: ['command', 'map', 'cases', 'reports'],
    match_card: { type: 'chain', accept_label: 'Approve Chain', decline_label: 'Reassign' },
    agent: { welcome: 'Coordination hub.', suggestions: ['Open coordination tasks', 'Network status'] },
    features: { ...DEFAULT_CONFIG.features, chains: true, coordination: true, network_view: true, batch_actions: true },
    theme: { pin_icon: '🤝' },
  },
  government: {
    modules: ['command', 'directory', 'cases', 'match', 'map', 'reports'],
    mobile_pins: ['command', 'map', 'cases', 'reports'],
    org_size: 'large' as const,
    match_card: { type: 'chain', accept_label: 'Approve Chain', decline_label: 'Reassign' },
    features: { ...DEFAULT_CONFIG.features, chains: true, coordination: true, network_view: true, batch_actions: true },
    theme: { pin_icon: '🏛️' },
  },
  vendor: {
    modules: ['command', 'cases', 'map', 'reports'],
    mobile_pins: ['command', 'cases', 'map', 'reports'],
    labels: { cases: 'My Jobs', reports: 'Revenue' },
    match_card: { type: 'bid', accept_label: 'Submit Bid', decline_label: 'Pass' },
    agent: { welcome: 'Vendor portal.', suggestions: ['Available jobs', 'My active bids'] },
    features: { ...DEFAULT_CONFIG.features, bidding: true },
    theme: { pin_icon: '🔨' },
  },
};

function mergeConfig(base: PortalConfig, overrides: Partial<PortalConfig>): PortalConfig {
  return {
    modules: overrides.modules ?? base.modules,
    mobile_pins: overrides.mobile_pins ?? base.mobile_pins,
    org_size: overrides.org_size ?? base.org_size,
    labels: { ...base.labels, ...overrides.labels },
    match_card: overrides.match_card ?? base.match_card,
    agent: overrides.agent ?? base.agent,
    features: { ...base.features, ...overrides.features },
    theme: { ...base.theme, ...overrides.theme },
  };
}

function resolveConfig(orgType: string | null, dbConfig: Record<string, unknown> | null): PortalConfig {
  // Start with global defaults
  let config = { ...DEFAULT_CONFIG };
  // Apply org-type defaults
  if (orgType && ORG_TYPE_DEFAULTS[orgType]) {
    config = mergeConfig(config, ORG_TYPE_DEFAULTS[orgType]);
  }
  // Apply DB overrides (partner-customized settings)
  if (dbConfig && Object.keys(dbConfig).length > 0) {
    config = mergeConfig(config, dbConfig as Partial<PortalConfig>);
  }
  return config;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface PortalConfigContextValue {
  config: PortalConfig;
  loading: boolean;
  /** Get the display label for a module (uses override or default) */
  label: (moduleId: ModuleId) => string;
  /** Check if a feature flag is enabled */
  feature: (flag: keyof FeatureFlags) => boolean;
  /** Check if a module is enabled */
  isModuleEnabled: (moduleId: ModuleId) => boolean;
  /** Update config (writes to DB + updates local state) */
  updateConfig: (partial: Partial<PortalConfig>) => Promise<void>;
}

const PortalConfigCtx = createContext<PortalConfigContextValue>({
  config: DEFAULT_CONFIG,
  loading: true,
  label: (id) => MODULE_META[id]?.label ?? id,
  feature: () => false,
  isModuleEnabled: () => true,
  updateConfig: async () => {},
});

export function usePortalConfig() {
  return useContext(PortalConfigCtx);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const CACHE_KEY = 'sos.portal_config.v1';

export function PortalConfigProvider({
  orgId,
  orgType,
  children,
}: {
  orgId: string | null;
  orgType: string | null;
  children: ReactNode;
}) {
  const [config, setConfig] = useState<PortalConfig>(() => {
    // Instant load from localStorage cache
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.org_id === orgId) {
            return resolveConfig(orgType, parsed.config);
          }
        }
      } catch { /* ignore */ }
    }
    return resolveConfig(orgType, null);
  });
  const [loading, setLoading] = useState(true);

  // Fetch from DB on mount / org change
  useEffect(() => {
    if (!orgId) {
      setConfig(resolveConfig(orgType, null));
      setLoading(false);
      return;
    }

    let cancelled = false;
    api.getPortalConfig(orgId)
      .then((res) => {
        if (cancelled) return;
        const resolved = resolveConfig(res.org_type || orgType, res.portal_config);
        setConfig(resolved);
        // Cache for instant next load
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ org_id: orgId, config: res.portal_config }));
        } catch { /* ignore */ }
      })
      .catch((err) => {
        console.warn('[usePortalConfig] failed to fetch, using defaults:', err);
        if (!cancelled) setConfig(resolveConfig(orgType, null));
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [orgId, orgType]);

  const updateConfig = useCallback(async (partial: Partial<PortalConfig>) => {
    const merged = mergeConfig(config, partial);
    setConfig(merged);
    // Write to DB
    if (orgId) {
      try {
        await api.updatePortalConfig(orgId, merged as unknown as Record<string, unknown>);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ org_id: orgId, config: merged }));
      } catch (err) {
        console.error('[usePortalConfig] failed to save:', err);
      }
    }
  }, [config, orgId]);

  const label = useCallback((id: ModuleId) => {
    return config.labels[id] || MODULE_META[id]?.label || id;
  }, [config.labels]);

  const feature = useCallback((flag: keyof FeatureFlags) => {
    return config.features[flag] ?? false;
  }, [config.features]);

  const isModuleEnabled = useCallback((id: ModuleId) => {
    return config.modules.includes(id);
  }, [config.modules]);

  const value: PortalConfigContextValue = {
    config, loading, label, feature, isModuleEnabled, updateConfig,
  };

  return (
    <PortalConfigCtx.Provider value={value}>
      {children}
    </PortalConfigCtx.Provider>
  );
}

// Re-export for backward compat during migration
export { DEFAULT_CONFIG, ORG_TYPE_DEFAULTS };
