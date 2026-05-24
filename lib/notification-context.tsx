'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getUnreadCount, subscribeToMatches, showBrowserNotification, requestNotificationPermission } from './notifications';

interface NotificationContextType {
  unreadCount: number;
  refreshCount: () => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
}

interface Toast {
  id: string;
  title: string;
  body: string;
  matchId?: string;
  timestamp: number;
}

const NotificationCtx = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshCount: () => {},
  toasts: [],
  dismissToast: () => {},
});

export function useNotifications() {
  return useContext(NotificationCtx);
}

export function NotificationProvider({ orgId, children }: { orgId: string | null; children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const unsubRef = useRef<(() => void) | null>(null);

  const refreshCount = useCallback(async () => {
    if (!orgId) return;
    const count = await getUnreadCount(orgId);
    setUnreadCount(count);
  }, [orgId]);

  // Initial load + periodic refresh
  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [refreshCount]);

  // Realtime subscription
  useEffect(() => {
    if (!orgId) return;

    // Request browser notification permission on mount
    requestNotificationPermission();

    const unsub = subscribeToMatches(orgId, (notification) => {
      // Bump count
      setUnreadCount(prev => prev + 1);

      // Show toast
      const toast: Toast = {
        id: notification.id || crypto.randomUUID(),
        title: '🔔 New Match',
        body: notification.message_text || 'A new match has been found for your organization.',
        matchId: notification.match_id,
        timestamp: Date.now(),
      };
      setToasts(prev => [toast, ...prev].slice(0, 5)); // max 5 toasts

      // Auto-dismiss after 8s
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 8000);

      // Browser notification
      showBrowserNotification(
        toast.title,
        toast.body,
        notification.deep_link || `/app/match?match=${notification.match_id}`
      );
    });

    unsubRef.current = unsub;
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [orgId]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <NotificationCtx.Provider value={{ unreadCount, refreshCount, toasts, dismissToast }}>
      {children}
    </NotificationCtx.Provider>
  );
}
