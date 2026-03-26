'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { StatCard } from '@/components/stat-card';
import { NervousSystem } from '@/components/nervous-system';
import { PartnerHome } from '@/components/partner-home';
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
  const [currentView, setCurrentView] = useState('admin');
  const { orgId, isAdmin, isPartner, loading: authLoading } = useAuthContext();

  // Determine effective orgId based on view switcher
  const effectiveOrgId = currentView === 'admin' || currentView === 'citizen' ? null : currentView;

  useEffect(() => {
    if (authLoading) return;
    async function load() {
      const queryOrgId = isAdmin ? effectiveOrgId : orgId;
      const [statsData, activityData] = await Promise.all([
        getScopedStats(queryOrgId),
        getRecentActivity(),
      ]);
      setStats(statsData);
      setActivity(activityData);
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [orgId, effectiveOrgId, authLoading, isAdmin]);

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

  // Partner view: simpler home widget
  if (isPartner && !isAdmin) {
    return (
      <DashboardShell title="Command Center" subtitle="Your coordination hub">
        <PartnerHome stats={{
          openMatches: stats?.activeMatches ?? 0,
          inProgress: 0,
          completed: stats?.fulfilledMatches ?? 0,
          avgTimeMin: 0,
          familiesServed: stats?.fulfilledMatches ?? 0,
          peopleServed: (stats?.fulfilledMatches ?? 0) * 3,
          fastestMin: 35,
        }} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Command Center"
      subtitle="Real-time coordination overview"
      currentView={currentView}
      onViewChange={setCurrentView}
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

      {/* Nervous System + Activity */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <NervousSystem metrics={{
            intakesToday: stats?.totalRequests ?? 0,
            matchesProposed: stats?.totalMatches ?? 0,
            matchesFulfilled: stats?.fulfilledMatches ?? 0,
            avgResponseMin: 0,
          }} />
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
