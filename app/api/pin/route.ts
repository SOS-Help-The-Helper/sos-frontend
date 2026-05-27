import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pinId = searchParams.get('id');
  const type = searchParams.get('type') || 'request';

  if (!pinId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const SOS_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
  const SOS_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!SOS_KEY) {
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  const table = type === 'resource' ? 'resources' : type === 'report' ? 'reports' : 'requests';

  try {
    const res = await fetch(
      `${SOS_URL}/rest/v1/${table}?id=eq.${pinId}&select=id,description,public_display_text,urgency,location_text,taxonomy_code,category,household_size,status`,
      { headers: { apikey: SOS_KEY, Authorization: `Bearer ${SOS_KEY}` } }
    );
    const rows = await res.json();
    if (!rows?.[0]) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    // Return only safe public fields
    const r = rows[0];
    return NextResponse.json({
      id: r.id,
      description: r.public_display_text || r.description,
      urgency: r.urgency,
      location_text: r.location_text,
      taxonomy_code: r.taxonomy_code,
      category: r.category,
      household_size: r.household_size,
      status: r.status,
      type,
    });
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }
}
