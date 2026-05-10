import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/c(.*)',
  '/erv(.*)',
  '/p/(.*)',
  '/what-is-sos',
  '/api/(.*)',
  '/home-v25.html',
]);

export default clerkMiddleware(async (auth, req) => {
  // Only protect routes NOT in the public list
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4)).*)',
    '/(api|trpc)(.*)',
  ],
};
