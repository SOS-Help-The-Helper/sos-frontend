'use client';
import { db } from '@/lib/api';

import { useState, useEffect } from 'react';
import { AdminShell } from '@/components/admin-shell';
// TODO: rewire to EF (Phase 4) — import { getHenryBrain } from '@/lib/henry-brain';

interface DivisionCard {
  name: string;
  emoji: string;
  agents: number;
  traces: number;
  learnings: number;
  cost: string;
  status: 'healthy' | 'degraded' | 'down';
}

interface AgentStatus {
  id: string;
  name: string;
  division: string;
  last_active: string;
  session_count: number;
  trace_count: number;
  status: 'active' | 'idle' | 'error';
}

export default function HealthPage() {
  const [divisions, setDivisions] = useState<DivisionCard[]>([]);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState({ tables: 0, rows: 0, size: '—' });

  useEffect(() => {
    async function load() {
      // SOS operational stats
      const [{ count: reqCount }, { count: resCount }, { count: matchCount }, { count: eventCount }, { count: traceCount }, { count: learningCount }] = await Promise.all([
        db.from('requests').select('id', { count: 'exact', head: true }),
        db.from('resources').select('id', { count: 'exact', head: true }),
        db.from('matches').select('id', { count: 'exact', head: true }),
        db.from('match_events').select('id', { count: 'exact', head: true }),
        db.from('signal_traces').select('id', { count: 'exact', head: true }),
        db.from('system_learnings').select('id', { count: 'exact', head: true }),
      ]);

      // Henry Brain agent stats (if available)
      let brainAgents: any[] = [];
      const brain = getHenryBrain();
      if (brain) {
        try {
          const { data } = await brain.from('agent_sessions').select('agent_id, created_at, status').order('created_at', { ascending: false }).limit(50);
          brainAgents = data || [];
        } catch { /* brain not configured yet */ }
      }

      // Build division cards
      const sosTraces = traceCount || 0;
      const sosLearnings = learningCount || 0;

      setDivisions([
        { name: 'SOS', emoji: '🆘', agents: 5, traces: sosTraces, learnings: sosLearnings, cost: '—', status: 'healthy' },
        { name: 'Harmony', emoji: '🎵', agents: 0, traces: 0, learnings: 0, cost: '—', status: 'idle' as any },
        { name: 'Grunt', emoji: '⚙️', agents: 0, traces: 0, learnings: 0, cost: '—', status: 'idle' as any },
      ]);

      // Build agent table
      const sosAgents: AgentStatus[] = [
        { id: 'sos-citizen', name: 'Citizen Agent', division: 'SOS', last_active: new Date().toISOString(), session_count: 0, trace_count: 0, status: 'active' },
        { id: 'sos-platform', name: 'Platform Brain', division: 'SOS', last_active: new Date().toISOString(), session_count: 0, trace_count: 0, status: 'active' },
        { id: 'sos-aid-arena', name: 'Aid Arena', division: 'SOS', last_active: new Date().toISOString(), session_count: 0, trace_count: 0, status: 'active' },
        { id: 'sos-erv', name: 'Emergency RV', division: 'SOS', last_active: new Date().toISOString(), session_count: 0, trace_count: 0, status: 'active' },
        { id: 'sos-fhm', name: 'Free Hot Meals', division: 'SOS', last_active: new Date().toISOString(), session_count: 0, trace_count: 0, status: 'active' },
      ];

      // Enrich from brain data if available
      brainAgents.forEach(ba => {
        const match = sosAgents.find(a => a.id === ba.agent_id);
        if (match) {
          match.session_count++;
          if (new Date(ba.created_at) > new Date(match.last_active)) {
            match.last_active = ba.created_at;
          }
        }
      });

      setAgents(sosAgents);
      setDbStats({
        tables: 29,
        rows: (reqCount || 0) + (resCount || 0) + (matchCount || 0) + (eventCount || 0),
        size: '—',
      });
      setLoading(false);
    }
    load();
  }, []);

  const statusColors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-sos-red-500',
    idle: 'bg-sos-gray-400',
    active: 'text-green-600',
    error: 'text-sos-red-500',
  };

  function timeSince(d: string) {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  return (
    <AdminShell title="Organism Health" subtitle="All divisions, agents, and system status">
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {/* Division cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {divisions.map(div => (
              <div key={div.name} className="bg-white rounded-xl border border-sos-gray-300 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{div.emoji}</span>
                    <h3 className="text-base font-bold text-sos-blue-800">{div.name}</h3>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColors[div.status] || statusColors.idle}`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-lg font-bold text-sos-blue-800">{div.agents}</p><p className="text-[10px] text-sos-gray-500">Agents</p></div>
                  <div><p className="text-lg font-bold text-sos-blue-800">{div.traces.toLocaleString()}</p><p className="text-[10px] text-sos-gray-500">Traces</p></div>
                  <div><p className="text-lg font-bold text-sos-blue-800">{div.learnings}</p><p className="text-[10px] text-sos-gray-500">Learnings</p></div>
                  <div><p className="text-lg font-bold text-sos-blue-800">{div.cost}</p><p className="text-[10px] text-sos-gray-500">Daily Cost</p></div>
                </div>
              </div>
            ))}
          </div>

          {/* DB stats */}
          <div className="bg-sos-blue-800 text-white rounded-xl p-5">
            <h3 className="text-sm font-bold mb-3">SIGNAL V2 Database</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xl font-bold">{dbStats.tables}</p><p className="text-[10px] text-white/50">Tables</p></div>
              <div><p className="text-xl font-bold">{dbStats.rows.toLocaleString()}</p><p className="text-[10px] text-white/50">Total Rows</p></div>
              <div><p className="text-xl font-bold">{dbStats.size}</p><p className="text-[10px] text-white/50">DB Size</p></div>
            </div>
          </div>

          {/* Agent table */}
          <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
            <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Agent Status</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sos-gray-300">
                    <th className="text-left text-[10px] font-semibold text-sos-gray-600 uppercase py-2 pr-4">Agent</th>
                    <th className="text-left text-[10px] font-semibold text-sos-gray-600 uppercase py-2 pr-4">Division</th>
                    <th className="text-left text-[10px] font-semibold text-sos-gray-600 uppercase py-2 pr-4">Status</th>
                    <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase py-2 pr-4">Sessions</th>
                    <th className="text-right text-[10px] font-semibold text-sos-gray-600 uppercase py-2">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map(agent => (
                    <tr key={agent.id} className="border-b border-sos-gray-200 last:border-0">
                      <td className="py-2.5 pr-4">
                        <span className="text-sm font-medium text-sos-blue-800">{agent.name}</span>
                        <span className="text-[10px] text-sos-gray-400 ml-2">{agent.id}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-sos-gray-600">{agent.division}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs font-semibold ${statusColors[agent.status] || 'text-sos-gray-400'}`}>
                          {agent.status === 'active' ? '● Active' : agent.status === 'idle' ? '○ Idle' : '✗ Error'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-sm text-sos-blue-800">{agent.session_count}</td>
                      <td className="py-2.5 text-right text-xs text-sos-gray-500">{timeSince(agent.last_active)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
