import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SOS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Wave 3: in the partner portal (/app/*) the browser must not talk to
// PostgREST directly — reads go through the session-gated, service-key-backed
// /api/db proxy (app/api/db/[...path]/route.ts), which is why the anon key can
// lose its broad SELECT grants in Wave 4. Citizen pages and server-side code
// keep the direct URL (citizen reads go through sos-read with the session
// token; public map data flows through the /api/map/tiles routes).
// NOTE: realtime channels don't traverse the proxy — portal consumers were
// converted to polling in Waves 2–3.
const isPortalBrowser =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/app');

export const supabase = createClient(
  isPortalBrowser ? `${window.location.origin}/api/db` : supabaseUrl,
  supabaseAnonKey,
);
