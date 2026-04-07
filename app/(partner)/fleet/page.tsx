'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { FleetDetailModal } from '@/components/partner/fleet-detail-modal';
import { FleetEditModal } from '@/components/partner/fleet-edit-modal';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { supabase } from '@/lib/supabase-client';
import { Search, ChevronDown, Eye, Edit3, GitCompare } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FleetStatus = 'all' | 'available' | 'matched' | 'maintenance' | 'sold' | 'in_transit';
type SortField = 'created_at' | 'sleeps' | 'location' | 'status';

interface FleetMetadata {
  vin?: string;
  year?: string;
  make?: string;
  model?: string;
  type?: string;
  sleeps?: number;
  weight?: number;
  hitch_type?: string;
  condition?: string;
  source?: string;
  delivery_method?: string;
  cost_to_ocala?: number;
  interior_contents?: string;
  repairs_needed?: string;
  [key: string]: unknown;
}

interface FleetResource {
  id: string;
  category: string;
  status: string;
  description?: string;
  details_sanitized?: string;
  capacity_available?: number;
  capacity_total?: number;
  latitude?: number;
  longitude?: number;
  location_text?: string;
  org_id?: string;
  source?: string;
  taxonomy_code?: string;
  persona_type?: string;
  created_at: string;
  metadata?: FleetMetadata;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_DOT: Record<string, string> = {
  available: 'bg-green-400',
  matched: 'bg-yellow-400',
  maintenance: 'bg-orange-400',
  sold: 'bg-sos-gray-400',
  in_transit: 'bg-blue-400',
};

const STATUS_BADGE: Record<string, string> = {
  available: 'bg-green-50 text-green-700',
  matched: 'bg-yellow-50 text-yellow-700',
  maintenance: 'bg-orange-50 text-orange-700',
  sold: 'bg-sos-gray-200 text-sos-gray-600',
  in_transit: 'bg-blue-50 text-blue-700',
};

const TABS: { key: FleetStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'matched', label: 'Matched' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'sold', label: 'Sold' },
  { key: 'in_transit', label: 'In Transit' },
];

const SORT_OPTIONS: { key: SortField; label: string }[] = [
  { key: 'created_at', label: 'Date Added' },
  { key: 'sleeps', label: 'Sleep Capacity' },
  { key: 'location', label: 'Location' },
  { key: 'status', label: 'Status' },
];

const SOURCE_LABELS: Record<string, string> = {
  citizen: 'Citizen Donated',
  partner: 'ERV Fleet',
  government: 'State Donated',
  manual: 'Manual Entry',
  web: 'Web Intake',
  migration: 'Migrated',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getRvDescription(r: FleetResource): string {
  const m = r.metadata;
  if (m?.year && m?.make && m?.model) {
    return `${m.year} ${m.make} ${m.model}${m.type ? ` ${m.type}` : ''}`;
  }
  return r.description || r.details_sanitized || 'RV Unit';
}

function getSleeps(r: FleetResource): number {
  return r.metadata?.sleeps ?? r.capacity_available ?? 0;
}

function getLocation(r: FleetResource): string {
  return r.location_text || r.details_sanitized || '';
}

function getSourceLabel(r: FleetResource): string {
  const metaSource = r.metadata?.source;
  if (typeof metaSource === 'string' && metaSource) {
    return SOURCE_LABELS[metaSource] || metaSource.replace(/_/g, ' ');
  }
  return SOURCE_LABELS[r.source || ''] || r.source || '';
}

function getVinDisplay(r: FleetResource): string | null {
  const vin = r.metadata?.vin;
  if (!vin) return null;
  return vin.length > 8 ? `${vin.slice(0, 4)}...${vin.slice(-4)}` : vin;
}

function matchesSearch(r: FleetResource, q: string): boolean {
  const lower = q.toLowerCase();
  const desc = getRvDescription(r).toLowerCase();
  const loc = getLocation(r).toLowerCase();
  const vin = (r.metadata?.vin || '').toLowerCase();
  const details = (r.details_sanitized || '').toLowerCase();
  return desc.includes(lower) || loc.includes(lower) || vin.includes(lower) || details.includes(lower);
}

function sortResources(items: FleetResource[], field: SortField): FleetResource[] {
  const sorted = [...items];
  switch (field) {
    case 'created_at':
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'sleeps':
      return sorted.sort((a, b) => getSleeps(b) - getSleeps(a));
    case 'location':
      return sorted.sort((a, b) => getLocation(a).localeCompare(getLocation(b)));
    case 'status':
      return sorted.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
    default:
      return sorted;
  }
}

/* ------------------------------------------------------------------ */
/*  Fleet Card                                                         */
/* ------------------------------------------------------------------ */

function FleetCard({
  resource,
  onView,
  onEdit,
}: {
  resource: FleetResource;
  onView: () => void;
  onEdit: () => void;
}) {
  const dotColor = STATUS_DOT[resource.status] || 'bg-sos-gray-400';
  const badgeColor = STATUS_BADGE[resource.status] || 'bg-sos-gray-200 text-sos-gray-600';
  const sleeps = getSleeps(resource);
  const location = getLocation(resource);
  const sourceLabel = getSourceLabel(resource);
  const vin = getVinDisplay(resource);
  const hitchType = resource.metadata?.hitch_type;
  const weight = resource.metadata?.weight;

  return (
    <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4 hover:shadow-md hover:border-sos-accent-300 transition-all">
      {/* Top row: status dot + description + sleeps badge */}
      <div className="flex items-start gap-3">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-sos-blue-800">
              {getRvDescription(resource)}
            </span>
            {sleeps > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sos-blue-50 text-sos-blue-800">
                Sleeps {sleeps}
              </span>
            )}
          </div>

          {/* Location + source + status */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {location && (
              <span className="text-xs text-sos-gray-600">{location}</span>
            )}
            {location && sourceLabel && (
              <span className="text-sos-gray-400">|</span>
            )}
            {sourceLabel && (
              <span className="text-xs text-sos-gray-500">{sourceLabel}</span>
            )}
            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${badgeColor}`}>
              {(resource.status || 'unknown').replace(/_/g, ' ')}
            </span>
          </div>

          {/* VIN + hitch + weight row */}
          {(vin || hitchType || weight) && (
            <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-sos-gray-500">
              {vin && <span>VIN: {vin}</span>}
              {vin && hitchType && <span className="text-sos-gray-400">|</span>}
              {hitchType && <span className="capitalize">{hitchType.replace(/_/g, ' ')}</span>}
              {(vin || hitchType) && weight && <span className="text-sos-gray-400">|</span>}
              {weight && <span>{weight.toLocaleString()} lbs</span>}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={onView}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-sos-gray-300 text-sos-gray-700 hover:bg-sos-gray-200 transition-colors"
            >
              <Eye className="h-3 w-3" /> View
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-sos-gray-300 text-sos-gray-700 hover:bg-sos-gray-200 transition-colors"
            >
              <Edit3 className="h-3 w-3" /> Edit
            </button>
            <button className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-sos-accent-300 text-sos-accent-700 hover:bg-sos-accent-50 transition-colors">
              <GitCompare className="h-3 w-3" /> Match
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fleet Page                                                         */
/* ------------------------------------------------------------------ */

export default function FleetPage() {
  const { orgId, isAdmin } = useAuthContext();
  const { effectiveOrgId } = useViewContext();
  const [resources, setResources] = useState<FleetResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FleetStatus>('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [selectedResource, setSelectedResource] = useState<FleetResource | null>(null);
  const [editResource, setEditResource] = useState<FleetResource | null>(null);

  const handleStatusChange = useCallback((newStatus: string) => {
    if (!selectedResource) return;
    setResources(prev =>
      prev.map(r => r.id === selectedResource.id ? { ...r, status: newStatus } : r),
    );
    setSelectedResource(prev => prev ? { ...prev, status: newStatus } : null);
  }, [selectedResource]);

  const handleEdit = useCallback((res: FleetResource) => {
    setEditResource(res);
  }, []);

  const handleEditSave = useCallback((updated: Record<string, unknown>) => {
    setResources(prev =>
      prev.map(r => r.id === updated.id ? { ...r, ...updated } as FleetResource : r),
    );
    // Also refresh the detail modal if it's showing the same resource
    if (selectedResource && selectedResource.id === updated.id) {
      setSelectedResource({ ...selectedResource, ...updated } as FleetResource);
    }
    setEditResource(null);
  }, [selectedResource]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('resources')
        .select('*')
        .eq('category', 'housing')
        .order('created_at', { ascending: false });

      if (effectiveOrgId) {
        query = query.eq('org_id', effectiveOrgId);
      } else if (orgId && !isAdmin) {
        query = query.eq('org_id', orgId);
      }

      const { data, error: err } = await query;
      if (err) {
        setError(err.message);
      } else {
        setResources((data || []) as FleetResource[]);
      }
      setLoading(false);
    }
    load();
  }, [orgId, isAdmin, effectiveOrgId]);

  const filtered = useMemo(() => {
    let items = resources;

    // Status filter
    if (statusFilter !== 'all') {
      items = items.filter(r => r.status === statusFilter);
    }

    // Search filter
    if (search.trim()) {
      items = items.filter(r => matchesSearch(r, search.trim()));
    }

    // Sort
    items = sortResources(items, sortField);

    return items;
  }, [resources, statusFilter, search, sortField]);

  // Summary stats
  const stats = useMemo(() => ({
    total: resources.length,
    available: resources.filter(r => r.status === 'available').length,
    matched: resources.filter(r => r.status === 'matched').length,
    maintenance: resources.filter(r => r.status === 'maintenance').length,
  }), [resources]);

  /* Loading skeleton */
  if (loading) {
    return (
      <DashboardShell title="Fleet Management" subtitle="Loading fleet...">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4 h-16 animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5 h-28 animate-pulse" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  /* Error state */
  if (error) {
    return (
      <DashboardShell title="Fleet Management" subtitle="Error loading fleet">
        <div className="bg-sos-red-50 border border-sos-red-100 rounded-xl p-6 text-center">
          <p className="text-sm text-sos-red-700">Failed to load fleet data: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-xs font-medium px-4 py-2 rounded-lg bg-sos-red-500 text-white hover:bg-sos-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Fleet Management" subtitle={`${stats.total} units across your fleet`}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-[#FDFCFA] border border-sos-gray-300 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-sos-blue-800">{stats.total}</p>
          <p className="text-[10px] text-sos-gray-500 font-medium">Total Units</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-green-700">{stats.available}</p>
          <p className="text-[10px] text-green-600 font-medium">Available</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-yellow-700">{stats.matched}</p>
          <p className="text-[10px] text-yellow-600 font-medium">Matched</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-orange-700">{stats.maintenance}</p>
          <p className="text-[10px] text-orange-600 font-medium">Maintenance</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 bg-sos-gray-200 rounded-xl p-1 w-fit overflow-x-auto">
        {TABS.map(tab => {
          const count = tab.key === 'all'
            ? resources.length
            : resources.filter(r => r.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-white text-sos-blue-800 shadow-sm'
                  : 'text-sos-gray-600 hover:text-sos-blue-800'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search + Sort row */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sos-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by VIN, description, or location..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-sos-gray-300 bg-[#FDFCFA] text-sm text-sos-blue-800 placeholder:text-sos-gray-400 focus:outline-none focus:ring-2 focus:ring-sos-accent-300 focus:border-sos-accent-300"
          />
        </div>
        <div className="relative">
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value as SortField)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-sos-gray-300 bg-[#FDFCFA] text-sm font-medium text-sos-blue-800 focus:outline-none focus:ring-2 focus:ring-sos-accent-300 focus:border-sos-accent-300 cursor-pointer"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sos-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Fleet Cards */}
      <div className="space-y-2">
        {filtered.length > 0 ? (
          filtered.map(resource => (
            <FleetCard
              key={resource.id}
              resource={resource}
              onView={() => setSelectedResource(resource)}
              onEdit={() => handleEdit(resource)}
            />
          ))
        ) : (
          <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-8 text-center">
            <p className="text-sm text-sos-gray-500">
              {search.trim()
                ? `No units matching "${search}"`
                : statusFilter !== 'all'
                  ? `No units with status "${statusFilter.replace(/_/g, ' ')}"`
                  : 'No fleet units found'}
            </p>
            {(search.trim() || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                className="mt-2 text-xs font-medium text-sos-accent-700 hover:text-sos-accent-900"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fleet Detail Modal */}
      {selectedResource && (
        <FleetDetailModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          onStatusChange={handleStatusChange}
          onEdit={() => handleEdit(selectedResource)}
        />
      )}

      {/* Fleet Edit Modal */}
      {editResource && (
        <FleetEditModal
          resource={editResource}
          onClose={() => setEditResource(null)}
          onSave={handleEditSave}
        />
      )}
    </DashboardShell>
  );
}
