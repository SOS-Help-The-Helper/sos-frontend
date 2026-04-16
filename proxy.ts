import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Public routes (everything else returns 404) ──
const PUBLIC_PATHS = new Set([
  '/',
  '/c',
  '/home-v20.html',
  '/home-v21.html',
  '/home-v22.html',
  '/home-v23.html',
  '/home-v24.html',
  '/home-v25.html',
  '/case.html',
]);

const PUBLIC_PREFIXES = [
  '/c/',           // citizen portal subpages
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

// ── Main proxy ──
export default function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Block non-public routes
  if (!isPublicRoute(path)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Rate limit API
  const limited = rateLimit(req);
  if (limited) return limited;

  return NextResponse.next();
}
