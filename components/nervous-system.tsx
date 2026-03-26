'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';

interface AgentNode {
  id: string;
  label: string;
  shortLabel: string;
  type: 'channel' | 'runtime' | 'agent' | 'skill' | 'data' | 'view';
  status: 'healthy' | 'slow' | 'down' | 'suspended';
  count: number;
  x: number;
  y: number;
  isBrain?: boolean;
}

interface PulseEvent {
  id: string;
  from: string;
  to: string;
  color: string;
  progress: number;
}

const NODES: AgentNode[] = [
  // Channels (y=30)
  { id: 'ch-imessage', label: 'iMessage', shortLabel: 'iMsg', type: 'channel', status: 'healthy', count: 0, x: 150, y: 30 },
  { id: 'ch-whatsapp', label: 'WhatsApp', shortLabel: 'WA', type: 'channel', status: 'healthy', count: 0, x: 300, y: 30 },
  { id: 'ch-slack', label: 'Slack', shortLabel: 'Slk', type: 'channel', status: 'healthy', count: 0, x: 450, y: 30 },
  { id: 'ch-web', label: 'Web', shortLabel: 'Web', type: 'channel', status: 'healthy', count: 0, x: 600, y: 30 },
  // Runtime (y=90)
  { id: 'runtime', label: 'OpenClaw Runtime', shortLabel: 'Runtime', type: 'runtime', status: 'healthy', count: 0, x: 375, y: 90 },
  // Agents (y=170)
  { id: 'sos-citizen', label: 'Citizen Agent', shortLabel: 'Citizen', type: 'agent', status: 'healthy', count: 0, x: 100, y: 170 },
  { id: 'sos-platform', label: 'Platform Brain', shortLabel: 'Brain', type: 'agent', status: 'healthy', count: 0, x: 300, y: 170, isBrain: true },
  { id: 'sos-aid-arena', label: 'Aid Arena', shortLabel: 'AA', type: 'agent', status: 'healthy', count: 0, x: 470, y: 155 },
  { id: 'sos-erv', label: 'Emergency RV', shortLabel: 'ERV', type: 'agent', status: 'healthy', count: 0, x: 580, y: 170 },
  { id: 'sos-fhm', label: 'Free Hot Meals', shortLabel: 'FHM', type: 'agent', status: 'healthy', count: 0, x: 680, y: 155 },
  // Skills (y=250)
  { id: 'skills', label: 'NanoClaw Skills', shortLabel: 'Skills', type: 'skill', status: 'healthy', count: 8, x: 375, y: 250 },
  // Supabase (y=310)
  { id: 'supabase', label: 'SIGNAL V2', shortLabel: 'DB', type: 'data', status: 'healthy', count: 93, x: 375, y: 310 },
  // Views (y=370)
  { id: 'view-citizen', label: 'Citizen View', shortLabel: 'Citizen', type: 'view', status: 'healthy', count: 0, x: 175, y: 370 },
  { id: 'view-command', label: 'Command Center', shortLabel: 'Command', type: 'view', status: 'healthy', count: 0, x: 375, y: 370 },
  { id: 'view-partner', label: 'Partner View', shortLabel: 'Partner', type: 'view', status: 'healthy', count: 0, x: 575, y: 370 },
];

const CONNECTIONS = [
  // Channels → Runtime
  { from: 'ch-imessage', to: 'runtime' },
  { from: 'ch-whatsapp', to: 'runtime' },
  { from: 'ch-slack', to: 'runtime' },
  { from: 'ch-web', to: 'runtime' },
  // Runtime → Agents
  { from: 'runtime', to: 'sos-citizen' },
  { from: 'runtime', to: 'sos-platform' },
  { from: 'runtime', to: 'sos-aid-arena' },
  { from: 'runtime', to: 'sos-erv' },
  { from: 'runtime', to: 'sos-fhm' },
  // Agents → Skills
  { from: 'sos-citizen', to: 'skills' },
  { from: 'sos-platform', to: 'skills' },
  // Skills → Supabase
  { from: 'skills', to: 'supabase' },
  // Supabase → Views
  { from: 'supabase', to: 'view-citizen' },
  { from: 'supabase', to: 'view-command' },
  { from: 'supabase', to: 'view-partner' },
];

const STATUS_COLORS = {
  healthy: '#22C55E',
  slow: '#F59E0B',
  down: '#EF4E4B',
  suspended: '#A6A6A6',
};

const SKILL_PILLS = [
  { name: 'intake-parser', active: true },
  { name: 'match-engine', active: true },
  { name: 'triage', active: true },
  { name: 'geocoder', active: true },
  { name: 'pii-sanitizer', active: true },
  { name: 'route-dispatch', active: true },
  { name: 'nws-monitor', active: true },
  { name: 'resource-search', active: false },
  { name: 'x-intel', active: false },
];

interface NervousSystemProps {
  metrics?: {
    intakesToday: number;
    matchesProposed: number;
    matchesFulfilled: number;
    avgResponseMin: number;
  };
}

export function NervousSystem({ metrics }: NervousSystemProps) {
  const [pulses, setPulses] = useState<PulseEvent[]>([]);
  const [nodes, setNodes] = useState(NODES);

  // Simulate periodic pulses for demo (replace with Supabase Realtime)
  useEffect(() => {
    const interval = setInterval(() => {
      const paths = [
        { from: 'sos-citizen', to: 'sos-platform', color: '#89CFF0' },
        { from: 'sos-platform', to: 'sos-erv', color: '#EF4E4B' },
        { from: 'sos-platform', to: 'sos-aid-arena', color: '#EF4E4B' },
        { from: 'ch-web', to: 'runtime', color: '#89CFF0' },
      ];
      const path = paths[Math.floor(Math.random() * paths.length)];

      const pulse: PulseEvent = {
        id: crypto.randomUUID(),
        ...path,
        progress: 0,
      };

      setPulses(prev => [...prev, pulse]);

      // Remove pulse after animation
      setTimeout(() => {
        setPulses(prev => prev.filter(p => p.id !== pulse.id));
      }, 1500);
    }, 3000 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, []);

  function getNode(id: string) {
    return nodes.find(n => n.id === id);
  }

  return (
    <div className="bg-sos-bg rounded-xl border border-sos-gray-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-semibold text-white">System Nervous System</span>
          <span className="text-[10px] text-white/40">7 agents · all healthy</span>
        </div>
        <button className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition-colors">
          Replay 24h
        </button>
      </div>

      {/* SVG Visualization */}
      <svg viewBox="0 0 750 400" className="w-full h-[360px]">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection Lines */}
        {CONNECTIONS.map(conn => {
          const from = getNode(conn.from);
          const to = getNode(conn.to);
          if (!from || !to) return null;
          return (
            <line
              key={`${conn.from}-${conn.to}`}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke="#89CFF0"
              strokeWidth="1"
              strokeOpacity="0.15"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Animated Pulses */}
        {pulses.map(pulse => {
          const from = getNode(pulse.from);
          const to = getNode(pulse.to);
          if (!from || !to) return null;
          return (
            <circle
              key={pulse.id}
              r="4"
              fill={pulse.color}
              filter="url(#glow)"
              opacity="0.9"
            >
              <animate
                attributeName="cx"
                from={from.x} to={to.x}
                dur="1.5s" fill="freeze"
              />
              <animate
                attributeName="cy"
                from={from.y} to={to.y}
                dur="1.5s" fill="freeze"
              />
              <animate
                attributeName="opacity"
                from="0.9" to="0"
                begin="1.2s" dur="0.3s" fill="freeze"
              />
            </circle>
          );
        })}

        {/* Channel Pills */}
        {nodes.filter(n => n.type === 'channel').map(node => (
          <g key={node.id}>
            <rect x={node.x - 35} y={node.y - 12} width="70" height="24" rx="12"
              fill="#89CFF0" fillOpacity="0.1" stroke="#89CFF0" strokeOpacity="0.3" strokeWidth="1" />
            <circle cx={node.x - 20} cy={node.y} r="3" fill={STATUS_COLORS[node.status]} />
            <text x={node.x - 8} y={node.y + 4} fill="#89CFF0" fontSize="10" fontFamily="Roboto" fontWeight="500">
              {node.shortLabel}
            </text>
          </g>
        ))}

        {/* Runtime Bar */}
        <rect x="175" y="78" width="400" height="28" rx="6" fill="#1A3850" stroke="#89CFF0" strokeOpacity="0.2" strokeWidth="1" />
        <text x="240" y="96" fill="white" fontSize="10" fontFamily="Roboto" fontWeight="700">OpenClaw Runtime</text>
        <text x="420" y="96" fill="#89CFF0" fillOpacity="0.5" fontSize="9" fontFamily="Roboto">JSONL · 12 agents</text>

        {/* Agent Nodes */}
        {nodes.filter(n => n.type === 'agent').map(node => {
          const w = node.isBrain ? 110 : 85;
          const h = node.isBrain ? 44 : 36;
          return (
            <g key={node.id}>
              {node.isBrain && (
                <rect x={node.x - w/2 - 3} y={node.y - h/2 - 3} width={w + 6} height={h + 6} rx="10"
                  fill="none" stroke="#EF4E4B" strokeOpacity="0.3" strokeWidth="1">
                  <animate attributeName="stroke-opacity" values="0.1;0.4;0.1" dur="3s" repeatCount="indefinite" />
                </rect>
              )}
              <rect x={node.x - w/2} y={node.y - h/2} width={w} height={h} rx="8"
                fill="#1A3850" stroke={node.isBrain ? '#EF4E4B' : '#89CFF0'} strokeOpacity="0.3" strokeWidth="1" />
              <circle cx={node.x - w/2 + 14} cy={node.y - 2} r="3.5" fill={STATUS_COLORS[node.status]} />
              <text x={node.x - w/2 + 24} y={node.y + 2} fill="white" fontSize="9" fontFamily="Roboto" fontWeight="600">
                {node.shortLabel}
              </text>
              {node.isBrain && (
                <text x={node.x - w/2 + 14} y={node.y + 14} fill="#89CFF0" fillOpacity="0.6" fontSize="8" fontFamily="Roboto">
                  {node.count} decisions
                </text>
              )}
            </g>
          );
        })}

        {/* Skills Bar */}
        <rect x="125" y="238" width="500" height="28" rx="6" fill="#F7F7F7" fillOpacity="0.08" stroke="#89CFF0" strokeOpacity="0.1" strokeWidth="1" />
        <text x="145" y="256" fill="#89CFF0" fillOpacity="0.6" fontSize="9" fontFamily="Roboto" fontWeight="600">Skills:</text>
        {SKILL_PILLS.slice(0, 6).map((skill, i) => (
          <g key={skill.name}>
            <rect x={195 + i * 65} y={244} width="60" height="16" rx="8"
              fill={skill.active ? '#89CFF0' : '#A6A6A6'} fillOpacity={skill.active ? 0.1 : 0.05}
              stroke={skill.active ? '#89CFF0' : '#A6A6A6'} strokeOpacity={0.2} strokeWidth="0.5" />
            <text x={200 + i * 65} y={255} fill={skill.active ? '#89CFF0' : '#A6A6A6'}
              fillOpacity={skill.active ? 0.6 : 0.3} fontSize="7" fontFamily="Roboto">
              {skill.name.split('-').pop()}
            </text>
          </g>
        ))}

        {/* Supabase Bar */}
        <rect x="150" y="298" width="450" height="28" rx="6" fill="#0F1E2B" stroke="#89CFF0" strokeOpacity="0.15" strokeWidth="1" />
        <text x="190" y="316" fill="white" fillOpacity="0.7" fontSize="10" fontFamily="Roboto" fontWeight="700">SIGNAL V2</text>
        {['S', 'I', 'G', 'N', 'A', 'L'].map((letter, i) => (
          <g key={letter}>
            <rect x={310 + i * 24} y={304} width="18" height="18" rx="4"
              fill="#89CFF0" fillOpacity="0.1" stroke="#89CFF0" strokeOpacity="0.15" strokeWidth="0.5" />
            <text x={315 + i * 24} y={317} fill="#89CFF0" fillOpacity="0.7" fontSize="10" fontFamily="Roboto" fontWeight="700">
              {letter}
            </text>
          </g>
        ))}
        <text x="465" y="316" fill="white" fillOpacity="0.3" fontSize="8" fontFamily="Roboto">93 tables</text>

        {/* View Nodes */}
        {nodes.filter(n => n.type === 'view').map(node => (
          <g key={node.id}>
            <rect x={node.x - 50} y={node.y - 12} width="100" height="24" rx="6"
              fill="none" stroke="#89CFF0" strokeOpacity="0.3" strokeWidth="1" />
            <text x={node.x - 35} y={node.y + 4} fill="#89CFF0" fillOpacity="0.7" fontSize="9" fontFamily="Roboto" fontWeight="500">
              {node.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Metrics Bar */}
      <div className="px-4 py-2 border-t border-white/10 flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40">Intakes:</span>
          <span className="text-[10px] font-semibold text-white">{metrics?.intakesToday ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40">Matches:</span>
          <span className="text-[10px] font-semibold text-white">{metrics?.matchesProposed ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40">Fulfilled:</span>
          <span className="text-[10px] font-semibold text-green-400">{metrics?.matchesFulfilled ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40">Avg:</span>
          <span className="text-[10px] font-semibold text-white">{metrics?.avgResponseMin ?? 0}m</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-white/30">All systems operational</span>
        </div>
      </div>
    </div>
  );
}
