/**
 * Supabase Auth clients (SSR).
 *
 * Auth ALWAYS runs against the SOS DB — the identity layer — regardless of
 * which partner DB the user's data routes to. Use the SOS_* env vars (with a
 * fallback to the generic NEXT_PUBLIC_SUPABASE_* vars).
 *
 * - createSupabaseBrowserClient() → client components (cookie-backed session)
 *
 * The server-side client lives in ./supabase-auth-server (it imports
 * next/headers, which is server-only and must not be pulled into client
 * bundles).
 *
 * The @supabase/ssr browser client persists the session in cookies (not
 * localStorage), so middleware and server routes can read the same session.
 */

import { createBrowserClient } from '@supabase/ssr';

export const SOS_AUTH_URL =
  process.env.NEXT_PUBLIC_SOS_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

export const SOS_AUTH_ANON_KEY =
  process.env.NEXT_PUBLIC_SOS_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

/** Browser-side auth client for client components. Session lives in cookies. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(SOS_AUTH_URL, SOS_AUTH_ANON_KEY);
}
