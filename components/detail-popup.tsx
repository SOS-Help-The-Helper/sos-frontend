'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { X, Search, UserPlus, MessageSquare } from 'lucide-react';

interface DetailPopupProps {
  item: any;
  type: 'request' | 'resource';
  onClose: () => void;
}

export function DetailPopup({ item, type, onClose }: DetailPopupProps) {
  const router = useRouter();
  const { orgType } = useAuthContext();
  const [showPartners, setShowPartners] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [personFlags, setPersonFlags] = useState<any>(null);
  const isCoordinator = orgType === 'coordination';

  useEffect(() => {
    if (showPartners) {
      supabase
        .from('organizations')
        .select('id, name, org_type, capabilities, network_role')
        .order('name')
        .then(({ data }) => setPartners(data || []));
    }
  }, [showPartners]);

  // Load person flags for badges
  useEffect(() => {
    if (item.person_id) {
      supabase
        .from('persons')
        .select('is_veteran, is_first_responder, has_medical_needs')
        .eq('id', item.person_id)
        .single()
        .then(({ data }) => setPersonFlags(data));
    }
  }, [item.person_id]);

  function handleTagPartner(partnerId: string) {
    if (item.sos_id) {
      router.push(`/sos/${item.sos_id}`);
    }
    onClose();
  }

  // Use public_display_text if available, fall back to details_sanitized
  const displayText = item.public_display_text || item.details_sanitized;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div
        className="relative w-full md:w-[420px] bg-white rounded-t-2xl md:rounded-xl shadow-xl max-h-[85vh] overflow-y-auto pb-20"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-3.5 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl md:rounded-t-xl ${
          type === 'request' ? 'bg-sos-red-500' : 'bg-sos-accent-600'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-white text-base">
              {type === 'request' ? '🔴' : '🔵'}
            </span>
            <span className="text-white text-sm font-bold capitalize">
              {item.category?.replace(/_/g, ' ')}
            </span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Status (no urgency highlight) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              item.status === 'active' || item.status === 'open' || item.status === 'available'
                ? 'bg-green-50 text-green-700'
                : item.status === 'matched' ? 'bg-sos-accent-50 text-sos-accent-700'
                : item.status === 'paused' ? 'bg-yellow-50 text-yellow-700'
                : 'bg-sos-gray-200 text-sos-gray-600'
            }`}>{item.status}</span>
            {type === 'resource' && item.capacity_available && (
              <span className="text-[10px] text-sos-gray-600">
                Capacity: {item.capacity_available}
              </span>
            )}
          </div>

          {/* Description */}
          {displayText && (
            <div>
              <p className="text-sm text-sos-blue-800 leading-relaxed">{displayText}</p>
            </div>
          )}

          {/* Triage Score */}
          {type === 'request' && item.triage_score != null && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Triage Score</span>
                <span className="text-sm font-bold text-sos-blue-800">{item.triage_score}</span>
              </div>
              <div className="h-2 bg-sos-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    item.triage_score >= 80 ? 'bg-sos-red-500'
                    : item.triage_score >= 50 ? 'bg-yellow-500'
                    : 'bg-sos-accent-500'
                  }`}
                  style={{ width: `${item.triage_score}%` }}
                />
              </div>
            </div>
          )}

          {/* Date */}
          <p className="text-[10px] text-sos-gray-400">
            Created {new Date(item.created_at).toLocaleDateString()} · {timeAgo(item.created_at)}
          </p>

          {/* Person Badges — last row, small */}
          {type === 'request' && personFlags && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {personFlags.is_veteran && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sos-gray-100 text-sos-gray-600">🎖️ Veteran</span>
              )}
              {personFlags.is_first_responder && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sos-gray-100 text-sos-gray-600">🚒 First Responder</span>
              )}
              {personFlags.has_medical_needs && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sos-gray-100 text-sos-gray-600">🏥 Medical</span>
              )}
              {item.urgency && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sos-gray-100 text-sos-gray-600">{item.urgency}</span>
              )}
              {item.household_size && item.household_size > 1 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sos-gray-100 text-sos-gray-600">👥 {item.household_size} people</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t border-sos-gray-300">
            {type === 'request' && (
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sos-red-500 text-white text-sm font-semibold hover:bg-sos-red-600 transition-colors">
                <Search className="h-4 w-4" />
                Find Match
              </button>
            )}

            <button
              onClick={() => setShowPartners(!showPartners)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-sos-blue-800 text-sos-blue-800 text-sm font-semibold hover:bg-sos-blue-800 hover:text-white transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Tag Partner
            </button>

            {item.sos_id && (
              <button
                onClick={() => { router.push(`/sos/${item.sos_id}`); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sos-gray-200 text-sos-blue-800 text-sm font-semibold hover:bg-sos-gray-300 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Open Coordination Thread
              </button>
            )}
          </div>

          {/* Partner Selector */}
          {showPartners && (
            <div className="border-t border-sos-gray-300 pt-3">
              <p className="text-[10px] text-sos-gray-500 uppercase tracking-wider mb-2">Select Partner</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {partners.filter(p => p.id !== 'sos-platform').map(partner => (
                  <button
                    key={partner.id}
                    onClick={() => handleTagPartner(partner.id)}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-sos-accent-50 border border-sos-gray-300 hover:border-sos-accent-300 transition-colors"
                  >
                    <span className="text-lg">
                      {partner.org_type === 'coordination' ? '🤝'
                       : partner.org_type === 'transport_housing' ? '🚐'
                       : partner.org_type === 'food_service' ? '🍽️'
                       : partner.org_type === 'supply_warehouse' ? '📦' : '🏢'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-sos-blue-800">{partner.name}</p>
                      <p className="text-[10px] text-sos-gray-500 capitalize">{partner.org_type?.replace(/_/g, ' ')}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
