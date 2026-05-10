'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Package, Warehouse, Star } from 'lucide-react';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const PARTNER_KEY = process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '';
const BASE = `${SB_URL}/functions/v1/partner-read`;

type View = 'inventory' | 'facilities';

export default function AssetsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [view, setView] = useState<View>('inventory');
  const [resources, setResources] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [partnerStatusFilter, setPartnerStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const queryType = view === 'inventory' ? 'resource_summary' : 'facility_summary';
    const filters: Record<string, any> = {};
    if (statusFilter !== 'all') filters.status = statusFilter;
    fetch(BASE, {
      method: 'POST',
      headers: { 'x-partner-key': PARTNER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_type: queryType, filters, limit: 500 }),
    })
      .then(r => r.json())
      .then(d => {
        if (view === 'inventory') setResources(d.results || []);
        else setFacilities(d.results || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [view, statusFilter]);

  const filtered = view === 'inventory'
    ? resources.filter(r => {
        if (partnerStatusFilter !== 'all' && r.partner_status !== partnerStatusFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          return (r.description || '').toLowerCase().includes(s) || (r.vin || '').toLowerCase().includes(s) || (r.taxonomy_code || '').toLowerCase().includes(s);
        }
        return true;
      })
    : facilities;

  const statusColor: Record<string, string> = { active: 'text-green-400', deployed: 'text-blue-400', in_transit: 'text-yellow-400', paused: 'text-orange-400', cancelled: 'text-red-400' };

  return (
    <div className="flex flex-col h-full bg-[#0F1E2B] text-white">
      <div className="flex gap-2 p-3 pb-0">
        {(['inventory', 'facilities'] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${view === v ? 'bg-white/10 text-white' : 'text-white/40'}`}>
            {v === 'inventory' ? 'Inventory' : 'Facilities'}
          </button>
        ))}
      </div>

      {view === 'inventory' && (
        <div className="flex gap-2 p-3 text-xs">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white/70">
            {['all','active','deployed','in_transit','paused','cancelled','retired'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={partnerStatusFilter} onChange={e => setPartnerStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white/70">
            {['all','pending','screening','received','available','deployed','sold','cleaning','repair','auction_ready'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="VIN or description..."
            className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white/70 placeholder:text-white/30 text-xs" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-20 space-y-2">
        {loading ? <p className="text-white/30 text-center py-8">Loading...</p> :
         view === 'inventory' ? filtered.map((r, i) => (
          <div key={r.id || i} className="bg-white/5 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{r.description || r.taxonomy_code || 'Resource'}</span>
              <span className={`text-[10px] font-medium ${statusColor[r.status] || 'text-white/40'}`}>{r.status}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              {r.taxonomy_code && <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">{r.taxonomy_code}</span>}
              {r.partner_status && <span className="bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded">{r.partner_status}</span>}
              {r.vin && <span className="text-white/30">VIN: ...{r.vin.slice(-5)}</span>}
              {r.condition_rating && <span className="flex items-center gap-0.5 text-yellow-400"><Star className="h-2.5 w-2.5" />{r.condition_rating}</span>}
            </div>
            {r.location_text && <p className="text-[10px] text-white/30">{r.location_text}</p>}
          </div>
        )) : facilities.map((f, i) => (
          <div key={f.id || i} className="bg-white/5 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-orange-400" />
                <span className="font-medium text-sm">{f.name}</span>
              </div>
              <span className="text-[10px] text-white/40">{f.current_count || 0}{f.capacity ? `/${f.capacity}` : ''} assets</span>
            </div>
            {f.address && <p className="text-[10px] text-white/30">{f.address}</p>}
            {f.contact_name && <p className="text-[10px] text-white/30">Contact: {f.contact_name} {f.contact_phone || ''}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
