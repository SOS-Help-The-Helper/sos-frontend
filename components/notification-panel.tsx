'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  match_id?: string;
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

export function NotificationBell({ personId }: { personId: string | null }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!personId) return;
    loadNotifications();

    // Wave 3: poll instead of a realtime channel (anon postgres_changes dies
    // with the Wave 4 read lockdown). 60s + refresh-on-focus covers the UX.
    const timer = setInterval(loadNotifications, 60_000);
    const onFocus = () => loadNotifications();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [personId]);

  async function loadNotifications() {
    if (!personId) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, read, created_at, match_id')
      .eq('recipient_id', personId)
      .eq('recipient_type', 'citizen')
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data || []);
    setUnreadCount((data || []).filter(n => !n.read).length);
  }

  async function markAllRead() {
    if (!personId) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', personId)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  return (
    <>
      {/* Bell button */}
      <button onClick={() => { setOpen(!open); if (!open) loadNotifications(); }}
        className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center relative">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#EF4E4B] border-2 border-[#1A3850] flex items-center justify-center text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 max-h-[60vh] bg-[#1A3850] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          style={{ backdropFilter: 'blur(16px)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-bold text-white">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-[#89CFF0] hover:text-white">Mark all read</button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[50vh]">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/30 text-sm">No notifications yet</p>
              </div>
            ) : notifications.map(n => (
              <div key={n.id} className={`px-4 py-3 border-b border-white/5 ${!n.read ? 'bg-white/5' : ''}`}>
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
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
