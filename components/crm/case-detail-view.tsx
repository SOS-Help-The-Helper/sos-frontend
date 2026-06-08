'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Phone,
  MessageSquare,
  PenLine,
  Zap,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';

interface CaseDetailViewProps {
  person: {
    id: string;
    display_name: string | null;
    phone: string | null;
    email: string | null;
    sos_score: number | null;
    created_at: string;
  } | null;
  sos: {
    id: string;
    status: string;
    all_needs_met: boolean;
    request_count: number;
    fulfilled_count: number;
    created_at: string;
  } | null;
  requests: Array<{
    id: string;
    status: string;
    category: string;
    taxonomy_code: string;
    urgency: string;
    location_text: string;
    city: string;
    county: string;
    household_size: number;
    created_at: string;
    updated_at: string;
  }>;
  resources: Array<{
    id: string;
    status: string;
    category: string;
    taxonomy_code: string;
    capacity_available: number;
    created_at: string;
  }>;
  matches: Array<{
    id: string;
    request_id: string;
    resource_id: string;
    score: number;
    status: string;
    reasoning: string;
    created_at: string;
  }>;
  notes: Array<{
    id: string;
    note_text: string;
    note_type: string;
    author_id: string;
    created_at: string;
  }>;
  householdMembers: Array<{
    person_id: string;
    relationship: string;
    persons: { display_name: string };
  }>;
  onPostNote: (text: string) => void;
  postingNote: boolean;
  onRefetch: () => void;
  onChat: () => void;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}

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
  resource: '#4ADE80',
  sos: '#A855F7',
};

interface TimelineEvent {
  type: 'sos' | 'request' | 'match' | 'note' | 'resource';
  date: string;
  title: string;
  desc?: string;
  urgency?: string;
  status?: string;
  score?: number;
}

export default function CaseDetailView({
  person,
  sos,
  requests,
  resources,
  matches,
  notes,
  householdMembers,
  onPostNote,
  postingNote,
  onRefetch,
  onChat,
}: CaseDetailViewProps) {
  const [adminOpen, setAdminOpen] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const displayName = person?.display_name || 'Anonymous';
  const initial = (person?.display_name || 'A').charAt(0).toUpperCase();

  // Derive a top-level urgency for the case from the most severe request
  const urgencyRank: Record<string, number> = {
    critical: 3,
    high: 2,
    medium: 1,
    low: 0,
  };
  const caseUrgency = requests.reduce<string>((acc, r) => {
    if ((urgencyRank[r.urgency] ?? -1) > (urgencyRank[acc] ?? -1)) return r.urgency;
    return acc;
  }, 'low');
  const urgencyColor = URGENCY_COLORS[caseUrgency] || URGENCY_COLORS.low;

  // Location line from first request that has county/city
  const locRequest = requests.find((r) => r.county || r.city);
  const locationLine = locRequest?.county
    ? [locRequest.county, locRequest.city].filter(Boolean).join(', ')
    : null;

  // Days open
  const openSince = sos?.created_at || person?.created_at;
  const daysOpen = openSince
    ? Math.floor((Date.now() - new Date(openSince).getTime()) / 86400000)
    : 0;

  // Build timeline events
  const events: TimelineEvent[] = [];
  if (sos) {
    events.push({
      type: 'sos',
      date: sos.created_at,
      title: 'SOS Opened',
      desc: 'Coordination case created',
    });
  }
  for (const r of requests) {
    events.push({
      type: 'request',
      date: r.created_at,
      title: 'Request: ' + (r.taxonomy_code || r.category),
      desc: r.location_text,
      urgency: r.urgency,
      status: r.status,
    });
  }
  for (const m of matches) {
    events.push({
      type: 'match',
      date: m.created_at,
      title: 'Match Proposed',
      desc: m.reasoning?.slice(0, 100),
      score: m.score,
      status: m.status,
    });
  }
  for (const n of notes) {
    events.push({
      type: 'note',
      date: n.created_at,
      title: n.note_type === 'system' ? 'System Note' : 'Note Added',
      desc: n.note_text,
    });
  }
  for (const r of resources) {
    events.push({
      type: 'resource',
      date: r.created_at,
      title: 'Resource: ' + (r.taxonomy_code || r.category),
      desc: 'Capacity: ' + r.capacity_available,
      status: r.status,
    });
  }
  events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleSendNote = () => {
    const text = noteText.trim();
    if (!text) return;
    onPostNote(text);
    setNoteText('');
  };

  const adminItems = ['Reassign', 'Flag for Review', 'Close Case', 'Export'];

  return (
    <div className="flex flex-col h-full bg-[#0F1E2B] text-white">
      {/* TOP BAR */}
      <div className="relative h-14 flex items-center justify-between px-4 sticky top-0 z-40 bg-[#0F1E2B]/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/app/cases"
            className="p-1 -ml-1 rounded-lg hover:bg-white/10 shrink-0"
          >
            <ChevronLeft size={22} />
          </Link>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 text-lg font-medium truncate max-w-[50%] text-center">
          {displayName}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: urgencyColor }}
          />
          {sos?.status && (
            <span className="text-xs rounded-full bg-white/10 px-2 py-0.5">
              {sos.status}
            </span>
          )}
          <button
            onClick={() => setAdminOpen((v) => !v)}
            className="p-1 rounded-lg hover:bg-white/10"
            aria-label="Admin actions"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* ADMIN DROPDOWN */}
        {adminOpen && (
          <div className="absolute right-4 top-14 bg-[#1A3850] border border-white/10 rounded-xl shadow-xl p-2 z-50 w-44">
            {adminItems.map((item) => (
              <button
                key={item}
                onClick={() => {
                  toast('Coming soon');
                  setAdminOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* HERO CARD */}
      <div className="mx-4 mt-3 bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 shrink-0 bg-white/10 rounded-full flex items-center justify-center text-white font-bold ring-2"
            style={{ '--tw-ring-color': urgencyColor } as React.CSSProperties}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold truncate">{displayName}</div>
            {locationLine && (
              <div className="text-xs text-white/50 truncate">{locationLine}</div>
            )}
            {openSince && (
              <div className="text-xs text-white/30">
                Filed {new Date(openSince).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {[
            `${requests.length} requests`,
            `${matches.length} matches`,
            `${daysOpen}d open`,
            `${sos?.fulfilled_count ?? 0} fulfilled`,
          ].map((chip) => (
            <span
              key={chip}
              className="text-[10px] bg-white/5 rounded-full px-2 py-0.5 text-white/40"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* TIMELINE */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {events.length === 0 && (
          <div className="text-center text-white/30 text-sm py-12">
            No activity yet
          </div>
        )}
        {events.map((ev, i) => {
          const isLast = i === events.length - 1;
          const isOpen = !!expanded[i];
          return (
            <div key={i} className="flex gap-3">
              {/* Left rail */}
              <div className="flex flex-col items-center">
                <span
                  className="w-3 h-3 rounded-full shrink-0 mt-1.5"
                  style={{ backgroundColor: DOT_COLORS[ev.type] }}
                />
                {!isLast && <span className="w-0.5 flex-1 bg-white/10" />}
              </div>

              {/* Card */}
              <button
                onClick={() => setExpanded((p) => ({ ...p, [i]: !p[i] }))}
                className="flex-1 text-left bg-white/[0.03] rounded-lg p-3 mb-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{ev.title}</span>
                  <span className="text-[10px] text-white/30 shrink-0 mt-0.5">
                    {timeAgo(ev.date)}
                  </span>
                </div>

                {ev.desc && (
                  <div
                    className={
                      'text-xs text-white/50 mt-1 ' +
                      (isOpen ? '' : 'line-clamp-2')
                    }
                  >
                    {ev.desc}
                  </div>
                )}

                {(ev.status || typeof ev.score === 'number') && (
                  <div className="flex items-center gap-2 mt-2">
                    {ev.status && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                        {ev.status}
                      </span>
                    )}
                    {typeof ev.score === 'number' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#89CFF0]/20 text-[#89CFF0]">
                        {Math.round(ev.score * 100) / 100} score
                      </span>
                    )}
                  </div>
                )}

                {isOpen && (
                  <div className="text-[10px] text-white/30 mt-2">
                    {new Date(ev.date).toLocaleString()}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* NOTE INPUT */}
      {noteMode && (
        <div className="px-4 pb-2">
          <textarea
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note…"
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm resize-none outline-none focus:border-white/20"
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
      <div className="sticky bottom-0 bg-[#0F1E2B]/95 backdrop-blur-xl border-t border-white/10 px-6 py-3">
        <div className="grid grid-cols-4">
          <button
            onClick={() => toast('Coming soon')}
            className="flex flex-col items-center gap-1 text-[10px] text-white/50"
          >
            <Phone size={20} />
            Call
          </button>
          <button
            onClick={onChat}
            className="flex flex-col items-center gap-1 text-[10px] text-white/50"
          >
            <MessageSquare size={20} />
            Chat
          </button>
          <button
            onClick={() => setNoteMode((v) => !v)}
            className={
              'flex flex-col items-center gap-1 text-[10px] ' +
              (noteMode ? 'text-white' : 'text-white/50')
            }
          >
            <PenLine size={20} color={noteMode ? '#FCD34D' : undefined} />
            Note
          </button>
          <button
            onClick={() => toast('Coming soon')}
            className="flex flex-col items-center gap-1 text-[10px] text-white/50"
          >
            <Zap size={20} />
            Match
          </button>
        </div>
      </div>
    </div>
  );
}
