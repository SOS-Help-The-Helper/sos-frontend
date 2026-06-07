'use client';
import { useEffect, useState } from 'react';
import { Bell, ArrowRight, Truck, Package, AlertTriangle, UserCheck } from 'lucide-react';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface NotificationFeedProps {
  open: boolean;
  onClose: () => void;
}

const ICONS: Record<string, any> = {
  status_changed: Package,
  location_moved: Truck,
  transport_verified: UserCheck,
  ops_status_changed: ArrowRight,
};

export function NotificationFeed({ open, onClose }: NotificationFeedProps) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch(`${SB_URL}/functions/v1/inventory-query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SB_ANON}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_type: 'transaction_history', limit: 20 }),
    })
      .then(r => r.json())
      .then(d => setEvents(d.events || d.results || []))
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  return (
    <div className="absolute top-14 right-3 z-50 w-72 bg-[#1A3850] rounded-xl shadow-xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-sm font-medium text-white">Recent Activity</span>
        <button onClick={onClose} className="text-white/30 text-xs">Close</button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-white/30 text-xs text-center py-6">No recent activity</p>
        ) : events.map((e, i) => {
          const Icon = ICONS[e.event_type] || Package;
          return (
            <div key={e.id || i} className="flex items-start gap-2 px-3 py-2 border-b border-white/5">
              <Icon className="h-3.5 w-3.5 text-white/30 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white/70">
                  {(e.event_type ?? '').replace(/_/g, ' ')}: {e.from_status || '?'} → {e.to_status || '?'}
                </p>
                {e.notes && <p className="text-[10px] text-white/30 truncate">{e.notes}</p>}
                <p className="text-[9px] text-white/20">{new Date(e.created_at).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
