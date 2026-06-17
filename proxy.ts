import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ── Public routes (everything else returns 404) ──
const PUBLIC_PATHS = new Set([
  '/',
  '/c',
  '/home',
  '/home-v25.html',
  '/login',
  '/vote',
  '/join',
  '/partners',
  '/app',
  '/deck',
]);

const PUBLIC_PREFIXES = [
  '/c/',           // citizen portal subpages
  '/app/',         // partner portal
  '/erv/',         // ERV public pages (impact report, etc.)
  '/case-studies/', // Public case studies
  '/maps/',         // Map showcase demos
  '/s/',            // Share pages (public pin detail)
  '/api/pin/',      // Pin detail API (public)
  '/share/',        // Public incident situation reports
  '/drive/',       // driver delivery pages
  // (Wave 3) the bare partner prefixes — /cases/, /directory/, /match/, … —
  // were removed: no top-level routes exist for them (partner pages live
  // under /app/*, which is session-gated below), so they were pure latent
  // bypass surface in front of the /app auth gate.
  '/_next/',       // Next.js assets
  '/api/',         // API routes
  '/logomark',     // brand assets
  '/manifest',     // PWA manifest
  '/sw.js',        // service worker
  '/favicon',
  '/opengraph',
];

const ASSET_REGEX = /\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|css|js|json|mp4|webm)$/;

function isPublicRoute(path: string): boolean {
  const BLOCKED_PATHS = new Set(['/c/test-agent']);
  if (BLOCKED_PATHS.has(path)) return false;
  if (PUBLIC_PATHS.has(path)) return true;
  for (const prefix of PUBLIC_PREFIXES) {
    if (path.startsWith(prefix)) return true;
  }
  if (ASSET_REGEX.test(path)) return true;
  return false;
}

// ── Rate limiter for /api/chat ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: NextRequest): NextResponse | null {
  if (!req.nextUrl.pathname.startsWith('/api/chat')) return null;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + 60_000 };
    rateLimitMap.set(ip, record);
  }
  record.count++;
  if (record.count > 30) {
    return NextResponse.json({ error: 'Too many requests. Wait a moment.' }, { status: 429 });
  }
  return null;
}

// ── Auth gate for the partner portal (/app/*) ──
// Auth ALWAYS runs against the SOS DB (the identity layer). Unauthenticated
// requests to /app are redirected to /login; authenticated ones pass through
// with a refreshed session cookie. Returns a response to send, or null to let
// the request continue normally.
async function gateApp(req: NextRequest): Promise<NextResponse | null> {
  const path = req.nextUrl.pathname;
  const isProtected = path === '/app' || path.startsWith('/app/');
  if (!isProtected) return null;

  const url =
    process.env.NEXT_PUBLIC_SOS_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  const anonKey =
    process.env.NEXT_PUBLIC_SOS_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  // Auth not configured (e.g. build/preview) → don't lock anyone out.
  if (!url || !anonKey) return null;

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = `?redirect=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated — return the response carrying any refreshed session cookies.
  return res;
}

// ── Main proxy ──
export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Block non-public routes
  if (!isPublicRoute(path)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Rate limit API
  const limited = rateLimit(req);
  if (limited) return limited;

  // Gate the partner portal behind a Supabase session
  const gated = await gateApp(req);
  if (gated) return gated;

  return NextResponse.next();
}
