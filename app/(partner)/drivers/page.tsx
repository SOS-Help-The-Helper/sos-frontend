'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { DriverDetailModal } from '@/components/partner/driver-detail-modal';
import { DriverEditModal } from '@/components/partner/driver-edit-modal';
import { Search, Eye, Edit3, Truck } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Driver {
  id: string;
  description?: string;
  location?: string;
  status?: string;
  tow_vehicle?: string;
  tow_rating?: string;
  hitch_type?: string;
  class_a?: boolean;
  availability?: string;
  travel_range?: string;
  cdl?: boolean;
  additional_skills?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://rtduqguwhkczexnoawej.supabase.co';

const HITCH_OPTIONS = [
  { value: 'all', label: 'All Hitch Types' },
  { value: 'bumper_pull', label: 'Bumper Pull' },
  { value: '5th_wheel', label: '5th Wheel' },
  { value: 'gooseneck', label: 'Gooseneck' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'all', label: 'All Availability' },
  { value: 'open', label: 'Open' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'limited', label: 'Limited' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseDriverName(description?: string): string {
  if (!description) return 'Unknown Driver';
  const match = description.match(/Volunteer driver:\s*(.+?)\s*-/i);
  return match ? match[1].trim() : description;
}

function parseVehicleFromDesc(description?: string): string | null {
  if (!description) return null;
  const match = description.match(/-\s*(.+)$/);
  return match ? match[1].trim() : null;
}

function matchesSearch(d: Driver, q: string): boolean {
  const lower = q.toLowerCase();
  const name = parseDriverName(d.description).toLowerCase();
  const loc = (d.location || '').toLowerCase();
  const vehicle = (d.tow_vehicle || '').toLowerCase();
  const desc = (d.description || '').toLowerCase();
  return (
    name.includes(lower) ||
    loc.includes(lower) ||
    vehicle.includes(lower) ||
    desc.includes(lower)
  );
}

/* ------------------------------------------------------------------ */
/*  Driver Card                                                        */
/* ------------------------------------------------------------------ */

function DriverCard({
  driver,
  onView,
  onEdit,
  onAssign,
}: {
  driver: Driver;
  onView: () => void;
  onEdit: () => void;
  onAssign: () => void;
}) {
  const isAvailable = driver.status === 'available';
  const dotColor = isAvailable ? 'bg-green-400' : 'bg-gray-500';
  const name = parseDriverName(driver.description);
  const hitchLabel = driver.hitch_type
    ? driver.hitch_type.replace(/_/g, ' ')
    : null;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 hover:border-gray-500 transition-all">
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />

        {/* Center info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-100">{name}</span>
            {driver.cdl && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300">
                CDL
              </span>
            )}
            {driver.class_a && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300">
                Class A
              </span>
            )}
          </div>

          {/* Tow vehicle */}
          {driver.tow_vehicle && (
            <p className="text-xs text-gray-400 mt-0.5">{driver.tow_vehicle}</p>
          )}

          {/* Hitch type + availability + travel range + location */}
          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-gray-500">
            {hitchLabel && (
              <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 capitalize">
                {hitchLabel}
              </span>
            )}
            {driver.availability && (
              <>
                {hitchLabel && <span className="text-gray-600">|</span>}
                <span className="capitalize">{driver.availability}</span>
              </>
            )}
            {driver.travel_range && (
              <>
                <span className="text-gray-600">|</span>
                <span>{driver.travel_range}</span>
              </>
            )}
            {driver.location && (
              <>
                <span className="text-gray-600">|</span>
                <span>{driver.location}</span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={onAssign}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-blue-700 text-blue-300 hover:bg-blue-900/40 transition-colors"
            >
              <Truck className="h-3 w-3" /> Assign to Run
            </button>
            <button
              onClick={onView}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-800 transition-colors"
            >
              <Eye className="h-3 w-3" /> View
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-800 transition-colors"
            >
              <Edit3 className="h-3 w-3" /> Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Drivers Page                                                       */
/* ------------------------------------------------------------------ */

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [availableCount, setAvailableCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [hitchFilter, setHitchFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [cdlOnly, setCdlOnly] = useState(false);
  const [classAOnly, setClassAOnly] = useState(false);

  // Modals
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);

  const handleEdit = useCallback((d: Driver) => {
    setEditDriver(d);
  }, []);

  const handleEditSave = useCallback(
    (updated: Record<string, unknown>) => {
      const asDriver = updated as unknown as Driver;
      setDrivers(prev =>
        prev.map(d => (d.id === asDriver.id ? asDriver : d)),
      );
      if (selectedDriver && selectedDriver.id === asDriver.id) {
        setSelectedDriver(asDriver);
      }
      setEditDriver(null);
    },
    [selectedDriver],
  );

  const handleStatusChange = useCallback((driverId: string, newStatus: string) => {
    setDrivers(prev =>
      prev.map(d => (d.id === driverId ? { ...d, status: newStatus } : d)),
    );
    setSelectedDriver(prev =>
      prev && prev.id === driverId ? { ...prev, status: newStatus } : prev,
    );
  }, []);

  // Fetch drivers from erv-query EF
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/erv-query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ query_type: 'driver_status', limit: 200 }),
        });
        if (!resp.ok) throw new Error(`EF returned ${resp.status}`);
        const data = await resp.json();
        setDrivers((data.drivers || []) as Driver[]);
        setTotalDrivers(data.total_drivers ?? data.drivers?.length ?? 0);
        setAvailableCount(data.available ?? 0);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load drivers';
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filtered list
  const filtered = useMemo(() => {
    let items = drivers;

    if (hitchFilter !== 'all') {
      items = items.filter(
        d => d.hitch_type?.toLowerCase() === hitchFilter,
      );
    }
    if (availabilityFilter !== 'all') {
      items = items.filter(
        d => d.availability?.toLowerCase() === availabilityFilter,
      );
    }
    if (cdlOnly) {
      items = items.filter(d => d.cdl === true);
    }
    if (classAOnly) {
      items = items.filter(d => d.class_a === true);
    }
    if (search.trim()) {
      items = items.filter(d => matchesSearch(d, search.trim()));
    }

    return items;
  }, [drivers, hitchFilter, availabilityFilter, cdlOnly, classAOnly, search]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (hitchFilter !== 'all') count++;
    if (availabilityFilter !== 'all') count++;
    if (cdlOnly) count++;
    if (classAOnly) count++;
    return count;
  }, [hitchFilter, availabilityFilter, cdlOnly, classAOnly]);

  /* Loading skeleton */
  if (loading) {
    return (
      <DashboardShell title="Volunteer Drivers" subtitle="Loading drivers...">
        <div className="bg-gray-950 rounded-2xl p-4 md:p-6 min-h-[80vh]">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-900 rounded-xl border border-gray-700 p-4 h-16 animate-pulse" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-gray-900 rounded-xl border border-gray-700 p-5 h-28 animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardShell>
    );
  }

  /* Error state */
  if (error) {
    return (
      <DashboardShell title="Volunteer Drivers" subtitle="Error loading drivers">
        <div className="bg-gray-950 rounded-2xl p-4 md:p-6 min-h-[80vh]">
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
            <p className="text-sm text-red-300">Failed to load drivers: {error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-xs font-medium px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Volunteer Drivers"
      subtitle={`${totalDrivers} registered drivers`}
    >
      <div className="bg-gray-950 rounded-2xl p-4 md:p-6 min-h-[80vh]">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-gray-100">{totalDrivers}</p>
            <p className="text-[10px] text-gray-500 font-medium">Total Drivers</p>
          </div>
          <div className="bg-green-900/30 border border-green-800 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-green-300">{availableCount}</p>
            <p className="text-[10px] text-green-500 font-medium">Available</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-gray-100">{filtered.length}</p>
            <p className="text-[10px] text-gray-500 font-medium">
              Showing{activeFilterCount > 0 ? ` (${activeFilterCount} filters)` : ''}
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or location..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-700 bg-gray-900 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Hitch Type */}
          <select
            value={hitchFilter}
            onChange={e => setHitchFilter(e.target.value)}
            className="appearance-none px-3 py-2.5 rounded-xl border border-gray-700 bg-gray-900 text-sm font-medium text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {HITCH_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Availability */}
          <select
            value={availabilityFilter}
            onChange={e => setAvailabilityFilter(e.target.value)}
            className="appearance-none px-3 py-2.5 rounded-xl border border-gray-700 bg-gray-900 text-sm font-medium text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {AVAILABILITY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* CDL Toggle */}
          <button
            onClick={() => setCdlOnly(!cdlOnly)}
            className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors whitespace-nowrap ${
              cdlOnly
                ? 'border-blue-500 bg-blue-900/40 text-blue-300'
                : 'border-gray-700 bg-gray-900 text-gray-400 hover:text-gray-200'
            }`}
          >
            CDL
          </button>

          {/* Class A Toggle */}
          <button
            onClick={() => setClassAOnly(!classAOnly)}
            className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors whitespace-nowrap ${
              classAOnly
                ? 'border-purple-500 bg-purple-900/40 text-purple-300'
                : 'border-gray-700 bg-gray-900 text-gray-400 hover:text-gray-200'
            }`}
          >
            Class A
          </button>
        </div>

        {/* Driver Cards */}
        <div className="space-y-2">
          {filtered.length > 0 ? (
            filtered.map(driver => (
              <DriverCard
                key={driver.id}
                driver={driver}
                onView={() => setSelectedDriver(driver)}
                onEdit={() => handleEdit(driver)}
                onAssign={() => {/* TODO: navigate to run assignment */}}
              />
            ))
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-8 text-center">
              <p className="text-sm text-gray-500">
                {search.trim()
                  ? `No drivers matching "${search}"`
                  : activeFilterCount > 0
                    ? 'No drivers match the current filters'
                    : 'No drivers found'}
              </p>
              {(search.trim() || activeFilterCount > 0) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setHitchFilter('all');
                    setAvailabilityFilter('all');
                    setCdlOnly(false);
                    setClassAOnly(false);
                  }}
                  className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Driver Detail Modal */}
      {selectedDriver && (
        <DriverDetailModal
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
          onStatusChange={newStatus => handleStatusChange(selectedDriver.id, newStatus)}
          onEdit={() => handleEdit(selectedDriver)}
        />
      )}

      {/* Driver Edit Modal */}
      {editDriver && (
        <DriverEditModal
          resource={editDriver}
          onClose={() => setEditDriver(null)}
          onSave={handleEditSave}
        />
      )}
    </DashboardShell>
  );
}
