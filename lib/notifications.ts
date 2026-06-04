import { supabase } from './supabase-client';

interface MatchNotification {
  id?: string;
  match_id: string;
  message_text?: string;
  deep_link?: string;
}

export async function getUnreadCount(orgId: string): Promise<number> {
  if (!orgId) return 0;
  const { count, error } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'proposed');
  if (error) return 0;
  return count ?? 0;
}

export function subscribeToMatches(
  orgId: string,
  onNotification: (data: MatchNotification) => void,
): () => void {
  const channel = supabase
    .channel(`org-matches-${orgId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'matches' },
      (payload) => {
        const match = payload.new as Record<string, string>;
        onNotification({
          id: match.id,
          match_id: match.id,
          message_text: match.match_reasoning || 'A new match has been found for your organization.',
        });
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function showBrowserNotification(title: string, body: string, link?: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const n = new Notification(title, { body, icon: '/logomark-192.png' });
  if (link) n.onclick = () => { window.focus(); window.location.href = link; };
}

export async function requestNotificationPermission(): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}
