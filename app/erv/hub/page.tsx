'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { DataTable, type Column, type FilterColumnDef } from '@/components/erv/data-table';

// ── Constants ──
const NAVY = '#0F1E2B';
const BLUE = '#89CFF0';
const RED = '#EF4E4B';
const GREEN = '#22C55E';
const CARD_BG = '#1A3850';

const ERV_QUERY_URL = 'https://rtduqguwhkczexnoawej.supabase.co/functions/v1/erv-query';
const ERV_AUTH = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0ZHVxZ3V3aGtjemV4bm9hd2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2Njg1ODAsImV4cCI6MjA2NzI0NDU4MH0.1QZ5ofS-ND_OI71igPlxxMTyZJJRlATSSC0djccWR8o';

// ERV Partner DB — used for donor_pipeline (not available on SOS DB)
const ERV_PARTNER_URL = 'https://xbtrtztzaokeodarqvpr.supabase.co/functions/v1/partner-read';
const ERV_PARTNER_AUTH = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhidHJ0enR6YW9rZW9kYXJxdnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjE0NTYsImV4cCI6MjA5MTU5NzQ1Nn0.adgNAyeml0GIy81VXQu7DcbnnJNhQhNT9zVgwjNJbds';
const ERV_PARTNER_KEY = 'erv_pk_708c849205328c2d0f734e8dac6494fd';

type ViewType = 'requests' | 'fleet' | 'drivers' | 'donors' | 'impact';
const VIEWS: { id: ViewType; label: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'fleet', label: 'Fleet' },
  { id: 'drivers', label: 'Drivers' },
  { id: 'donors', label: 'Donors' },
  { id: 'impact', label: 'Impact' },
];

async function ervQuery(queryType: string, filters?: Record<string, any>) {
  const res = await fetch(ERV_QUERY_URL, {
    method: 'POST',
    headers: { Authorization: ERV_AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_type: queryType, filters, limit: 5000 }),
  });
  return res.json();
}

async function ervPartnerQuery(queryType: string, filters?: Record<string, any>) {
  const res = await fetch(ERV_PARTNER_URL, {
    method: 'POST',
    headers: {
      Authorization: ERV_PARTNER_AUTH,
      'Content-Type': 'application/json',
      'x-partner-key': ERV_PARTNER_KEY,
    },
    body: JSON.stringify({ query_type: queryType, filters, limit: 5000 }),
  });
  return res.json();
}

// ── Helpers ──
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap capitalize"
      style={{ color, background: bg }}
    >
      {label.replace(/_/g, ' ')}
    </span>
  );
}

function Check({ yes }: { yes: boolean }) {
  return <span style={{ color: yes ? GREEN : 'rgba(255,255,255,0.2)' }}>{yes ? '✓' : '—'}</span>;
}

function statusPill(status: string) {
  const s = (status || '').toLowerCase();
  if (['fulfilled', 'delivered', 'deployed', 'housed'].includes(s))
    return <Pill label={s} color={GREEN} bg="rgba(34,197,94,0.15)" />;
  if (['active', 'available', 'ready', 'approved'].includes(s))
    return <Pill label={s} color={BLUE} bg="rgba(137,207,240,0.15)" />;
  if (['matched', 'screening', 'in_transit'].includes(s))
    return <Pill label={s} color="#facc15" bg="rgba(250,204,21,0.12)" />;
  if (['closed', 'cancelled', 'declined', 'withdrew'].includes(s))
    return <Pill label={s} color="rgba(255,255,255,0.3)" bg="rgba(255,255,255,0.06)" />;
  return <Pill label={s || '—'} color="rgba(255,255,255,0.4)" bg="rgba(255,255,255,0.06)" />;
}

function priorityBadge(score: number | null) {
  if (score == null) return <span className="text-white/20">—</span>;
  const color = score >= 80 ? RED : score >= 50 ? '#facc15' : GREEN;
  const bg = score >= 80 ? 'rgba(239,78,75,0.15)' : score >= 50 ? 'rgba(250,204,21,0.12)' : 'rgba(34,197,94,0.12)';
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ color, background: bg }}>
      {score}
    </span>
  );
}

// ── Counting Number ──
function CountUp({ target, duration = 800 }: { target: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      if (ref.current) ref.current.textContent = Math.round(target * eased).toLocaleString();
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return <span ref={ref}>0</span>;
}

// ── Impact Charts ──
function HorizontalBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.label}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-white/70">{d.label}</span>
            <span className="text-white/50 font-bold">{d.value.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(d.value / max) * 100}%`, background: BLUE }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Donut({ slices, size = 120 }: { slices: { label: string; value: number; color: string }[]; size?: number }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-xs text-white/30 text-center py-4">No data</p>;
  const r = 40;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <div style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {slices.filter(s => s.value > 0).map((slice, i) => {
            const pct = slice.value / total;
            const dash = pct * circumference;
            const gap = circumference - dash;
            const currentOffset = offset;
            offset += dash;
            return (
              <circle key={i} cx="50" cy="50" r={r} fill="none"
                stroke={slice.color} strokeWidth="16"
                strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-currentOffset} />
            );
          })}
        </svg>
      </div>
      <div className="space-y-1.5">
        {slices.filter(s => s.value > 0).map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[11px] text-white/60 capitalize">{s.label.replace(/_/g, ' ')}</span>
            <span className="text-[11px] font-bold text-white/40 ml-auto">{s.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Column Definitions ──
const requestColumns: Column<any>[] = [
  {
    key: 'display_name', label: 'Name',
    render: r => <span className="font-medium text-white/90">{r.persons?.display_name || r.display_name || '—'}</span>,
    searchValue: r => r.persons?.display_name || r.display_name || '',
  },
  { key: 'state', label: 'State', render: r => <span className="text-white/60">{r.state || '—'}</span> },
  {
    key: 'priority_score', label: 'Priority',
    render: r => priorityBadge(r.priority_score),
    sortValue: r => r.priority_score ?? 0,
  },
  { key: 'status', label: 'Status', render: r => statusPill(r.partner_status || r.status) },
  { key: 'household_size', label: 'HH', render: r => <span className="text-white/60">{r.household_size || '—'}</span> },
  { key: 'is_veteran', label: 'Vet', render: r => <Check yes={!!r.is_veteran} />, mobileHide: true },
  { key: 'is_first_responder', label: 'FR', render: r => <Check yes={!!r.is_first_responder} />, mobileHide: true },
  { key: 'is_fema_replacement', label: 'FEMA', render: r => <Check yes={!!r.is_fema_replacement} />, mobileHide: true },
  {
    key: 'created_at', label: 'Date',
    render: r => <span className="text-white/40 text-xs">{formatDate(r.created_at)}</span>,
    sortValue: r => new Date(r.created_at || 0).getTime(),
    mobileHide: true,
  },
];

const requestFilters: FilterColumnDef[] = [
  { key: 'status', label: 'Status', options: [
    { value: 'pending', label: 'Pending' }, { value: 'active', label: 'Active' },
    { value: 'matched', label: 'Matched' }, { value: 'fulfilled', label: 'Fulfilled' },
    { value: 'approved', label: 'Approved' },
  ]},
];

const fleetColumns: Column<any>[] = [
  {
    key: 'vehicle', label: 'Vehicle',
    render: r => <span className="font-medium text-white/90">{[r.year, r.make, r.model].filter(Boolean).join(' ') || r.vehicle_type || '—'}</span>,
    searchValue: r => [r.year, r.make, r.model, r.vehicle_type].filter(Boolean).join(' '),
  },
  { key: 'vehicle_type', label: 'Type', render: r => <span className="text-white/60 capitalize">{(r.vehicle_type || '—').replace(/_/g, ' ')}</span> },
  { key: 'sleeps', label: 'Sleeps', render: r => <span className="text-white/60">{r.sleeps || r.capacity_available || '—'}</span>, sortValue: r => r.sleeps || r.capacity_available || 0 },
  { key: 'hitch_type', label: 'Hitch', render: r => <span className="text-white/60 capitalize">{(r.hitch_type || '—').replace(/_/g, ' ')}</span>, mobileHide: true },
  { key: 'status', label: 'Status', render: r => statusPill(r.partner_status || r.status) },
  { key: 'source', label: 'Source', render: r => <span className="text-white/50 capitalize text-xs">{(r.source || '—').replace(/_/g, ' ')}</span>, mobileHide: true },
  { key: 'vin', label: 'VIN', render: r => <span className="text-white/30 font-mono text-xs">{r.vin || '—'}</span>, mobileHide: true },
];

const fleetFilters: FilterColumnDef[] = [
  { key: 'status', label: 'Status', options: [
    { value: 'available', label: 'Available' }, { value: 'deployed', label: 'Deployed' },
    { value: 'pending', label: 'Pending' }, { value: 'maintenance', label: 'Maintenance' },
  ]},
  { key: 'source', label: 'Source', options: [
    { value: 'citizen_donation', label: 'Donation' }, { value: 'fl_state_inventory', label: 'FL State' },
    { value: 'partner_fleet', label: 'Fleet' },
  ]},
];

const driverColumns: Column<any>[] = [
  {
    key: 'display_name', label: 'Name',
    render: r => <span className="font-medium text-white/90">{r.persons?.display_name || r.display_name || '—'}</span>,
    searchValue: r => r.persons?.display_name || r.display_name || '',
  },
  {
    key: 'tow_capability', label: 'Tow Capability',
    render: r => {
      const caps = Array.isArray(r.tow_capability) ? r.tow_capability : [];
      return caps.length > 0
        ? <span className="text-white/60 text-xs">{caps.map((c: string) => c.replace(/_/g, ' ')).join(', ')}</span>
        : <span className="text-white/20">—</span>;
    },
    searchValue: r => (Array.isArray(r.tow_capability) ? r.tow_capability.join(' ') : ''),
  },
  { key: 'has_class_a', label: 'Class A', render: r => <Check yes={!!r.has_class_a} /> },
  { key: 'status', label: 'Status', render: r => statusPill(r.partner_status || r.status) },
  { key: 'state', label: 'State', render: r => <span className="text-white/60">{r.state || '—'}</span> },
];

const driverFilters: FilterColumnDef[] = [
  { key: 'status', label: 'Status', options: [
    { value: 'available', label: 'Available' }, { value: 'active', label: 'Active' },
    { value: 'deployed', label: 'Deployed' },
  ]},
];

const donorColumns: Column<any>[] = [
  {
    key: 'contact_name', label: 'Donor',
    render: r => <span className="font-medium text-white/90">{r.persons?.display_name || r.contact_name || '—'}</span>,
    searchValue: r => r.persons?.display_name || r.contact_name || '',
  },
  {
    key: 'location_text', label: 'Location',
    render: r => {
      const loc = r.location_text || '—';
      return <span className="text-white/60">{loc.length > 30 ? loc.slice(0, 30) + '…' : loc}</span>;
    },
    searchValue: r => r.location_text || '',
  },
  {
    key: 'rv', label: 'RV',
    render: r => {
      const rv = [r.year, r.make, r.model].filter(Boolean).join(' ') || r.vehicle_type || r.description?.slice(0, 50) || '—';
      return <span className="text-white/60">{rv}</span>;
    },
    searchValue: r => [r.year, r.make, r.model, r.vehicle_type, r.description].filter(Boolean).join(' '),
  },
  { key: 'sleeps', label: 'Sleeps', render: r => <span className="text-white/60">{r.sleeps || '—'}</span>, mobileHide: true },
  { key: 'status', label: 'Status', render: r => statusPill(r.partner_status || r.status) },
  {
    key: 'created_at', label: 'Date',
    render: r => <span className="text-white/40 text-xs">{formatDate(r.created_at)}</span>,
    sortValue: r => new Date(r.created_at || 0).getTime(),
    mobileHide: true,
  },
];

const donorFilters: FilterColumnDef[] = [
  { key: 'status', label: 'Status', options: [
    { value: 'pending', label: 'Pending' }, { value: 'screening', label: 'Screening' },
    { value: 'available', label: 'Available' }, { value: 'deployed', label: 'Deployed' },
  ]},
];

// ── Main Page ──
export default function ErvHubPage() {
  return (
    <Suspense fallback={
      <div style={{ background: NAVY, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: BLUE, fontSize: 14 }}>Loading ERV Hub...</span>
      </div>
    }>
      <ErvHub />
    </Suspense>
  );
}

function ErvHub() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = (searchParams.get('view') as ViewType) || 'requests';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, any>>({
    requests: [], fleet: [], drivers: [], donors: [],
    impactStats: null, byState: [], byStatus: [],
  });

  // URL param filters
  const stateFilter = searchParams.get('state') || '';
  const statusFilter = searchParams.get('status') || '';
  const veteranFilter = searchParams.get('veteran') === 'true';
  const femaFilter = searchParams.get('fema') === 'true';
  const searchFilter = searchParams.get('search') || '';

  const setView = useCallback((v: ViewType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', v);
    router.push(`/erv/hub?${params.toString()}`);
  }, [searchParams, router]);

  // Fetch all data on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [reqRes, fleetRes, driverRes, donorRes] = await Promise.all([
          ervQuery('request_summary'),
          ervQuery('fleet_status'),
          ervQuery('driver_status'),
          ervPartnerQuery('donor_pipeline'),
        ]);

        if (cancelled) return;

        const requests = reqRes?.data?.requests || [];
        const fleet = fleetRes?.data?.resources || [];
        const drivers = Array.isArray(driverRes?.data) ? driverRes.data : driverRes?.data?.resources || [];
        const donors = donorRes?.donations || donorRes?.data?.donations || [];

        // Compute impact from the data we have
        const fulfilled = requests.filter((r: any) => ['fulfilled', 'delivered'].includes(r.status));
        const totalPeople = fulfilled.reduce((s: number, r: any) => s + (r.household_size || 1), 0);
        const activeReqs = requests.filter((r: any) => !['fulfilled', 'delivered', 'closed', 'declined', 'withdrew'].includes(r.status));
        const availableRvs = fleet.filter((r: any) => ['available', 'ready', 'active'].includes(r.status));

        // By state (top 10)
        const stateMap: Record<string, number> = {};
        requests.forEach((r: any) => { if (r.state && r.state !== 'unknown') stateMap[r.state] = (stateMap[r.state] || 0) + 1; });
        const byState = Object.entries(stateMap)
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

        // Fleet by status
        const statusMap: Record<string, number> = {};
        fleet.forEach((r: any) => { statusMap[r.status || 'unknown'] = (statusMap[r.status || 'unknown'] || 0) + 1; });
        const byStatus = Object.entries(statusMap)
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value);

        setData({
          requests, fleet, drivers, donors,
          impactStats: {
            familiesHoused: fulfilled.length,
            peopleServed: totalPeople,
            activeRequests: activeReqs.length,
            availableRvs: availableRvs.length,
          },
          byState, byStatus,
        });
      } catch (err) {
        // Fail silently — show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Apply URL filters to data
  const filteredData = useMemo(() => {
    const applyFilters = (rows: any[], hasState = true) => {
      let result = rows;
      if (stateFilter && hasState) result = result.filter(r => (r.state || '').toLowerCase() === stateFilter.toLowerCase());
      if (statusFilter) result = result.filter(r => (r.status || r.partner_status || '').toLowerCase() === statusFilter.toLowerCase());
      if (veteranFilter) result = result.filter(r => r.is_veteran);
      if (femaFilter) result = result.filter(r => r.is_fema_replacement);
      return result;
    };
    return {
      requests: applyFilters(data.requests),
      fleet: applyFilters(data.fleet),
      drivers: applyFilters(data.drivers),
      donors: applyFilters(data.donors, false),
    };
  }, [data, stateFilter, statusFilter, veteranFilter, femaFilter]);

  // Current view data
  const currentData = view === 'requests' ? filteredData.requests
    : view === 'fleet' ? filteredData.fleet
    : view === 'drivers' ? filteredData.drivers
    : view === 'donors' ? filteredData.donors
    : [];

  const currentColumns = view === 'requests' ? requestColumns
    : view === 'fleet' ? fleetColumns
    : view === 'drivers' ? driverColumns
    : view === 'donors' ? donorColumns
    : [];

  const currentFilters = view === 'requests' ? requestFilters
    : view === 'fleet' ? fleetFilters
    : view === 'drivers' ? driverFilters
    : view === 'donors' ? donorFilters
    : [];

  const statStrip = useMemo(() => {
    if (view === 'requests') {
      const pending = filteredData.requests.filter((r: any) => r.status === 'pending' || r.partner_status === 'pending').length;
      return `${filteredData.requests.length.toLocaleString()} requests · ${pending} pending`;
    }
    if (view === 'fleet') {
      const avail = filteredData.fleet.filter((r: any) => ['available', 'ready'].includes(r.status)).length;
      return `${filteredData.fleet.length.toLocaleString()} RVs · ${avail} available`;
    }
    if (view === 'drivers') return `${filteredData.drivers.length.toLocaleString()} drivers`;
    if (view === 'donors') return `${filteredData.donors.length.toLocaleString()} donations`;
    return '';
  }, [view, filteredData]);

  // Status color for donut
  const statusColor = (s: string) => {
    if (['available', 'ready', 'active'].includes(s)) return BLUE;
    if (['deployed', 'fulfilled'].includes(s)) return GREEN;
    if (['closed', 'sold'].includes(s)) return 'rgba(255,255,255,0.15)';
    if (['pending', 'screening'].includes(s)) return '#facc15';
    if (['maintenance', 'repair'].includes(s)) return RED;
    return 'rgba(255,255,255,0.25)';
  };

  return (
    <div className="min-h-screen" style={{ background: NAVY }}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2" style={{ background: 'linear-gradient(to bottom, rgba(15,30,43,0.98), rgba(15,30,43,0.85))' }}>
        <h1 className="text-white text-sm font-bold">🚐 ERV Hub</h1>
        <p className="text-white/30 text-[10px]">Emergency RV — Data & Operations</p>
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex px-2 min-w-max">
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className="px-4 py-2.5 text-xs font-semibold transition-all whitespace-nowrap"
              style={{
                color: view === v.id ? BLUE : 'rgba(255,255,255,0.35)',
                borderBottom: view === v.id ? `2px solid ${BLUE}` : '2px solid transparent',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat strip */}
      {view !== 'impact' && (
        <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span className="text-[11px] text-white/35">{loading ? 'Loading...' : statStrip}</span>
          {(stateFilter || statusFilter || veteranFilter || femaFilter) && (
            <button
              onClick={() => router.push(`/erv/hub?view=${view}`)}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ color: BLUE, background: 'rgba(137,207,240,0.1)' }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-4">
        {view === 'impact' ? (
          <ImpactView
            stats={data.impactStats}
            byState={data.byState}
            byStatus={data.byStatus}
            statusColor={statusColor}
            loading={loading}
          />
        ) : (
          <DataTable
            columns={currentColumns}
            data={currentData}
            loading={loading}
            defaultSortKey={view === 'requests' ? 'priority_score' : 'status'}
            defaultSortDir="desc"
            filterColumns={currentFilters}
            rowKey={(r: any) => r.id || Math.random().toString()}
            emptyMessage={`No ${view} found${stateFilter ? ` in ${stateFilter}` : ''}.`}
          />
        )}
      </div>
    </div>
  );
}

// ── Impact View ──
function ImpactView({
  stats, byState, byStatus, statusColor, loading,
}: {
  stats: any;
  byState: { label: string; value: number }[];
  byStatus: { label: string; value: number }[];
  statusColor: (s: string) => string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: CARD_BG }} />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <p className="text-white/30 text-sm text-center py-12">No impact data available.</p>;
  }

  const cards = [
    { label: 'Families Housed', value: stats.familiesHoused, color: GREEN },
    { label: 'People Served', value: stats.peopleServed, color: BLUE },
    { label: 'Active Requests', value: stats.activeRequests, color: RED },
    { label: 'Available RVs', value: stats.availableRvs, color: BLUE },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(c => (
          <div
            key={c.label}
            className="rounded-xl p-4"
            style={{ background: CARD_BG, borderLeft: `3px solid ${c.color}` }}
          >
            <p className="text-2xl font-bold" style={{ color: c.color }}>
              <CountUp target={c.value} />
            </p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Requests by State */}
      {byState.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: CARD_BG }}>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">Requests by State</p>
          <HorizontalBars data={byState} />
        </div>
      )}

      {/* Fleet by Status */}
      {byStatus.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: CARD_BG }}>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">Fleet by Status</p>
          <Donut
            slices={byStatus.map(s => ({ label: s.label, value: s.value, color: statusColor(s.label) }))}
          />
        </div>
      )}
    </div>
  );
}
