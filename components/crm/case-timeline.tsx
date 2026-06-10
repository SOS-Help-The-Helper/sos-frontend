"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  org_name?: string;
  metadata?: Record<string, any>;
}

interface CaseTimelineProps {
  events: TimelineEvent[];
  onAddNote?: (text: string) => void;
  postingNote?: boolean;
}

// Dot palette: ice blue default, SOS red for urgency, green for completions
const ICE = "#89CFF0";
const RED = "#EF4E4B";
const GREEN = "#4ADE80";

const EVENT_META: Record<string, { icon: string; dot: string }> = {
  request_created:  { icon: "🆘", dot: RED },
  match_proposed:   { icon: "🔗", dot: ICE },
  match_accepted:   { icon: "✅", dot: GREEN },
  resource_assigned:{ icon: "📦", dot: ICE },
  note_added:       { icon: "💬", dot: ICE },
  status_changed:   { icon: "🔄", dot: ICE },
  report_created:   { icon: "📢", dot: RED },
  vote_attestation: { icon: "🗳️", dot: ICE },
};

const DEFAULT_META = { icon: "•", dot: ICE };

function relativeTime(timestamp: string): string {
  const then = new Date(timestamp).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 0) return "just now";
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(day / 365)}y ago`;
}

function CaseTimeline({ events, onAddNote, postingNote }: CaseTimelineProps) {
  const [note, setNote] = useState("");

  // Newest events first
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleSend = () => {
    const text = note.trim();
    if (!text || postingNote || !onAddNote) return;
    onAddNote(text);
    setNote("");
  };

  return (
    <div className="bg-transparent">
      {/* Note input */}
      {onAddNote && (
        <div className="mb-5 flex items-start gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Add a note…"
            rows={2}
            disabled={postingNote}
            className="flex-1 resize-none rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-[#89CFF0]/40 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={postingNote || !note.trim()}
            className="shrink-0 mt-px flex items-center justify-center h-9 w-9 rounded-lg bg-[#89CFF0]/15 text-[#89CFF0] hover:bg-[#89CFF0]/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send note"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Timeline */}
      {sorted.length === 0 ? (
        <div className="py-10 text-center text-sm text-white/40">No activity yet</div>
      ) : (
        <ol className="relative border-l-2 border-[#89CFF0]/30 pl-6 space-y-5">
          {sorted.map((event) => {
            const meta = EVENT_META[event.type] ?? DEFAULT_META;
            return (
              <li key={event.id} className="relative">
                {/* Dot */}
                <span
                  className="absolute -left-[31px] top-1 w-3 h-3 rounded-full ring-4 ring-[#0F1E2B]"
                  style={{ backgroundColor: meta.dot }}
                  aria-hidden
                />
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none mt-px" aria-hidden>
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                      <span className="text-sm text-white/80 font-medium">
                        {event.title}
                      </span>
                      {event.org_name && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#89CFF0]/15 text-[#89CFF0]">
                          {event.org_name}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="mt-0.5 text-sm text-white/60 break-words">
                        {event.description}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-white/40">
                      {relativeTime(event.timestamp)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default CaseTimeline;
