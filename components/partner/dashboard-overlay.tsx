'use client';
import { useEffect, useState } from 'react';
import { Home, Truck, Package, Clock } from 'lucide-react';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const BASE = `${SB_URL}/functions/v1`;

interface DashboardOverlayProps {
  visible: boolean;
}

export function DashboardOverlay({ visible }: DashboardOverlayProps) {
  const [stats, setStats] = useState({ deployed: 0, inTransit: 0, available: 0, avgHours: 0 });

  const efPost = (fn: string, body: Record<string, unknown>) =>
    fetch(`${BASE}/${fn}`, { method: 'POST', headers: { 'Authorization': `Bearer ${SB_ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

  useEffect(() => {
    if (!visible) return;
    Promise.all([
      efPost('inventory-query', { query_type: 'org_inventory_summary', filters: { status: 'deployed' } }),
      efPost('crm-delivery', { action: 'list', status: 'in_transit', limit: 500 }),
      efPost('inventory-query', { query_type: 'org_inventory_summary', filters: { status: 'active' } }),
    ]).then(([deployed, transport, available]) => {
      const deliveries = transport.deliveries || transport.results || [];
      const active = deliveries.filter((t: any) => !['completed','cancelled','confirmed'].includes(t.status));
      setStats({
        deployed: deployed.total || deployed.count || 0,
        inTransit: active.length,
        available: available.total || available.count || 0,
        avgHours: 0,
      });
    });
  }, [visible]);

  if (!visible) return null;

  const cards = [
    { label: 'Deployed', value: stats.deployed, icon: Home, color: 'text-green-400' },
    { label: 'In Transit', value: stats.inTransit, icon: Truck, color: 'text-yellow-400' },
    { label: 'Available', value: stats.available, icon: Package, color: 'text-blue-400' },
    { label: 'Avg Delivery', value: stats.avgHours ? `${stats.avgHours}h` : '—', icon: Clock, color: 'text-white/50' },
  ];

  return (
    <div className="absolute top-16 left-3 right-3 z-20 grid grid-cols-2 gap-2">
      {cards.map(c => (
        <div key={c.label} className="bg-[#0F1E2B]/90 backdrop-blur rounded-lg p-3 flex items-center gap-3">
          <c.icon className={`h-5 w-5 ${c.color}`} />
          <div>
            <p className="text-lg font-bold text-white">{c.value}</p>
            <p className="text-[10px] text-white/40">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
