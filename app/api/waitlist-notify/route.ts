import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Supabase Database Webhook target.
 *
 * Fires on INSERT into public.partner_waitlist and posts a formatted alert to
 * the configured Slack channel. Secured by a shared secret header so only
 * Supabase can trigger it.
 *
 * Env required (Vercel, Production):
 *   WAITLIST_NOTIFY_SECRET   - shared secret, also set as the webhook's header
 *   SLACK_BOT_TOKEN          - xoxb token for a bot that is a member of the channel
 *   SLACK_WAITLIST_CHANNEL   - channel id (e.g. C0AV7E24QBA)
 */

export const runtime = 'nodejs';

type WaitlistRow = {
  first_name?: string;
  last_name?: string;
  email?: string;
  organization_name?: string;
  organization_website?: string;
  use_case?: string;
  utm?: Record<string, string> | null;
  created_at?: string;
};

export async function POST(req: NextRequest) {
  const secret = process.env.WAITLIST_NOTIFY_SECRET || '';
  const provided =
    req.headers.get('x-waitlist-secret') ||
    req.headers.get('x-supabase-secret') ||
    '';
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: { type?: string; record?: WaitlistRow } = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad body' }, { status: 400 });
  }

  const r = payload.record || {};
  const token = process.env.SLACK_BOT_TOKEN || '';
  const channel = process.env.SLACK_WAITLIST_CHANNEL || '';
  if (!token || !channel) {
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  const name = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || '(no name)';
  const website = r.organization_website
    ? r.organization_website.startsWith('http')
      ? r.organization_website
      : `https://${r.organization_website}`
    : null;
  const utmStr =
    r.utm && Object.keys(r.utm).length
      ? Object.entries(r.utm)
          .map(([k, v]) => `${k}=${v}`)
          .join(' · ')
      : null;

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🚀 New partner waitlist signup', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Name:*\n${name}` },
        { type: 'mrkdwn', text: `*Email:*\n${r.email ?? '—'}` },
        { type: 'mrkdwn', text: `*Organization:*\n${r.organization_name ?? '—'}` },
        {
          type: 'mrkdwn',
          text: `*Website:*\n${website ? `<${website}|${r.organization_website}>` : '—'}`,
        },
      ],
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Use case:*\n${r.use_case ?? '—'}` },
    },
    ...(utmStr
      ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: `📈 ${utmStr}` }] }]
      : []),
  ];

  const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel,
      text: `New partner waitlist signup: ${name} — ${r.organization_name ?? ''}`,
      blocks,
    }),
  });
  const slackJson = await slackRes.json().catch(() => ({}));
  if (!slackJson.ok) {
    console.error('slack post failed', slackJson.error);
    return NextResponse.json({ error: 'slack failed', detail: slackJson.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
