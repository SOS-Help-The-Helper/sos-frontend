import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Server-side edge-function proxy for the partner portal (Wave 3).
 *
 * The portal pages are session-gated by proxy.ts, but their DATA calls used to
 * go straight from the browser to Supabase with the public anon key — which is
 * why the EFs had to accept anon. This route moves the data plane behind the
 * same trust boundary as the page plane: a valid Supabase session cookie. The
 * service-role key lives only here (server env, never NEXT_PUBLIC), so the
 * EFs can require service auth (Wave 4) while the portal keeps working.
 *
 * Interim posture until per-user RBAC (Wave 6): any authenticated portal
 * session may call the allowlisted EFs — the same boundary /app pages already
 * have. Citizen EFs are NOT proxied here; citizens call them directly with
 * x-citizen-token.
 */

// EFs the portal actually calls (from the lib/api.ts call-site inventory).
const PORTAL_EFS = new Set([
  'sos-coordination', 'sos-intelligence', 'sos-inventory', 'sos-events',
  'sos-intake', 'sos-matching', 'sos-read', 'sos-write', 'sos-update',
  'sos-notify', 'match-engine', 'match-transport',
  'erv-query', 'erv-update', 'erv-match-propose',
  'resource-search', 'alerts-feed', 'fema-check', 'image-analyze',
  'community-messages', 'crm-chat', 'partner-write', 'address-autocomplete',
]);

async function getSessionUser(req: NextRequest) {
  const url =
    process.env.NEXT_PUBLIC_SOS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey =
    process.env.NEXT_PUBLIC_SOS_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) return null;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll() { /* read-only: refresh happens in proxy.ts */ },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function forward(req: NextRequest, fn: string, method: 'GET' | 'POST') {
  if (!PORTAL_EFS.has(fn)) {
    return NextResponse.json({ error: `Function not allowed: ${fn}` }, { status: 403 });
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

  const search = req.nextUrl.search || '';
  const res = await fetch(`${base}/functions/v1/${fn}${search}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    ...(method === 'POST' ? { body: await req.text() } : {}),
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ fn: string }> }) {
  const { fn } = await ctx.params;
  return forward(req, fn, 'POST');
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ fn: string }> }) {
  const { fn } = await ctx.params;
  return forward(req, fn, 'GET');
}
