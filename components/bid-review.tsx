'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Check, X, AlertTriangle, Star, Clock, DollarSign } from 'lucide-react';

interface BidReviewProps {
  requestId: string;
  onClose: () => void;
}

export function BidReview({ requestId, onClose }: BidReviewProps) {
  const [request, setRequest] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [vendors, setVendors] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [reqData, bidData] = await Promise.all([
        supabase.from('requests').select('*').eq('id', requestId).single(),
        supabase.from('bids').select('*').eq('request_id', requestId).order('bid_amount', { ascending: true }),
      ]);

      setRequest(reqData.data);
      const bidList = bidData.data || [];
      setBids(bidList);

      // Fetch vendor info
      const vendorIds = [...new Set(bidList.map((b: any) => b.vendor_org_id))];
      if (vendorIds.length > 0) {
        const { data: orgData } = await supabase.from('organizations').select('id, name, org_type, trust_score, domain').in('id', vendorIds);
        setVendors(new Map((orgData || []).map((o: any) => [o.id, o])));
      }

      setLoading(false);
    }
    load();
  }, [requestId]);

  async function acceptBid(bidId: string) {
    await supabase.from('bids').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', bidId);
    // Decline other bids
    const otherBids = bids.filter(b => b.id !== bidId);
    for (const b of otherBids) {
      if (b.status === 'submitted') {
        await supabase.from('bids').update({ status: 'declined' }).eq('id', b.id);
      }
    }
    setBids(prev => prev.map(b => b.id === bidId ? { ...b, status: 'accepted' } : b.status === 'submitted' ? { ...b, status: 'declined' } : b));
  }

  async function declineBid(bidId: string) {
    await supabase.from('bids').update({ status: 'declined' }).eq('id', bidId);
    setBids(prev => prev.map(b => b.id === bidId ? { ...b, status: 'declined' } : b));
  }

  if (loading) return null;

  const medianBid = bids.length > 0 ? bids[Math.floor(bids.length / 2)].bid_amount : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full md:w-[560px] bg-[#FDFCFA] rounded-t-2xl md:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-sos-blue-800 px-5 py-4 rounded-t-2xl md:rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Review Bids</h3>
              <p className="text-xs text-sos-accent-400 mt-0.5">
                {request?.category?.replace(/_/g, ' ')} · {bids.length} bid{bids.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {/* Job summary */}
        <div className="px-5 py-3 border-b border-sos-gray-300 bg-[#F0EEEB]">
          {request?.details_sanitized && (
            <p className="text-sm text-sos-blue-800">{request.details_sanitized}</p>
          )}
          {request?.vendor_budget > 0 && (
            <p className="text-xs text-sos-gray-600 mt-1">Budget: ${request.vendor_budget.toLocaleString()}</p>
          )}
        </div>

        {/* Bids comparison */}
        <div className="p-5 space-y-3">
          {bids.map((bid, i) => {
            const vendor = vendors.get(bid.vendor_org_id);
            const isLowest = i === 0;
            const isGouging = bid.gouging_flagged;
            const isAccepted = bid.status === 'accepted';
            const isDeclined = bid.status === 'declined';
            const isActionable = bid.status === 'submitted';

            return (
              <div key={bid.id} className={`p-4 rounded-xl border-2 transition-all ${
                isAccepted ? 'border-green-400 bg-green-50' :
                isDeclined ? 'border-sos-gray-300 bg-sos-gray-200 opacity-60' :
                isLowest ? 'border-sos-accent-400 bg-sos-accent-50' :
                'border-sos-gray-300/80 bg-[#FDFCFA]'
              }`}>
                {/* Vendor + Amount */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-bold text-sos-blue-800">{vendor?.name || 'Vendor'}</span>
                    {vendor?.trust_score != null && (
                      <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        vendor.trust_score >= 70 ? 'bg-green-50 text-green-600' :
                        vendor.trust_score >= 50 ? 'bg-sos-accent-50 text-sos-accent-600' :
                        'bg-sos-gray-200 text-sos-gray-500'
                      }`}>Trust: {vendor.trust_score}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-sos-blue-800">${bid.bid_amount.toLocaleString()}</span>
                    {bid.platform_fee_amount && (
                      <p className="text-[9px] text-sos-gray-500">+ ${bid.platform_fee_amount} fee</p>
                    )}
                  </div>
                </div>

                {/* Details row */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] text-sos-gray-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {bid.estimated_duration || '—'}
                  </span>
                  {isLowest && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">Lowest</span>}
                  {isGouging && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-sos-red-50 text-sos-red-700 flex items-center gap-0.5">
                      <AlertTriangle className="h-3 w-3" /> Gouging
                    </span>
                  )}
                  {isAccepted && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">✓ Accepted</span>}
                  {isDeclined && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-sos-gray-200 text-sos-gray-500">Declined</span>}
                </div>

                {/* Scope */}
                {bid.scope_description && (
                  <p className="text-xs text-sos-gray-600 mb-3">{bid.scope_description}</p>
                )}

                {/* Ratings (if completed) */}
                {bid.citizen_rating && (
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span className="text-[10px] text-sos-gray-600">{bid.citizen_rating}/5 citizen rating</span>
                  </div>
                )}

                {/* Actions */}
                {isActionable && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => acceptBid(bid.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => declineBid(bid.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 border-sos-gray-300 text-sos-gray-600 text-xs font-bold hover:bg-sos-gray-200 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {bids.length === 0 && (
            <p className="text-sm text-sos-gray-500 text-center py-4">No bids received yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
