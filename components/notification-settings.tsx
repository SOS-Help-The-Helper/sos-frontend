'use client';

import { useEffect, useState } from 'react';
import { api, getCitizenToken } from '@/lib/api';
import { supabase } from '@/lib/supabase-client';

/**
 * Notification preference toggles, shared by the citizen profile and the partner
 * settings page. Renders just the toggle rows — each page wraps it in its own
 * card chrome so it looks native in both themes.
 *
 * Reads/writes notification_preferences on the persons row (scope='citizen') or
 * the organizations row (scope='org'), both via sos-events settings.* — the same
 * EF the profile/settings pages already use. Reads are best-effort; if the row
 * can't be loaded the toggles fall back to "all on".
 */

export interface NotificationPrefs {
  sms_imessage: boolean;
  agent_chat: boolean;
  in_app: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = { sms_imessage: true, agent_chat: true, in_app: true };

const TOGGLES: Array<{ key: keyof NotificationPrefs; label: string; desc: string }> = [
  { key: 'sms_imessage', label: 'SMS / iMessage', desc: 'Text alerts for matches and urgent updates.' },
  { key: 'agent_chat', label: 'Agent chat', desc: 'Proactive messages from the SOS agent.' },
  { key: 'in_app', label: 'In-app notifications', desc: 'The bell in your header.' },
];

function normalize(raw: unknown): NotificationPrefs {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<NotificationPrefs>;
  return {
    sms_imessage: p.sms_imessage !== false,
    agent_chat: p.agent_chat !== false,
    in_app: p.in_app !== false,
  };
}

export function NotificationSettings({
  scope,
  recipientId,
}: {
  scope: 'citizen' | 'org';
  recipientId: string | null;
}) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!recipientId) { setLoaded(true); return; }
      try {
        if (scope === 'org') {
          const res = await api.efCall<{ org?: { notification_preferences?: unknown; metadata?: { notification_preferences?: unknown } } }>(
            'sos-events',
            { action: 'settings.get_settings', org_id: recipientId }
          );
          const raw = res.org?.notification_preferences ?? res.org?.metadata?.notification_preferences;
          if (!cancelled) setPrefs(normalize(raw));
        } else {
          const { data } = await supabase
            .from('persons')
            .select('notification_preferences')
            .eq('id', recipientId)
            .single();
          if (!cancelled) setPrefs(normalize((data as { notification_preferences?: unknown } | null)?.notification_preferences));
        }
      } catch {
        // Best-effort — keep the all-on defaults.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [scope, recipientId]);

  async function toggle(key: keyof NotificationPrefs) {
    if (!recipientId || saving) return;
    const next = { ...prefs, [key]: !prefs[key] };
    const prev = prefs;
    setPrefs(next);
    setSaving(true);
    setError(null);
    try {
      if (scope === 'org') {
        await api.efCall('sos-events', {
          action: 'settings.update_profile',
          org_id: recipientId,
          notification_preferences: next,
        });
      } else {
        await api.efCall(
          'sos-events',
          { action: 'settings.update_profile', person_id: recipientId, notification_preferences: next },
          { auth: { citizenToken: getCitizenToken() ?? undefined } }
        );
      }
    } catch {
      setPrefs(prev); // roll back on failure
      setError('Could not save — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      {TOGGLES.map((t) => {
        const on = prefs[t.key];
        return (
          <button
            key={t.key}
            onClick={() => toggle(t.key)}
            disabled={!recipientId || !loaded || saving}
            className="w-full flex items-center justify-between gap-3 py-2.5 text-left disabled:opacity-60"
          >
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-white">{t.label}</span>
              <span className="block text-[11px] text-white/45">{t.desc}</span>
            </span>
            <span
              className={`relative w-10 h-6 rounded-full flex-shrink-0 transition-colors ${on ? 'bg-[#EF4E4B]' : 'bg-white/15'}`}
              aria-checked={on}
              role="switch"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`}
              />
            </span>
          </button>
        );
      })}
      {error && <p className="text-[11px] text-[#EF4E4B] pt-1">{error}</p>}
    </div>
  );
}
