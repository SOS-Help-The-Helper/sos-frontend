import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Routes that require Clerk authentication
const isProtectedRoute = createRouteMatcher([
  '/p/(.*)',
]);

// Routes that are publicly accessible (no auth needed)
const isPublicRoute = createRouteMatcher([
  '/',
  '/c(.*)',
  '/erv(.*)',
  '/what-is-sos',
  '/api/(.*)',
  '/home-v25.html',
  '/aa(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
