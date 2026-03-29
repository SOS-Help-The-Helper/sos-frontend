'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';

interface CapacityEditorProps {
  resource: {
    id: string;
    category: string;
    status: string;
    capacity_available: number | null;
    capacity_total?: number | null;
    details_sanitized?: string;
    org_id?: string;
  };
  onClose: () => void;
  onSaved: (updated: any) => void;
}

const STATUS_OPTIONS = [
  { id: 'available', label: 'Available', icon: '🟢', desc: 'Ready to accept matches' },
  { id: 'limited', label: 'Limited', icon: '🟡', desc: 'Reduced capacity, still accepting' },
  { id: 'at_capacity', label: 'At Capacity', icon: '🔴', desc: 'Cannot accept new matches' },
  { id: 'paused', label: 'Paused', icon: '⏸️', desc: 'Temporarily unavailable' },
];

export function CapacityEditor({ resource, onClose, onSaved }: CapacityEditorProps) {
  const [status, setStatus] = useState(resource.status || 'available');
  const [total, setTotal] = useState(resource.capacity_total ?? 0);
  const [available, setAvailable] = useState(resource.capacity_available ?? 0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);

    // Update resource
    const { error: resError } = await supabase
      .from('resources')
      .update({
        status,
        capacity_available: available,
        capacity_total: total,
      })
      .eq('id', resource.id);

    if (resError) { setSaving(false); return; }

    // Audit trail: insert capacity_log
    await supabase.from('capacity_log').insert({
      org_id: resource.org_id,
      resource_id: resource.id,
      category: resource.category,
      status,
      capacity_total: total,
      capacity_available: available,
      notes: notes || null,
    });

    onSaved({ ...resource, status, capacity_available: available, capacity_total: total });
    setSaving(false);
    onClose();
  }

  const utilization = total > 0 ? Math.round(((total - available) / total) * 100) : 0;
  const barColor = available / (total || 1) > 0.5 ? 'bg-green-500' : available / (total || 1) > 0.2 ? 'bg-yellow-500' : 'bg-sos-red-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-xl shadow-xl border border-sos-gray-300 p-6 w-96 max-w-[90vw]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-sos-blue-800">Edit Capacity</h3>
          <button onClick={onClose} className="text-sos-gray-400 hover:text-sos-gray-600">✕</button>
        </div>

        <p className="text-xs text-sos-gray-500 mb-4 capitalize">{resource.category?.replace(/_/g, ' ')} — {resource.details_sanitized || 'Resource'}</p>

        {/* Status */}
        <div className="mb-4">
          <label className="text-xs font-medium text-sos-gray-600 mb-2 block">Status</label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setStatus(opt.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-colors ${
                  status === opt.id ? 'border-sos-blue-800 bg-sos-blue-50' : 'border-sos-gray-300 hover:border-sos-gray-400'
                }`}
              >
                <span className="text-lg">{opt.icon}</span>
                <div>
                  <p className="text-xs font-bold text-sos-blue-800">{opt.label}</p>
                  <p className="text-[10px] text-sos-gray-500">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Capacity numbers */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-sos-gray-600">Total Capacity</label>
            <input
              type="number"
              inputMode="numeric"
              value={total}
              onChange={e => { const v = parseInt(e.target.value) || 0; setTotal(v); if (available > v) setAvailable(v); }}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-sos-gray-300 text-lg font-bold text-center text-sos-blue-800 focus:outline-none focus:border-sos-accent-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-sos-gray-600">Available Now</label>
            <input
              type="number"
              inputMode="numeric"
              value={available}
              onChange={e => setAvailable(Math.min(parseInt(e.target.value) || 0, total))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-sos-gray-300 text-lg font-bold text-center text-sos-blue-800 focus:outline-none focus:border-sos-accent-400"
            />
          </div>
        </div>

        {/* Capacity bar preview */}
        {total > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-[10px] text-sos-gray-500 mb-1">
              <span>{utilization}% utilized</span>
              <span>{available} of {total} available</span>
            </div>
            <div className="h-3 bg-sos-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${100 - (available / total) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-4">
          <label className="text-xs font-medium text-sos-gray-600">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. 2 units in maintenance"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-sos-gray-300 text-sm font-semibold text-sos-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-sos-blue-800 text-white text-sm font-semibold disabled:opacity-40">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
