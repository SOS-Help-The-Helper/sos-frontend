'use client';
import { useEffect, useState } from 'react';
import { Truck, Star, MapPin, Clock, Wrench, FileText } from 'lucide-react';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface RVDetailProps {
  resource: Record<string, any>;
  onClose: () => void;
}

export function RVDetail({ resource, onClose }: RVDetailProps) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!resource.id) return;
    fetch(`${SB_URL}/functions/v1/inventory-query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SB_ANON}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_type: 'transaction_history', filters: { resource_id: resource.id }, limit: 20 }),
    }).then(r => r.json()).then(d => setEvents(d.events || d.results || [])).catch(() => {});
  }, [resource.id]);

  const r = resource;
  const specs = [
    r.year && `${r.year}`,
    r.make,
    r.model,
    r.length_ft && `${r.length_ft}ft`,
    r.sleeps && `Sleeps ${r.sleeps}`,
    r.hitch_type,
    r.weight_lbs && `${r.weight_lbs} lbs`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1E2B] overflow-y-auto">
      <div className="sticky top-0 z-10 bg-[#0F1E2B] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="font-medium text-white">{r.description || 'RV Detail'}</span>
        <button onClick={onClose} className="text-white/40 text-sm">Close</button>
      </div>

      <div className="p-4 space-y-4">
        {/* Specs */}
        <div className="bg-white/5 rounded-lg p-3 space-y-2">
          <p className="text-xs text-white/40">Specifications</p>
          <p className="text-sm text-white">{specs || 'No specs available'}</p>
          {r.vin && <p className="text-xs text-white/30">VIN: {r.vin}</p>}
          <div className="flex gap-3 text-xs">
            {r.status && <span className="text-green-400">{r.status}</span>}
            {r.ops_status && <span className="text-orange-400">{r.ops_status}</span>}
            {r.condition_rating && <span className="flex items-center gap-1 text-yellow-400"><Star className="h-3 w-3" />{r.condition_rating}</span>}
          </div>
        </div>

        {/* Location */}
        <div className="bg-white/5 rounded-lg p-3 space-y-1">
          <p className="text-xs text-white/40">Location</p>
          <div className="flex items-center gap-2 text-sm text-white"><MapPin className="h-3.5 w-3.5" />{r.location_text || r.current_lot || 'Unknown'}</div>
        </div>

        {/* Condition */}
        {(r.condition_notes || r.repairs_needed || r.known_repairs) && (
          <div className="bg-white/5 rounded-lg p-3 space-y-1">
            <p className="text-xs text-white/40">Condition</p>
            {r.condition_notes && <p className="text-xs text-white/70">{r.condition_notes}</p>}
            {r.repairs_needed && <p className="text-xs text-orange-300"><Wrench className="h-3 w-3 inline mr-1" />{r.repairs_needed}</p>}
            {r.known_repairs && <p className="text-xs text-white/40">{r.known_repairs}</p>}
          </div>
        )}

        {/* Title + Appraisal */}
        {(r.title_status || r.appraisal_value) && (
          <div className="bg-white/5 rounded-lg p-3 space-y-1">
            <p className="text-xs text-white/40">Title & Appraisal</p>
            {r.title_status && <p className="text-xs text-white/70"><FileText className="h-3 w-3 inline mr-1" />Title: {r.title_status}</p>}
            {r.appraisal_value && <p className="text-xs text-white/70">Appraised: ${r.appraisal_value}</p>}
            {r.needs_appraisal && <p className="text-xs text-yellow-300">Needs appraisal</p>}
          </div>
        )}

        {/* Staff notes */}
        {r.staff_notes && (
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40">Staff Notes</p>
            <p className="text-xs text-white/70">{r.staff_notes}</p>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-1">
          <p className="text-xs text-white/40 px-1">Asset Timeline</p>
          {events.length === 0 ? <p className="text-xs text-white/20 px-1">No events recorded</p> :
            events.map((e, i) => (
              <div key={e.id || i} className="flex items-start gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[11px] text-white/60">{(e.event_type ?? '').replace(/_/g, ' ')}{e.from_status ? `: ${e.from_status} → ${e.to_status}` : ''}</p>
                  {e.notes && <p className="text-[10px] text-white/30">{e.notes}</p>}
                  <p className="text-[9px] text-white/15">{new Date(e.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
