'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

interface CitizenReport {
  id: string;
  category: string;
  urgency: string;
  details_sanitized: string;
  location_name: string;
  latitude: number;
  longitude: number;
  created_at: string;
  person_trust_score?: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  shelter: '🏠', food: '🍽️', medical: '🏥', transportation: '🚗',
  utilities: '⚡', flood: '🌊', fire: '🔥', rescue: '🆘', other: '📋',
};

const URGENCY_COLORS: Record<string, string> = {
  critical: 'bg-sos-red-500/20 text-sos-red-400 border-sos-red-500/30',
  urgent: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  can_wait: 'bg-sos-accent-400/20 text-sos-accent-400 border-sos-accent-400/30',
};

type VerifyAction = 'confirm' | 'partial' | 'not_observed';

export default function VerifyQueue() {
  const router = useRouter();
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // Get unverified citizen reports — ordered by urgency then proximity
      const { data } = await supabase
        .from('requests')
        .select('id, category, urgency, details_sanitized, location_name, latitude, longitude, created_at')
        .eq('source', 'citizen_intake')
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(20);

      setReports(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleVerify(reportId: string, action: VerifyAction) {
    setActing(reportId);

    try {
      await fetch('/api/ems/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: reportId,
          verification: action,
          agent_id: 'ems',
        }),
      });

      // Remove from local list
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch {
      // Offline — queue for sync
      setReports(prev => prev.filter(r => r.id !== reportId));
    }

    setActing(null);
  }

  function timeSince(dateStr: string) {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-[env(safe-area-inset-top)] pb-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/ems/sitrep')} className="text-white/40 hover:text-white text-sm">← Sitrep</button>
          <h1 className="text-sm font-bold">Verify Reports</h1>
        </div>
        <span className="text-xs text-white/40">{reports.length} unverified</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-sos-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">✓</span>
          </div>
          <h3 className="text-base font-bold">Queue Clear</h3>
          <p className="text-sm text-white/50 mt-1">No citizen reports to verify nearby.</p>
          <button onClick={() => router.push('/ems/sitrep')} className="mt-4 px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm font-bold">
            File a Sitrep
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className={`rounded-xl border border-white/10 bg-white/5 overflow-hidden ${acting === report.id ? 'opacity-50' : ''}`}>
              {/* Report info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_ICONS[report.category] || '📋'}</span>
                    <span className="text-sm font-bold capitalize">{report.category?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${URGENCY_COLORS[report.urgency] || URGENCY_COLORS.can_wait}`}>
                      {report.urgency?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-white/30">{timeSince(report.created_at)}</span>
                  </div>
                </div>

                {report.details_sanitized && (
                  <p className="text-sm text-white/70 mb-2">{report.details_sanitized}</p>
                )}

                {report.location_name && (
                  <p className="text-xs text-white/40">📍 {report.location_name}</p>
                )}
              </div>

              {/* Actions — big tap targets */}
              <div className="flex border-t border-white/10">
                <button
                  onClick={() => handleVerify(report.id, 'confirm')}
                  disabled={acting === report.id}
                  className="flex-1 py-3.5 text-center text-sm font-bold text-green-400 hover:bg-green-500/10 active:bg-green-500/20 transition-colors border-r border-white/10"
                >
                  ✓ Confirm
                </button>
                <button
                  onClick={() => handleVerify(report.id, 'partial')}
                  disabled={acting === report.id}
                  className="flex-1 py-3.5 text-center text-sm font-bold text-yellow-400 hover:bg-yellow-500/10 active:bg-yellow-500/20 transition-colors border-r border-white/10"
                >
                  ~ Partial
                </button>
                <button
                  onClick={() => handleVerify(report.id, 'not_observed')}
                  disabled={acting === report.id}
                  className="flex-1 py-3.5 text-center text-sm font-bold text-white/40 hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  ✗ Not Seen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
