'use client';

import { useState, useEffect } from 'react';
import { CitizenShell } from '@/components/citizen-shell';
import { SOSBottomSheet } from '@/components/sos-bottom-sheet';
import { api } from '@/lib/api';

type Filter = 'all' | 'alerts' | 'community' | 'needs' | 'reports';

interface FeedItem {
  id: string;
  type: 'community' | 'alert' | 'need' | 'report';
  icon: string;
  title: string;
  body: string;
  time: string;
  distance?: string;
  person_id?: string;
  flagged?: boolean;
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  async function loadFeed() {
    setLoading(true);
    setError(false);
    try {
      // Community messages
      const msgs = await api.getMessages('community') as Array<{
        id: string; person_id: string; message_text: string;
        message_type: string; photo_url: string | null; flagged: boolean; created_at: string;
      }>;

      const feedItems: FeedItem[] = (msgs || []).map(m => ({
        id: m.id,
        type: m.message_type === 'report' ? 'report' : m.message_type === 'agent_response' ? 'community' : 'community',
        icon: m.message_type === 'report' ? '📢' : m.message_type === 'agent_response' ? '🤖' : m.photo_url ? '📷' : '💬',
        title: m.message_type === 'report' ? 'Citizen Report' : m.message_type === 'agent_response' ? 'SOS Agent' : 'Community',
        body: m.message_text,
        time: timeSince(m.created_at),
        person_id: m.person_id,
        flagged: m.flagged,
      }));

      setItems(feedItems);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeed();
  }, []);

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  function timeSince(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return 'now'; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`;
  }

  return (
    <CitizenShell onSOSTap={() => setSheetOpen(true)} hideSOSButton={sheetOpen}>
      <div className="flex flex-col h-full pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
        {/* Header */}
        <div className="bg-[#1A3850] px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
          <h1 className="text-sm font-bold text-white">📋 Feed</h1>
          {/* Filter pills */}
          <div className="flex gap-1 mt-2 overflow-x-auto">
            {(['all', 'alerts', 'community', 'needs', 'reports'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                  filter === f ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'
                }`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Feed list */}
        <div className="flex-1 overflow-y-auto bg-[#0F1E2B]">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : error ? (
            <div className="text-center py-16">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm font-bold text-white mt-2">Something went wrong</p>
              <button onClick={loadFeed} className="text-xs text-sos-accent-500 mt-2 underline">Tap to retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-3xl">📋</span>
              <p className="text-sm font-bold text-white mt-2">No feed items</p>
              <p className="text-xs text-white/40 mt-1">Activity near you will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map(item => (
                <div key={item.id} className={`px-4 py-3 ${item.flagged ? 'opacity-40' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white/50">{item.title}</span>
                        <span className="text-[9px] text-white/30">{item.time}</span>
                      </div>
                      <p className="text-xs text-white/80 mt-0.5 line-clamp-2">{item.body}</p>
                      {item.flagged && <p className="text-[9px] text-sos-red-400 mt-0.5">⚠️ Reported</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SOSBottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} context="feed" />
    </CitizenShell>
  );
}
