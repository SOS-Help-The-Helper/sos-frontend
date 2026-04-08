import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiter for /api/chat
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

// Demo bypass: no Clerk auth, just rate limiting
export default function middleware(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
