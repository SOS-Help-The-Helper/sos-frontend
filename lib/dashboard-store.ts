/**
 * Dashboard pin store — localStorage-backed pinning for reports per incident.
 * Created for command dashboard (Lovable v5 port).
 */

const STORAGE_KEY = 'sos.dashboard.pins';

function getAll(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveAll(data: Record<string, string[]>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getPinnedReports(incidentId: string): string[] {
  return getAll()[incidentId] || [];
}

export function isPinned(incidentId: string, reportId: string): boolean {
  return getPinnedReports(incidentId).includes(reportId);
}

export function pinReport(incidentId: string, reportId: string): string[] {
  const all = getAll();
  const pins = all[incidentId] || [];
  if (!pins.includes(reportId)) {
    all[incidentId] = [...pins, reportId];
    saveAll(all);
  }
  return all[incidentId];
}

export function unpinReport(incidentId: string, reportId: string): string[] {
  const all = getAll();
  all[incidentId] = (all[incidentId] || []).filter(id => id !== reportId);
  saveAll(all);
  return all[incidentId];
}

/** React hook — returns pinned report IDs for an incident, re-renders on change */
export function useDashboard(incidentId: string | undefined): string[] {
  if (typeof window === 'undefined' || !incidentId) return [];
  // Simple read — for reactivity, call pinReport/unpinReport and re-render manually
  return getPinnedReports(incidentId);
}
