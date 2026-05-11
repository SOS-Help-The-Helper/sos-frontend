'use client';
import { useEffect, useState, useCallback } from 'react';
import { usePartnerOrg } from '@/lib/partner-context';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

type SubTab = 'survivors' | 'volunteers' | 'rvs';

function SurvivorsKanban({ data }: { data: any[] }) {
  if (data.length === 0) return <p className="text-white/40 text-sm">Loading survivors...</p>;
  return <p className="text-white/60 text-sm">Loaded {data.length} survivors</p>;
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
          {activeTab === 'survivors' && <SurvivorsKanban data={survivors} />}
          {activeTab === 'volunteers' && <VolunteersKanban data={volunteers} />}
          {activeTab === 'rvs' && <RVsKanban data={rvs} />}
        </>
      )}
    </div>
  );
}
