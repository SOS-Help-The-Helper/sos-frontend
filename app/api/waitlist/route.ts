import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';

/**
 * Public partner-waitlist write endpoint.
 *
 * The /partners landing page posts here. We validate, lightly abuse-check, and
 * insert into `partner_waitlist` with the service role key (server-side only;
 * never exposed to the browser). RLS on the table denies anon, so this is the
 * single sanctioned write path. Field shape matches the Lovable design.
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

  const first_name = MAX(body.first_name, 80);
  const last_name = MAX(body.last_name, 80);
  const email = MAX(body.email, 255).toLowerCase();
  const organization_name = MAX(body.organization_name, 160);
  const organization_website = MAX(body.organization_website, 255) || null;
  const use_case = MAX(body.use_case, 1000);
  const utm = body.utm && typeof body.utm === 'object' ? body.utm : null;

  if (!first_name || !last_name || !email || !organization_name || !use_case) {
    return NextResponse.json(
      { error: 'Please fill in all required fields.' },
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
    first_name,
    last_name,
    email,
    organization_name,
    organization_website,
    use_case,
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
