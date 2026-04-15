import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Only these paths are publicly accessible
const PUBLIC_PATHS = [
  '/',
  '/c',
  '/home-v20.html',
  '/home-v21.html',
  '/home-v22.html',
  '/home-v23.html',
];

const PUBLIC_PREFIXES = [
  '/c/',           // citizen portal subpages
  '/_next/',       // Next.js assets
  '/api/',         // API routes (handled by their own auth)
  '/logomark',     // brand assets
  '/manifest',     // PWA manifest
  '/sw.js',        // service worker
  '/favicon',
  '/opengraph',
];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow exact public paths
  if (PUBLIC_PATHS.includes(path)) return NextResponse.next();

  // Allow public prefixes
  for (const prefix of PUBLIC_PREFIXES) {
    if (path.startsWith(prefix)) return NextResponse.next();
  }

  // Allow static assets (images, fonts, etc.)
  if (path.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|css|js|json|mp4|webm)$/)) {
    return NextResponse.next();
  }

  // Block everything else — return 404
  return new NextResponse('Not Found', { status: 404 });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
