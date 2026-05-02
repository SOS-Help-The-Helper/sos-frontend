'use client';
import { db } from '@/lib/api';

import { useState, useEffect } from 'react';
import { GovShell } from '@/components/gov-shell';
// TODO: rewire to lib/api.ts (Phase 3-5) — import { getGapAnalysis, type GapAnalysis } from '@/lib/gov-queries';

const SEVERITY_BADGES: Record<string, string> = {
  critical: 'bg-sos-red-500/20 text-sos-red-500 border border-sos-red-500/30',
  urgent: 'bg-yellow-500/20 text-yellow-700 border border-yellow-500/30',
  standard: 'bg-sos-accent-400/20 text-sos-accent-800 border border-sos-accent-400/30',
  can_wait: 'bg-sos-gray-200 text-sos-gray-600 border border-sos-gray-300',
};

const CATEGORY_ICONS: Record<string, string> = {
  shelter: '🏠', food: '🍽️', medical: '🏥', transportation: '🚗',
  utilities: '⚡', flood: '🌊', other: '📋',
};

export default function GapAnalysisPage() {
  const [gaps, setGaps] = useState<GapAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [disasters, setDisasters] = useState<any[]>([]);
  const [disasterFilter, setDisasterFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    db.from('disasters').select('id, name, status').then(({ data }) => setDisasters(data || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    getGapAnalysis(disasterFilter !== 'all' ? disasterFilter : undefined).then(data => {
      setGaps(data);
      setLoading(false);
    });
  }, [disasterFilter]);

  const filtered = gaps.filter(g => categoryFilter === 'all' || g.category === categoryFilter);
  const totalUnmet = filtered.reduce((s, g) => s + g.unmet_count, 0);
  const criticalCount = filtered.filter(g => g.severity === 'critical').reduce((s, g) => s + g.unmet_count, 0);
  const zones = [...new Set(filtered.map(g => g.zone))];
  const categories = [...new Set(gaps.map(g => g.category))];

  return (
    <GovShell title="Gap Analysis" subtitle="Unmet needs by zone, category, and severity — aggregated">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={disasterFilter} onChange={e => setDisasterFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-sos-gray-300 bg-white text-sos-blue-800 font-medium">
          <option value="all">All Disasters</option>
          {disasters.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-sos-gray-300 bg-white text-sos-blue-800 font-medium">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-sos-gray-300 p-4 text-center">
          <p className="text-2xl font-bold text-sos-red-500">{totalUnmet}</p>
          <p className="text-[10px] text-sos-gray-600 uppercase tracking-wider">Total Unmet</p>
        </div>
        <div className="bg-white rounded-xl border border-sos-gray-300 p-4 text-center">
          <p className="text-2xl font-bold text-sos-red-600">{criticalCount}</p>
          <p className="text-[10px] text-sos-gray-600 uppercase tracking-wider">Critical</p>
        </div>
        <div className="bg-white rounded-xl border border-sos-gray-300 p-4 text-center">
          <p className="text-2xl font-bold text-sos-blue-800">{zones.length}</p>
          <p className="text-[10px] text-sos-gray-600 uppercase tracking-wider">Zones Affected</p>
        </div>
        <div className="bg-white rounded-xl border border-sos-gray-300 p-4 text-center">
          <p className="text-2xl font-bold text-sos-blue-800">{categories.length}</p>
          <p className="text-[10px] text-sos-gray-600 uppercase tracking-wider">Categories</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-sos-gray-300">
          <span className="text-3xl">✓</span>
          <h3 className="text-base font-bold text-sos-blue-800 mt-2">No Unmet Needs</h3>
          <p className="text-sm text-sos-gray-600">All current requests are matched or in progress.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((gap, i) => (
            <div key={i} className="bg-white rounded-xl border border-sos-gray-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CATEGORY_ICONS[gap.category] || '📋'}</span>
                  <div>
                    <span className="text-sm font-bold text-sos-blue-800 capitalize">{gap.category.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-sos-gray-500 ml-2">in {gap.zone}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-sos-red-500">{gap.unmet_count}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_BADGES[gap.severity] || SEVERITY_BADGES.standard}`}>
                    {gap.severity}
                  </span>
                </div>
              </div>

              {gap.nearest_partner && (
                <div className="flex items-center gap-2 text-xs text-sos-gray-600 mb-2">
                  <span>📍 Nearest partner:</span>
                  <span className="font-medium text-sos-blue-800">{gap.nearest_partner}</span>
                  {gap.nearest_partner_type && <span className="text-sos-gray-400">({gap.nearest_partner_type.replace(/_/g, ' ')})</span>}
                </div>
              )}

              <div className="bg-sos-accent-50 border border-sos-accent-200 rounded-lg p-2.5 mt-2">
                <p className="text-xs text-sos-blue-800">{gap.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-sos-gray-400 mt-4 text-center">
        All data aggregated by zone. No personally identifiable information. Recommendations are system-generated.
      </p>
    </GovShell>
  );
}
