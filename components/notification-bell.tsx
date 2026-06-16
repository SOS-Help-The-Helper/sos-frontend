'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { getCitizenToken } from '@/lib/api';

/**
 * Unified notification bell for both portals.
 *
 * Reads via the shared supabase-client, which auto-routes: inside the partner
 * portal (/app/*) it goes through the session-gated /api/db proxy (notifications
 * is on its table allowlist); on citizen pages it reads Supabase directly with
 * the anon key + RLS. Marking read is a write, so it never goes through the
 * read-only /api/db proxy — it posts to /api/notifications/read, which holds the
 * service key server-side.
 *
 * recipientType='citizen' → recipientId is the person_id.
 * recipientType='org'     → recipientId is the org_id.
 */

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
  deep_link: string | null;
}

const TYPE_ICONS: Record<string, string> = {
  match_proposed: '🔔',
  match_accepted: '✅',
  match_declined: '❌',
  match_fulfilled: '🎉',
  resource_available: '📦',
  capacity_alert: '⚠️',
  new_request_nearby: '🆘',
  sos_update: '📋',
  community_alert: '📢',
  score_change: '📊',
  system: '⚙️',
};

function timeSince(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export interface NotificationBellProps {
  recipientType: 'citizen' | 'org';
  recipientId: string | null;
}

export function NotificationBell({ recipientType, recipientId }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!recipientId) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, read, created_at, deep_link')
      .eq('recipient_type', recipientType)
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false })
      .limit(20);
    const rows = (data as NotificationRow[] | null) || [];
    setItems(rows);
    setUnread(rows.filter((n) => !n.read).length);
  }, [recipientType, recipientId]);

  // Poll instead of realtime — anon postgres_changes dies under the Wave 4
  // read lockdown, and the /api/db proxy doesn't carry realtime channels.
  useEffect(() => {
    if (!recipientId) return;
    void load();
    const timer = setInterval(load, 60_000);
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [recipientId, load]);

  // Close the panel on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function postRead(body: Record<string, unknown>) {
    const token = recipientType === 'citizen' ? getCitizenToken() : null;
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-citizen-token': token } : {}),
      },
      body: JSON.stringify({ recipientType, recipientId, ...body }),
    }).catch(() => {});
  }

  async function openNotification(n: NotificationRow) {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
      void postRead({ ids: [n.id] });
    }
    if (n.deep_link) {
      if (/^https?:\/\//.test(n.deep_link)) window.location.assign(n.deep_link);
      else router.push(n.deep_link);
    }
  }

  async function markAllRead() {
    if (unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await postRead({ all: true });
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => { setOpen((o) => !o); if (!open) void load(); }}
        aria-label="Notifications"
        className="on-dark w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center relative transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4E4B] border-2 border-[#1A3850] flex items-center justify-center text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-80 max-w-[90vw] max-h-[60vh] bg-[#1A3850] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[70]"
          style={{ backdropFilter: 'blur(16px)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-bold text-white">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-[#89CFF0] hover:text-white">
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[50vh]">
            {items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/30 text-sm">No notifications yet</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${!n.read ? 'bg-white/5' : ''}`}
                >
                  <div className="flex gap-3">
                    <span className="text-lg flex-shrink-0">{TYPE_ICONS[n.type] || '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#89CFF0] flex-shrink-0" />}
                      </div>
                      {n.body && <p className="text-[11px] text-white/50 mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[9px] text-white/25 mt-1">{timeSince(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
