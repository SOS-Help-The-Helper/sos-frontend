'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { StatCard } from './stat-card';
import { DollarSign, Star, Clock, TrendingUp } from 'lucide-react';

interface VendorReportingProps {
  vendorOrgId: string;
}

export function VendorReporting({ vendorOrgId }: VendorReportingProps) {
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('bids')
        .select('*')
        .eq('vendor_org_id', vendorOrgId)
        .order('created_at', { ascending: false });
      setBids(data || []);
      setLoading(false);
    }
    load();
  }, [vendorOrgId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-5 h-28 animate-pulse" />)}
      </div>
    );
  }

  const submitted = bids.filter(b => b.status === 'submitted');
  const accepted = bids.filter(b => b.status === 'accepted');
  const completed = bids.filter(b => b.status === 'completed');
  const declined = bids.filter(b => b.status === 'declined');
  const inProgress = bids.filter(b => b.status === 'in_progress');

  const totalRevenue = completed.reduce((sum, b) => sum + (b.bid_amount || 0), 0);
  const totalFees = completed.reduce((sum, b) => sum + (b.platform_fee_amount || 0), 0);
  const winRate = bids.length > 0 ? Math.round(((accepted.length + completed.length + inProgress.length) / bids.length) * 100) : 0;

  const avgRating = completed.filter(b => b.citizen_rating).length > 0
    ? (completed.reduce((sum, b) => sum + (b.citizen_rating || 0), 0) / completed.filter(b => b.citizen_rating).length).toFixed(1)
    : '—';

  const avgCompletion = completed.filter(b => b.started_at && b.completed_at).length > 0
    ? Math.round(completed.filter(b => b.started_at && b.completed_at).reduce((sum, b) => {
        return sum + (new Date(b.completed_at).getTime() - new Date(b.started_at).getTime()) / (1000 * 60 * 60);
      }, 0) / completed.filter(b => b.started_at && b.completed_at).length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Jobs Won" value={accepted.length + completed.length + inProgress.length} subtitle={`${bids.length} total bids`} accent="blue" />
        <StatCard label="Win Rate" value={`${winRate}%`} subtitle={`${declined.length} declined`} accent="accent" />
        <StatCard label="Revenue" value={`$${totalRevenue.toLocaleString()}`} subtitle={`$${totalFees.toLocaleString()} in fees`} accent="red" />
        <StatCard label="Avg Rating" value={avgRating} subtitle={`${completed.filter(b => b.citizen_rating).length} reviews`} accent="blue" />
      </div>

      {/* Bid pipeline */}
      <div className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-5">
        <h3 className="text-sm font-bold text-sos-blue-800 mb-4">Bid Pipeline</h3>
        <div className="space-y-3">
          {[
            { label: 'Submitted', count: submitted.length, color: 'bg-sos-accent-500' },
            { label: 'Accepted', count: accepted.length, color: 'bg-green-500' },
            { label: 'In Progress', count: inProgress.length, color: 'bg-sos-blue-500' },
            { label: 'Completed', count: completed.length, color: 'bg-green-600' },
            { label: 'Declined', count: declined.length, color: 'bg-sos-gray-400' },
          ].map(item => {
            const pct = bids.length > 0 ? Math.round((item.count / bids.length) * 100) : 0;
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-sos-gray-600">{item.label}</span>
                  <span className="text-xs font-medium text-sos-blue-800">{item.count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-sos-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-5">
          <h3 className="text-sm font-bold text-sos-blue-800 mb-3">💰 Revenue</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5 border-b border-sos-gray-200">
              <span className="text-xs text-sos-gray-600">Gross Revenue</span>
              <span className="text-sm font-bold text-sos-blue-800">${totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-sos-gray-200">
              <span className="text-xs text-sos-gray-600">Platform Fees (10%)</span>
              <span className="text-sm font-medium text-sos-red-500">-${totalFees.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs font-semibold text-sos-blue-800">Net Revenue</span>
              <span className="text-sm font-bold text-green-600">${(totalRevenue - totalFees).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-5">
          <h3 className="text-sm font-bold text-sos-blue-800 mb-3">⭐ Performance</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5 border-b border-sos-gray-200">
              <span className="text-xs text-sos-gray-600">Customer Rating</span>
              <span className="text-sm font-bold text-sos-blue-800">{avgRating}/5</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-sos-gray-200">
              <span className="text-xs text-sos-gray-600">Win Rate</span>
              <span className="text-sm font-bold text-sos-blue-800">{winRate}%</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-sos-gray-200">
              <span className="text-xs text-sos-gray-600">Avg Completion</span>
              <span className="text-sm font-bold text-sos-blue-800">{avgCompletion ? `${avgCompletion}h` : '—'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-sos-gray-600">Gouging Flags</span>
              <span className="text-sm font-bold text-sos-blue-800">{bids.filter(b => b.gouging_flagged).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent bids */}
      <div className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-5">
        <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Recent Bids</h3>
        <div className="space-y-2">
          {bids.slice(0, 8).map(bid => (
            <div key={bid.id} className="flex items-center justify-between py-2 border-b border-sos-gray-200 last:border-0">
              <div>
                <p className="text-xs font-medium text-sos-blue-800">{bid.scope_description || 'Job'}</p>
                <p className="text-[10px] text-sos-gray-500">{new Date(bid.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-sos-blue-800">${bid.bid_amount?.toLocaleString()}</span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                  bid.status === 'completed' ? 'bg-green-50 text-green-700' :
                  bid.status === 'accepted' || bid.status === 'in_progress' ? 'bg-sos-accent-50 text-sos-accent-700' :
                  bid.status === 'submitted' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-sos-gray-200 text-sos-gray-500'
                }`}>{bid.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
