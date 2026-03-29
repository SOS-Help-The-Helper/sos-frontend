'use client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { StatCard } from '@/components/stat-card';
import { LineChart, HorizontalBars } from '@/components/charts';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { getRevenueStats, type RevenueStats } from '@/lib/vendor-enhanced-queries';

export default function RevenuePage() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { orgId } = useAuthContext();
  const { effectiveOrgId } = useViewContext();
  const currentOrgId = effectiveOrgId || orgId;

  useEffect(() => {
    if (!currentOrgId) return;
    getRevenueStats(currentOrgId).then(data => {
      setStats(data);
      setLoading(false);
    });
  }, [currentOrgId]);

  return (
    <DashboardShell title="Revenue" subtitle="Financial overview and job metrics">
      {loading || !stats ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Gross Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} accent="blue" />
            <StatCard label="Platform Fees" value={`$${stats.totalFees.toLocaleString()}`} subtitle="10% fee" accent="red" />
            <StatCard label="Net Revenue" value={`$${stats.netRevenue.toLocaleString()}`} accent="accent" />
            <StatCard label="Avg Job Value" value={`$${stats.avgJobValue.toLocaleString()}`} subtitle={`${stats.jobsCompleted} jobs completed`} accent="blue" />
          </div>

          {/* Monthly revenue chart */}
          <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
            <LineChart
              data={stats.monthlyRevenue.map(m => ({ label: m.month, value: m.revenue }))}
              label="Monthly Revenue ($)"
              color="#22C55E"
              height={160}
            />
          </div>

          {/* Revenue breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
              <h3 className="text-sm font-bold text-sos-blue-800 mb-4">💰 Revenue Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-sos-gray-200">
                  <span className="text-xs text-sos-gray-600">Gross Revenue</span>
                  <span className="text-sm font-bold text-sos-blue-800">${stats.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-sos-gray-200">
                  <span className="text-xs text-sos-gray-600">Platform Fees (10%)</span>
                  <span className="text-sm font-medium text-sos-red-500">-${stats.totalFees.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-bold text-sos-blue-800">Net Revenue</span>
                  <span className="text-base font-bold text-green-600">${stats.netRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
              <h3 className="text-sm font-bold text-sos-blue-800 mb-4">📊 Job Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{stats.jobsCompleted}</p>
                  <p className="text-[10px] text-green-600">Completed</p>
                </div>
                <div className="text-center p-3 bg-sos-accent-50 rounded-lg">
                  <p className="text-2xl font-bold text-sos-blue-800">${stats.avgJobValue.toLocaleString()}</p>
                  <p className="text-[10px] text-sos-gray-600">Avg Value</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
