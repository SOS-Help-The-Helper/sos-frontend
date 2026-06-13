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
  // Wave 3: polling instead of a realtime channel — anon postgres_changes
  // subscriptions stop working once anon SELECT is removed (Wave 4), and the
  // portal data plane now runs through the /api/db proxy, which realtime
  // websockets can't traverse. Poll the proposed-match feed every 60s and
  // notify on new ids.
  const seen = new Set<string>();
  let primed = false;

  const poll = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('id, match_reasoning')
      .eq('status', 'proposed')
      .order('created_at', { ascending: false })
      .limit(25);
    if (error || !data) return;
    for (const match of data as { id: string; match_reasoning: string | null }[]) {
      if (seen.has(match.id)) continue;
      seen.add(match.id);
      if (primed) {
        onNotification({
          id: match.id,
          match_id: match.id,
          message_text: match.match_reasoning || 'A new match has been found for your organization.',
        });
      }
    }
    primed = true;
  };

  void poll();
  const timer = setInterval(poll, 60_000);
  return () => clearInterval(timer);
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
