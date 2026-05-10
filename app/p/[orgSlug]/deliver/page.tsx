'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Truck, Phone, MapPin, Clock, AlertTriangle } from 'lucide-react';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const PARTNER_KEY = process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '';
const BASE = `${SB_URL}/functions/v1/partner-read`;

type View = 'active' | 'history';

export default function DeliveriesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [view, setView] = useState<View>('active');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const filters: Record<string, any> = {};
    if (view === 'active') filters.active_only = true;
    else filters.status = 'completed';
    fetch(BASE, {
      method: 'POST',
      headers: { 'x-partner-key': PARTNER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_type: 'transport_assignments', filters, limit: 100 }),
    })
      .then(r => r.json())
      .then(d => { setAssignments(d.results || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [view]);

  // Group by convoy
  const convoys = new Map<string, any[]>();
  const standalone: any[] = [];
  assignments.forEach(a => {
    if (a.convoy_id) {
      if (!convoys.has(a.convoy_id)) convoys.set(a.convoy_id, []);
      convoys.get(a.convoy_id)!.push(a);
    } else standalone.push(a);
  });

  const statusColor: Record<string, string> = {
    created: 'bg-gray-500', accepted: 'bg-blue-500', en_route: 'bg-blue-400',
    at_pickup: 'bg-yellow-500', loaded: 'bg-yellow-400', in_transit: 'bg-orange-400',
    arrived: 'bg-green-500', delivered: 'bg-green-400', verified: 'bg-green-600',
    completed: 'bg-green-700', issue: 'bg-red-500',
  };

  const navLink = (lat?: number, lng?: number) =>
    lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;

  const renderCard = (a: any) => (
    <div key={a.id} className="bg-white/5 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-sm">{a.metadata?.resource_summary || a.resources?.description || 'Assignment'}</span>
          {a.metadata?.resource_vin && <span className="text-[10px] text-white/30 ml-2">VIN ...{a.metadata.resource_vin.slice(-5)}</span>}
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${statusColor[a.status] || 'bg-gray-500'}`}>{a.status}</span>
      </div>

      <div className="flex items-center gap-1 text-[10px] text-white/50">
        <MapPin className="h-3 w-3" />
        <span>{a.origin_text}</span>
        <span className="mx-1">→</span>
        <span>{a.destination_text}</span>
      </div>

      {(a.metadata?.driver_name || a.driver?.display_name) && (
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/50">Driver: {a.metadata?.driver_name || a.driver?.display_name}</span>
          {a.metadata?.driver_phone && (
            <a href={`tel:${a.metadata.driver_phone}`} className="flex items-center gap-1 text-blue-400">
              <Phone className="h-3 w-3" /> Call
            </a>
          )}
        </div>
      )}

      {a.last_location_at && (
        <div className="flex items-center gap-1 text-[10px] text-white/30">
          <Clock className="h-3 w-3" />
          Last update: {new Date(a.last_location_at).toLocaleString()}
        </div>
      )}

      {a.issues?.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-red-400">
          <AlertTriangle className="h-3 w-3" /> {a.issues.length} issue(s)
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {navLink(a.destination_lat, a.destination_lng) && (
          <a href={navLink(a.destination_lat, a.destination_lng)!} target="_blank" rel="noopener"
            className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Navigate</a>
        )}
        <a href={`/drive/${a.id}`} target="_blank" rel="noopener"
          className="text-[10px] bg-white/10 text-white/50 px-2 py-1 rounded">Driver Page</a>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#0F1E2B] text-white">
      <div className="flex gap-2 p-3 pb-0">
        {(['active', 'history'] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${view === v ? 'bg-white/10 text-white' : 'text-white/40'}`}>
            {v === 'active' ? `Active (${view === 'active' ? assignments.length : '...'})` : 'History'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 pb-20 space-y-3">
        {loading ? <p className="text-white/30 text-center py-8">Loading...</p> :
         assignments.length === 0 ? <p className="text-white/30 text-center py-8">No {view} deliveries</p> : <>
          {/* Convoys */}
          {[...convoys.entries()].map(([convoyId, members]) => (
            <div key={convoyId} className="bg-white/[0.03] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4 text-orange-400" /> Convoy: {convoyId}
                </span>
                <span className="text-[10px] text-white/40">
                  {members.filter(m => m.status === 'delivered' || m.status === 'completed').length}/{members.length} delivered
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div className="bg-green-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${(members.filter(m => ['delivered','completed','verified'].includes(m.status)).length / members.length) * 100}%` }} />
              </div>
              {members.map(renderCard)}
            </div>
          ))}
          {/* Standalone */}
          {standalone.map(renderCard)}
        </>}
      </div>
    </div>
  );
}
