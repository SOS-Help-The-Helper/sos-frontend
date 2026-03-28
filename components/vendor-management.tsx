'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { BidReview } from './bid-review';
import { Briefcase, Clock, CheckCircle, XCircle } from 'lucide-react';

type VendorTab = 'active' | 'bids' | 'history';

interface VendorManagementProps {
  vendorOrgId: string;
}

export function VendorManagement({ vendorOrgId }: VendorManagementProps) {
  const [tab, setTab] = useState<VendorTab>('active');
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewJobId, setReviewJobId] = useState<string | null>(null);

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

  const activeJobs = bids.filter(b => ['accepted', 'in_progress'].includes(b.status));
  const pendingBids = bids.filter(b => b.status === 'submitted');
  const history = bids.filter(b => ['completed', 'declined', 'cancelled'].includes(b.status));

  const items = tab === 'active' ? activeJobs : tab === 'bids' ? pendingBids : history;

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-5 h-20 animate-pulse" />)}</div>;
  }

  return (
    <div>
      {/* Tab Toggle */}
      <div className="flex gap-1 mb-5 bg-[#F0EEEB] rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('active')}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'active' ? 'bg-white text-sos-blue-800 shadow-sm' : 'text-sos-gray-600'
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" /> Active Jobs ({activeJobs.length})
        </button>
        <button
          onClick={() => setTab('bids')}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'bids' ? 'bg-white text-sos-blue-800 shadow-sm' : 'text-sos-gray-600'
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> My Bids ({pendingBids.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'history' ? 'bg-white text-sos-blue-800 shadow-sm' : 'text-sos-gray-600'
          }`}
        >
          <CheckCircle className="h-3.5 w-3.5" /> History ({history.length})
        </button>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map(bid => (
          <div
            key={bid.id}
            onClick={() => setReviewJobId(bid.request_id)}
            className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-4 cursor-pointer hover:shadow-md hover:border-sos-accent-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-sos-blue-800">{bid.scope_description || 'Job'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-sos-gray-500">{new Date(bid.created_at).toLocaleDateString()}</span>
                  <span className="text-[10px] text-sos-gray-500">{bid.estimated_duration || '—'}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-sos-blue-800">${bid.bid_amount?.toLocaleString()}</p>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                  bid.status === 'completed' ? 'bg-green-50 text-green-700' :
                  bid.status === 'accepted' ? 'bg-green-50 text-green-600' :
                  bid.status === 'in_progress' ? 'bg-sos-accent-50 text-sos-accent-700' :
                  bid.status === 'submitted' ? 'bg-yellow-50 text-yellow-700' :
                  bid.status === 'declined' ? 'bg-sos-red-50 text-sos-red-600' :
                  'bg-sos-gray-200 text-sos-gray-500'
                }`}>{bid.status}</span>
              </div>
            </div>

            {/* Rating for completed */}
            {bid.status === 'completed' && bid.citizen_rating && (
              <div className="flex items-center gap-1 mt-2">
                {[1,2,3,4,5].map(s => (
                  <span key={s} className={`text-sm ${s <= bid.citizen_rating ? 'text-yellow-500' : 'text-sos-gray-300'}`}>★</span>
                ))}
                <span className="text-[10px] text-sos-gray-500 ml-1">{bid.citizen_rating}/5</span>
              </div>
            )}

            {bid.gouging_flagged && (
              <div className="mt-2 flex items-center gap-1">
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-sos-red-50 text-sos-red-700">🚨 Gouging flagged</span>
              </div>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-8 text-center">
            <p className="text-sm text-sos-gray-500">
              {tab === 'active' ? 'No active jobs' : tab === 'bids' ? 'No pending bids' : 'No job history'}
            </p>
          </div>
        )}
      </div>

      {/* Bid Review Modal */}
      {reviewJobId && (
        <BidReview requestId={reviewJobId} onClose={() => setReviewJobId(null)} />
      )}
    </div>
  );
}
