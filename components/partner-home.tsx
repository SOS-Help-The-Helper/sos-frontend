'use client';

import { useAuthContext } from '@/lib/auth-context';
import { StatCard } from './stat-card';

interface PartnerHomeProps {
  stats: {
    openMatches: number;
    inProgress: number;
    completed: number;
    avgTimeMin: number;
    familiesServed: number;
    peopleServed: number;
    fastestMin: number;
  };
}

export function PartnerHome({ stats }: PartnerHomeProps) {
  const { orgName, orgType } = useAuthContext();

  return (
    <div className="space-y-4">
      {/* Welcome */}
      <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
        <h2 className="text-lg font-bold text-sos-blue-800">
          Welcome back{orgName ? `, ${orgName}` : ''}
        </h2>
        {orgType && (
          <p className="text-xs text-sos-gray-600 capitalize mt-0.5">
            {orgType.replace(/_/g, ' ')}
          </p>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Open Matches"
          value={stats.openMatches}
          subtitle="Awaiting response"
          accent="red"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          subtitle="Being coordinated"
          accent="accent"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          subtitle="Successfully fulfilled"
          accent="blue"
        />
        <StatCard
          label="Avg Response"
          value={stats.avgTimeMin ? `${stats.avgTimeMin}m` : '—'}
          subtitle="Time to fulfill"
          accent="blue"
        />
      </div>

      {/* Agent Status */}
      <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          <h3 className="text-sm font-bold text-sos-blue-800">SOS Agent Online</h3>
        </div>
        <p className="text-xs text-sos-gray-600 mb-3">
          Your coordination partner is ready. Ask about matches, capacity, or get a situation brief.
        </p>
        <a
          href="/agent"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sos-accent-700 hover:text-sos-accent-900 transition-colors"
        >
          Open agent chat →
        </a>
      </div>

      {/* Impact Summary */}
      <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
        <h3 className="text-sm font-bold text-sos-blue-800 mb-3">📊 Your Impact</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-sos-accent-50">
            <p className="text-2xl font-bold text-sos-blue-800">{stats.familiesServed}</p>
            <p className="text-[10px] text-sos-gray-600 mt-0.5">Families helped</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-sos-accent-50">
            <p className="text-2xl font-bold text-sos-blue-800">{stats.peopleServed}</p>
            <p className="text-[10px] text-sos-gray-600 mt-0.5">People served</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-sos-accent-50">
            <p className="text-2xl font-bold text-sos-blue-800">{stats.fastestMin}m</p>
            <p className="text-[10px] text-sos-gray-600 mt-0.5">Fastest response</p>
          </div>
        </div>
      </div>
    </div>
  );
}
