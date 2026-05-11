'use client';
import { useEffect, useState, useCallback } from 'react';
import { usePartnerOrg } from '@/lib/partner-context';
import { KanbanBoard, KanbanColumn } from '@/components/partner/kanban-board';
import { ervFetch } from '@/lib/erv-api';

type SubTab = 'survivors' | 'volunteers' | 'rvs';

const SURVIVOR_TRANSITIONS: Record<string, string[]> = {
  pending: ['approved', 'declined'],
  approved: ['delivered', 'on_hold', 'declined'],
  on_hold: ['approved', 'declined'],
  delivered: ['completed'],
};

const RV_TRANSITIONS: Record<string, string[]> = {
  pending: ['screening', 'declined'],
  screening: ['received', 'declined'],
  received: ['available', 'repair'],
  available: ['deployed', 'sold', 'cleaning', 'repair'],
  deployed: ['returned'],
  returned: ['available', 'repair', 'sold'],
  repair: ['available', 'sold'],
  cleaning: ['available'],
};

const RV_COLUMNS: KanbanColumn[] = [
  { key: 'pending', label: 'Pending', color: '#f59e0b' },
  { key: 'screening', label: 'Screening', color: '#8b5cf6' },
  { key: 'received', label: 'Received', color: '#3b82f6' },
  { key: 'available', label: 'Available', color: '#10b981' },
  { key: 'deployed', label: 'Deployed', color: '#06b6d4' },
  { key: 'repair', label: 'Repair', color: '#ef4444' },
  { key: 'cleaning', label: 'Cleaning', color: '#a855f7' },
  { key: 'sold', label: 'Sold', color: '#6b7280' },
];

const VOLUNTEER_COLUMNS: KanbanColumn[] = [
  { key: 'active', label: 'Active', color: '#10b981' },
  { key: 'new', label: 'New', color: '#3b82f6' },
  { key: 'assigned', label: 'Assigned', color: '#06b6d4' },
  { key: 'inactive', label: 'Inactive', color: '#6b7280' },
];

const SURVIVOR_COLUMNS: KanbanColumn[] = [
  { key: 'pending', label: 'Pending', color: '#f59e0b' },
  { key: 'approved', label: 'Approved', color: '#3b82f6' },
  { key: 'on_hold', label: 'On Hold', color: '#8b5cf6' },
  { key: 'delivered', label: 'Delivered', color: '#10b981' },
  { key: 'completed', label: 'Completed', color: '#6b7280' },
  { key: 'declined', label: 'Declined', color: '#ef4444' },
];

function urgencyBadge(score: number) {
  if (score >= 80) return { label: 'Critical', className: 'bg-red-500/20 text-red-400' };
  if (score >= 60) return { label: 'High', className: 'bg-orange-500/20 text-orange-400' };
  if (score >= 40) return { label: 'Medium', className: 'bg-yellow-500/20 text-yellow-400' };
  return { label: 'Low', className: 'bg-green-500/20 text-green-400' };
}

function SurvivorCard({ item, onClick }: { item: any; onClick: (item: any) => void }) {
  const name = item.full_name || item.display_name || 'Unknown';
  const location = [item.city, item.state].filter(Boolean).join(', ');
  const date = item.created_at
    ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const badge = item.triage_score != null ? urgencyBadge(item.triage_score) : null;
  const matched = item.match_id || item.matched;

  return (
    <div
      className="bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors border border-white/10"
      onClick={() => onClick(item)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-white leading-tight">{name}</span>
        {badge && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>
      {location && <p className="text-xs text-white/40 mb-1">{location}</p>}
      <div className="flex items-center justify-between mt-1">
        {date && <span className="text-[10px] text-white/20">{date}</span>}
        {matched && <span className="text-[10px] text-green-400">✓ Matched</span>}
      </div>
    </div>
  );
}

function SurvivorsKanban({
  data,
  onCardClick,
  onStatusChange,
}: {
  data: any[];
  onCardClick: (item: any) => void;
  onStatusChange: (itemId: string, newStatus: string) => void;
}) {
  if (data.length === 0) return <p className="text-white/40 text-sm">Loading survivors...</p>;
  return (
    <KanbanBoard
      columns={SURVIVOR_COLUMNS}
      items={data}
      groupBy="partner_status"
      renderCard={({ item }) => (
        <SurvivorCard key={item.id ?? item.request_id} item={item} onClick={onCardClick} />
      )}
      onStatusChange={onStatusChange}
      validTransitions={SURVIVOR_TRANSITIONS}
    />
  );
}

function VolunteerCard({ item, onClick }: { item: any; onClick: (item: any) => void }) {
  const name = item.full_name || item.display_name || 'Unknown';
  const location = [item.city, item.state].filter(Boolean).join(', ');
  const skills = Array.isArray(item.tow_capability) && item.tow_capability.length > 0
    ? item.tow_capability.join(', ')
    : 'No skills listed';

  return (
    <div
      className="bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors border border-white/10"
      onClick={() => onClick(item)}
    >
      <p className="text-sm font-medium text-white leading-tight mb-1">{name}</p>
      {location && <p className="text-xs text-white/40 mb-1">{location}</p>}
      <p className="text-xs text-white/30 mb-1">{skills}</p>
      {item.phone && <p className="text-[10px] text-white/20">{item.phone}</p>}
    </div>
  );
}

function VolunteersKanban({ data, onCardClick }: { data: any[]; onCardClick: (item: any) => void }) {
  if (data.length === 0) return <p className="text-white/40 text-sm">Loading volunteers...</p>;
  return (
    <KanbanBoard
      columns={VOLUNTEER_COLUMNS}
      items={data}
      groupBy="volunteer_status"
      renderCard={({ item }) => (
        <VolunteerCard key={item.id ?? item.person_id} item={item} onClick={onCardClick} />
      )}
    />
  );
}

function RVCard({ item, onClick }: { item: any; onClick: (item: any) => void }) {
  const description =
    item.year || item.make || item.model
      ? [item.year, item.make, item.model].filter(Boolean).join(' ')
      : item.description || 'RV';
  const vin = item.vin ? `VIN: ...${String(item.vin).slice(-6)}` : null;
  const stars = item.condition_rating
    ? '★'.repeat(item.condition_rating) + '☆'.repeat(5 - item.condition_rating)
    : null;
  const location = item.current_lot || item.location_text || 'Location unknown';

  return (
    <div
      className="bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors border border-white/10"
      onClick={() => onClick(item)}
    >
      <p className="text-sm font-medium text-white leading-tight mb-1">{description}</p>
      {item.length_ft && <p className="text-xs text-white/40 mb-1">{item.length_ft} ft</p>}
      {vin && <p className="text-[10px] text-white/20 mb-1">{vin}</p>}
      {stars && <p className="text-xs text-yellow-400 mb-1">{stars}</p>}
      <p className="text-[10px] text-white/30">{location}</p>
    </div>
  );
}

function RVsKanban({
  data,
  onCardClick,
  onStatusChange,
}: {
  data: any[];
  onCardClick: (item: any) => void;
  onStatusChange: (itemId: string, newStatus: string) => void;
}) {
  if (data.length === 0) return <p className="text-white/40 text-sm">Loading RVs...</p>;
  return (
    <KanbanBoard
      columns={RV_COLUMNS}
      items={data}
      groupBy="partner_status"
      renderCard={({ item }) => (
        <RVCard key={item.id ?? item.resource_id} item={item} onClick={onCardClick} />
      )}
      onStatusChange={onStatusChange}
      validTransitions={RV_TRANSITIONS}
    />
  );
}

export default function ManagePage() {
  const { orgId } = usePartnerOrg();
  const [activeTab, setActiveTab] = useState<SubTab>('survivors');
  const [survivors, setSurvivors] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [rvs, setRvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const fetchTab = useCallback(async (tab: SubTab) => {
    setLoading(true);

    if (tab === 'survivors') {
      const res = await ervFetch('partner-read', { query_type: 'recent_requests', limit: 3000 }).catch(() => ({ results: [] }));
      setSurvivors(res.results || []);
    } else if (tab === 'rvs') {
      const res = await ervFetch('partner-read', { query_type: 'resource_summary', limit: 1000 }).catch(() => ({ results: [] }));
      setRvs(res.results || []);
    } else if (tab === 'volunteers') {
      const res = await ervFetch('partner-read', { query_type: 'person_lookup', filters: { role: 'volunteer' }, limit: 500 }).catch(() => ({ results: [] }));
      setVolunteers(res.results || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchTab(activeTab); }, [activeTab, fetchTab]);

  const handleCardClick = useCallback((item: any) => {
    setSelectedItem(item);
    console.log('Selected item:', item);
  }, []);

  const handleSurvivorStatusChange = useCallback(async (itemId: string, newStatus: string) => {
    const prev = survivors.find(s => String(s.id ?? s.request_id) === itemId);
    if (!prev) return;
    setSurvivors(all => all.map(s => String(s.id ?? s.request_id) === itemId ? { ...s, partner_status: newStatus } : s));
    const body = await ervFetch('partner-update', { action: 'record_status', record_type: 'request', record_id: itemId, partner_status: newStatus }).catch(e => ({ error: e.message }));
    if (body?.error) {
      setSurvivors(all => all.map(s => String(s.id ?? s.request_id) === itemId ? { ...s, partner_status: prev.partner_status } : s));
      window.alert(`Failed to update survivor status: ${body.error ?? 'Unknown error'}`);
    }
  }, [survivors]);

  const handleRVStatusChange = useCallback(async (itemId: string, newStatus: string) => {
    const prev = rvs.find(r => String(r.id ?? r.resource_id) === itemId);
    if (!prev) return;
    setRvs(all => all.map(r => String(r.id ?? r.resource_id) === itemId ? { ...r, partner_status: newStatus } : r));
    const body = await ervFetch('partner-update', { action: 'record_status', record_type: 'resource', record_id: itemId, partner_status: newStatus }).catch(e => ({ error: e.message }));
    if (body?.error) {
      setRvs(all => all.map(r => String(r.id ?? r.resource_id) === itemId ? { ...r, partner_status: prev.partner_status } : r));
      window.alert(`Failed to update RV status: ${body.error ?? 'Unknown error'}`);
    }
  }, [rvs]);

  const tabs: { key: SubTab; label: string }[] = [
    { key: 'survivors', label: 'Survivors' },
    { key: 'volunteers', label: 'Volunteers' },
    { key: 'rvs', label: 'RVs' },
  ];

  return (
    <div className="pt-20 pb-20 px-4 bg-[#0F1E2B] min-h-screen text-white">
      {/* Sub-tab toggle */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-xs font-medium px-4 py-1.5 rounded-full transition-colors ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {loading ? (
        <p className="text-white/40 text-sm">Loading...</p>
      ) : (
        <>
          {activeTab === 'survivors' && (
            <SurvivorsKanban data={survivors} onCardClick={handleCardClick} onStatusChange={handleSurvivorStatusChange} />
          )}
          {activeTab === 'volunteers' && <VolunteersKanban data={volunteers} onCardClick={handleCardClick} />}
          {activeTab === 'rvs' && <RVsKanban data={rvs} onCardClick={handleCardClick} onStatusChange={handleRVStatusChange} />}
        </>
      )}
    </div>
  );
}
