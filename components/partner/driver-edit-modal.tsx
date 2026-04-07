'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DriverEditModalProps {
  resource: any;
  onClose: () => void;
  onSave: (updated: Record<string, unknown>) => void;
}

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'assigned', label: 'Assigned' },
];

const HITCH_TYPES = [
  { value: 'bumper_pull', label: 'Bumper Pull' },
  { value: '5th_wheel', label: '5th Wheel' },
  { value: 'gooseneck', label: 'Gooseneck' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DriverEditModal({ resource, onClose, onSave }: DriverEditModalProps) {
  const meta = (resource.metadata || {}) as Record<string, unknown>;

  // Top-level fields
  const [description, setDescription] = useState(resource.description ?? '');
  const [locationText, setLocationText] = useState(
    resource.location_text ?? resource.location ?? '',
  );
  const [status, setStatus] = useState(resource.status ?? 'available');

  // Metadata fields (read from metadata first, fall back to flat resource fields)
  const [towVehicle, setTowVehicle] = useState(
    (meta.tow_vehicle as string) ?? resource.tow_vehicle ?? '',
  );
  const [towRating, setTowRating] = useState(
    (meta.tow_rating as string) ?? resource.tow_rating ?? '',
  );
  const [hitchType, setHitchType] = useState(
    (meta.hitch_type as string) ?? resource.hitch_type ?? '',
  );
  const [availability, setAvailability] = useState(
    (meta.availability as string) ?? resource.availability ?? '',
  );
  const [travelRange, setTravelRange] = useState(
    (meta.travel_range as string) ?? resource.travel_range ?? '',
  );
  const [cdl, setCdl] = useState(
    (meta.cdl as boolean) ?? resource.cdl ?? false,
  );
  const [classAExperience, setClassAExperience] = useState(
    (meta.class_a_experience as string) ?? resource.class_a_experience ?? '',
  );
  const [additionalSkills, setAdditionalSkills] = useState(
    (meta.additional_skills as string) ?? resource.additional_skills ?? '',
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
        tow_vehicle: towVehicle || undefined,
        tow_rating: towRating || undefined,
        hitch_type: hitchType || undefined,
        availability: availability || undefined,
        travel_range: travelRange || undefined,
        cdl: cdl || undefined,
        class_a_experience: classAExperience || undefined,
        additional_skills: additionalSkills || undefined,
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
        location: locationText || resource.location,
        tow_vehicle: towVehicle,
        tow_rating: towRating,
        hitch_type: hitchType,
        availability,
        travel_range: travelRange,
        cdl,
        class_a_experience: classAExperience,
        additional_skills: additionalSkills,
        metadata: mergedMeta,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [
    resource, description, locationText, status,
    towVehicle, towRating, hitchType, availability, travelRange,
    cdl, classAExperience, additionalSkills, onSave,
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
            <h2 className="text-lg font-bold text-gray-100">Edit Driver</h2>
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
                  placeholder="e.g. Volunteer driver: John Smith - F350"
                />
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
                  Vehicle &amp; Capabilities
                </h3>
              </div>

              {/* Tow Vehicle */}
              <div>
                <label className={labelCls}>Tow Vehicle</label>
                <input
                  type="text"
                  value={towVehicle}
                  onChange={e => setTowVehicle(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 2021 Ford F-350"
                />
              </div>

              {/* Tow Rating */}
              <div>
                <label className={labelCls}>Tow Rating</label>
                <input
                  type="text"
                  value={towRating}
                  onChange={e => setTowRating(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 20,000 lbs"
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

              {/* Availability */}
              <div>
                <label className={labelCls}>Availability</label>
                <input
                  type="text"
                  value={availability}
                  onChange={e => setAvailability(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Open, Weekends, Limited"
                />
              </div>

              {/* Travel Range */}
              <div>
                <label className={labelCls}>Travel Range</label>
                <input
                  type="text"
                  value={travelRange}
                  onChange={e => setTravelRange(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 500 miles"
                />
              </div>

              {/* CDL */}
              <div className="flex items-center gap-3 self-end pb-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cdl}
                    onChange={e => setCdl(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
                <span className="text-xs font-medium text-gray-400">CDL Licensed</span>
              </div>

              {/* Class A Experience */}
              <div>
                <label className={labelCls}>Class A Experience</label>
                <input
                  type="text"
                  value={classAExperience}
                  onChange={e => setClassAExperience(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 5 years"
                />
              </div>

              {/* Additional Skills — full width textarea */}
              <div className="md:col-span-2">
                <label className={labelCls}>Additional Skills</label>
                <textarea
                  value={additionalSkills}
                  onChange={e => setAdditionalSkills(e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="Mechanical, electrical, logistics experience, etc."
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
