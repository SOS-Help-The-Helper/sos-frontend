'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, Users, MapPin, Calendar, AlertTriangle,
  FileText, Plus, Clock, Shield,
} from 'lucide-react';
import type { QueueSurvivor } from '@/app/(partner)/queue/page';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SCORE_COMPONENTS: { label: string; points: number; flagKey: string }[] = [
  { label: 'Veteran', points: 25, flagKey: 'veteran' },
  { label: 'First Responder', points: 25, flagKey: 'first_responder' },
  { label: 'Single Parent', points: 20, flagKey: 'single_parent' },
  { label: 'Medical Needs', points: 15, flagKey: 'medical_needs' },
  { label: 'Children', points: 10, flagKey: 'children' },
  { label: 'Elderly', points: 10, flagKey: 'elderly' },
  { label: 'Uninsured', points: 5, flagKey: 'uninsured' },
];

const FLAG_BADGES: { key: string; emoji: string; label: string }[] = [
  { key: 'veteran', emoji: '🎖️', label: 'Veteran' },
  { key: 'first_responder', emoji: '🚒', label: 'First Responder' },
  { key: 'medical_needs', emoji: '🏥', label: 'Medical' },
  { key: 'single_parent', emoji: '👨‍👧', label: 'Single Parent' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreColor(score: number): { bg: string; text: string; dot: string } {
  if (score >= 80) return { bg: 'bg-red-900/40', text: 'text-red-300', dot: 'bg-red-400' };
  if (score >= 50) return { bg: 'bg-orange-900/40', text: 'text-orange-300', dot: 'bg-orange-400' };
  if (score >= 30) return { bg: 'bg-yellow-900/40', text: 'text-yellow-300', dot: 'bg-yellow-400' };
  return { bg: 'bg-gray-700/60', text: 'text-gray-400', dot: 'bg-gray-500' };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isFlagActive(survivor: QueueSurvivor, flagKey: string): boolean {
  return !!(survivor as unknown as Record<string, unknown>)[flagKey];
}

/* ------------------------------------------------------------------ */
/*  Detail Item                                                        */
/* ------------------------------------------------------------------ */

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | null | undefined;
}) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">{label}</p>
        <p className="text-sm text-gray-200 break-words">{value}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

interface SurvivorDetailModalProps {
  survivor: QueueSurvivor;
  onClose: () => void;
}

export function SurvivorDetailModal({ survivor, onClose }: SurvivorDetailModalProps) {
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const scoreStyle = getScoreColor(survivor.priority_score);
  const notes: { text: string; added_at: string; added_by: string }[] =
    Array.isArray((survivor.metadata as Record<string, unknown>)?.notes)
      ? ((survivor.metadata as Record<string, unknown>).notes as { text: string; added_at: string; added_by: string }[])
      : [];

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleAddNote = useCallback(() => {
    // Placeholder — notes would go through an EF in a real flow
    const text = noteText.trim();
    if (!text) return;
    setNoteText('');
    setAddingNote(false);
  }, [noteText]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8 md:pt-16">
        <div
          className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* ---- 1. Header ---- */}
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-700">
            <div className="min-w-0 flex items-center gap-3">
              {/* Score badge */}
              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${scoreStyle.bg} ${scoreStyle.text} font-bold text-lg flex-shrink-0`}>
                {survivor.priority_score}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-100 truncate">{survivor.name}</h2>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${scoreStyle.bg} ${scoreStyle.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${scoreStyle.dot}`} />
                  Priority {survivor.priority_score}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-100 transition-colors flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">

            {/* ---- 2. Person Details ---- */}
            <div className="px-5 py-4 border-b border-gray-700">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Person Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <DetailItem icon={FileText} label="Name" value={survivor.name} />
                <DetailItem icon={Users} label="Household Size" value={survivor.household_size} />
                <DetailItem icon={MapPin} label="Location" value={survivor.location} />
                <DetailItem icon={AlertTriangle} label="Disaster" value={survivor.disaster} />
                <DetailItem icon={Shield} label="Urgency" value={survivor.urgency} />
                <DetailItem icon={Calendar} label="Submitted" value={formatDate(survivor.submitted)} />
              </div>
            </div>

            {/* ---- 3. Flags ---- */}
            <div className="px-5 py-4 border-b border-gray-700">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Flags</h3>
              <div className="flex flex-wrap gap-2">
                {FLAG_BADGES.map(f => {
                  const active = isFlagActive(survivor, f.key);
                  return (
                    <span
                      key={f.key}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                        active
                          ? 'bg-blue-900/30 text-blue-300 border-blue-700'
                          : 'bg-gray-800 text-gray-600 border-gray-700'
                      }`}
                    >
                      {f.emoji} {f.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* ---- 4. Score Breakdown ---- */}
            <div className="px-5 py-4 border-b border-gray-700">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Score Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-800">
                      <th className="text-left py-2 pr-3 font-medium">Component</th>
                      <th className="text-right py-2 pr-3 font-medium">Points</th>
                      <th className="text-right py-2 font-medium">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SCORE_COMPONENTS.map(comp => {
                      const active = isFlagActive(survivor, comp.flagKey);
                      return (
                        <tr key={comp.label} className="border-b border-gray-800/50">
                          <td className={`py-2 pr-3 ${active ? 'text-gray-200' : 'text-gray-600'}`}>
                            {comp.label}
                          </td>
                          <td className={`py-2 pr-3 text-right font-semibold ${active ? 'text-green-400' : 'text-gray-700'}`}>
                            {active ? `+${comp.points}` : '—'}
                          </td>
                          <td className="py-2 text-right">
                            <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-green-400' : 'bg-gray-700'}`} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-700">
                      <td className="py-2 pr-3 text-gray-300 font-medium">Total</td>
                      <td className="py-2 pr-3 text-right text-gray-100 font-bold">{survivor.priority_score}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ---- 5. Request Details ---- */}
            <div className="px-5 py-4 border-b border-gray-700">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Request Details</h3>
              {survivor.description || survivor.details_sanitized ? (
                <p className="text-sm text-gray-200 leading-relaxed">
                  {survivor.description || survivor.details_sanitized}
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">No description available</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mt-3">
                <DetailItem icon={Shield} label="Urgency" value={survivor.urgency} />
                <DetailItem icon={FileText} label="Status" value={survivor.status} />
                <DetailItem icon={Calendar} label="Submitted" value={formatDate(survivor.submitted)} />
              </div>
            </div>

            {/* ---- 6. Notes ---- */}
            <div className="px-5 py-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</h3>
                {!addingNote && (
                  <button
                    onClick={() => setAddingNote(true)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Note
                  </button>
                )}
              </div>

              {notes.length === 0 && !addingNote ? (
                <p className="text-sm text-gray-500 italic">No notes yet</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                        {idx < notes.length - 1 && (
                          <div className="w-px flex-1 bg-gray-700 mt-1" />
                        )}
                      </div>
                      <div className="pb-2 min-w-0">
                        <p className="text-sm text-gray-200 break-words">{note.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-600" />
                          <span className="text-[10px] text-gray-500">
                            {formatDateTime(note.added_at)}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            by {note.added_by}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline add note */}
              {addingNote && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                    placeholder="Type a note..."
                    className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setAddingNote(false); setNoteText(''); }}
                    className="text-xs text-gray-400 hover:text-gray-200 px-2"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* ---- 7. Actions ---- */}
            <div className="px-5 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Actions</h3>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors">
                  Propose Match
                </button>
                <button
                  onClick={() => setAddingNote(true)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-600 hover:text-gray-100 hover:border-gray-500 transition-colors"
                >
                  Add Note
                </button>
                <button className="px-4 py-2 rounded-lg text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-600 hover:text-gray-100 hover:border-gray-500 transition-colors">
                  Change Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
