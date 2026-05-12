/**
 * Build a partner dashboard URL with optional scoping params.
 * Used by agents to generate shareable links.
 */

interface DashboardParams {
  org?: string;       // org slug (required — defaults handled by caller)
  disaster?: string;  // disaster slug
  year?: string;      // year filter
  status?: string;    // ops_status filter
  tab?: 'map' | 'match' | 'manage';  // which tab to open
}

export function buildDashboardUrl(params: DashboardParams): string {
  const base = 'https://sosconnect.org/app';
  const searchParams = new URLSearchParams();

  if (params.org) searchParams.set('org', params.org);
  if (params.disaster) searchParams.set('disaster', params.disaster);
  if (params.year) searchParams.set('year', params.year);
  if (params.status) searchParams.set('status', params.status);

  let url = base;
  if (params.tab && params.tab !== 'map') {
    url += '/' + params.tab;
  }

  const qs = searchParams.toString();
  return qs ? url + '?' + qs : url;
}
