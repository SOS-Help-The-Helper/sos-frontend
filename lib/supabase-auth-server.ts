/**
 * Server-side Supabase Auth client (SSR) for Server Components and Route
 * Handlers. Reads — and where allowed, refreshes — the session cookie via
 * next/headers. Kept separate from ./supabase-auth so the browser bundle never
 * imports next/headers.
 *
 * Auth ALWAYS runs against the SOS DB (the identity layer).
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SOS_AUTH_URL, SOS_AUTH_ANON_KEY } from './supabase-auth';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(SOS_AUTH_URL, SOS_AUTH_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component (read-only cookies). Safe to ignore —
          // middleware (proxy.ts) refreshes the session on navigations.
        }
      },
    },
  });
}
