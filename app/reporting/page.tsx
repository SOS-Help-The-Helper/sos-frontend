'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { StatCard } from '@/components/stat-card';
import { getReportingData } from '@/lib/report-queries';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';

export default function Reporting() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin, orgType } = useAuthContext();
  const { effectiveOrgId } = useViewContext();
  const showPartnerTable = isAdmin || orgType === 'coordination';

  useEffect(() => {
    async function load() {
      const reportData = await getReportingData(effectiveOrgId);
      setData(reportData);
      setLoading(false);
    }
    load();
  }, [effectiveOrgId]);

  if (loading) {
    return (
      <DashboardShell title="Reporting" subtitle="Loading...">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5 h-28 animate-pulse" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Reporting" subtitle="Impact metrics and coordination analytics">
      {/* Headline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard
          label="Fulfillment Rate"
          value={data.fulfillmentRate ? `${data.fulfillmentRate}%` : '—'}
          subtitle={`${data.fulfilled} fulfilled of ${data.fulfilled + data.failed + data.expired} resolved`}
          accent="red"
        />
        <StatCard
          label="Avg Response Time"
          value={data.avgResponseTime ? `${data.avgResponseTime}m` : '—'}
          subtitle="From match proposed to connected"
          accent="accent"
        />
        <StatCard
          label="Avg Match Score"
          value={data.avgScore}
          subtitle={`Across ${data.totalMatches} matches`}
          accent="blue"
        />
        <StatCard
          label="People Reached"
          value={data.totalRequests}
          subtitle={`${data.totalOffers} resources available`}
          accent="blue"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
        {/* Match Score Distribution */}
        <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
          <h3 className="text-sm font-bold text-sos-blue-800 mb-4">Match Score Distribution</h3>
          <div className="space-y-3">
            {Object.entries(data.scoreRanges).map(([range, count]) => {
              const total = data.totalMatches || 1;
              const pct = Math.round(((count as number) / total) * 100);
              return (
                <div key={range}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-sos-gray-600">{range}</span>
                    <span className="text-xs font-medium text-sos-blue-800">{count as number} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-sos-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        range === '80+' ? 'bg-green-500' :
                        range === '60-79' ? 'bg-sos-accent-500' :
                        range === '40-59' ? 'bg-sos-accent-300' :
                        'bg-sos-gray-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Match Outcome Breakdown */}
        <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
          <h3 className="text-sm font-bold text-sos-blue-800 mb-4">Match Outcomes</h3>
          <div className="space-y-3">
            {[
              { label: 'Fulfilled', count: data.fulfilled, color: 'bg-green-500', textColor: 'text-green-700' },
              { label: 'Failed', count: data.failed, color: 'bg-sos-red-500', textColor: 'text-sos-red-700' },
              { label: 'Expired', count: data.expired, color: 'bg-sos-gray-400', textColor: 'text-sos-gray-600' },
              { label: 'Active', count: data.totalMatches - data.fulfilled - data.failed - data.expired, color: 'bg-sos-accent-500', textColor: 'text-sos-accent-700' },
            ].map(item => {
              const pct = data.totalMatches > 0 ? Math.round((item.count / data.totalMatches) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${item.textColor}`}>{item.label}</span>
                    <span className="text-xs font-medium text-sos-blue-800">{item.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-sos-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
        {/* Category Distribution */}
        <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
          <h3 className="text-sm font-bold text-sos-blue-800 mb-4">Requests by Category</h3>
          <div className="space-y-2">
            {Object.entries(data.categoryDist)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([category, count]) => {
                const pct = Math.round(((count as number) / data.totalRequests) * 100);
                return (
                  <div key={category} className="flex items-center justify-between py-1.5 border-b border-sos-gray-200 last:border-0">
                    <span className="text-xs text-sos-blue-800 capitalize">{category.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-sos-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-sos-accent-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-medium text-sos-gray-600 w-8 text-right">{count as number}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Urgency Distribution */}
        <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
          <h3 className="text-sm font-bold text-sos-blue-800 mb-4">Urgency Breakdown</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(data.urgencyDist)
              .sort(([a], [b]) => {
                const order: Record<string, number> = { critical: 0, high: 1, standard: 2, low: 3 };
                return (order[a] ?? 4) - (order[b] ?? 4);
              })
              .map(([urgency, count]) => (
                <div key={urgency} className={`p-3 rounded-lg border ${
                  urgency === 'critical' ? 'bg-sos-red-50 border-sos-red-100' :
                  urgency === 'high' ? 'bg-yellow-50 border-yellow-100' :
                  urgency === 'standard' ? 'bg-sos-accent-50 border-sos-accent-100' :
                  'bg-sos-gray-200 border-sos-gray-300'
                }`}>
                  <p className="text-2xl font-bold text-sos-blue-800">{count as number}</p>
                  <p className="text-[10px] font-medium text-sos-gray-600 uppercase tracking-wider capitalize">{urgency}</p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Per-Org Stats — Admin + Coordinators only */}
      {showPartnerTable && (
      <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5 mb-4">
        <h3 className="text-sm font-bold text-sos-blue-800 mb-4">Partner Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-sos-gray-300">
                <th className="text-left text-[10px] font-semibold text-sos-gray-600 uppercase tracking-wider py-2 pr-4">Organization</th>
                <th className="text-left text-[10px] font-semibold text-sos-gray-600 uppercase tracking-wider py-2 pr-4">Type</th>
                <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase tracking-wider py-2">Offers</th>
              </tr>
            </thead>
            <tbody>
              {data.orgStats.map((org: any) => (
                <tr key={org.id} className="border-b border-sos-gray-200 last:border-0">
                  <td className="py-2.5 pr-4">
                    <span className="text-sm font-medium text-sos-blue-800">{org.name}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-xs text-sos-gray-600 capitalize">{org.type?.replace(/_/g, ' ') || '—'}</span>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="text-sm font-medium text-sos-blue-800">{org.resources}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* All Resources Summary */}
      <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5 mb-4">
        <h3 className="text-sm font-bold text-sos-blue-800 mb-3">All Resources</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-sos-accent-50 text-center">
            <p className="text-xl font-bold text-sos-blue-800">{data.totalOffers}</p>
            <p className="text-[10px] text-sos-gray-600">Total Resources</p>
          </div>
          <div className="p-3 rounded-lg bg-green-50 text-center">
            <p className="text-xl font-bold text-green-700">
              {data.orgStats.reduce((sum: number, o: any) => sum + o.resources, 0)}
            </p>
            <p className="text-[10px] text-sos-gray-600">Active Offers</p>
          </div>
          <div className="p-3 rounded-lg bg-sos-blue-50 text-center">
            <p className="text-xl font-bold text-sos-blue-800">{data.orgStats.length}</p>
            <p className="text-[10px] text-sos-gray-600">Partner Orgs</p>
          </div>
          <div className="p-3 rounded-lg bg-sos-gray-200 text-center">
            <p className="text-xl font-bold text-sos-blue-800">
              {Object.keys(data.categoryDist).length}
            </p>
            <p className="text-[10px] text-sos-gray-600">Categories Covered</p>
          </div>
        </div>
      </div>

      {/* System Intelligence */}
      {data.learnings.length > 0 && (
        <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
          <h3 className="text-sm font-bold text-sos-blue-800 mb-4">System Intelligence — {data.learnings.length} Active Learnings</h3>
          <div className="space-y-2.5">
            {data.learnings.map((learning: any) => (
              <div key={learning.id} className="flex items-start gap-3 p-3 rounded-lg bg-sos-gray-200/50">
                <div className="w-10 h-10 rounded-full bg-sos-accent-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-sos-accent-700">
                    {Math.round(learning.confidence * 100)}%
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-sos-blue-800 leading-snug">{learning.pattern}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-sos-gray-500">{learning.category}</span>
                    {learning.evidence_count && (
                      <span className="text-[10px] text-sos-gray-400">{learning.evidence_count} evidence points</span>
                    )}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      learning.status === 'active' ? 'bg-green-50 text-green-600' :
                      learning.status === 'validated' ? 'bg-sos-accent-50 text-sos-accent-600' :
                      'bg-sos-gray-200 text-sos-gray-500'
                    }`}>{learning.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
