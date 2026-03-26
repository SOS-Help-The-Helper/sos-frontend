'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuthContext } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { Pause, Play, X, Edit3 } from 'lucide-react';

type Tab = 'requests' | 'resources';

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
  const [tab, setTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      let reqQuery = supabase
        .from('requests')
        .select('id, category, urgency, status, details_sanitized, created_at, triage_score')
        .order('created_at', { ascending: false });

      let offQuery = supabase
        .from('resources')
        .select('id, category, status, capacity_available, details_sanitized, created_at')
        .order('created_at', { ascending: false });

      if (orgId && !isAdmin) {
        reqQuery = reqQuery.eq('org_id', orgId);
        offQuery = offQuery.eq('org_id', orgId);
      }

      const [reqData, offData] = await Promise.all([reqQuery, offQuery]);
      setRequests(reqData.data || []);
      setResources(offData.data || []);
      setLoading(false);
    }
    load();
  }, [orgId, isAdmin]);

  const items = tab === 'requests' ? requests : resources;
  const filtered = filter === 'all' ? items : items.filter((i: any) => i.status === filter);

  const statuses = [...new Set(items.map((i: any) => i.status))].filter(Boolean);

  async function updateStatus(table: string, id: string, newStatus: string) {
    const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', id);
    if (!error) {
      if (table === 'requests') {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      } else {
        setResources(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
      }
    }
  }

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
      <div className="flex gap-1 mb-5 bg-sos-gray-200 rounded-xl p-1 w-fit">
        <button
          onClick={() => { setTab('requests'); setFilter('all'); }}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'requests'
              ? 'bg-white text-sos-blue-800 shadow-sm'
              : 'text-sos-gray-600 hover:text-sos-blue-800'
          }`}
        >
          Requests ({requests.length})
        </button>
        <button
          onClick={() => { setTab('resources'); setFilter('all'); }}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'resources'
              ? 'bg-white text-sos-blue-800 shadow-sm'
              : 'text-sos-gray-600 hover:text-sos-blue-800'
          }`}
        >
          Resources ({resources.length})
        </button>
      </div>

      {/* Status Filter */}
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
            <div key={item.id} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4 flex items-center gap-4">
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
                  {tab === 'resources' && item.capacity_available && (
                    <span className="text-[10px] text-sos-gray-500">
                      Capacity: {item.capacity_available}
                    </span>
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
    </DashboardShell>
  );
}
