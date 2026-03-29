'use client';

import { useState, useEffect } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { supabase } from '@/lib/supabase-client';

interface PendingLearning {
  id: string;
  pattern: string;
  confidence: number;
  category: string;
  evidence_count: number;
  status: string;
  created_at: string;
  source_agent?: string;
}

interface TrustFlag {
  id: string;
  name: string;
  org_type: string;
  trust_score: number;
  reason: string;
}

type Tab = 'learnings' | 'trust' | 'skills' | 'orgs';

export default function ApprovalsPage() {
  const [tab, setTab] = useState<Tab>('learnings');
  const [learnings, setLearnings] = useState<PendingLearning[]>([]);
  const [trustFlags, setTrustFlags] = useState<TrustFlag[]>([]);
  const [pendingOrgs, setPendingOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // Pending learnings
      const { data: learningData } = await supabase
        .from('system_learnings')
        .select('id, pattern, confidence, category, evidence_count, status, created_at')
        .eq('status', 'proposed')
        .order('confidence', { ascending: false });

      setLearnings(learningData || []);

      // Trust flags — orgs with low trust
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name, org_type, trust_score')
        .not('trust_score', 'is', null)
        .lt('trust_score', 0.4)
        .order('trust_score', { ascending: true });

      setTrustFlags((orgData || []).map(o => ({
        id: o.id,
        name: o.name,
        org_type: o.org_type,
        trust_score: o.trust_score,
        reason: o.trust_score < 0.2 ? 'Critical: trust below 20%' : 'Warning: trust below 40%',
      })));

      // Pending org registrations
      try {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id, name, org_type, capabilities, coverage_radius_km, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        setPendingOrgs(orgData || []);
      } catch { /* table may not have status column yet */ }

      setLoading(false);
    }
    load();
  }, []);

  async function handleLearning(id: string, action: 'active' | 'rejected') {
    setActing(id);
    await supabase.from('system_learnings').update({ status: action }).eq('id', id);
    // Audit trail
    await supabase.from('audit_log').insert({
      action: `learning_${action}`,
      actor_type: 'admin',
      details: `Learning ${id} → ${action}`,
    }).then(() => {});
    setLearnings(prev => prev.filter(l => l.id !== id));
    setActing(null);
  }

  async function handleTrust(orgId: string, action: 'override' | 'suspend') {
    setActing(orgId);
    if (action === 'suspend') {
      await supabase.from('organizations').update({ status: 'suspended' }).eq('id', orgId);
    } else {
      await supabase.from('organizations').update({ trust_score: 0.5 }).eq('id', orgId);
    }
    // Audit trail
    await supabase.from('audit_log').insert({
      action: `trust_${action}`,
      actor_type: 'admin',
      details: `Org ${orgId} → ${action}`,
    }).then(() => {});
    setTrustFlags(prev => prev.filter(f => f.id !== orgId));
    setActing(null);
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'orgs', label: 'Pending Orgs', count: pendingOrgs.length },
    { id: 'learnings', label: 'System Learnings', count: learnings.length },
    { id: 'trust', label: 'Trust Flags', count: trustFlags.length },
    { id: 'skills', label: 'Skill Alerts', count: 0 },
  ];

  return (
    <AdminShell title="Approval Queue" subtitle="Human-in-the-loop decisions">
      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
              tab === t.id ? 'bg-sos-blue-800 text-white' : 'bg-white border border-sos-gray-300 text-sos-gray-600 hover:bg-sos-gray-200'
            }`}
          >
            {t.label} {t.count > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-sos-red-500 text-white text-[9px]">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Pending Orgs tab */}
          {tab === 'orgs' && (
            <div className="space-y-3">
              {pendingOrgs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-sos-gray-300">
                  <span className="text-3xl">✓</span>
                  <h3 className="text-base font-bold text-sos-blue-800 mt-2">No Pending Applications</h3>
                  <p className="text-sm text-sos-gray-600">All org registrations have been reviewed.</p>
                </div>
              ) : pendingOrgs.map(org => (
                <div key={org.id} className={`bg-white rounded-xl border border-sos-gray-300 overflow-hidden ${acting === org.id ? 'opacity-50' : ''}`}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-sos-blue-800">{org.name}</h4>
                      <span className="text-[10px] text-sos-gray-400">{new Date(org.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div><span className="text-sos-gray-500">Type</span><p className="font-medium text-sos-blue-800 capitalize">{org.org_type?.replace(/_/g, ' ')}</p></div>
                      
                      {org.coverage_radius_km && <div><span className="text-sos-gray-500">Coverage</span><p className="font-medium text-sos-blue-800">{org.coverage_radius_km} km</p></div>}
                    </div>
                    {org.capabilities?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {org.capabilities.map((c: string) => (
                          <span key={c} className="text-[9px] bg-sos-accent-50 text-sos-accent-700 px-1.5 py-0.5 rounded-full">{c.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex border-t border-sos-gray-300">
                    <button
                      onClick={async () => {
                        setActing(org.id);
                        await supabase.from('organizations').update({ status: 'active', trust_score: 0.7 }).eq('id', org.id);
                        await supabase.from('audit_log').insert({ action: 'org_approved', actor_type: 'admin', details: `Org ${org.name} (${org.id}) approved, trust set to 0.7` }).then(() => {});
                        setPendingOrgs(prev => prev.filter(o => o.id !== org.id));
                        setActing(null);
                      }}
                      className="flex-1 py-3 text-center text-sm font-bold text-green-600 hover:bg-green-50 transition-colors border-r border-sos-gray-300"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={async () => {
                        setActing(org.id);
                        await supabase.from('organizations').update({ status: 'rejected' }).eq('id', org.id);
                        await supabase.from('audit_log').insert({ action: 'org_rejected', actor_type: 'admin', details: `Org ${org.name} (${org.id}) rejected` }).then(() => {});
                        setPendingOrgs(prev => prev.filter(o => o.id !== org.id));
                        setActing(null);
                      }}
                      className="flex-1 py-3 text-center text-sm font-bold text-sos-red-500 hover:bg-sos-red-50 transition-colors"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Learnings tab */}
          {tab === 'learnings' && (
            <div className="space-y-3">
              {learnings.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-sos-gray-300">
                  <span className="text-3xl">✓</span>
                  <h3 className="text-base font-bold text-sos-blue-800 mt-2">Queue Clear</h3>
                  <p className="text-sm text-sos-gray-600">No pending learnings to review.</p>
                </div>
              ) : learnings.map(learning => (
                <div key={learning.id} className={`bg-white rounded-xl border border-sos-gray-300 overflow-hidden ${acting === learning.id ? 'opacity-50' : ''}`}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-sos-gray-500 uppercase">{learning.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-sos-gray-400">{learning.evidence_count} evidence</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          learning.confidence >= 0.8 ? 'bg-green-50 text-green-700' :
                          learning.confidence >= 0.5 ? 'bg-yellow-50 text-yellow-700' :
                          'bg-sos-gray-200 text-sos-gray-600'
                        }`}>
                          {Math.round(learning.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-sos-blue-800 leading-snug">{learning.pattern}</p>
                    <p className="text-[10px] text-sos-gray-400 mt-1">{new Date(learning.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex border-t border-sos-gray-300">
                    <button
                      onClick={() => handleLearning(learning.id, 'active')}
                      disabled={acting === learning.id}
                      className="flex-1 py-3 text-center text-sm font-bold text-green-600 hover:bg-green-50 transition-colors border-r border-sos-gray-300"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleLearning(learning.id, 'rejected')}
                      disabled={acting === learning.id}
                      className="flex-1 py-3 text-center text-sm font-bold text-sos-red-500 hover:bg-sos-red-50 transition-colors"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trust flags tab */}
          {tab === 'trust' && (
            <div className="space-y-3">
              {trustFlags.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-sos-gray-300">
                  <span className="text-3xl">✓</span>
                  <h3 className="text-base font-bold text-sos-blue-800 mt-2">No Trust Flags</h3>
                  <p className="text-sm text-sos-gray-600">All partners are above trust threshold.</p>
                </div>
              ) : trustFlags.map(flag => (
                <div key={flag.id} className={`bg-white rounded-xl border border-sos-gray-300 overflow-hidden ${acting === flag.id ? 'opacity-50' : ''}`}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-sos-blue-800">{flag.name}</h4>
                        <span className="text-[10px] text-sos-gray-500 capitalize">{flag.org_type?.replace(/_/g, ' ')}</span>
                      </div>
                      <span className={`text-lg font-bold ${flag.trust_score < 0.2 ? 'text-sos-red-500' : 'text-yellow-600'}`}>
                        {Math.round(flag.trust_score * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-sos-gray-600">{flag.reason}</p>
                  </div>
                  <div className="flex border-t border-sos-gray-300">
                    <button
                      onClick={() => handleTrust(flag.id, 'override')}
                      disabled={acting === flag.id}
                      className="flex-1 py-3 text-center text-sm font-bold text-sos-accent-700 hover:bg-sos-accent-50 transition-colors border-r border-sos-gray-300"
                    >
                      Reset to 50%
                    </button>
                    <button
                      onClick={() => handleTrust(flag.id, 'suspend')}
                      disabled={acting === flag.id}
                      className="flex-1 py-3 text-center text-sm font-bold text-sos-red-500 hover:bg-sos-red-50 transition-colors"
                    >
                      Suspend
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Skills tab */}
          {tab === 'skills' && (
            <div className="text-center py-12 bg-white rounded-xl border border-sos-gray-300">
              <span className="text-3xl">📊</span>
              <h3 className="text-base font-bold text-sos-blue-800 mt-2">Skill Monitoring</h3>
              <p className="text-sm text-sos-gray-600">Accuracy alerts will appear when skills drop below 80% threshold.</p>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
