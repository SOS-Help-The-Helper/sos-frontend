import { NextRequest, NextResponse } from 'next/server';

const SOS_URL =
  process.env.NEXT_PUBLIC_SOS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Server-side route: prefer the service key (survives the Wave 4 read
// lockdown); anon fallback keeps previews working.
const SOS_ANON =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const HEADERS = {
  'apikey': SOS_ANON,
  'Authorization': `Bearer ${SOS_ANON}`,
  'Content-Type': 'application/json',
};

// Public-safe fields per type — NO PII (no phone, no exact address, no person_id, no names)
const SELECT = {
  request: 'id,category,taxonomy_code,urgency,status,description,public_display_text,location_text,household_size,created_at,latitude,longitude',
  resource: 'id,category,taxonomy_code,status,description,public_display_text,location_text,capacity_available,capacity_remaining,created_at,latitude,longitude,org_id',
  report: 'id,category,taxonomy_code,report_type,verification_status,description,public_display_text,location_text,corroboration_count,created_at,latitude,longitude',
};

/**
 * GET /api/pin/[id]?type=request|resource|report
 * Returns public-safe details for a single map pin.
 * Used by: pin detail cards, share pages.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const type = req.nextUrl.searchParams.get('type') || 'request';

  if (!['request', 'resource', 'report'].includes(type)) {
    return NextResponse.json({ error: 'type must be request, resource, or report' }, { status: 400 });
  }

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid pin ID' }, { status: 400 });
  }

  const table = type === 'resource' ? 'resources' : type === 'report' ? 'reports' : 'requests';
  const select = SELECT[type as keyof typeof SELECT];

  try {
    const res = await fetch(
      `${SOS_URL}/rest/v1/${table}?id=eq.${id}&select=${select}&limit=1`,
      { headers: HEADERS }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
    }

    const rows = await res.json();
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const record = rows[0];

    // If resource, fetch org name
    if (type === 'resource' && record.org_id) {
      try {
        const orgRes = await fetch(
          `${SOS_URL}/rest/v1/organizations?id=eq.${record.org_id}&select=name&limit=1`,
          { headers: HEADERS }
        );
        const orgs = await orgRes.json();
        if (orgs?.[0]?.name) record.org_name = orgs[0].name;
      } catch { /* ignore — org name is nice-to-have */ }
      delete record.org_id; // Don't expose org_id to client
    }

    // Add computed fields
    record.type = type;
    record.map_pin_url = `https://sosconnect.org/c?pin=${id}&type=${type}`;
    record.share_url = `https://sosconnect.org/s/${id}?type=${type}`;

    return NextResponse.json(record, {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[pin-detail] Error:', err?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
