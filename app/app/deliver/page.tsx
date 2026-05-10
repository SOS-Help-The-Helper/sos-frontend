'use client';
import { useEffect, useState } from 'react';
import { usePartnerOrg } from '@/lib/partner-context';
import { Truck, CheckCircle2, Clock } from 'lucide-react';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export default function DeliverPage() {
  const { orgId } = usePartnerOrg();
  const [transports, setTransports] = useState<any[]>([]);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  useEffect(() => {
    if (!orgId) return;
    const key = process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '';
    fetch(`${SB_URL}/functions/v1/partner-read`, {
      method: 'POST', headers: { 'x-partner-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_type: 'transport_assignments', filters: { org_id: orgId }, limit: 100 }),
    }).then(r => r.json()).then(d => setTransports(d.results || [])).catch(() => {});
  }, [orgId]);

  const active = transports.filter(t => !['delivered', 'cancelled'].includes(t.status));
  const history = transports.filter(t => ['delivered', 'cancelled'].includes(t.status));
  const shown = tab === 'active' ? active : history;

  return (
    <div className="pt-20 pb-20 px-4 bg-[#0F1E2B] min-h-screen">
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('active')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${tab === 'active' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40'}`}><Truck className="h-3.5 w-3.5" />Active ({active.length})</button>
        <button onClick={() => setTab('history')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${tab === 'history' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40'}`}><CheckCircle2 className="h-3.5 w-3.5" />History ({history.length})</button>
      </div>
      <div className="space-y-2">
        {shown.map(t => (
          <div key={t.id} className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-white font-medium">{t.resource_description || 'Transport'}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.status === 'in_transit' ? 'bg-blue-500/20 text-blue-400' : t.status === 'delivered' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>{t.status?.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-xs text-white/40">{t.origin} → {t.destination}</p>
            {t.driver_name && <p className="text-[10px] text-white/30 mt-1">Driver: {t.driver_name}</p>}
            {t.status === 'in_transit' && (
              <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${t.progress || 50}%` }} />
              </div>
            )}
          </div>
        ))}
        {shown.length === 0 && <p className="text-white/20 text-sm text-center py-8">No {tab} deliveries</p>}
      </div>
    </div>
  );
}
