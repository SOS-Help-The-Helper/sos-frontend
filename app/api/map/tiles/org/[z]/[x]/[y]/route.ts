import { NextRequest, NextResponse } from 'next/server';

const SOS_URL =
  process.env.NEXT_PUBLIC_SOS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Server-side route: prefer the service key so the map_tiles_* RPCs can lose
// their anon EXECUTE grant; anon fallback keeps previews working.
const SOS_ANON =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Serves org-scoped MVT vector tiles from PostGIS via Supabase RPC.
 * Calls map_tiles_org(p_org_id, x, y, z) — same single 'sos' source-layer as the
 * public endpoint, but filtered to a single org's data (no PII in tiles).
 * GET /api/map/tiles/org/{z}/{x}/{y}?org_id=UUID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params;
  const zInt = parseInt(z, 10);
  const xInt = parseInt(x, 10);
  const yInt = parseInt(y, 10);
  const orgId = req.nextUrl.searchParams.get('org_id');

  if (isNaN(zInt) || isNaN(xInt) || isNaN(yInt) || zInt < 0 || zInt > 22) {
    return NextResponse.json({ error: 'Invalid tile coordinates' }, { status: 400 });
  }

  if (!orgId) {
    return NextResponse.json({ error: 'Missing org_id' }, { status: 400 });
  }

  try {
    const res = await fetch(`${SOS_URL}/rest/v1/rpc/map_tiles_org`, {
      method: 'POST',
      headers: {
        'apikey': SOS_ANON,
        'Authorization': `Bearer ${SOS_ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ z: zInt, x: xInt, y: yInt, p_org_id: orgId }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[map-tiles-org] RPC error:', res.status, errText);
      return NextResponse.json({ error: 'Tile generation failed', status: res.status }, { status: 500 });
    }

    const data = await res.json();

    // data is base64-encoded MVT (or empty string)
    if (!data || data === '') {
      return new NextResponse(null, {
        status: 204,
        headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Decode base64 to binary
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.mapbox-vector-tile',
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[map-tiles-org] Unexpected error:', err?.message || err);
    return NextResponse.json({ error: 'Internal server error', detail: err?.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
}
