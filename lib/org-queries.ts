import { supabase } from './supabase-client';

export interface Organization {
  id: string;
  name: string;
  org_type: string;
  domain: string | null;
  verified_domain: string | null;
  website: string | null;
  capabilities: string[] | null;
  specializations: string[] | null;
  service_area_description: string | null;
  trust_score: number | null;
  dashboard_config: Record<string, any> | null;
  created_at: string;
}

export interface Affiliation {
  id: string;
  person_id: string;
  org_id: string;
  role: string;
  status: string;
  phone_verified: boolean;
  email_verified: boolean;
  invited_by: string | null;
  created_at: string;
}

export async function getOrganizations() {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('name');

  if (error) console.error('Error fetching orgs:', error);
  return data || [];
}

export async function getOrgAffiliations(orgId: string) {
  const { data, error } = await supabase
    .from('affiliations')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) console.error('Error fetching affiliations:', error);
  return data || [];
}

export async function getOrgOffers(orgId: string) {
  const { data, error } = await supabase
    .from('offers')
    .select('id, category, capacity_available, status, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) console.error('Error fetching org offers:', error);
  return data || [];
}

export async function getSystemConfig() {
  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .order('config_key');

  if (error) console.error('Error fetching system config:', error);
  return data || [];
}

export function getOrgTypeColor(type: string): string {
  const colors: Record<string, string> = {
    coordination: 'bg-sos-accent-50 text-sos-accent-700 border-sos-accent-200',
    transport_housing: 'bg-green-50 text-green-700 border-green-200',
    food_service: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    supply_warehouse: 'bg-sos-blue-50 text-sos-blue-700 border-sos-blue-200',
    government: 'bg-sos-gray-200 text-sos-gray-700 border-sos-gray-300',
    vendor: 'bg-sos-red-50 text-sos-red-700 border-sos-red-200',
  };
  return colors[type] || 'bg-sos-gray-200 text-sos-gray-600 border-sos-gray-300';
}
