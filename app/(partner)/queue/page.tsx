'use client';

import { useEffect, useState, useMemo } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { SurvivorDetailModal } from '@/components/partner/survivor-detail-modal';
import { MatchWizard } from '@/components/partner/match-wizard';
import { Search, ChevronDown, GitCompare, Eye } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface QueueSurvivor {
  id?: string;
  name: string;
  priority_score: number;
  urgency: string;
  household_size: number;
  location: string;
  veteran: boolean;
  first_responder: boolean;
  medical_needs: boolean;
  single_parent: boolean;
  disaster: string;
  submitted: string;
  // optional fields the detail modal may use
  description?: string;
  details_sanitized?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

type FilterFlag = 'veteran' | 'first_responder' | 'medical' | 'fema';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://rtduqguwhkczexnoawej.supabase.co';

const FILTER_CHIPS: { key: FilterFlag; label: string }[] = [
  { key: 'veteran', label: 'Veteran' },
  { key: 'first_responder', label: 'First Responder' },
  { key: 'medical', label: 'Medical' },
  { key: 'fema', label: 'FEMA Replacement' },
];

const SCORE_COMPONENTS: { label: string; points: number; description: string }[] = [
  { label: 'Veteran', points: 25, description: 'Military veteran status' },
  { label: 'First Responder', points: 25, description: 'First responder status' },
  { label: 'Single Parent', points: 20, description: 'Single parent household' },
  { label: 'Medical Needs', points: 15, description: 'Medical needs present' },
  { label: 'Children', points: 10, description: 'Children in household' },
  { label: 'Elderly', points: 10, description: 'Elderly household members' },
  { label: 'Uninsured', points: 5, description: 'No insurance coverage' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreColor(score: number): { bg: string; text: string; ring: string } {
  if (score >= 80) return { bg: 'bg-red-500', text: 'text-white', ring: 'ring-red-200' };
  if (score >= 50) return { bg: 'bg-orange-500', text: 'text-white', ring: 'ring-orange-200' };
  if (score >= 30) return { bg: 'bg-yellow-400', text: 'text-yellow-900', ring: 'ring-yellow-200' };
  return { bg: 'bg-sos-gray-300', text: 'text-sos-gray-700', ring: 'ring-sos-gray-200' };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getFlags(s: QueueSurvivor): { emoji: string; label: string }[] {
  const flags: { emoji: string; label: string }[] = [];
  if (s.veteran) flags.push({ emoji: '🎖️', label: 'Veteran' });
  if (s.first_responder) flags.push({ emoji: '🚒', label: 'First Responder' });
  if (s.medical_needs) flags.push({ emoji: '🏥', label: 'Medical' });
  if (s.single_parent) flags.push({ emoji: '👨‍👧', label: 'Single Parent' });
  return flags;
}

/* ------------------------------------------------------------------ */
/*  Score Breakdown Tooltip                                            */
/* ------------------------------------------------------------------ */

function ScoreBreakdown({ survivor }: { survivor: QueueSurvivor }) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3 pointer-events-none">
      <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Score Breakdown</p>
      <div className="space-y-1.5">
        {SCORE_COMPONENTS.map(comp => {
          const active =
            (comp.label === 'Veteran' && survivor.veteran) ||
            (comp.label === 'First Responder' && survivor.first_responder) ||
            (comp.label === 'Medical Needs' && survivor.medical_needs) ||
            (comp.label === 'Single Parent' && survivor.single_parent);
          return (
            <div key={comp.label} className="flex items-center justify-between">
              <span className={`text-xs ${active ? 'text-gray-200' : 'text-gray-600'}`}>
                {comp.label}
              </span>
              <span className={`text-xs font-semibold ${active ? 'text-green-400' : 'text-gray-700'}`}>
                {active ? `+${comp.points}` : '—'}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium">Total</span>
        <span className="text-sm text-gray-100 font-bold">{survivor.priority_score}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Survivor Card                                                      */
/* ------------------------------------------------------------------ */

function SurvivorCard({
  survivor,
  onView,
  onPropose,
}: {
  survivor: QueueSurvivor;
  onView: () => void;
  onPropose: () => void;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const scoreStyle = getScoreColor(survivor.priority_score);
  const flags = getFlags(survivor);

  return (
    <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4 hover:shadow-md hover:border-sos-accent-300 transition-all">
      <div className="flex items-start gap-4">
        {/* Score circle */}
        <div
          className="relative flex-shrink-0"
          onMouseEnter={() => setShowBreakdown(true)}
          onMouseLeave={() => setShowBreakdown(false)}
          onClick={() => setShowBreakdown(prev => !prev)}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scoreStyle.bg} ${scoreStyle.text} ring-2 ${scoreStyle.ring} font-bold text-lg cursor-help`}>
            {survivor.priority_score}
          </div>
          {showBreakdown && <ScoreBreakdown survivor={survivor} />}
        </div>

        {/* Center info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-sos-blue-800">{survivor.name}</span>
            {flags.map(f => (
              <span
                key={f.label}
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sos-blue-50 text-sos-blue-800"
              >
                {f.emoji} {f.label}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-sos-gray-600">
            <span>Household: {survivor.household_size}</span>
            <span className="text-sos-gray-400">|</span>
            <span>{survivor.location}</span>
            {survivor.disaster && (
              <>
                <span className="text-sos-gray-400">|</span>
                <span className="text-sos-accent-700 font-medium">{survivor.disaster}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-[11px] text-sos-gray-500">
            <span>Urgency: <span className="font-semibold capitalize">{survivor.urgency}</span></span>
            <span className="text-sos-gray-400">|</span>
            <span>Submitted {formatDate(survivor.submitted)}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={onPropose}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-sos-accent-300 text-sos-accent-700 hover:bg-sos-accent-50 transition-colors"
            >
              <GitCompare className="h-3 w-3" /> Propose Match
            </button>
            <button
              onClick={onView}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-sos-gray-300 text-sos-gray-700 hover:bg-sos-gray-200 transition-colors"
            >
              <Eye className="h-3 w-3" /> View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Queue Page                                                         */
/* ------------------------------------------------------------------ */

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueSurvivor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<FilterFlag>>(new Set());
  const [disasterFilter, setDisasterFilter] = useState<string>('all');
  const [selectedSurvivor, setSelectedSurvivor] = useState<QueueSurvivor | null>(null);
  const [wizardRequest, setWizardRequest] = useState<QueueSurvivor | null>(null);

  /* ---- Fetch queue ---- */
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/erv-query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ query_type: 'priority_queue', limit: 50 }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setQueue(data.queue || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load queue');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ---- Unique disasters for dropdown ---- */
  const disasters = useMemo(() => {
    const set = new Set<string>();
    queue.forEach(s => { if (s.disaster) set.add(s.disaster); });
    return Array.from(set).sort();
  }, [queue]);

  /* ---- Filter + search ---- */
  const filtered = useMemo(() => {
    let items = queue;

    // Flag filters (AND logic)
    if (activeFilters.has('veteran')) items = items.filter(s => s.veteran);
    if (activeFilters.has('first_responder')) items = items.filter(s => s.first_responder);
    if (activeFilters.has('medical')) items = items.filter(s => s.medical_needs);
    if (activeFilters.has('fema')) {
      // FEMA Replacement: filter for disaster-linked requests (proxy for FEMA)
      items = items.filter(s => !!s.disaster);
    }

    // Disaster dropdown
    if (disasterFilter !== 'all') {
      items = items.filter(s => s.disaster === disasterFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        (s.disaster || '').toLowerCase().includes(q),
      );
    }

    return items;
  }, [queue, activeFilters, disasterFilter, search]);

  /* ---- Toggle filter chip ---- */
  function toggleFilter(key: FilterFlag) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <DashboardShell title="Priority Queue" subtitle="Loading queue...">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5 h-24 animate-pulse" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <DashboardShell title="Priority Queue" subtitle="Error loading queue">
        <div className="bg-sos-red-50 border border-sos-red-100 rounded-xl p-6 text-center">
          <p className="text-sm text-sos-red-700">Failed to load priority queue: {error}</p>
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
    <DashboardShell
      title="Priority Queue"
      subtitle={`${queue.length} active survivor${queue.length !== 1 ? 's' : ''}`}
    >
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {/* Filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_CHIPS.map(chip => {
            const active = activeFilters.has(chip.key);
            return (
              <button
                key={chip.key}
                onClick={() => toggleFilter(chip.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  active
                    ? 'bg-sos-blue-800 text-white border-sos-blue-800'
                    : 'bg-[#FDFCFA] text-sos-gray-600 border-sos-gray-300 hover:border-sos-blue-800 hover:text-sos-blue-800'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Disaster dropdown */}
        <div className="relative">
          <select
            value={disasterFilter}
            onChange={e => setDisasterFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-sos-gray-300 bg-[#FDFCFA] text-xs font-medium text-sos-blue-800 focus:outline-none focus:ring-2 focus:ring-sos-accent-300 focus:border-sos-accent-300 cursor-pointer"
          >
            <option value="all">All Disasters</option>
            {disasters.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sos-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sos-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, location, or disaster..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-sos-gray-300 bg-[#FDFCFA] text-sm text-sos-blue-800 placeholder:text-sos-gray-400 focus:outline-none focus:ring-2 focus:ring-sos-accent-300 focus:border-sos-accent-300"
        />
      </div>

      {/* Active filter count */}
      {(activeFilters.size > 0 || disasterFilter !== 'all') && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-sos-gray-500">
            Showing {filtered.length} of {queue.length} survivors
          </span>
          <button
            onClick={() => { setActiveFilters(new Set()); setDisasterFilter('all'); setSearch(''); }}
            className="text-xs font-medium text-sos-accent-700 hover:text-sos-accent-900"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Queue list */}
      <div className="space-y-2">
        {filtered.length > 0 ? (
          filtered.map((survivor, idx) => (
            <SurvivorCard
              key={`${survivor.name}-${idx}`}
              survivor={survivor}
              onView={() => setSelectedSurvivor(survivor)}
              onPropose={() => setWizardRequest(survivor)}
            />
          ))
        ) : (
          <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-8 text-center">
            <p className="text-sm text-sos-gray-500">
              {search.trim()
                ? `No survivors matching "${search}"`
                : activeFilters.size > 0 || disasterFilter !== 'all'
                  ? 'No survivors match the current filters'
                  : 'No survivors in the priority queue'}
            </p>
            {(search.trim() || activeFilters.size > 0 || disasterFilter !== 'all') && (
              <button
                onClick={() => { setActiveFilters(new Set()); setDisasterFilter('all'); setSearch(''); }}
                className="mt-2 text-xs font-medium text-sos-accent-700 hover:text-sos-accent-900"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Survivor Detail Modal */}
      {selectedSurvivor && (
        <SurvivorDetailModal
          survivor={selectedSurvivor}
          onClose={() => setSelectedSurvivor(null)}
          onProposeMatch={s => {
            setSelectedSurvivor(null);
            setWizardRequest(s);
          }}
        />
      )}

      {/* Match Wizard */}
      {wizardRequest && (
        <MatchWizard
          preselected={{ requestId: wizardRequest.id }}
          onClose={() => setWizardRequest(null)}
          onPropose={() => {
            setWizardRequest(null);
          }}
        />
      )}
    </DashboardShell>
  );
}
