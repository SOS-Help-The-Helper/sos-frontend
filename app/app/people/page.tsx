'use client';
import { useEffect, useState } from 'react';
import { usePartnerOrg } from '@/lib/partner-context';
import { Search, Filter } from 'lucide-react';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export default function PeoplePage() {
  const { orgId } = usePartnerOrg();
  const [people, setPeople] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'survivors' | 'volunteers'>('all');

  useEffect(() => {
    if (!orgId) return;
    const key = process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '';
    fetch(`${SB_URL}/functions/v1/partner-read`, {
      method: 'POST', headers: { 'x-partner-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_type: 'persons', filters: { org_id: orgId }, limit: 100 }),
    }).then(r => r.json()).then(d => setPeople(d.results || [])).catch(() => {});
  }, [orgId]);

  const filtered = people.filter(p => {
    if (filter === 'survivors' && p.role !== 'survivor') return false;
    if (filter === 'volunteers' && p.role !== 'volunteer') return false;
    if (search && !`${p.full_name} ${p.email} ${p.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="pt-20 pb-20 px-4 bg-[#0F1E2B] min-h-screen">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people..." className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30" />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {(['all', 'survivors', 'volunteers'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium ${filter === f ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'}`}>{f}</button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">{p.full_name || 'Unknown'}</p>
              <p className="text-xs text-white/40">{p.role} · {p.phone || p.email || 'No contact'}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.role === 'volunteer' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>{p.role}</span>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-white/20 text-sm text-center py-8">No people found</p>}
      </div>
    </div>
  );
}
