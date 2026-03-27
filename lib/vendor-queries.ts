import { supabase } from './supabase-client';

export interface VendorJob {
  id: string;
  category: string;
  details_sanitized: string;
  vendor_budget: number;
  vendor_budget_currency: string;
  urgency: string;
  status: string;
  triage_score: number;
  created_at: string;
  location_text: string;
}

export interface Bid {
  id: string;
  request_id: string;
  vendor_org_id: string;
  bid_amount: number;
  bid_currency: string;
  estimated_duration: string;
  scope_description: string;
  status: string;
  platform_fee_percent: number;
  platform_fee_amount: number;
  gouging_flagged: boolean;
  created_at: string;
}

export async function getVendorJobs() {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('is_vendor_job', true)
    .in('status', ['active', 'open', 'pending'])
    .order('created_at', { ascending: false });

  if (error) console.error('Error fetching vendor jobs:', error);
  return data || [];
}

export async function getBidsForJob(requestId: string) {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('request_id', requestId)
    .order('bid_amount', { ascending: true });

  if (error) console.error('Error fetching bids:', error);
  return data || [];
}

export async function getVendorBids(vendorOrgId: string) {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('vendor_org_id', vendorOrgId)
    .order('created_at', { ascending: false });

  if (error) console.error('Error fetching vendor bids:', error);
  return data || [];
}

export async function submitBid(bid: {
  request_id: string;
  vendor_org_id: string;
  bid_amount: number;
  estimated_duration: string;
  scope_description: string;
}) {
  const { data, error } = await supabase
    .from('bids')
    .insert({
      ...bid,
      status: 'submitted',
      bid_currency: 'USD',
      platform_fee_percent: 10,
      platform_fee_amount: Math.round(bid.bid_amount * 0.10),
    })
    .select()
    .single();

  if (error) console.error('Error submitting bid:', error);
  return data;
}
