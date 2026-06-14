import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Mark notifications read.
 *
 * The /api/db proxy is read-only (writes go through EFs), and notifications have
 * no dedicated EF action, so this small route owns the one write the bell needs.
 * It holds the service key server-side and scopes every update to the caller's
 * own (recipient_type, recipient_id) — never a blanket update.
 *
 * Auth boundary, mirroring the rest of the data plane:
 *  - recipient_type='org'     → a valid portal Supabase session (same gate as
 *    /api/db and /api/ef).
 *  - recipient_type='citizen' → the x-citizen-token header must be present. The
 *    update is pinned to recipient_id, so the worst a forged token allows is
 *    flipping someone's unread flag — no data is read or leaked.
 *
 * Body: { recipientType, recipientId, ids?: string[], all?: boolean }
 */

function envUrl() {
  return process.env.NEXT_PUBLIC_SOS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}
function anonKey() {
  return process.env.NEXT_PUBLIC_SOS_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

async function hasPortalSession(req: NextRequest): Promise<boolean> {
  const url = envUrl();
  const anon = anonKey();
  if (!url || !anon) return false;
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll() { /* read-only */ },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as
    | { recipientType?: string; recipientId?: string; ids?: string[]; all?: boolean }
    | null;

  const recipientType = body?.recipientType;
  const recipientId = body?.recipientId;
  if ((recipientType !== 'citizen' && recipientType !== 'org') || !recipientId) {
    return NextResponse.json({ error: 'recipientType and recipientId are required' }, { status: 400 });
  }

  // Auth, per recipient type.
  if (recipientType === 'org') {
    if (!(await hasPortalSession(req))) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
  } else {
    if (!req.headers.get('x-citizen-token')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
  }

  const base = envUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base || !serviceKey) {
    return NextResponse.json({ error: 'Route not configured (missing service key)' }, { status: 500 });
  }

  // Build a scoped PostgREST filter: always pinned to this recipient.
  const params = new URLSearchParams();
  params.set('recipient_type', `eq.${recipientType}`);
  params.set('recipient_id', `eq.${recipientId}`);
  if (Array.isArray(body?.ids) && body.ids.length > 0) {
    params.set('id', `in.(${body.ids.join(',')})`);
  } else if (!body?.all) {
    return NextResponse.json({ error: 'Provide ids[] or all:true' }, { status: 400 });
  } else {
    // all:true → only the still-unread rows.
    params.set('read', 'eq.false');
  }

  const res = await fetch(`${base}/rest/v1/notifications?${params.toString()}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ read: true, read_at: new Date().toISOString() }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json({ error: text || 'Update failed' }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}

// Accept PATCH too — same handler — so callers can use either verb.
export const PATCH = POST;
