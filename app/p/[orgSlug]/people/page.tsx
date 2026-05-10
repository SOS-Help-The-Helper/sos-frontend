'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Users, Search } from 'lucide-react';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const PARTNER_KEY = process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '';
const BASE = `${SB_URL}/functions/v1/partner-read`;

type View = 'survivors' | 'volunteers';

export default function PeoplePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [view, setView] = useState<View>('survivors');
  const [data, setData] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const queryType = view === 'survivors' ? 'request_summary' : 'resource_summary';
    const filters: Record<string, any> = {};
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (urgencyFilter !== 'all' && view === 'survivors') filters.urgency = urgencyFilter;

    fetch(BASE, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SB_URL.includes('supabase') ? '' : ''}`, 'x-partner-key': PARTNER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_type: queryType, filters, limit: 200 }),
    })
      .then(r => r.json())
      .then(d => { setData(d.results || d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [view, statusFilter, urgencyFilter]);

  const filtered = data.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (r.display_name || r.description || '').toLowerCase().includes(s) ||
           (r.taxonomy_code || '').toLowerCase().includes(s) ||
           (r.location_text || '').toLowerCase().includes(s);
  });

  const urgencyColor: Record<string, string> = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-green-500' };

  return (
    <div className="flex flex-col h-full bg-[#0F1E2B] text-white">
      {/* Toggle */}
      <div className="flex gap-2 p-3 pb-0">
        {(['survivors', 'volunteers'] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${view === v ? 'bg-white/10 text-white' : 'text-white/40'}`}>
            {v === 'survivors' ? 'Survivors' : 'Volunteers'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 p-3 text-xs">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white/70">
          {['all','active','matched','fulfilled','paused','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {view === 'survivors' && (
          <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white/70">
            {['all','critical','high','medium','low'].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        )}
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="w-full bg-white/5 border border-white/10 rounded pl-7 pr-2 py-1.5 text-white/70 placeholder:text-white/30 text-xs" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-20 space-y-2">
        {loading ? <p className="text-white/30 text-center py-8">Loading...</p> :
         filtered.length === 0 ? <p className="text-white/30 text-center py-8">No results</p> :
         filtered.map((r, i) => (
          <div key={r.id || i} className="bg-white/5 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{r.display_name || r.description || 'Anonymous'}</span>
              {r.urgency && <span className={`text-[10px] px-1.5 py-0.5 rounded ${urgencyColor[r.urgency] || 'bg-gray-500'} text-white`}>{r.urgency}</span>}
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              {r.taxonomy_code && <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">{r.taxonomy_code}</span>}
              {r.status && <span className="bg-white/10 text-white/50 px-1.5 py-0.5 rounded">{r.status}</span>}
              {r.partner_status && <span className="bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded">{r.partner_status}</span>}
            </div>
            {r.location_text && <p className="text-[10px] text-white/30">{r.location_text}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
