'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { type FilterConfig, DEFAULT_FILTER } from '@/lib/filter-engine';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = ['active', 'matched', 'fulfilled', 'closed', 'paused', 'expired'] as const;
const URGENCY_OPTIONS = ['critical', 'high', 'standard'] as const;
const TIME_RANGE_OPTIONS = ['24h', '7d', '30d', 'all'] as const;
const CATEGORY_OPTIONS = ['housing', 'food', 'medical', 'transport', 'supplies', 'utilities', 'safety'] as const;

const MI_TO_KM = 1.60934;
const KM_TO_MI = 1 / MI_TO_KM;
const MAX_DISTANCE_MI = 500;

const LABEL: Record<string, string> = {
  active: 'Active', matched: 'Matched', fulfilled: 'Fulfilled',
  closed: 'Closed', paused: 'Paused', expired: 'Expired',
  critical: 'Critical', high: 'High', standard: 'Standard',
  '24h': '24h', '7d': '7d', '30d': '30d', all: 'All',
  housing: 'Housing', food: 'Food', medical: 'Medical',
  transport: 'Transport', supplies: 'Supplies', utilities: 'Utilities', safety: 'Safety',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-700 pb-3 mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between text-sm font-semibold text-gray-100 mb-2"
      >
        {title}
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && children}
    </div>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        selected
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-gray-800 text-gray-400 border-gray-600 hover:text-gray-200 hover:border-gray-500'
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  config: FilterConfig;
  onChange: (config: FilterConfig) => void;
  onSave: (name: string) => void;
}

export function FilterPanel({ open, onClose, config, onChange, onSave }: FilterPanelProps) {
  // Local draft that only commits on Apply
  const [draft, setDraft] = useState<FilterConfig>(config);
  const [savingTab, setSavingTab] = useState(false);
  const [tabName, setTabName] = useState('');
  const tabInputRef = useRef<HTMLInputElement>(null);

  // Sync draft when config changes externally
  useEffect(() => {
    setDraft(config);
  }, [config]);

  // Focus tab name input when save mode opens
  useEffect(() => {
    if (savingTab) tabInputRef.current?.focus();
  }, [savingTab]);

  // ---------------------------------------------------------------------------
  // Draft updaters
  // ---------------------------------------------------------------------------

  const toggleMulti = useCallback(<K extends keyof FilterConfig>(
    key: K,
    value: string,
  ) => {
    setDraft(prev => {
      const arr = prev[key] as string[];
      const next = arr.includes(value)
        ? arr.filter(v => v !== value)
        : [...arr, value];
      return { ...prev, [key]: next };
    });
  }, []);

  const setTimeRange = useCallback((range: FilterConfig['timeRange']) => {
    setDraft(prev => ({ ...prev, timeRange: range }));
  }, []);

  const setDistanceMi = useCallback((mi: number) => {
    setDraft(prev => ({
      ...prev,
      distanceKm: mi === 0 ? null : Math.round(mi * MI_TO_KM),
    }));
  }, []);

  const distanceMi = draft.distanceKm != null ? Math.round(draft.distanceKm * KM_TO_MI) : 0;

  // ---------------------------------------------------------------------------
  // Footer actions
  // ---------------------------------------------------------------------------

  const handleClear = useCallback(() => {
    setDraft({ ...DEFAULT_FILTER });
  }, []);

  const handleApply = useCallback(() => {
    onChange(draft);
    onClose();
  }, [draft, onChange, onClose]);

  const handleSave = useCallback(() => {
    const name = tabName.trim();
    if (!name) return;
    onSave(name);
    setSavingTab(false);
    setTabName('');
  }, [tabName, onSave]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel — desktop (right slide) */}
      <div
        className={`
          fixed z-50 bg-gray-900 border-gray-700 flex flex-col
          transition-transform duration-300 ease-in-out
          hidden md:flex
          top-0 right-0 h-full w-80 border-l
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <PanelContent
          draft={draft}
          distanceMi={distanceMi}
          savingTab={savingTab}
          tabName={tabName}
          tabInputRef={tabInputRef}
          toggleMulti={toggleMulti}
          setTimeRange={setTimeRange}
          setDistanceMi={setDistanceMi}
          handleClear={handleClear}
          handleApply={handleApply}
          handleSave={handleSave}
          setSavingTab={setSavingTab}
          setTabName={setTabName}
          onClose={onClose}
        />
      </div>

      {/* Panel — mobile (bottom sheet) */}
      <div
        className={`
          fixed z-50 bg-gray-900 border-gray-700 flex flex-col
          transition-transform duration-300 ease-in-out
          md:hidden
          bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl border-t
          ${open ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-gray-600" />
        </div>
        <PanelContent
          draft={draft}
          distanceMi={distanceMi}
          savingTab={savingTab}
          tabName={tabName}
          tabInputRef={tabInputRef}
          toggleMulti={toggleMulti}
          setTimeRange={setTimeRange}
          setDistanceMi={setDistanceMi}
          handleClear={handleClear}
          handleApply={handleApply}
          handleSave={handleSave}
          setSavingTab={setSavingTab}
          setTabName={setTabName}
          onClose={onClose}
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Inner content (shared between desktop & mobile shells)
// ---------------------------------------------------------------------------

interface PanelContentProps {
  draft: FilterConfig;
  distanceMi: number;
  savingTab: boolean;
  tabName: string;
  tabInputRef: React.RefObject<HTMLInputElement | null>;
  toggleMulti: <K extends keyof FilterConfig>(key: K, value: string) => void;
  setTimeRange: (range: FilterConfig['timeRange']) => void;
  setDistanceMi: (mi: number) => void;
  handleClear: () => void;
  handleApply: () => void;
  handleSave: () => void;
  setSavingTab: (v: boolean) => void;
  setTabName: (v: string) => void;
  onClose: () => void;
}

function PanelContent({
  draft,
  distanceMi,
  savingTab,
  tabName,
  tabInputRef,
  toggleMulti,
  setTimeRange,
  setDistanceMi,
  handleClear,
  handleApply,
  handleSave,
  setSavingTab,
  setTabName,
  onClose,
}: PanelContentProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-100">Filters</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-100">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Status */}
        <Section title="Status">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(s => (
              <Chip
                key={s}
                label={LABEL[s]}
                selected={draft.statuses.includes(s)}
                onClick={() => toggleMulti('statuses', s)}
              />
            ))}
          </div>
        </Section>

        {/* Urgency */}
        <Section title="Urgency">
          <div className="flex flex-wrap gap-2">
            {URGENCY_OPTIONS.map(u => (
              <Chip
                key={u}
                label={LABEL[u]}
                selected={draft.urgencies.includes(u)}
                onClick={() => toggleMulti('urgencies', u)}
              />
            ))}
          </div>
        </Section>

        {/* Time Range */}
        <Section title="Time Range">
          <div className="flex flex-wrap gap-2">
            {TIME_RANGE_OPTIONS.map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  draft.timeRange === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-800 text-gray-400 border-gray-600 hover:text-gray-200 hover:border-gray-500'
                }`}
              >
                {LABEL[t]}
              </button>
            ))}
          </div>
        </Section>

        {/* Distance */}
        <Section title="Distance">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>0 mi</span>
              <span className="font-semibold text-gray-100">
                {distanceMi === 0 ? 'Off' : `${distanceMi} mi`}
              </span>
              <span>{MAX_DISTANCE_MI} mi</span>
            </div>
            <input
              type="range"
              min={0}
              max={MAX_DISTANCE_MI}
              step={5}
              value={distanceMi}
              onChange={e => setDistanceMi(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {draft.distanceCenter
                  ? `${draft.distanceCenter.lat.toFixed(2)}, ${draft.distanceCenter.lng.toFixed(2)}`
                  : 'Current location'}
              </span>
            </div>
            {!draft.distanceCenter && distanceMi > 0 && (
              <p className="text-xs text-yellow-500/80">
                Set a center location to activate distance filter
              </p>
            )}
          </div>
        </Section>

        {/* Category */}
        <Section title="Category">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map(c => (
              <Chip
                key={c}
                label={LABEL[c]}
                selected={draft.categories.includes(c)}
                onClick={() => toggleMulti('categories', c)}
              />
            ))}
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700 px-4 py-3">
        {savingTab ? (
          <div className="flex items-center gap-2">
            <input
              ref={tabInputRef}
              type="text"
              value={tabName}
              onChange={e => setTabName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Tab name..."
              className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleSave}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              Save
            </button>
            <button
              onClick={() => { setSavingTab(false); setTabName(''); }}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button
              onClick={handleClear}
              className="text-xs font-medium text-gray-400 hover:text-gray-200"
            >
              Clear All
            </button>
            <button
              onClick={() => setSavingTab(true)}
              className="text-xs font-medium text-gray-400 hover:text-gray-200"
            >
              Save as Tab
            </button>
            <button
              onClick={handleApply}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </>
  );
}
