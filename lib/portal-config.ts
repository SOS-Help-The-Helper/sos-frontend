/**
 * Portal Configuration System
 * 
 * Each org_type gets a complete portal config that controls:
 * - Nav labels
 * - Agent welcome + suggestions
 * - Match card type + actions
 * - Management tabs
 * - Reporting metrics
 * - Map pin styles
 * - Feature flags
 * 
 * To onboard a new partner:
 * 1. Add org to Supabase (name, org_type, capabilities)
 * 2. Add to View As page (one line)
 * 3. Portal auto-generates from org_type config
 */

export interface PortalConfig {
  // Nav
  labels: {
    agent: string;
    map: string;
    matching: string;
    management: string;
    reporting: string;
  };

  // Agent chat
  agent: {
    welcome: string;
    suggestions: string[];
  };

  // Match cards
  matchCard: {
    type: 'single' | 'multi_step' | 'chain' | 'bid' | 'citizen';
    acceptLabel: string;
    declineLabel: string;
    showServingWindow?: boolean;
    steps?: string[];
  };

  // Management
  managementTabs: string[];

  // Reporting
  reportingType: 'standard' | 'vendor' | 'citizen';

  // Map
  pinIcon: string;

  // Features
  features: {
    chains: boolean;
    bidding: boolean;
    coordination: boolean;
    networkView: boolean;
    servingWindows: boolean;
    adminAssign: boolean;
    batchActions: boolean;
  };
}

const PORTAL_CONFIGS: Record<string, PortalConfig> = {
  admin: {
    labels: { agent: 'Agent', map: 'Map', matching: 'Matches', management: 'Management', reporting: 'Reports' },
    agent: { welcome: 'You\'re connected to the SOS Platform agent. Full access to all coordination data, matches, and system intelligence.', suggestions: ['System status', 'Show all open matches', 'Partner performance'] },
    matchCard: { type: 'single', acceptLabel: 'Accept', declineLabel: 'Decline' },
    managementTabs: ['organizations', 'requests', 'resources', 'vendor_jobs'],
    reportingType: 'standard',
    pinIcon: '🆘',
    features: { chains: true, bidding: false, coordination: true, networkView: true, servingWindows: false, adminAssign: true, batchActions: true },
  },

  citizen: {
    labels: { agent: 'Help', map: 'Near Me', matching: 'My Options', management: 'My SOS', reporting: 'My Impact' },
    agent: { welcome: 'Everyone is a helper. Need something? We\'ll match you. Have something to offer? We\'ll connect you. Most people do both.', suggestions: ['🆘 I need help', '🤝 I can help', '🔄 I need AND can give help', 'What\'s near me?'] },
    matchCard: { type: 'citizen', acceptLabel: 'Accept Help', declineLabel: 'See More' },
    managementTabs: ['requests', 'resources'],
    reportingType: 'citizen',
    pinIcon: '📍',
    features: { chains: false, bidding: false, coordination: false, networkView: false, servingWindows: false, adminAssign: false, batchActions: false },
  },

  transport_housing: {
    labels: { agent: 'Fleet', map: 'Deployments', matching: 'Housing Matches', management: 'Vehicles', reporting: 'Fleet Stats' },
    agent: { welcome: 'Your fleet dashboard. Check unit availability, assign drivers, and manage housing deployments.', suggestions: ['Fleet status', 'Open housing matches', 'Assign a unit'] },
    matchCard: { type: 'multi_step', acceptLabel: 'Assign Unit', declineLabel: 'Decline', steps: ['request', 'unit', 'driver'] },
    managementTabs: ['organizations', 'requests', 'resources'],
    reportingType: 'standard',
    pinIcon: '🚐',
    features: { chains: true, bidding: false, coordination: false, networkView: false, servingWindows: false, adminAssign: false, batchActions: false },
  },

  food_service: {
    labels: { agent: 'Meals', map: 'Sites', matching: 'Food Matches', management: 'Meal Sites', reporting: 'Meals Served' },
    agent: { welcome: 'Meal site coordination. Manage your sites, track serving capacity, and match hungry families to events.', suggestions: ['Today\'s meal schedule', 'Site capacity', 'Open food matches'] },
    matchCard: { type: 'single', acceptLabel: 'Send to Site', declineLabel: 'Skip', showServingWindow: true },
    managementTabs: ['organizations', 'requests', 'resources'],
    reportingType: 'standard',
    pinIcon: '🍽️',
    features: { chains: false, bidding: false, coordination: false, networkView: false, servingWindows: true, adminAssign: false, batchActions: false },
  },

  coordination: {
    labels: { agent: 'Coordination', map: 'Network Map', matching: 'Coordination', management: 'Network', reporting: 'Network Stats' },
    agent: { welcome: 'Coordination hub. Manage your volunteer network, approve match chains, and track multi-partner deployments.', suggestions: ['Open coordination tasks', 'Network status', 'Assign a partner'] },
    matchCard: { type: 'chain', acceptLabel: 'Approve Chain', declineLabel: 'Reassign' },
    managementTabs: ['organizations', 'requests', 'resources'],
    reportingType: 'standard',
    pinIcon: '🤝',
    features: { chains: true, bidding: false, coordination: true, networkView: true, servingWindows: false, adminAssign: false, batchActions: false },
  },

  supply_warehouse: {
    labels: { agent: 'Supply Chain', map: 'Warehouses', matching: 'Supply Matches', management: 'Inventory', reporting: 'Distribution' },
    agent: { welcome: 'Supply chain dashboard. Track warehouse inventory, dispatch supplies, and manage distribution to disaster zones.', suggestions: ['Inventory levels', 'Pending dispatch', 'Supply matches'] },
    matchCard: { type: 'single', acceptLabel: 'Dispatch', declineLabel: 'Skip' },
    managementTabs: ['organizations', 'requests', 'resources'],
    reportingType: 'standard',
    pinIcon: '📦',
    features: { chains: false, bidding: false, coordination: false, networkView: false, servingWindows: false, adminAssign: false, batchActions: false },
  },

  vendor: {
    labels: { agent: 'Jobs', map: 'Job Map', matching: 'Available Jobs', management: 'My Jobs', reporting: 'Revenue' },
    agent: { welcome: 'Vendor portal. Browse available restoration jobs, submit bids, and track your active projects.', suggestions: ['Available jobs', 'My active bids', 'Job history'] },
    matchCard: { type: 'bid', acceptLabel: 'Submit Bid', declineLabel: 'Pass' },
    managementTabs: ['active_jobs', 'my_bids', 'history'],
    reportingType: 'vendor',
    pinIcon: '🔨',
    features: { chains: false, bidding: true, coordination: false, networkView: false, servingWindows: false, adminAssign: false, batchActions: false },
  },
};

// Default fallback
const DEFAULT_CONFIG = PORTAL_CONFIGS.admin;

/**
 * Get portal config for a given org type.
 * Falls back to admin config if type not found.
 */
export function getPortalConfig(orgType: string | null | undefined): PortalConfig {
  if (!orgType) return DEFAULT_CONFIG;
  return PORTAL_CONFIGS[orgType] || DEFAULT_CONFIG;
}

/**
 * Get portal config from view context.
 * Maps view ID → org type → config.
 */
export function getPortalConfigForView(currentView: string, orgType?: string | null): PortalConfig {
  if (currentView === 'admin') return PORTAL_CONFIGS.admin;
  if (currentView === 'citizen') return PORTAL_CONFIGS.citizen;
  // For org-specific views, use the org's type
  if (orgType) return getPortalConfig(orgType);
  return DEFAULT_CONFIG;
}

// Export all configs for the View As page
export const ALL_PORTAL_CONFIGS = PORTAL_CONFIGS;
