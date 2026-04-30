'use client';
import { db } from '@/lib/api';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { DetailPopup } from '@/components/detail-popup';
// TODO: rewire to EF (Phase 4) — // import { BidReview } from '@/components/bid-review'; // TODO: rewire to EF (Phase 4)
// TODO: rewire to EF (Phase 4) — // import { VendorManagement } from '@/components/vendor-management'; // TODO: rewire to EF (Phase 4)
import { Pause, Play, X, Edit3, BarChart3 } from 'lucide-react';
// TODO: rewire to EF (Phase 4) — // import { CapacityEditor } from '@/components/capacity-editor'; // TODO: rewire to EF (Phase 4)

type Tab = 'organizations' | 'requests' | 'resources' | 'capacity' | 'vendor_jobs';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-50 text-green-700',
  active: 'bg-green-50 text-green-700',
  available: 'bg-green-50 text-green-700',
  matched: 'bg-sos-accent-50 text-sos-accent-700',
  deployed: 'bg-sos-accent-50 text-sos-accent-700',
  paused: 'bg-yellow-50 text-yellow-700',
  fulfilled: 'bg-green-100 text-green-800',
  exhausted: 'bg-sos-gray-200 text-sos-gray-600',
  withdrawn: 'bg-sos-gray-200 text-sos-gray-600',
  cancelled: 'bg-sos-gray-200 text-sos-gray-600',
  expired: 'bg-sos-gray-200 text-sos-gray-600',
  flagged: 'bg-sos-red-50 text-sos-red-700',
};

export default function Management() {
  const { orgId, isAdmin } = useAuthContext();
  const { effectiveOrgId, effectiveOrgType } = useViewContext();
  const [tab, setTab] = useState<Tab>('organizations');
  const [orgs, setOrgs] = useState<any[]>([]);
  const [vendorJobs, setVendorJobs] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editingCapacity, setEditingCapacity] = useState<any>(null);
  const [reviewJobId, setReviewJobId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      let reqQuery = supabase
        .from('requests')
        .select('id, category, urgency, status, details_sanitized, created_at, triage_score')
        .order('created_at', { ascending: false });

      let offQuery = supabase
        .from('resources')
        .select('id, category, status, capacity_available, capacity_total, details_sanitized, created_at, org_id')
        .order('created_at', { ascending: false });

      if (orgId && !isAdmin) {
        reqQuery = reqQuery.eq('org_id', orgId);
        offQuery = offQuery.eq('org_id', orgId);
      }

      const orgQuery = supabase
        .from('organizations')
        .select('id, name, org_type, domain, verified_domain, trust_score, capabilities, network_role, created_at')
        .order('name');

      const [reqData, offData, orgData] = await Promise.all([reqQuery, offQuery, orgQuery]);
      setRequests(reqData.data || []);
      setResources(offData.data || []);
      setOrgs(orgData.data || []);

      // Vendor jobs + bids
      const { data: vjData } = await db.from('requests').select('id, category, details_sanitized, vendor_budget, status, urgency, created_at').eq('is_vendor_job', true).order('created_at', { ascending: false });
      setVendorJobs(vjData || []);
      const { data: bidData } = await db.from('bids').select('id, request_id, vendor_org_id, bid_amount, status, gouging_flagged, created_at').order('created_at', { ascending: false });
      setBids(bidData || []);

      setLoading(false);
    }
    load();
  }, [orgId, isAdmin]);

  const items = tab === 'requests' ? requests : resources;
  const filtered = filter === 'all' ? items : items.filter((i: any) => i.status === filter);

  const statuses = [...new Set(items.map((i: any) => i.status))].filter(Boolean);

  async function updateStatus(table: string, id: string, newStatus: string) {
    const { error } = await db.from(table).update({ status: newStatus }).eq('id', id);
    if (!error) {
      if (table === 'requests') {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      } else {
        setResources(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
      }
    }
  }

  // Vendor-specific management
  const isVendorView = effectiveOrgType === 'vendor';
  const showVendorJobs = isAdmin || effectiveOrgType === 'vendor';
  // TODO: rewire to EF (Phase 4)
  // if (isVendorView) {
  //   return (
  //     <DashboardShell title="My Jobs" subtitle="Active jobs, bids, and history">
{/* TODO: rewire */ /*   //       <VendorManagement vendorOrgId={effectiveOrgId!} /> */}
  //     </DashboardShell>
  //   );
  // }

  if (loading) {
    return (
      <DashboardShell title="Management" subtitle="Loading...">
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5 h-20 animate-pulse" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Management" subtitle="Manage your requests and resources">
      {/* Tab Toggle */}
      <div className="flex gap-1 mb-5 bg-sos-gray-200 rounded-xl p-1 w-fit overflow-x-auto">
        <button
          onClick={() => { setTab('organizations'); setFilter('all'); }}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
            tab === 'organizations'
              ? 'bg-white text-sos-blue-800 shadow-sm'
              : 'text-sos-gray-600 hover:text-sos-blue-800'
          }`}
        >
          Organizations ({orgs.length})
        </button>
        <button
          onClick={() => { setTab('requests'); setFilter('all'); }}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
            tab === 'requests'
              ? 'bg-white text-sos-blue-800 shadow-sm'
              : 'text-sos-gray-600 hover:text-sos-blue-800'
          }`}
        >
          Requests ({requests.length})
        </button>
        <button
          onClick={() => { setTab('resources'); setFilter('all'); }}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
            tab === 'resources'
              ? 'bg-white text-sos-blue-800 shadow-sm'
              : 'text-sos-gray-600 hover:text-sos-blue-800'
          }`}
        >
          Resources ({resources.length})
        </button>
        <button
          onClick={() => { setTab('capacity'); setFilter('all'); }}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
            tab === 'capacity'
              ? 'bg-white text-sos-blue-800 shadow-sm'
              : 'text-sos-gray-600 hover:text-sos-blue-800'
          }`}
        >
          <span className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Capacity</span>
        </button>
        {showVendorJobs && (
        <button
          onClick={() => { setTab('vendor_jobs'); setFilter('all'); }}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
            tab === 'vendor_jobs'
              ? 'bg-white text-sos-blue-800 shadow-sm'
              : 'text-sos-gray-600 hover:text-sos-blue-800'
          }`}
        >
          💼 Vendor Jobs ({vendorJobs.length})
        </button>
        )}
      </div>

      {/* Vendor Jobs Tab */}
      {tab === 'vendor_jobs' && (
        <div className="space-y-2">
          {vendorJobs.map((job: any) => {
            const jobBids = bids.filter((b: any) => b.request_id === job.id);
            return (
              <div key={job.id} onClick={() => setReviewJobId(job.id)} className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-4 cursor-pointer hover:shadow-md hover:border-sos-accent-300 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🔧</span>
                    <div>
                      <p className="text-sm font-bold text-sos-blue-800 capitalize">{job.category?.replace(/_/g, ' ')}</p>
                      {job.details_sanitized && (
                        <p className="text-xs text-sos-gray-600 mt-0.5 truncate max-w-sm">{job.details_sanitized}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {job.vendor_budget > 0 && (
                      <p className="text-sm font-bold text-green-600">${job.vendor_budget.toLocaleString()}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-sos-accent-50 text-sos-accent-700">
                        {jobBids.length} bid{jobBids.length !== 1 ? 's' : ''}
                      </span>
                      {jobBids.some((b: any) => b.gouging_flagged) && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-sos-red-50 text-sos-red-700">
                          🚨 Gouging
                        </span>
                      )}
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                        job.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-sos-gray-200 text-sos-gray-600'
                      }`}>{job.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {vendorJobs.length === 0 && (
            <div className="bg-[#FDFCFA] rounded-xl border-2 border-sos-gray-300/80 p-8 text-center">
              <p className="text-sm text-sos-gray-500">No vendor jobs found</p>
            </div>
          )}
        </div>
      )}

      {/* Organizations Tab */}
      {tab === 'organizations' && (
        <div className="space-y-2">
          {orgs.map((org: any) => (
            <a key={org.id} href={`/organizations`} className="block bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4 hover:shadow-md hover:border-sos-accent-300 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                    org.org_type === 'coordination' ? 'bg-green-50' :
                    org.org_type === 'transport_housing' ? 'bg-sos-accent-50' :
                    org.org_type === 'food_service' ? 'bg-yellow-50' :
                    org.org_type === 'supply_warehouse' ? 'bg-sos-blue-50' :
                    'bg-sos-gray-200'
                  }`}>
                    {org.org_type === 'coordination' ? '🤝' :
                     org.org_type === 'transport_housing' ? '🚐' :
                     org.org_type === 'food_service' ? '🍽️' :
                     org.org_type === 'supply_warehouse' ? '📦' : '🏢'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-sos-blue-800">{org.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-sos-gray-500 capitalize">{org.org_type?.replace(/_/g, ' ')}</span>
                      {org.domain && <span className="text-[10px] text-sos-gray-400">{org.domain}</span>}
                      {org.network_role && org.network_role !== 'independent' && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">{org.network_role}</span>
                      )}
                    </div>
                  </div>
                </div>
                {org.trust_score != null && (
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      org.trust_score >= 0.7 ? 'text-green-600' : org.trust_score >= 0.5 ? 'text-sos-accent-700' : 'text-sos-red-500'
                    }`}>{Math.round(org.trust_score * 100)}</p>
                    <p className="text-[9px] text-sos-gray-500">Trust</p>
                  </div>
                )}
              </div>
              {org.capabilities && org.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(org.capabilities as string[]).slice(0, 5).map((cap: string, i: number) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-sos-gray-200 text-sos-gray-600 capitalize">{cap.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>
      )}

      {/* Status Filter + Items List (requests/resources only) */}
      {tab !== 'organizations' && (<>

      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
            filter === 'all' ? 'bg-sos-blue-800 text-white' : 'bg-white text-sos-gray-600 border border-sos-gray-300'
          }`}
        >
          All ({items.length})
        </button>
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap capitalize transition-colors ${
              filter === s ? 'bg-sos-blue-800 text-white' : 'bg-white text-sos-gray-600 border border-sos-gray-300'
            }`}
          >
            {s} ({items.filter((i: any) => i.status === s).length})
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {filtered.length > 0 ? filtered.map((item: any) => {
          const tableName = tab === 'requests' ? 'requests' : 'resources';
          const isPaused = item.status === 'paused';
          const isActive = ['open', 'active', 'available', 'matched', 'deployed'].includes(item.status);
          const isResolved = ['fulfilled', 'exhausted', 'withdrawn', 'cancelled', 'expired'].includes(item.status);

          return (
            <div key={item.id} onClick={() => setSelectedItem({ ...item, _type: tab === 'requests' ? 'request' : 'resource' })} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-sos-accent-300 transition-all">
              {/* Status dot */}
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                isActive ? 'bg-green-400' :
                isPaused ? 'bg-yellow-400' :
                'bg-sos-gray-400'
              }`} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-sos-blue-800 capitalize">
                    {item.category?.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[item.status] || 'bg-sos-gray-200 text-sos-gray-600'}`}>
                    {item.status}
                  </span>
                  {tab === 'requests' && item.urgency && (
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                      item.urgency === 'critical' ? 'bg-sos-red-50 text-sos-red-700' :
                      item.urgency === 'high' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-sos-gray-200 text-sos-gray-600'
                    }`}>
                      {item.urgency}
                    </span>
                  )}
                  {tab === 'resources' && (
                    <div className="flex items-center gap-2">
                      {item.capacity_available != null && (
                        <span className="text-[10px] text-sos-gray-500">
                          Capacity: {item.capacity_available}
                        </span>
                      )}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        item.status === 'available' ? 'bg-green-50 text-green-700' :
                        item.status === 'limited' ? 'bg-yellow-50 text-yellow-700' :
                        item.status === 'at_capacity' ? 'bg-sos-red-50 text-sos-red-700' :
                        'bg-sos-gray-200 text-sos-gray-500'
                      }`}>
                        {item.status === 'available' ? '🟢 Available' :
                         item.status === 'limited' ? '🟡 Limited' :
                         item.status === 'at_capacity' ? '🔴 At Capacity' :
                         item.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                  {tab === 'resources' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingCapacity(item); }}
                      className="text-[10px] text-sos-accent-700 hover:text-sos-accent-900 font-medium mt-1"
                    >
                      ✏️ Edit Capacity
                    </button>
                  )}
                </div>
                {item.details_sanitized && (
                  <p className="text-xs text-sos-gray-600 mt-0.5 truncate">{item.details_sanitized}</p>
                )}
                <p className="text-[10px] text-sos-gray-400 mt-0.5">
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              {!isResolved && (
                <div className="flex gap-1.5 flex-shrink-0">
                  {isActive && (
                    <button
                      onClick={() => updateStatus(tableName, item.id, 'paused')}
                      className="p-2 rounded-lg border border-sos-gray-300 text-yellow-600 hover:bg-yellow-50 transition-colors"
                      title="Pause"
                    >
                      <Pause className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isPaused && (
                    <button
                      onClick={() => updateStatus(tableName, item.id, tab === 'requests' ? 'open' : 'available')}
                      className="p-2 rounded-lg border border-sos-gray-300 text-green-600 hover:bg-green-50 transition-colors"
                      title="Resume"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {(isActive || isPaused) && (
                    <button
                      onClick={() => updateStatus(tableName, item.id, 'withdrawn')}
                      className="p-2 rounded-lg border border-sos-gray-300 text-sos-red-500 hover:bg-sos-red-50 transition-colors"
                      title="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        }) : (
          <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-8 text-center">
            <p className="text-sm text-sos-gray-500">
              No {tab === 'requests' ? 'requests' : 'resources'} found
              {filter !== 'all' ? ` with status "${filter}"` : ''}
            </p>
          </div>
        )}
      </div>
      </>
      )}
      {/* Capacity Tab */}
      {tab === 'capacity' && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-green-700">{resources.filter(r => r.status === 'available').length}</p>
              <p className="text-[10px] text-green-600">Available</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-yellow-700">{resources.filter(r => r.status === 'limited').length}</p>
              <p className="text-[10px] text-yellow-600">Limited</p>
            </div>
            <div className="bg-sos-red-50 border border-sos-red-100 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-sos-red-700">{resources.filter(r => r.status === 'at_capacity').length}</p>
              <p className="text-[10px] text-sos-red-600">At Capacity</p>
            </div>
            <div className="bg-sos-gray-200 border border-sos-gray-300 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-sos-gray-600">{resources.filter(r => r.status === 'paused').length}</p>
              <p className="text-[10px] text-sos-gray-500">Paused</p>
            </div>
          </div>

          {/* Resource capacity bars */}
          <div className="space-y-2">
            {resources.map(resource => {
              const total = resource.capacity_total || 0;
              const avail = resource.capacity_available || 0;
              const pct = total > 0 ? Math.round((avail / total) * 100) : 0;
              const barColor = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-sos-red-500';
              const statusBadge = resource.status === 'available' ? '🟢' : resource.status === 'limited' ? '🟡' : resource.status === 'at_capacity' ? '🔴' : '⏸️';

              return (
                <div key={resource.id} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{statusBadge}</span>
                      <span className="text-sm font-bold text-sos-blue-800 capitalize">{resource.category?.replace(/_/g, ' ')}</span>
                    </div>
                    <button
                      onClick={() => setEditingCapacity(resource)}
                      className="text-xs text-sos-accent-700 hover:text-sos-accent-900 font-medium"
                    >
                      Edit
                    </button>
                  </div>
                  {resource.details_sanitized && (
                    <p className="text-xs text-sos-gray-600 mb-2">{resource.details_sanitized}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-sos-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: total > 0 ? `${100 - pct}%` : '0%' }} />
                    </div>
                    <span className="text-xs font-bold text-sos-blue-800 w-20 text-right">
                      {total > 0 ? `${avail}/${total}` : 'Not set'}
                    </span>
                  </div>
                </div>
              );
            })}
            {resources.length === 0 && (
              <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-8 text-center">
                <p className="text-sm text-sos-gray-600">No resources to manage.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bid Review Modal — TODO: rewire to EF (Phase 4) */}
      {/* {reviewJobId && (
{/* TODO: rewire */ /*         <BidReview requestId={reviewJobId} onClose={() => setReviewJobId(null)} /> */}
      )} */}

      {/* Capacity Editor Modal — TODO: rewire to EF (Phase 4) */}

      {/* Detail Popup */}
      {selectedItem && (
        <DetailPopup
          item={selectedItem}
          type={selectedItem._type}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </DashboardShell>
  );
}
