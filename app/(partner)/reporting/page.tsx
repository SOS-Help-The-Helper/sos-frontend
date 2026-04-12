'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { StatCard } from '@/components/stat-card';
import { getReportingData } from '@/lib/report-queries';
import { VendorReporting } from '@/components/vendor-reporting';
import { supabase } from '@/lib/supabase-client';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { LineChart, HorizontalBars, DonutChart } from '@/components/charts';
import { ImpactCertificate } from '@/components/impact-certificate';
import { getResponseTimeTrend, getCategoryBreakdown, getCommunityImpact, getPlatformComparison, type ResponseTimeTrend, type CategoryBreakdown, type CommunityImpact, type PlatformComparison } from '@/lib/partner-report-queries';

export default function Reporting() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [disasters, setDisasters] = useState<any[]>([]);
  const [disasterFilter, setDisasterFilter] = useState('all');
  const { isAdmin, orgType } = useAuthContext();
  const { effectiveOrgId, effectiveOrgType } = useViewContext();
  const showPartnerTable = isAdmin || orgType === 'coordination';
  const [responseTrend, setResponseTrend] = useState<ResponseTimeTrend[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [communityImpact, setCommunityImpact] = useState<CommunityImpact | null>(null);
  const [comparison, setComparison] = useState<PlatformComparison | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    async function load() {
      const reportData = await getReportingData(effectiveOrgId, disasterFilter !== 'all' ? disasterFilter : undefined);
      const { data: disData } = await supabase.from('disasters').select('id, name, status');
      setDisasters(disData || []);
      setData(reportData);

      // Load enhanced partner reporting
      const currentOrg = effectiveOrgId;
      if (currentOrg) {
        const [trend, cats, impact, comp] = await Promise.all([
          getResponseTimeTrend(currentOrg),
          getCategoryBreakdown(currentOrg),
          getCommunityImpact(currentOrg),
          isAdmin ? getPlatformComparison(currentOrg) : Promise.resolve(null),
        ]);
        setResponseTrend(trend);
        setCategoryBreakdown(cats);
        setCommunityImpact(impact);
        setComparison(comp);
      }

      setLoading(false);
    }
    load();
  }, [effectiveOrgId, disasterFilter]);

  // CSV export
  function downloadCSV() {
    if (!data) return;
    supabase.from('audit_log').insert({ action: 'partner_report_export', actor_type: 'partner', details: `CSV export: ${new Date().toISOString()}` }).then(() => {});
    const rows = [
      ['Partner Impact Report'],
      ['Generated', new Date().toISOString()],
      [''],
      ['SUMMARY'],
      ['Fulfillment Rate', `${data.fulfillmentRate}%`],
      ['Avg Response Time', `${communityImpact?.avgResponseHrs || 0}hrs`],
      ['Families Helped', String(communityImpact?.familiesHelped || 0)],
      ['Trust Score', String(communityImpact?.trustScore || 0)],
      [''],
      ['CATEGORY BREAKDOWN'],
      ...categoryBreakdown.map(c => [c.category, String(c.count)]),
      [''],
      ['RESPONSE TIME TREND'],
      ...responseTrend.map(t => [t.label, `${t.value}hrs`]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `SOS_Partner_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // Vendor-specific reporting
  const isVendorView = effectiveOrgType === 'vendor';
  if (isVendorView) {
    return (
      <DashboardShell title="Vendor Dashboard" subtitle="Jobs, revenue, and performance">
        <VendorReporting vendorOrgId={effectiveOrgId!} />
      </DashboardShell>
    );
  }

  if (loading) {
    return (
      <DashboardShell title="Reporting" subtitle="Loading...">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-sos-gray-300 p-5 h-28 animate-pulse" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Reporting" subtitle="Impact metrics and coordination analytics">
      {/* Disaster Filter */}
      <div className="flex items-center gap-3 mb-5">
        <select
          value={disasterFilter}
          onChange={e => setDisasterFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border-2 border-sos-gray-300/80 bg-white text-sos-blue-800 font-medium"
        >
          <option value="all">All Disasters</option>
          {disasters.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
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
        <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
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
        <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
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
        <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
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
        <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
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
      <div className="bg-white rounded-xl border border-sos-gray-300 p-5 mb-4">
        <h3 className="text-sm font-bold text-sos-blue-800 mb-4">Partner Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-sos-gray-300">
                <th className="text-left text-[10px] font-semibold text-sos-gray-600 uppercase tracking-wider py-2 pr-4">Organization</th>
                <th className="text-left text-[10px] font-semibold text-sos-gray-600 uppercase tracking-wider py-2 pr-4">Type</th>
                <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase tracking-wider py-2 pr-4">Matches</th>
                <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase tracking-wider py-2 pr-4">Fulfilled</th>
                <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase tracking-wider py-2 pr-4">Rate</th>
                <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase tracking-wider py-2">Trust</th>
                <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase tracking-wider py-2">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {data.orgStats.filter((org: any) => org.matches > 0 || org.resources > 0).map((org: any) => (
                <tr key={org.id} className="border-b border-sos-gray-200 last:border-0">
                  <td className="py-2.5 pr-4">
                    <span className="text-sm font-medium text-sos-blue-800">{org.name}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-xs text-sos-gray-600 capitalize">{org.type?.replace(/_/g, ' ') || '—'}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <span className="text-sm font-medium text-sos-blue-800">{org.matches}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <span className="text-sm font-medium text-green-600">{org.fulfilled}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <span className={`text-sm font-bold ${org.fulfillmentRate >= 80 ? 'text-green-600' : org.fulfillmentRate >= 50 ? 'text-sos-accent-700' : 'text-sos-red-500'}`}>
                      {org.fulfillmentRate}%
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className={`text-sm font-medium ${org.trustScore >= 0.8 ? 'text-green-600' : org.trustScore >= 0.5 ? 'text-sos-accent-700' : org.trustScore ? 'text-yellow-600' : 'text-sos-gray-400'}`}>
                      {org.trustScore ? `${(org.trustScore * 100).toFixed(0)}%` : '—'}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="text-sm text-sos-gray-600">{org.avgResponseMin ? `${org.avgResponseMin}m` : '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* All Resources Summary */}
      <div className="bg-white rounded-xl border border-sos-gray-300 p-5 mb-4">
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
        <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
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

      {/* Enhanced Partner Reporting */}
      {communityImpact && (
        <>
          {/* Community Impact Hero */}
          <div className="bg-sos-blue-800 text-white rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Community Impact</h3>
              <div className="flex gap-2">
                <button onClick={downloadCSV} className="text-[10px] px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-medium transition-colors">📥 Export CSV</button>
                <button onClick={() => setShowCertificate(true)} className="text-[10px] px-3 py-1 rounded-lg bg-sos-red-500 hover:bg-sos-red-600 font-bold transition-colors">🏆 Impact Certificate</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="text-2xl font-bold">{communityImpact.familiesHelped}</p><p className="text-[10px] text-white/60">Families Helped</p></div>
              <div><p className="text-2xl font-bold">{communityImpact.avgResponseHrs}<span className="text-sm">h</span></p><p className="text-[10px] text-white/60">Avg Response</p></div>
              <div><p className="text-2xl font-bold">{communityImpact.coverageMi}<span className="text-sm">mi</span></p><p className="text-[10px] text-white/60">Coverage</p></div>
              <div><p className="text-2xl font-bold">{Math.round(communityImpact.trustScore * 100)}<span className="text-sm">%</span></p><p className="text-[10px] text-white/60">Trust Score</p></div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Response time trend */}
            <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
              <LineChart data={responseTrend} label="Response Time (hours)" color="#89CFF0" height={140} />
            </div>

            {/* Category breakdown */}
            <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
              {categoryBreakdown.length > 0 ? (
                <DonutChart
                  data={categoryBreakdown.map((c, i) => ({
                    label: c.category,
                    value: c.count,
                    color: ['#EF4E4B', '#89CFF0', '#22C55E', '#EDB200', '#8B5CF6', '#EC4899', '#06B6D4'][i % 7],
                  }))}
                  label="Fulfillments by Category"
                />
              ) : (
                <HorizontalBars data={[]} label="Fulfillments by Category" />
              )}
            </div>
          </div>

          {/* Platform comparison (admin only) */}
          {comparison && (
            <div className="bg-white rounded-xl border border-sos-gray-300 p-5 mb-4">
              <h3 className="text-sm font-bold text-sos-blue-800 mb-4">vs Platform Average</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-sos-gray-500 mb-1">Response Time</p>
                  <p className={`text-lg font-bold ${comparison.orgAvgResponse <= comparison.platformAvgResponse ? 'text-green-600' : 'text-sos-red-500'}`}>
                    {comparison.orgAvgResponse}h
                  </p>
                  <p className="text-[10px] text-sos-gray-400">Platform: {comparison.platformAvgResponse}h</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-sos-gray-500 mb-1">Fulfillment Rate</p>
                  <p className={`text-lg font-bold ${comparison.orgFulfillmentRate >= comparison.platformFulfillmentRate ? 'text-green-600' : 'text-sos-red-500'}`}>
                    {comparison.orgFulfillmentRate}%
                  </p>
                  <p className="text-[10px] text-sos-gray-400">Platform: {comparison.platformFulfillmentRate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-sos-gray-500 mb-1">Trust Score</p>
                  <p className={`text-lg font-bold ${comparison.orgTrustScore >= comparison.platformAvgTrust ? 'text-green-600' : 'text-yellow-600'}`}>
                    {Math.round(comparison.orgTrustScore * 100)}%
                  </p>
                  <p className="text-[10px] text-sos-gray-400">Platform: {Math.round(comparison.platformAvgTrust * 100)}%</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Impact Certificate Modal */}
      {showCertificate && communityImpact && (
        <ImpactCertificate
          orgName={data?.orgStats?.[0]?.name || 'Your Organization'}
          disasterName={disasters.find(d => d.id === disasterFilter)?.name || 'All Operations'}
          familiesHelped={communityImpact.familiesHelped}
          avgResponseHrs={communityImpact.avgResponseHrs}
          fulfillmentRate={communityImpact.fulfillmentRate}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </DashboardShell>
  );
}
