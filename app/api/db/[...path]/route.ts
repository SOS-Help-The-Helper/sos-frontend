import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Server-side PostgREST READ proxy for the partner portal (Wave 3).
 *
 * The portal's ~40 direct `.from()` reads used to hit rest/v1 from the browser
 * with the anon key — which is why broad anon SELECT policies had to exist.
 * supabase-js in the browser now points its REST base here (see
 * lib/supabase-client.ts); this route checks the portal session cookie,
 * enforces a table allowlist, strips PII columns from persons rows, and
 * forwards with the service key. GET/HEAD only — all writes go through EFs.
 */

// Tables the portal reads directly (grep inventory, 2026-06-12).
const READABLE_TABLES = new Set([
  'matches', 'resources', 'requests', 'organizations', 'persons',
  'map_views', 'disasters', 'chat_sessions', 'notifications',
  'reports', 'community_messages', 'system_learnings', 'signal_traces',
  'soses', 'taxonomy', 'events', 'facilities',
]);

// Columns stripped from persons rows (PII the portal list views don't need;
// detail views go through sos-coordination directory.get_person).
const PERSONS_PII = ['phone', 'phone_canonical', 'phone_hash', 'email', 'auth_user_id'];

async function getSessionUser(req: NextRequest) {
  const url =
    process.env.NEXT_PUBLIC_SOS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey =
    process.env.NEXT_PUBLIC_SOS_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) return null;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll() { /* read-only */ },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function stripPii(payload: unknown): unknown {
  if (Array.isArray(payload)) return payload.map(stripPii);
  if (payload && typeof payload === 'object') {
    const row = payload as Record<string, unknown>;
    for (const col of PERSONS_PII) delete row[col];
    for (const v of Object.values(row)) {
      if (v && typeof v === 'object') stripPii(v);
    }
  }
  return payload;
}

async function handle(req: NextRequest, params: { path: string[] }, method: 'GET' | 'HEAD') {
  // Expected shape: /api/db/rest/v1/<table>?<postgrest query>
  const path = params.path || [];
  if (path[0] !== 'rest' || path[1] !== 'v1' || !path[2]) {
    return NextResponse.json({ error: 'Unsupported path' }, { status: 400 });
  }
  const table = path[2];
  if (table === 'rpc' || !READABLE_TABLES.has(table)) {
    return NextResponse.json({ error: `Table not allowed: ${table}` }, { status: 403 });
  }

  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const base =
    process.env.NEXT_PUBLIC_SOS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceKey) {
    return NextResponse.json({ error: 'Proxy not configured (missing service key)' }, { status: 500 });
  }

  const upstream = await fetch(`${base}/rest/v1/${path.slice(2).join('/')}${req.nextUrl.search}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      // Forward PostgREST negotiation headers (count, ranges, single-object).
      ...(req.headers.get('accept') ? { Accept: req.headers.get('accept')! } : {}),
      ...(req.headers.get('prefer') ? { Prefer: req.headers.get('prefer')! } : {}),
      ...(req.headers.get('range') ? { Range: req.headers.get('range')! } : {}),
    },
  });

  const passHeaders: Record<string, string> = {
    'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
  };
  const contentRange = upstream.headers.get('Content-Range');
  if (contentRange) passHeaders['Content-Range'] = contentRange;

  if (method === 'HEAD' || upstream.status === 204) {
    return new NextResponse(null, { status: upstream.status, headers: passHeaders });
  }

  const text = await upstream.text();
  if (!upstream.ok) {
    return new NextResponse(text, { status: upstream.status, headers: passHeaders });
  }
  try {
    const body = stripPii(JSON.parse(text));
    return NextResponse.json(body, { status: upstream.status, headers: passHeaders });
  } catch {
    return new NextResponse(text, { status: upstream.status, headers: passHeaders });
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, await ctx.params, 'GET');
}

export async function HEAD(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, await ctx.params, 'HEAD');
}

// Writes are explicitly rejected — mutations go through edge functions only.
export async function POST() {
  return NextResponse.json({ error: 'Writes are not proxied — use the EF API' }, { status: 405 });
}
export async function PATCH() {
  return NextResponse.json({ error: 'Writes are not proxied — use the EF API' }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: 'Writes are not proxied — use the EF API' }, { status: 405 });
}
