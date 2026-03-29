import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * POST /api/ems/verify
 * Proxies to sitrep-write edge function with verification action.
 * Body: { report_id, verification: 'confirm' | 'partial' | 'not_observed', agent_id }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.report_id || !body.verification) {
      return NextResponse.json({ error: 'Missing report_id or verification' }, { status: 400 });
    }

    // Call sitrep-write EF with verification action
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sitrep-write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'verify',
        report_id: body.report_id,
        verification: body.verification,
        agent_id: body.agent_id || 'ems',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[verify] EF error:', errorText);
      return NextResponse.json({ error: 'Verification failed' }, { status: 502 });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[verify] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
