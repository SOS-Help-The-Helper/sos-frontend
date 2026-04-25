// TODO(Phase3-5): migrate supabase.from() calls below to lib/api.ts EF calls
/**
 * Partner notification system.
 * Reads from partner_notifications table.
 * Realtime subscription on matches for live updates.
 */

import { supabase } from '@/lib/supabase-client';

export interface PartnerNotification {
  id: string;
  org_id: string;
  match_id: string;
  channel: string;
  status: string;
  sent_at: string;
  read_at: string | null;
  deep_link: string | null;
  message_text: string;
}

export interface NotificationPreferences {
  slack: boolean;
  email: boolean;
  sms: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = { slack: true, email: false, sms: false };

export async function getNotificationPreferences(orgId: string): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from('organizations')
    .select('notification_preferences')
    .eq('id', orgId)
    .single();
  return data?.notification_preferences || DEFAULT_PREFS;
}

export async function saveNotificationPreferences(orgId: string, prefs: NotificationPreferences): Promise<boolean> {
  const { error } = await supabase
    .from('organizations')
    .update({ notification_preferences: prefs })
    .eq('id', orgId);
  return !error;
}

export async function getUnreadCount(orgId: string): Promise<number> {
  const { count } = await supabase
    .from('partner_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .is('read_at', null);
  return count || 0;
}

export async function getUnreadNotifications(orgId: string): Promise<PartnerNotification[]> {
  const { data } = await supabase
    .from('partner_notifications')
    .select('*')
    .eq('org_id', orgId)
    .is('read_at', null)
    .order('sent_at', { ascending: false });
  return data || [];
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('partner_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
  return !error;
}

export async function markMatchAsRead(orgId: string, matchId: string): Promise<boolean> {
  const { error } = await supabase
    .from('partner_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('match_id', matchId)
    .is('read_at', null);
  return !error;
}

/**
 * Subscribe to new matches for this org via Supabase Realtime.
 * Returns an unsubscribe function.
 */
export function subscribeToMatches(orgId: string, onNewMatch: (payload: any) => void): () => void {
  const channel = supabase
    .channel(`matches:org:${orgId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'partner_notifications',
        filter: `org_id=eq.${orgId}`,
      },
      (payload) => {
        onNewMatch(payload.new);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/**
 * Request browser notification permission.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Show a browser notification.
 */
export function showBrowserNotification(title: string, body: string, deepLink?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const notif = new Notification(title, {
    body,
    icon: '/logomark.png',
    badge: '/logomark.png',
    tag: 'sos-match',
  });
  if (deepLink) {
    notif.onclick = () => { window.focus(); window.location.href = deepLink; };
  }
}
