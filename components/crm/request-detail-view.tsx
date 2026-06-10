'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  AlertTriangle,
  MapPin,
  PenLine,
  Check,
  X,
  User,
  Phone,
  Mail,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface RequestDetailViewProps {
  request: any;
  matches: any[];
  notes: any[];
  onRefetch: () => void;
  onEdit: (field: string, value: any) => void;
  onPostNote: (text: string) => void;
  saving: boolean;
  postingNote: boolean;
}

const URGENCY_OPTIONS = ['critical', 'high', 'medium', 'low'];
const STATUS_OPTIONS = ['pending', 'approved', 'matched', 'fulfilled', 'closed'];

const URGENCY_COLORS: Record<string, string> = {
  critical: '#EF4E4B',
  high: '#F97316',
  medium: '#89CFF0',
  low: 'rgba(255,255,255,0.3)',
};

const DOT_COLORS: Record<string, string> = {
  request: '#EF4E4B',
  match: '#89CFF0',
  note: '#FCD34D',
};

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

interface TimelineEvent {
  type: 'request' | 'match' | 'note';
  date: string;
  title: string;
  desc?: string;
  status?: string;
  score?: number;
}

function EditableField({
  label,
  field,
  value,
  type = 'text',
  options,
  saving,
  onEdit,
}: {
  label: string;
  field: string;
  value: any;
  type?: 'text' | 'number' | 'select';
  options?: string[];
  saving: boolean;
  onEdit: (field: string, value: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value));

  const start = () => {
    setDraft(value == null ? '' : String(value));
    setEditing(true);
  };
  const commit = () => {
    onEdit(field, type === 'number' ? Number(draft) : draft);
    setEditing(false);
  };

  return (
    <div className="group flex items-start justify-between gap-3 py-2.5 border-b border-[var(--hairline)] last:border-0">
      <div className="text-xs text-[var(--foreground)]/40 pt-0.5 shrink-0 w-24">{label}</div>
      {editing ? (
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          {type === 'select' ? (
            <select
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="bg-[var(--surface-1)] border border-[var(--hairline)] rounded-lg px-2 py-1 text-sm outline-none capitalize"
            >
              {options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="bg-[var(--surface-1)] border border-[var(--hairline)] rounded-lg px-2 py-1 text-sm outline-none w-full max-w-[180px] text-right"
            />
          )}
          <button
            onClick={commit}
            disabled={saving}
            className="p-1 rounded-md hover:bg-foreground/5 disabled:opacity-40"
            aria-label="Save"
          >
            <Check size={15} color="#4ADE80" />
          </button>
          <button onClick={() => setEditing(false)} className="p-1 rounded-md hover:bg-foreground/5" aria-label="Cancel">
            <X size={15} />
          </button>
        </div>
      ) : (
        <button onClick={start} className="flex items-center gap-1.5 text-sm text-right min-w-0">
          <span className="truncate capitalize">
            {value == null || value === '' ? <span className="text-[var(--foreground)]/30">—</span> : String(value)}
          </span>
          <PenLine size={13} className="shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
        </button>
      )}
    </div>
  );
}

export default function RequestDetailView({
  request,
  matches,
  notes,
  onRefetch,
  onEdit,
  onPostNote,
  saving,
  postingNote,
}: RequestDetailViewProps) {
  const [noteMode, setNoteMode] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const urgencyColor = URGENCY_COLORS[request?.urgency] || URGENCY_COLORS.low;
  const heading = request?.taxonomy_code || request?.category || 'Request';
  const locationLine = [request?.location_text, request?.city, request?.state, request?.county]
    .filter(Boolean)
    .join(', ');
  const person = request?.persons;

  const flags = [
    request?.has_children && 'Children',
    request?.has_elderly && 'Elderly',
    request?.has_disabled && 'Disabled',
    request?.has_pets && 'Pets',
  ].filter(Boolean) as string[];

  const events: TimelineEvent[] = [];
  if (request?.created_at)
    events.push({ type: 'request', date: request.created_at, title: 'Request Filed', desc: request.description, status: request.status });
  for (const m of matches)
    events.push({
      type: 'match',
      date: m.created_at,
      title: 'Match: ' + (m.resources?.organizations?.name || m.resources?.description || 'Resource'),
      desc: m.reasoning,
      status: m.status,
      score: m.match_score,
    });
  for (const n of notes)
    events.push({ type: 'note', date: n.created_at, title: n.note_type === 'system' ? 'System Note' : 'Note Added', desc: n.note_text });
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSendNote = () => {
    const text = noteText.trim();
    if (!text) return;
    onPostNote(text);
    setNoteText('');
  };

  return (
    <div className="flex flex-col h-full" style={{ color: 'var(--foreground)' }}>
      {/* TOP BAR */}
      <div className="relative h-14 flex items-center justify-between px-4 sticky top-0 z-40 bg-[var(--surface-1)]/95 backdrop-blur-xl border-b border-[var(--hairline)]">
        <Link href="/app/cases" className="p-1 -ml-1 rounded-lg hover:bg-foreground/5 shrink-0">
          <ChevronLeft size={22} />
        </Link>
        <div className="absolute left-1/2 -translate-x-1/2 text-sm font-mono text-[var(--foreground)]/50">Request</div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: urgencyColor }} />
          <span className="text-xs rounded-full bg-foreground/5 px-2 py-0.5 capitalize">{request?.status || 'unknown'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {/* HERO CARD */}
        <div className="mx-4 mt-3 bg-[var(--surface-1)] border border-[var(--hairline)] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 shrink-0 bg-foreground/5 rounded-full flex items-center justify-center ring-2"
              style={{ '--tw-ring-color': urgencyColor } as React.CSSProperties}
            >
              <AlertTriangle size={18} color={urgencyColor} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-serif truncate">{heading}</div>
              {request?.category && <div className="text-xs text-[var(--foreground)]/40 truncate">{request.category}</div>}
              {locationLine && (
                <div className="flex items-center gap-1 text-xs text-[var(--foreground)]/30 truncate mt-0.5">
                  <MapPin size={11} className="shrink-0" />
                  {locationLine}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-[10px] rounded-full px-2 py-0.5 capitalize" style={{ backgroundColor: urgencyColor + '33', color: urgencyColor }}>
              {request?.urgency || 'low'} urgency
            </span>
            {request?.household_size != null && (
              <span className="text-[10px] bg-foreground/5 rounded-full px-2 py-0.5 text-[var(--foreground)]/50">
                Household of {request.household_size}
              </span>
            )}
            {flags.map((f) => (
              <span key={f} className="text-[10px] bg-[#FCD34D]/15 text-[#FCD34D] rounded-full px-2 py-0.5">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* EDITABLE FIELDS */}
        <div className="mx-4 mt-3 bg-[var(--surface-1)] border border-[var(--hairline)] rounded-xl px-4 py-1">
          <EditableField label="Description" field="description" value={request?.description} saving={saving} onEdit={onEdit} />
          <EditableField label="Urgency" field="urgency" value={request?.urgency} type="select" options={URGENCY_OPTIONS} saving={saving} onEdit={onEdit} />
          <EditableField label="Status" field="status" value={request?.status} type="select" options={STATUS_OPTIONS} saving={saving} onEdit={onEdit} />
          <EditableField label="Household" field="household_size" value={request?.household_size} type="number" saving={saving} onEdit={onEdit} />
        </div>

        {/* PERSON CARD */}
        {person && (
          <div className="mx-4 mt-3 flex items-center gap-3 bg-[var(--surface-1)] border border-[var(--hairline)] rounded-xl p-4">
            <div className="w-9 h-9 shrink-0 bg-foreground/5 rounded-full flex items-center justify-center">
              <User size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{person.display_name || 'Anonymous'}</div>
              <div className="flex flex-wrap gap-3 mt-0.5">
                {person.phone && (
                  <span className="flex items-center gap-1 text-xs text-[var(--foreground)]/40">
                    <Phone size={11} /> {person.phone}
                  </span>
                )}
                {person.email && (
                  <span className="flex items-center gap-1 text-xs text-[var(--foreground)]/40 truncate">
                    <Mail size={11} /> {person.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE */}
        <div className="px-4 py-4">
          <div className="text-[10px] uppercase tracking-wide text-[var(--foreground)]/30 mb-3">Timeline</div>
          {events.length === 0 && <div className="text-center text-[var(--foreground)]/30 text-sm py-8">No activity yet</div>}
          {events.map((ev, i) => {
            const isOpen = !!expanded[i];
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-3 h-3 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: DOT_COLORS[ev.type] }} />
                  {i !== events.length - 1 && <span className="w-0.5 flex-1 bg-foreground/5" />}
                </div>
                <button
                  onClick={() => setExpanded((p) => ({ ...p, [i]: !p[i] }))}
                  className="flex-1 text-left bg-[var(--surface-1)]/50 rounded-lg p-3 mb-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{ev.title}</span>
                    <span className="text-[10px] text-[var(--foreground)]/30 shrink-0 mt-0.5">{timeAgo(ev.date)}</span>
                  </div>
                  {ev.desc && (
                    <div className={'text-xs text-[var(--foreground)]/50 mt-1 ' + (isOpen ? '' : 'line-clamp-2')}>{ev.desc}</div>
                  )}
                  {(ev.status || typeof ev.score === 'number') && (
                    <div className="flex items-center gap-2 mt-2">
                      {ev.status && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/5 text-[var(--foreground)]/60 capitalize">{ev.status}</span>
                      )}
                      {typeof ev.score === 'number' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#89CFF0]/20 text-[#89CFF0]">
                          {Math.round(ev.score * 100) / 100} score
                        </span>
                      )}
                    </div>
                  )}
                  {isOpen && <div className="text-[10px] text-[var(--foreground)]/30 mt-2">{new Date(ev.date).toLocaleString()}</div>}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* NOTE INPUT */}
      {noteMode && (
        <div className="px-4 pb-2">
          <textarea
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note…"
            className="w-full bg-[var(--surface-1)] border border-[var(--hairline)] rounded-lg p-3 text-sm resize-none outline-none focus:border-white/20"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSendNote}
              disabled={postingNote || !noteText.trim()}
              className="bg-[#EF4E4B] rounded-lg px-4 py-2 text-xs font-medium disabled:opacity-50"
            >
              {postingNote ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BAR */}
      <div className="sticky bottom-0 bg-[var(--surface-1)]/95 backdrop-blur-xl border-t border-[var(--hairline)] px-6 py-3">
        <div className="grid grid-cols-2">
          <button
            onClick={() => setNoteMode((v) => !v)}
            className={'flex flex-col items-center gap-1 text-[10px] ' + (noteMode ? 'text-[var(--foreground)]' : 'text-[var(--foreground)]/50')}
          >
            <PenLine size={20} color={noteMode ? '#FCD34D' : undefined} />
            Note
          </button>
          <button onClick={() => toast('Coming soon')} className="flex flex-col items-center gap-1 text-[10px] text-[var(--foreground)]/50">
            <Zap size={20} />
            Match
          </button>
        </div>
      </div>
    </div>
  );
}
