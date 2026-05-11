/**
 * ERV API helper — shared constants for partner-read/partner-update calls.
 * These EFs are deployed on the ERV Supabase (xbtrtztzaokeodarqvpr),
 * NOT the SOS Supabase.
 */

export const ERV_URL = process.env.NEXT_PUBLIC_ERV_SUPABASE_URL || '';

export const ERV_HEADERS: Record<string, string> = {
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ERV_ANON_KEY || ''}`,
  'x-partner-key': process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '',
  'Content-Type': 'application/json',
};

/** POST to an ERV edge function */
export async function ervFetch(fn: string, body: Record<string, unknown>) {
  const res = await fetch(`${ERV_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: ERV_HEADERS,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    console.error(`[ervFetch] ${fn} failed:`, data.error || res.statusText);
  }
  return data;
}
