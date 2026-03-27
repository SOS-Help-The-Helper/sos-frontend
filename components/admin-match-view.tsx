'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { ArrowRight, Check, X } from 'lucide-react';

interface AdminMatchViewProps {
  disasterFilter?: string;
}

export function AdminMatchView({ disasterFilter }: AdminMatchViewProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let reqQuery = supabase.from('requests')
        .select('id, category, urgency, status, details_sanitized, triage_score, org_id, created_at')
        .in('status', ['active', 'open', 'pending', 'matched'])
        .order('triage_score', { ascending: false });

      if (disasterFilter && disasterFilter !== 'all') {
        reqQuery = reqQuery.eq('disaster_id', disasterFilter);
      }

      const [reqData, orgData] = await Promise.all([
        reqQuery,
        supabase.from('organizations').select('id, name, org_type, capabilities, trust_score').not('id', 'eq', 'sos-platform').order('name'),
      ]);

      setRequests(reqData.data || []);
      setPartners(orgData.data || []);
      setLoading(false);
    }
    load();
  }, [disasterFilter]);

  async function assignMatch() {
    if (!selectedRequest || !selectedPartner) return;
    // Create a match record
    const { error } = await supabase.from('matches').insert({
      request_id: selectedRequest.id,
      resource_id: null, // Manual assignment — resource TBD
      disaster_id: disasterFilter !== 'all' ? disasterFilter : null,
      match_score: 0,
      match_summary_masked: `Manual · ${selectedRequest.category?.replace(/_/g, ' ')} · Assigned to ${selectedPartner.name}`,
      match_reasoning: `Manually assigned by admin to ${selectedPartner.name}`,
      status: 'proposed',
    });

    if (!error) {
      // Remove from unmatched list
      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      setSelectedRequest(null);
      setSelectedPartner(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const unmatched = requests.filter(r => r.status !== 'matched');
  const matched = requests.filter(r => r.status === 'matched');

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-xs text-sos-gray-600">{unmatched.length} unmatched</span>
        <span className="text-xs text-green-600">{matched.length} matched</span>
        <span className="text-xs text-sos-gray-500">{partners.length} partners available</span>
        {selectedRequest && selectedPartner && (
          <button
            onClick={assignMatch}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sos-red-500 text-white text-xs font-bold hover:bg-sos-red-600 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Assign Match
          </button>
        )}
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT: Requests */}
        <div>
          <h3 className="text-sm font-bold text-sos-blue-800 mb-2">Requests ({unmatched.length})</h3>
          <div className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
            {unmatched.map(req => {
              const isSelected = selectedRequest?.id === req.id;
              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequest(isSelected ? null : req)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-sos-red-400 bg-sos-red-50 shadow-sm'
                      : 'border-sos-gray-300/80 bg-[#FDFCFA] hover:border-sos-accent-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        req.urgency === 'critical' ? 'bg-sos-red-500 animate-pulse' :
                        req.urgency === 'high' ? 'bg-sos-red-400' :
                        'bg-sos-accent-500'
                      }`} />
                      <span className="text-sm font-semibold text-sos-blue-800 capitalize">
                        {req.category?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {req.triage_score && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.triage_score >= 80 ? 'bg-sos-red-50 text-sos-red-700' :
                          req.triage_score >= 50 ? 'bg-sos-accent-50 text-sos-accent-700' :
                          'bg-sos-gray-200 text-sos-gray-600'
                        }`}>{req.triage_score}</span>
                      )}
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${
                        req.urgency === 'critical' ? 'bg-sos-red-100 text-sos-red-700' :
                        req.urgency === 'high' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-sos-gray-200 text-sos-gray-600'
                      }`}>{req.urgency}</span>
                    </div>
                  </div>
                  {req.details_sanitized && (
                    <p className="text-xs text-sos-gray-600 mt-1.5 line-clamp-2">{req.details_sanitized}</p>
                  )}
                </div>
              );
            })}
            {unmatched.length === 0 && (
              <p className="text-sm text-sos-gray-500 text-center py-8">All requests matched ✓</p>
            )}
          </div>
        </div>

        {/* CENTER: Arrow */}
        {selectedRequest && (
          <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-10 h-10 rounded-full bg-sos-blue-800 flex items-center justify-center shadow-lg">
              <ArrowRight className="h-5 w-5 text-white" />
            </div>
          </div>
        )}

        {/* RIGHT: Partners */}
        <div>
          <h3 className="text-sm font-bold text-sos-blue-800 mb-2">Partners ({partners.length})</h3>
          <div className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
            {partners.map(org => {
              const isSelected = selectedPartner?.id === org.id;
              const typeIcon = org.org_type === 'coordination' ? '🤝' :
                org.org_type === 'transport_housing' ? '🚐' :
                org.org_type === 'food_service' ? '🍽️' :
                org.org_type === 'supply_warehouse' ? '📦' :
                org.org_type === 'vendor' ? '🔨' : '🏢';

              return (
                <div
                  key={org.id}
                  onClick={() => setSelectedPartner(isSelected ? null : org)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-green-400 bg-green-50 shadow-sm'
                      : 'border-sos-gray-300/80 bg-[#FDFCFA] hover:border-sos-accent-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{typeIcon}</span>
                      <div>
                        <span className="text-sm font-semibold text-sos-blue-800">{org.name}</span>
                        <p className="text-[10px] text-sos-gray-500 capitalize">{org.org_type?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    {org.trust_score != null && (
                      <span className={`text-sm font-bold ${
                        org.trust_score >= 0.7 ? 'text-green-600' :
                        org.trust_score >= 0.5 ? 'text-sos-accent-700' :
                        'text-sos-red-500'
                      }`}>{Math.round(org.trust_score * 100)}</span>
                    )}
                  </div>
                  {org.capabilities && org.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(org.capabilities as string[]).slice(0, 4).map((cap: string, i: number) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-sos-gray-200 text-sos-gray-600 capitalize">{cap.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selection indicator */}
      {(selectedRequest || selectedPartner) && (
        <div className="mt-4 p-3 rounded-xl bg-sos-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedRequest ? (
              <span className="text-xs">
                <strong>Request:</strong> {selectedRequest.category?.replace(/_/g, ' ')} · {selectedRequest.urgency}
              </span>
            ) : (
              <span className="text-xs text-white/50">← Select a request</span>
            )}
            <ArrowRight className="h-4 w-4 text-white/50" />
            {selectedPartner ? (
              <span className="text-xs">
                <strong>Partner:</strong> {selectedPartner.name}
              </span>
            ) : (
              <span className="text-xs text-white/50">Select a partner →</span>
            )}
          </div>
          {selectedRequest && selectedPartner ? (
            <button onClick={assignMatch} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white text-sos-blue-800 hover:bg-sos-gray-200 transition-colors">
              Assign →
            </button>
          ) : (
            <button onClick={() => { setSelectedRequest(null); setSelectedPartner(null); }} className="text-xs text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
