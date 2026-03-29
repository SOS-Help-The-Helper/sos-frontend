import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * POST /api/ems/sitrep
 * Proxies to sitrep-write edge function.
 * Body: { location: {lat, lng}, category, severity, affected_count, structures_affected, notes, photo_url, agent_id }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.location?.lat || !body.location?.lng || !body.category || !body.severity) {
      return NextResponse.json({ error: 'Missing required fields: location, category, severity' }, { status: 400 });
    }

    // Call sitrep-write edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sitrep-write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        location: body.location,
        category: body.category,
        severity: body.severity,
        affected_count: body.affected_count || null,
        structures_affected: body.structures_affected || null,
        notes: body.notes || null,
        photo_url: body.photo_url || null,
        agent_id: body.agent_id || 'ems',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sitrep-write] EF error:', errorText);
      return NextResponse.json({ error: 'Sitrep submission failed' }, { status: 502 });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[sitrep] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
