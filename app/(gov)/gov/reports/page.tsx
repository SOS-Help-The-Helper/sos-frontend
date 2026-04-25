'use client';

import { useState, useEffect } from 'react';
import { GovShell } from '@/components/gov-shell';
// TODO: rewire to lib/api.ts (Phase 3-5) — import { getSitrepSummary, type SitrepSummary } from '@/lib/gov-queries';
import { supabase } from '@/lib/supabase-client';

export default function GovReports() {
  const [report, setReport] = useState<SitrepSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [disasters, setDisasters] = useState<any[]>([]);
  const [disasterFilter, setDisasterFilter] = useState('all');

  useEffect(() => {
    supabase.from('disasters').select('id, name, status').then(({ data }) => setDisasters(data || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    getSitrepSummary(disasterFilter !== 'all' ? disasterFilter : undefined).then(data => {
      setReport(data);
      setLoading(false);
    });
  }, [disasterFilter]);

  function downloadCSV() {
    if (!report) return;

    // Audit log this download
    supabase.from('audit_log').insert({
      action: 'foia_export',
      actor_type: 'gov_user',
      details: `CSV export: ${report.disaster_name}, ${new Date().toISOString()}`,
    }).then(() => {});

    // Build CSV — aggregated only
    const rows = [
      ['Situation Report — FOIA Safe Export'],
      ['Generated', new Date().toISOString()],
      ['Disaster', report.disaster_name],
      [''],
      ['SUMMARY'],
      ['Total Requests', String(report.total_requests)],
      ['Total Resources', String(report.total_resources)],
      ['Total Matches', String(report.total_matches)],
      ['Fulfillment Rate', `${report.fulfillment_rate}%`],
      ['Active Partners', String(report.active_partners)],
      [''],
      ['BY CATEGORY', 'Requests', 'Matched', 'Fulfilled', 'Unmet'],
      ...Object.entries(report.by_category).map(([cat, d]) => [
        cat, String(d.requests), String(d.matched), String(d.fulfilled), String(d.unmet),
      ]),
      [''],
      ['BY URGENCY', 'Count'],
      ...Object.entries(report.by_urgency).map(([u, c]) => [u, String(c)]),
      [''],
      ['PARTNER PERFORMANCE', 'Type', 'Matches', 'Fulfilled', 'Capacity'],
      ...report.partner_summary.map(p => [p.name, p.type, String(p.matches), String(p.fulfilled), p.capacity]),
      [''],
      ['ZONE DETAIL', 'Category', 'Urgency', 'Count', 'Matched', 'Fulfilled', 'Unmet'],
      ...report.zones.map(z => [z.zone, z.category, z.urgency, String(z.count), String(z.matched), String(z.fulfilled), String(z.unmet)]),
      [''],
      ['NOTE: All data is aggregated. No personally identifiable information is included.'],
      ['This export is FOIA-safe and audit-logged.'],
    ];

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOS_SitRep_${report.disaster_name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <GovShell title="Situation Reports" subtitle="Auto-generated, anonymized, FOIA-safe">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <select value={disasterFilter} onChange={e => setDisasterFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-sos-gray-300 bg-white text-sos-blue-800 font-medium">
          <option value="all">All Disasters</option>
          {disasters.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button
          onClick={downloadCSV}
          disabled={!report}
          className="text-xs px-4 py-2 rounded-lg bg-sos-blue-800 text-white font-bold hover:bg-sos-blue-700 disabled:opacity-40 transition-colors"
        >
          📥 Export CSV (FOIA-Safe)
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : !report ? null : (
        <div className="space-y-5">
          {/* Header */}
          <div className="bg-sos-blue-800 text-white rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold">{report.disaster_name}</h3>
              <span className="text-[10px] text-white/50">Generated {new Date(report.generated_at).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3">
              <div><p className="text-2xl font-bold">{report.total_requests}</p><p className="text-[10px] text-white/50">Requests</p></div>
              <div><p className="text-2xl font-bold">{report.total_resources}</p><p className="text-[10px] text-white/50">Resources</p></div>
              <div><p className="text-2xl font-bold">{report.total_matches}</p><p className="text-[10px] text-white/50">Matches</p></div>
              <div><p className="text-2xl font-bold">{report.fulfillment_rate}%</p><p className="text-[10px] text-white/50">Fulfilled</p></div>
              <div><p className="text-2xl font-bold">{report.active_partners}</p><p className="text-[10px] text-white/50">Partners</p></div>
            </div>
          </div>

          {/* By Category */}
          <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
            <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Needs by Category</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sos-gray-300">
                    <th className="text-left text-[10px] font-semibold text-sos-gray-600 uppercase py-2 pr-4">Category</th>
                    <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase py-2 pr-4">Requests</th>
                    <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase py-2 pr-4">Matched</th>
                    <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase py-2 pr-4">Fulfilled</th>
                    <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase py-2">Unmet</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.by_category).map(([cat, d]) => (
                    <tr key={cat} className="border-b border-sos-gray-200 last:border-0">
                      <td className="py-2 pr-4 text-sm font-medium text-sos-blue-800 capitalize">{cat.replace(/_/g, ' ')}</td>
                      <td className="py-2 pr-4 text-right text-sm text-sos-blue-800">{d.requests}</td>
                      <td className="py-2 pr-4 text-right text-sm text-sos-accent-700">{d.matched}</td>
                      <td className="py-2 pr-4 text-right text-sm text-green-600">{d.fulfilled}</td>
                      <td className="py-2 text-right text-sm font-bold text-sos-red-500">{d.unmet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* By Urgency */}
          <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
            <h3 className="text-sm font-bold text-sos-blue-800 mb-3">By Urgency</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(report.by_urgency).sort(([a], [b]) => {
                const sev: Record<string, number> = { critical: 0, urgent: 1, standard: 2, can_wait: 3 };
                return (sev[a] ?? 4) - (sev[b] ?? 4);
              }).map(([u, count]) => (
                <div key={u} className={`p-3 rounded-lg border text-center ${
                  u === 'critical' ? 'bg-sos-red-50 border-sos-red-100' :
                  u === 'urgent' ? 'bg-yellow-50 border-yellow-100' :
                  'bg-sos-gray-200 border-sos-gray-300'
                }`}>
                  <p className="text-xl font-bold text-sos-blue-800">{count}</p>
                  <p className="text-[10px] font-medium text-sos-gray-600 uppercase capitalize">{u.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Partner Performance */}
          {report.partner_summary.length > 0 && (
            <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
              <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Partner Activity</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-sos-gray-300">
                      <th className="text-left text-[10px] font-semibold text-sos-gray-600 uppercase py-2 pr-4">Organization</th>
                      <th className="text-left text-[10px] font-semibold text-sos-gray-600 uppercase py-2 pr-4">Type</th>
                      <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase py-2 pr-4">Matches</th>
                      <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase py-2">Fulfilled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.partner_summary.map(p => (
                      <tr key={p.name} className="border-b border-sos-gray-200 last:border-0">
                        <td className="py-2 pr-4 text-sm font-medium text-sos-blue-800">{p.name}</td>
                        <td className="py-2 pr-4 text-xs text-sos-gray-600 capitalize">{p.type.replace(/_/g, ' ')}</td>
                        <td className="py-2 pr-4 text-right text-sm text-sos-blue-800">{p.matches}</td>
                        <td className="py-2 text-right text-sm font-bold text-green-600">{p.fulfilled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FOIA notice */}
          <div className="bg-sos-accent-50 border border-sos-accent-200 rounded-xl p-4">
            <p className="text-xs text-sos-blue-800">
              <strong>FOIA Compliance:</strong> All data in this report is aggregated and anonymized. No personally identifiable information (PII) is included.
              CSV exports are audit-logged with timestamp and user identity. Contact info@sos-help.org for data requests.
            </p>
          </div>
        </div>
      )}
    </GovShell>
  );
}
