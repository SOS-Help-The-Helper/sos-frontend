'use client';
import { db } from '@/lib/api';

import { useState, useEffect } from 'react';
import { AdminShell } from '@/components/admin-shell';

interface SignalTrace {
  id: string;
  agent_id: string;
  layer: string;
  trace_type: string;
  content: string;
  confidence: number;
  created_at: string;
}

interface SystemLearning {
  id: string;
  pattern: string;
  confidence: number;
  category: string;
  status: string;
  evidence_count: number;
  created_at: string;
}

const LAYER_COLORS: Record<string, string> = {
  S: 'bg-sos-red-500',
  I: 'bg-sos-accent-600',
  G: 'bg-green-500',
  N: 'bg-yellow-500',
  A: 'bg-purple-500',
  L: 'bg-sos-blue-800',
};

const LAYER_NAMES: Record<string, string> = {
  S: 'Signal', I: 'Intelligence', G: 'Graph', N: 'Network', A: 'Adaptive', L: 'Learning',
};

type Tab = 'traces' | 'learnings';

export default function IntelligencePage() {
  const [tab, setTab] = useState<Tab>('traces');
  const [traces, setTraces] = useState<SignalTrace[]>([]);
  const [learnings, setLearnings] = useState<SystemLearning[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState('all');
  const [layerFilter, setLayerFilter] = useState('all');

  useEffect(() => {
    async function load() {
      const [{ data: traceData }, { data: learningData }] = await Promise.all([
        supabase
          .from('signal_traces')
          .select('id, agent_id, layer, trace_type, content, confidence, created_at')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('system_learnings')
          .select('id, pattern, confidence, category, status, evidence_count, created_at')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      setTraces(traceData || []);
      setLearnings(learningData || []);
      setLoading(false);
    }
    load();
  }, []);

  const agents = [...new Set(traces.map(t => t.agent_id))].sort();
  const layers = [...new Set(traces.map(t => t.layer))].sort();

  const filteredTraces = traces.filter(t => {
    if (agentFilter !== 'all' && t.agent_id !== agentFilter) return false;
    if (layerFilter !== 'all' && t.layer !== layerFilter) return false;
    return true;
  });

  function timeSince(d: string) {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  return (
    <AdminShell title="Intelligence Feed" subtitle="SIGNAL traces and system learnings">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('traces')} className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${tab === 'traces' ? 'bg-sos-blue-800 text-white' : 'bg-white border border-sos-gray-300 text-sos-gray-600'}`}>
          Signal Traces ({traces.length})
        </button>
        <button onClick={() => setTab('learnings')} className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${tab === 'learnings' ? 'bg-sos-blue-800 text-white' : 'bg-white border border-sos-gray-300 text-sos-gray-600'}`}>
          System Learnings ({learnings.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : tab === 'traces' ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-sos-gray-300 bg-white text-sos-blue-800 font-medium">
              <option value="all">All Agents</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="flex bg-white rounded-lg border border-sos-gray-300 p-0.5">
              <button onClick={() => setLayerFilter('all')} className={`text-[10px] px-2 py-1 rounded-md font-bold ${layerFilter === 'all' ? 'bg-sos-blue-800 text-white' : 'text-sos-gray-500'}`}>ALL</button>
              {layers.map(l => (
                <button key={l} onClick={() => setLayerFilter(l)} className={`text-[10px] px-2 py-1 rounded-md font-bold ${layerFilter === l ? 'bg-sos-blue-800 text-white' : 'text-sos-gray-500'}`}>
                  {l}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-sos-gray-400 self-center">{filteredTraces.length} traces</span>
          </div>

          {/* Trace list */}
          <div className="space-y-1.5">
            {filteredTraces.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-sos-gray-300">
                <p className="text-sm text-sos-gray-600">No signal traces found. Traces are generated when agents process requests, matches, and learnings.</p>
              </div>
            ) : filteredTraces.map(trace => (
              <div key={trace.id} className="bg-white rounded-lg border border-sos-gray-300 p-3 flex items-start gap-3">
                {/* Layer badge */}
                <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold ${LAYER_COLORS[trace.layer] || 'bg-sos-gray-400'}`}>
                  {trace.layer}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-sos-gray-500">{trace.agent_id}</span>
                    <span className="text-[10px] text-sos-gray-300">•</span>
                    <span className="text-[10px] text-sos-gray-400">{LAYER_NAMES[trace.layer] || trace.layer}</span>
                    <span className="text-[10px] text-sos-gray-300">•</span>
                    <span className="text-[10px] text-sos-gray-400">{trace.trace_type}</span>
                  </div>
                  <p className="text-xs text-sos-blue-800 leading-snug truncate">{trace.content}</p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-[10px] text-sos-gray-400">{timeSince(trace.created_at)}</span>
                  {trace.confidence > 0 && (
                    <span className={`text-[9px] font-bold mt-0.5 ${trace.confidence >= 0.8 ? 'text-green-600' : trace.confidence >= 0.5 ? 'text-yellow-600' : 'text-sos-gray-400'}`}>
                      {Math.round(trace.confidence * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Learnings explorer */
        <div className="space-y-3">
          {/* SIGNAL layer overview */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            {Object.entries(LAYER_NAMES).map(([key, name]) => {
              const count = learnings.filter(l => l.category?.startsWith(key.toLowerCase())).length;
              return (
                <div key={key} className="bg-white rounded-lg border border-sos-gray-300 p-3 text-center">
                  <div className={`w-6 h-6 rounded-md mx-auto mb-1 flex items-center justify-center text-white text-[10px] font-bold ${LAYER_COLORS[key]}`}>{key}</div>
                  <p className="text-xs font-bold text-sos-blue-800">{count}</p>
                  <p className="text-[9px] text-sos-gray-500">{name}</p>
                </div>
              );
            })}
          </div>

          {learnings.map(learning => (
            <div key={learning.id} className="bg-white rounded-xl border border-sos-gray-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-sos-gray-500 uppercase">{learning.category}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    learning.status === 'active' ? 'bg-green-50 text-green-700' :
                    learning.status === 'proposed' ? 'bg-yellow-50 text-yellow-700' :
                    learning.status === 'validated' ? 'bg-sos-accent-50 text-sos-accent-700' :
                    'bg-sos-gray-200 text-sos-gray-500'
                  }`}>{learning.status}</span>
                </div>
                <span className={`text-xs font-bold ${learning.confidence >= 0.8 ? 'text-green-600' : learning.confidence >= 0.5 ? 'text-yellow-600' : 'text-sos-gray-400'}`}>
                  {Math.round(learning.confidence * 100)}%
                </span>
              </div>
              <p className="text-sm text-sos-blue-800 leading-snug">{learning.pattern}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-sos-gray-400">
                <span>{learning.evidence_count} evidence</span>
                <span>{new Date(learning.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
