'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FleetEditResource {
  id: string;
  description?: string;
  passenger_capacity?: number;
  vehicle_type?: string;
  location_text?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

interface FleetEditModalProps {
  resource: FleetEditResource;
  onClose: () => void;
  onSave: (updated: Record<string, unknown>) => void;
}

const VEHICLE_TYPES = [
  { value: '5th_wheel', label: '5th Wheel' },
  { value: 'travel_trailer', label: 'Travel Trailer' },
  { value: 'motorhome', label: 'Motorhome' },
  { value: 'toy_hauler', label: 'Toy Hauler' },
];

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'matched', label: 'Matched' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'sold', label: 'Sold' },
  { value: 'in_transit', label: 'In Transit' },
];

const HITCH_TYPES = [
  { value: 'bumper_pull', label: 'Bumper Pull' },
  { value: '5th_wheel', label: '5th Wheel' },
  { value: 'gooseneck', label: 'Gooseneck' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FleetEditModal({ resource, onClose, onSave }: FleetEditModalProps) {
  const meta = (resource.metadata || {}) as Record<string, unknown>;

  // Top-level fields
  const [description, setDescription] = useState(resource.description ?? '');
  const [passengerCapacity, setPassengerCapacity] = useState<number | ''>(
    resource.passenger_capacity ?? '',
  );
  const [vehicleType, setVehicleType] = useState(resource.vehicle_type ?? '');
  const [locationText, setLocationText] = useState(resource.location_text ?? '');
  const [status, setStatus] = useState(resource.status ?? 'available');

  // Metadata fields
  const [vin, setVin] = useState((meta.vin as string) ?? '');
  const [condition, setCondition] = useState((meta.condition as string) ?? '');
  const [hitchType, setHitchType] = useState((meta.hitch_type as string) ?? '');
  const [specDryWeightLbs, setSpecDryWeightLbs] = useState<number | ''>(
    (meta.spec_dry_weight_lbs as number) ?? '',
  );
  const [interiorContents, setInteriorContents] = useState(
    (meta.interior_contents as string) ?? '',
  );
  const [repairsNeeded, setRepairsNeeded] = useState(
    (meta.repairs_needed as string) ?? '',
  );
  const [deliveryMethod, setDeliveryMethod] = useState(
    (meta.delivery_method as string) ?? '',
  );
  const [costToOcala, setCostToOcala] = useState(
    (meta.cost_to_ocala as string) ?? '',
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      // 1. PATCH top-level fields
      const topLevel = {
        description,
        passenger_capacity: passengerCapacity === '' ? null : passengerCapacity,
        vehicle_type: vehicleType || null,
        location_text: locationText || null,
        status,
      };

      const { error: topErr } = await supabase
        .from('resources')
        .update(topLevel)
        .eq('id', resource.id);

      if (topErr) throw topErr;

      // 2. PATCH metadata — read current, merge changed fields
      const { data: current, error: readErr } = await supabase
        .from('resources')
        .select('metadata')
        .eq('id', resource.id)
        .single();

      if (readErr) throw readErr;

      const currentMeta = (current?.metadata ?? {}) as Record<string, unknown>;
      const mergedMeta = {
        ...currentMeta,
        vin: vin || undefined,
        condition: condition || undefined,
        hitch_type: hitchType || undefined,
        spec_dry_weight_lbs: specDryWeightLbs === '' ? undefined : specDryWeightLbs,
        interior_contents: interiorContents || undefined,
        repairs_needed: repairsNeeded || undefined,
        delivery_method: deliveryMethod || undefined,
        cost_to_ocala: costToOcala || undefined,
      };

      const { error: metaErr } = await supabase
        .from('resources')
        .update({ metadata: mergedMeta })
        .eq('id', resource.id);

      if (metaErr) throw metaErr;

      // 3. Call onSave with updated data
      onSave({
        ...resource,
        ...topLevel,
        metadata: mergedMeta,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [
    resource, description, passengerCapacity, vehicleType, locationText, status,
    vin, condition, hitchType, specDryWeightLbs, interiorContents,
    repairsNeeded, deliveryMethod, costToOcala, onSave,
  ]);

  /* ---- Shared input styles ---- */
  const inputCls =
    'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8 md:pt-16">
        <div
          className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-gray-100">Edit Resource</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-5 py-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Description — full width */}
              <div className="md:col-span-2">
                <label className={labelCls}>Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 2020 Keystone Cougar 5th Wheel"
                />
              </div>

              {/* Passenger Capacity */}
              <div>
                <label className={labelCls}>Passenger Capacity</label>
                <input
                  type="number"
                  value={passengerCapacity}
                  onChange={e =>
                    setPassengerCapacity(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={inputCls}
                  min={0}
                />
              </div>

              {/* Vehicle Type */}
              <div>
                <label className={labelCls}>Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={e => setVehicleType(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select...</option>
                  {VEHICLE_TYPES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className={labelCls}>Location</label>
                <input
                  type="text"
                  value={locationText}
                  onChange={e => setLocationText(e.target.value)}
                  className={inputCls}
                  placeholder="City, State"
                />
              </div>

              {/* Status */}
              <div>
                <label className={labelCls}>Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className={inputCls}
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* ---- Metadata Fields ---- */}
              <div className="md:col-span-2 border-t border-gray-700 pt-4 mt-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  Metadata
                </h3>
              </div>

              {/* VIN */}
              <div>
                <label className={labelCls}>VIN</label>
                <input
                  type="text"
                  value={vin}
                  onChange={e => setVin(e.target.value)}
                  className={inputCls}
                  placeholder="Vehicle Identification Number"
                />
              </div>

              {/* Hitch Type */}
              <div>
                <label className={labelCls}>Hitch Type</label>
                <select
                  value={hitchType}
                  onChange={e => setHitchType(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select...</option>
                  {HITCH_TYPES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Dry Weight */}
              <div>
                <label className={labelCls}>Dry Weight (lbs)</label>
                <input
                  type="number"
                  value={specDryWeightLbs}
                  onChange={e =>
                    setSpecDryWeightLbs(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={inputCls}
                  min={0}
                />
              </div>

              {/* Delivery Method */}
              <div>
                <label className={labelCls}>Delivery Method</label>
                <input
                  type="text"
                  value={deliveryMethod}
                  onChange={e => setDeliveryMethod(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Cost to Ocala */}
              <div>
                <label className={labelCls}>Cost to Ocala</label>
                <input
                  type="text"
                  value={costToOcala}
                  onChange={e => setCostToOcala(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. $500"
                />
              </div>

              {/* Condition — full width textarea */}
              <div className="md:col-span-2">
                <label className={labelCls}>Condition</label>
                <textarea
                  value={condition}
                  onChange={e => setCondition(e.target.value)}
                  rows={2}
                  className={inputCls}
                  placeholder="Overall condition notes"
                />
              </div>

              {/* Interior Contents — full width textarea */}
              <div className="md:col-span-2">
                <label className={labelCls}>Interior Contents</label>
                <textarea
                  value={interiorContents}
                  onChange={e => setInteriorContents(e.target.value)}
                  rows={2}
                  className={inputCls}
                  placeholder="Items included with the unit"
                />
              </div>

              {/* Repairs Needed — full width textarea */}
              <div className="md:col-span-2">
                <label className={labelCls}>Repairs Needed</label>
                <textarea
                  value={repairsNeeded}
                  onChange={e => setRepairsNeeded(e.target.value)}
                  rows={2}
                  className={inputCls}
                  placeholder="Known repairs or issues"
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 border border-gray-600 hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
