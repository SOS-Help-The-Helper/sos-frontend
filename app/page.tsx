'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { StatCard } from '@/components/stat-card';
import { getRecentActivity } from '@/lib/queries';
import { getScopedStats } from '@/lib/scoped-queries';
import { useAuthContext } from '@/lib/auth-context';

interface Stats {
  openRequests: number;
  totalRequests: number;
  activeMatches: number;
  totalMatches: number;
  fulfilledMatches: number;
  fulfillmentRate: number;
  partnersOnline: number;
  partnerNames: string;
  activeDisasters: Array<{ id: string; name: string; status: string; slug: string }>;
  totalOffers: number;
  learnings: Array<{ id: string; pattern: string; confidence: number; category: string }>;
}

interface ActivityItem {
  time: string;
  text: string;
  type: string;
}

export default function CommandCenter() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { orgId, isAdmin, loading: authLoading } = useAuthContext();

  useEffect(() => {
    if (authLoading) return;
    async function load() {
      const [statsData, activityData] = await Promise.all([
        getScopedStats(orgId),
        getRecentActivity(),
      ]);
      setStats(statsData);
      setActivity(activityData);
      setLoading(false);
    }
    load();
    // Refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [orgId, authLoading]);

  if (loading) {
    return (
      <DashboardShell title="Command Center" subtitle="Loading...">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-sos-gray-300 p-5 h-28 animate-pulse" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Command Center"
      subtitle="Real-time coordination overview"
    >
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Open Requests"
          value={stats?.openRequests ?? 0}
          subtitle={`${stats?.totalRequests ?? 0} total across ${stats?.activeDisasters?.length ?? 0} disasters`}
          accent="red"
        />
        <StatCard
          label="Active Matches"
          value={stats?.activeMatches ?? 0}
          subtitle={`${stats?.totalMatches ?? 0} total · ${stats?.fulfilledMatches ?? 0} fulfilled`}
          accent="accent"
        />
        <StatCard
          label="Partners"
          value={stats?.partnersOnline ?? 0}
          subtitle={stats?.partnerNames || 'No partners'}
          accent="blue"
        />
        <StatCard
          label="Fulfillment Rate"
          value={stats?.fulfillmentRate ? `${stats.fulfillmentRate}%` : '—'}
          subtitle={stats?.fulfilledMatches ? `${stats.fulfilledMatches} matches fulfilled` : 'Awaiting first resolution'}
          accent="blue"
        />
      </div>

      {/* Map + Activity */}
      <div className="grid grid-cols-3 gap-4">
        {/* Map Placeholder */}
        <div className="col-span-2 bg-white rounded-xl border border-sos-gray-300 overflow-hidden">
          <div className="h-[420px] bg-sos-blue-900 flex items-center justify-center relative">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-sos-blue-800 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-sos-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <p className="text-white/60 text-sm font-medium">Mapbox Integration</p>
              <p className="text-white/30 text-xs mt-1">
                {stats?.totalRequests ?? 0} requests · {stats?.totalOffers ?? 0} offers · Heat layer + pins
              </p>
            </div>
            {/* Data indicator */}
            <div className="absolute bottom-3 left-3 flex gap-2">
              <span className="text-[10px] bg-sos-red-500/20 text-sos-red-400 px-2 py-0.5 rounded-full">
                {stats?.openRequests ?? 0} needs
              </span>
              <span className="text-[10px] bg-sos-accent-500/20 text-sos-accent-400 px-2 py-0.5 rounded-full">
                {stats?.totalOffers ?? 0} offers
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
          <h3 className="text-sm font-bold text-sos-blue-800 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {activity.length > 0 ? activity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  item.type === 'match' ? 'bg-sos-accent-500' :
                  item.type === 'request' ? 'bg-sos-red-500' :
                  'bg-sos-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-sos-blue-800 leading-snug">{item.text}</p>
                  <p className="text-[10px] text-sos-gray-500 mt-0.5">{item.time}</p>
                </div>
              </div>
            )) : (
              <p className="text-xs text-sos-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Active Disasters */}
      {stats?.activeDisasters && stats.activeDisasters.length > 0 && (
        <div className="mt-4 bg-white rounded-xl border border-sos-gray-300 p-5">
          <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Active Disasters</h3>
          <div className="grid grid-cols-2 gap-3">
            {stats.activeDisasters.map((disaster, i) => (
              <div key={disaster.id} className={`flex items-center gap-3 p-3 rounded-lg ${
                i === 0 ? 'bg-sos-red-50 border border-sos-red-100' : 'bg-sos-accent-50 border border-sos-accent-100'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  i === 0 ? 'bg-sos-red-500' : 'bg-sos-accent-600'
                }`} />
                <div>
                  <p className="text-sm font-medium text-sos-blue-800">{disaster.name}</p>
                  <p className="text-xs text-sos-gray-600">Active</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Learnings Preview */}
      {stats?.learnings && stats.learnings.length > 0 && (
        <div className="mt-4 bg-white rounded-xl border border-sos-gray-300 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-sos-blue-800">System Intelligence</h3>
            <span className="text-[10px] text-sos-gray-500">{stats.learnings.length} active learnings</span>
          </div>
          <div className="space-y-2">
            {stats.learnings.slice(0, 3).map((learning) => (
              <div key={learning.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-sos-gray-200/50">
                <div className="w-8 h-8 rounded-full bg-sos-accent-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-sos-accent-700">
                    {Math.round(learning.confidence * 100)}%
                  </span>
                </div>
                <div>
                  <p className="text-xs text-sos-blue-800 leading-snug">{learning.pattern}</p>
                  <p className="text-[10px] text-sos-gray-500 mt-0.5">{learning.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
