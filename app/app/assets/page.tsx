'use client';
import { useEffect, useState } from 'react';
import { usePartnerOrg } from '@/lib/partner-context';
import { Package, Building2 } from 'lucide-react';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export default function AssetsPage() {
  const { orgId, orgSlug } = usePartnerOrg();
  const [resources, setResources] = useState<any[]>([]);
  const [tab, setTab] = useState<'inventory' | 'facilities'>('inventory');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!orgId) return;
    const key = process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '';
    fetch(`${SB_URL}/functions/v1/partner-read`, {
      method: 'POST', headers: { 'x-partner-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_type: 'resources', filters: { org_id: orgId }, limit: 200 }),
    }).then(r => r.json()).then(d => setResources(d.results || [])).catch(() => {});
  }, [orgId]);

  const statuses = ['all', ...new Set(resources.map(r => r.partner_status || r.status).filter(Boolean))];
  const filtered = statusFilter === 'all' ? resources : resources.filter(r => (r.partner_status || r.status) === statusFilter);

  return (
    <div className="pt-20 pb-20 px-4 bg-[#0F1E2B] min-h-screen">
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('inventory')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${tab === 'inventory' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40'}`}><Package className="h-3.5 w-3.5" />Inventory</button>
        <button onClick={() => setTab('facilities')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${tab === 'facilities' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40'}`}><Building2 className="h-3.5 w-3.5" />Facilities</button>
      </div>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1 rounded-full text-[10px] whitespace-nowrap ${statusFilter === s ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'}`}>{s}</button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.id} className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-white font-medium">{r.description || r.resource_type || 'Resource'}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">{r.partner_status || r.status}</span>
            </div>
            <p className="text-xs text-white/40">{r.location_text || 'Location unknown'}</p>
            {r.vin && <p className="text-[10px] text-white/20 mt-1">VIN: {r.vin}</p>}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-white/20 text-sm text-center py-8">No assets found</p>}
      </div>
    </div>
  );
}
