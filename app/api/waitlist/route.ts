import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';

/**
 * Public partner-waitlist write endpoint.
 *
 * The /partners landing page posts here. We validate, lightly rate-/abuse-check,
 * and insert into `partner_waitlist` with the service role key (server-side only;
 * never exposed to the browser). RLS on the table denies anon, so this is the
 * single sanctioned write path. No EF needed for a simple public lead capture.
 */

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = (s: unknown, n: number) => (typeof s === 'string' ? s.trim().slice(0, n) : '');

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + '|sos-waitlist').digest('hex').slice(0, 32);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Honeypot: bots fill hidden fields. If present, pretend success silently.
  if (typeof body.company_url_hp === 'string' && body.company_url_hp.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const org_name = MAX(body.org_name, 200);
  const contact_name = MAX(body.contact_name, 160);
  const email = MAX(body.email, 254).toLowerCase();
  const phone = MAX(body.phone, 40) || null;
  const website = MAX(body.website, 300) || null;
  const org_type = MAX(body.org_type, 60) || null;
  const state = MAX(body.state, 60) || null;
  const coverage_area = MAX(body.coverage_area, 500) || null;
  const disaster_focus = MAX(body.disaster_focus, 300) || null;
  const message = MAX(body.message, 2000) || null;
  const utm = body.utm && typeof body.utm === 'object' ? body.utm : null;

  if (!org_name || !contact_name || !email) {
    return NextResponse.json(
      { error: 'Organization name, contact name, and email are required.' },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const base =
    process.env.NEXT_PUBLIC_SOS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SOS_SERVICE_ROLE_KEY || '';
  if (!base || !serviceKey) {
    return NextResponse.json({ error: 'Waitlist is not configured.' }, { status: 500 });
  }

  const fwd = req.headers.get('x-forwarded-for') || '';
  const ip = fwd.split(',')[0].trim() || '0.0.0.0';

  const row = {
    org_name,
    contact_name,
    email,
    phone,
    website,
    org_type,
    state,
    coverage_area,
    disaster_focus,
    message,
    utm,
    user_agent: MAX(req.headers.get('user-agent') || '', 400) || null,
    ip_hash: hashIp(ip),
    source: 'waitlist_landing',
  };

  const upstream = await fetch(`${base}/rest/v1/partner_waitlist`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (upstream.status === 409) {
    // Duplicate email (unique index). Treat as success — they're already on the list.
    return NextResponse.json({ ok: true, duplicate: true });
  }
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    console.error('partner_waitlist insert failed', upstream.status, detail);
    return NextResponse.json({ error: 'Could not save your signup. Please try again.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
