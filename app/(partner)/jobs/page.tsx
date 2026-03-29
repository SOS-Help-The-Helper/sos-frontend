'use client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { getAvailableJobs, getActiveJobs, type AvailableJob, type ActiveJob } from '@/lib/vendor-enhanced-queries';
import { BidForm } from '@/components/bid-form';
import { type VendorJob } from '@/lib/vendor-queries';

type Tab = 'available' | 'active' | 'completed';

const URGENCY_BADGE: Record<string, string> = {
  critical: 'bg-sos-red-500/20 text-sos-red-400',
  urgent: 'bg-yellow-500/20 text-yellow-600',
  high: 'bg-yellow-500/20 text-yellow-600',
  standard: 'bg-sos-gray-200 text-sos-gray-600',
};

const STATUS_PIPELINE: Record<string, { label: string; color: string; step: number }> = {
  submitted: { label: 'Bid Sent', color: 'bg-yellow-500', step: 1 },
  accepted: { label: 'Accepted', color: 'bg-sos-accent-500', step: 2 },
  in_progress: { label: 'In Progress', color: 'bg-sos-blue-800', step: 3 },
  completed: { label: 'Completed', color: 'bg-green-500', step: 4 },
};

export default function VendorJobsPage() {
  const [tab, setTab] = useState<Tab>('available');
  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [biddingJob, setBiddingJob] = useState<AvailableJob | null>(null);
  const { orgId } = useAuthContext();
  const { effectiveOrgId } = useViewContext();
  const currentOrgId = effectiveOrgId || orgId;

  useEffect(() => {
    if (!currentOrgId) return;
    async function load() {
      const [avail, active] = await Promise.all([
        getAvailableJobs(currentOrgId!),
        getActiveJobs(currentOrgId!),
      ]);
      setAvailableJobs(avail);
      setActiveJobs(active);
      setLoading(false);
    }
    load();
  }, [currentOrgId]);

  const completedJobs = activeJobs.filter(j => j.bid_status === 'completed');
  const inProgressJobs = activeJobs.filter(j => ['submitted', 'accepted', 'in_progress'].includes(j.bid_status));

  return (
    <DashboardShell title="Jobs" subtitle={`${availableJobs.length} available · ${inProgressJobs.length} active`}>
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-sos-gray-200 rounded-xl p-1 w-fit">
        {[
          { id: 'available' as Tab, label: `Available (${availableJobs.length})` },
          { id: 'active' as Tab, label: `Active (${inProgressJobs.length})` },
          { id: 'completed' as Tab, label: `Completed (${completedJobs.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-white text-sos-blue-800 shadow-sm' : 'text-sos-gray-600 hover:text-sos-blue-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Available jobs */}
          {tab === 'available' && (
            <div className="space-y-3">
              {availableJobs.length === 0 ? (
                <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-8 text-center">
                  <span className="text-3xl">📭</span>
                  <h3 className="text-base font-bold text-sos-blue-800 mt-2">No Available Jobs</h3>
                  <p className="text-sm text-sos-gray-600">Jobs matching your capabilities and coverage will appear here.</p>
                </div>
              ) : availableJobs.map(job => (
                <div key={job.id} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-sos-blue-800 capitalize">{job.category?.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      {job.urgency && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${URGENCY_BADGE[job.urgency] || URGENCY_BADGE.standard}`}>
                          {job.urgency}
                        </span>
                      )}
                      {job.vendor_budget > 0 && (
                        <span className="text-sm font-bold text-green-600">${job.vendor_budget.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  {job.details_sanitized && <p className="text-xs text-sos-gray-600 mb-2">{job.details_sanitized}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-sos-gray-400">
                      {job.location_name && <span>📍 {job.location_name}</span>}
                      {job.distance_km != null && <span>{job.distance_km} km away</span>}
                      <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => setBiddingJob(job)}
                      className="text-xs font-bold px-4 py-2 rounded-lg bg-sos-red-500 text-white hover:bg-sos-red-600 transition-colors"
                    >
                      Submit Bid
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active jobs */}
          {tab === 'active' && (
            <div className="space-y-3">
              {inProgressJobs.length === 0 ? (
                <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-8 text-center">
                  <span className="text-3xl">📋</span>
                  <h3 className="text-base font-bold text-sos-blue-800 mt-2">No Active Jobs</h3>
                  <p className="text-sm text-sos-gray-600">Submit bids on available jobs to get started.</p>
                </div>
              ) : inProgressJobs.map(job => {
                const pipeline = STATUS_PIPELINE[job.bid_status] || STATUS_PIPELINE.submitted;
                return (
                  <div key={job.bid_id} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-sos-blue-800 capitalize">{job.category?.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-bold text-green-600">${job.bid_amount?.toLocaleString()}</span>
                    </div>

                    {/* Status pipeline */}
                    <div className="flex items-center gap-1 mb-3">
                      {Object.entries(STATUS_PIPELINE).map(([key, val]) => (
                        <div key={key} className="flex-1">
                          <div className={`h-1.5 rounded-full ${val.step <= pipeline.step ? pipeline.color : 'bg-sos-gray-200'}`} />
                          <p className={`text-[8px] mt-0.5 text-center ${val.step <= pipeline.step ? 'text-sos-blue-800 font-bold' : 'text-sos-gray-400'}`}>
                            {val.label}
                          </p>
                        </div>
                      ))}
                    </div>

                    {job.details && <p className="text-xs text-sos-gray-600 mb-2">{job.details}</p>}
                    <div className="flex items-center gap-3 text-[10px] text-sos-gray-400">
                      {job.estimated_days && <span>Est: {job.estimated_days} days</span>}
                      {job.started_at && <span>Started: {new Date(job.started_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed jobs */}
          {tab === 'completed' && (
            <div className="space-y-3">
              {completedJobs.length === 0 ? (
                <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-8 text-center">
                  <span className="text-3xl">🏆</span>
                  <h3 className="text-base font-bold text-sos-blue-800 mt-2">No Completed Jobs Yet</h3>
                  <p className="text-sm text-sos-gray-600">Completed jobs and their ratings will appear here.</p>
                </div>
              ) : completedJobs.map(job => (
                <div key={job.bid_id} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-sos-blue-800 capitalize">{job.category?.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-bold text-green-600">${job.bid_amount?.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-sos-gray-600 mb-2">{job.details}</p>
                  <div className="flex items-center gap-3 text-[10px] text-sos-gray-400">
                    <span className="text-green-600 font-bold">✓ Completed</span>
                    {job.completed_at && <span>{new Date(job.completed_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bid form modal */}
      {biddingJob && (
        <BidForm
          job={{
            ...biddingJob,
            vendor_budget_currency: 'USD',
            status: 'open',
            triage_score: 0,
            location_text: biddingJob.location_name || '',
          } as VendorJob}
          onClose={() => setBiddingJob(null)}
          onSubmitted={() => {
            setBiddingJob(null);
            setAvailableJobs(prev => prev.filter(j => j.id !== biddingJob.id));
          }}
        />
      )}
    </DashboardShell>
  );
}
