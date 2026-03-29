/**
 * Henry Brain Supabase client.
 * Separate project from the operational SOS DB.
 * Used by admin pages for organism health, intelligence, and approvals.
 * Lazy-initialized to avoid build-time failures when env vars aren't set.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getHenryBrain(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_HENRY_BRAIN_URL || 'https://vqudlavumxwslfejqupy.supabase.co';
  const key = process.env.NEXT_PUBLIC_HENRY_BRAIN_ANON_KEY;
  if (!key) return null;

  _client = createClient(url, key);
  return _client;
}
