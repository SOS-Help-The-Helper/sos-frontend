'use client';
import { useEffect, useState, useCallback } from 'react';
import { usePartnerOrg } from '@/lib/partner-context';
import { KanbanBoard, KanbanColumn } from '@/components/partner/kanban-board';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

type SubTab = 'survivors' | 'volunteers' | 'rvs';

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
}: {
  data: any[];
  onCardClick: (item: any) => void;
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
    />
  );
}

function VolunteersKanban({ data }: { data: any[] }) {
  if (data.length === 0) return <p className="text-white/40 text-sm">Loading volunteers...</p>;
  return <p className="text-white/60 text-sm">Loaded {data.length} volunteers</p>;
}

function RVsKanban({ data }: { data: any[] }) {
  if (data.length === 0) return <p className="text-white/40 text-sm">Loading RVs...</p>;
  return <p className="text-white/60 text-sm">Loaded {data.length} RVs</p>;
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
    if (!orgId) return;
    setLoading(true);
    const key = process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '';
    const headers = { 'x-partner-key': key, 'Content-Type': 'application/json' };

    if (tab === 'survivors') {
      const res = await fetch(`${SB_URL}/functions/v1/partner-read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query_type: 'recent_requests', filters: { org_id: orgId }, limit: 3000 }),
      }).then(r => r.json()).catch(() => ({ results: [] }));
      setSurvivors(res.results || []);
    } else if (tab === 'rvs') {
      const res = await fetch(`${SB_URL}/functions/v1/partner-read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query_type: 'resource_summary', filters: { org_id: orgId }, limit: 1000 }),
      }).then(r => r.json()).catch(() => ({ results: [] }));
      setRvs(res.results || []);
    } else if (tab === 'volunteers') {
      const res = await fetch(`${SB_URL}/functions/v1/partner-read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query_type: 'person_lookup', filters: { org_id: orgId, role: 'volunteer' }, limit: 500 }),
      }).then(r => r.json()).catch(() => ({ results: [] }));
      setVolunteers(res.results || []);
    }

    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchTab(activeTab); }, [activeTab, fetchTab]);

  const handleCardClick = useCallback((item: any) => {
    setSelectedItem(item);
    console.log('Selected item:', item);
  }, []);

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
            <SurvivorsKanban data={survivors} onCardClick={handleCardClick} />
          )}
          {activeTab === 'volunteers' && <VolunteersKanban data={volunteers} />}
          {activeTab === 'rvs' && <RVsKanban data={rvs} />}
        </>
      )}
    </div>
  );
}
