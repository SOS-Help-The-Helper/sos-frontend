/**
 * Enhanced vendor queries.
 * Job matching by capabilities × location × budget.
 * Revenue tracking, active jobs pipeline.
 */

import { supabase } from '@/lib/supabase-client';

export interface VendorProfile {
  id: string;
  name: string;
  service_categories: string[];
  capabilities: string[];
  coverage_radius_km: number;
  min_budget: number | null;
  max_budget: number | null;
  latitude: number | null;
  longitude: number | null;
  trust_score: number | null;
}

export interface AvailableJob {
  id: string;
  category: string;
  details_sanitized: string;
  vendor_budget: number;
  urgency: string;
  latitude: number;
  longitude: number;
  location_name: string;
  created_at: string;
  disaster_id: string;
  distance_km?: number;
}

export interface ActiveJob {
  bid_id: string;
  request_id: string;
  category: string;
  details: string;
  bid_amount: number;
  bid_status: string;
  estimated_days: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface RevenueStats {
  totalRevenue: number;
  totalFees: number;
  netRevenue: number;
  jobsCompleted: number;
  avgJobValue: number;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
}

export async function getVendorProfile(orgId: string): Promise<VendorProfile | null> {
  const { data } = await supabase
    .from('organizations')
    .select('id, name, service_categories, capabilities, coverage_radius_km, min_budget, max_budget, latitude, longitude, trust_score')
    .eq('id', orgId)
    .single();
  return data;
}

export async function updateVendorProfile(orgId: string, updates: Partial<VendorProfile>): Promise<boolean> {
  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId);
  return !error;
}

export async function getAvailableJobs(orgId: string): Promise<AvailableJob[]> {
  // Get vendor profile for filtering
  const profile = await getVendorProfile(orgId);
  if (!profile) return [];

  // Get all open vendor jobs
  const { data: jobs } = await supabase
    .from('requests')
    .select('id, category, details_sanitized, vendor_budget, urgency, latitude, longitude, location_name, created_at, disaster_id')
    .eq('is_vendor_job', true)
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (!jobs) return [];

  // Filter by capabilities × location × budget
  return jobs.filter(job => {
    // Capability match: job category in vendor's service categories
    const capMatch = !profile.service_categories?.length ||
      profile.service_categories.includes(job.category);

    // Budget match
    const budgetMatch = (!profile.min_budget || job.vendor_budget >= profile.min_budget) &&
      (!profile.max_budget || job.vendor_budget <= profile.max_budget);

    // Location match: within coverage radius
    let locationMatch = true;
    if (profile.latitude && profile.longitude && job.latitude && job.longitude && profile.coverage_radius_km) {
      const dist = haversine(profile.latitude, profile.longitude, job.latitude, job.longitude);
      locationMatch = dist <= profile.coverage_radius_km;
      (job as any).distance_km = Math.round(dist);
    }

    return capMatch && budgetMatch && locationMatch;
  }).map(job => ({ ...job, distance_km: (job as any).distance_km }));
}

export async function getActiveJobs(orgId: string): Promise<ActiveJob[]> {
  const { data } = await supabase
    .from('bids')
    .select('id, request_id, bid_amount, status, estimated_days, started_at, completed_at, created_at, scope_description')
    .eq('vendor_org_id', orgId)
    .in('status', ['submitted', 'accepted', 'in_progress', 'completed'])
    .order('created_at', { ascending: false });

  if (!data) return [];

  // Get request details for each bid
  const requestIds = data.map(b => b.request_id);
  const { data: requests } = await supabase
    .from('requests')
    .select('id, category, details_sanitized')
    .in('id', requestIds);

  const reqMap = new Map((requests || []).map(r => [r.id, r]));

  return data.map(bid => ({
    bid_id: bid.id,
    request_id: bid.request_id,
    category: reqMap.get(bid.request_id)?.category || 'unknown',
    details: bid.scope_description || reqMap.get(bid.request_id)?.details_sanitized || '',
    bid_amount: bid.bid_amount,
    bid_status: bid.status,
    estimated_days: bid.estimated_days,
    started_at: bid.started_at,
    completed_at: bid.completed_at,
    created_at: bid.created_at,
  }));
}

export async function getRevenueStats(orgId: string): Promise<RevenueStats> {
  const { data: bids } = await supabase
    .from('bids')
    .select('bid_amount, platform_fee_amount, status, completed_at, created_at')
    .eq('vendor_org_id', orgId)
    .eq('status', 'completed');

  const completed = bids || [];
  const totalRevenue = completed.reduce((s, b) => s + (b.bid_amount || 0), 0);
  const totalFees = completed.reduce((s, b) => s + (b.platform_fee_amount || 0), 0);

  // Monthly breakdown
  const months = new Map<string, number>();
  completed.forEach(b => {
    const d = new Date(b.completed_at || b.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.set(key, (months.get(key) || 0) + (b.bid_amount || 0));
  });

  return {
    totalRevenue,
    totalFees,
    netRevenue: totalRevenue - totalFees,
    jobsCompleted: completed.length,
    avgJobValue: completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0,
    monthlyRevenue: Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, revenue]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        revenue,
      })),
  };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
