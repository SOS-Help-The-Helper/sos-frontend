import { NextRequest, NextResponse } from 'next/server';

const SOS_URL =
  process.env.NEXT_PUBLIC_SOS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Server-side route: prefer the service key; fall back to anon (map_tiles_public is anon-executable).
const SOS_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SOS_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SOS_ANON = SOS_SERVICE_KEY || SOS_ANON_KEY;

/**
 * Serves MVT vector tiles from PostGIS via Supabase RPC.
 * Without org_id: calls map_tiles_public (all data, no PII).
 * With org_id: calls map_tiles_org (org-scoped data).
 * GET /api/map/tiles/{z}/{x}/{y}[?org_id=UUID]
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

  // Choose RPC function based on whether org_id is provided
  const rpcFn = orgId ? 'map_tiles_org' : 'map_tiles_public';
  const rpcBody = orgId
    ? { z: zInt, x: xInt, y: yInt, p_org_id: orgId }
    : { z: zInt, x: xInt, y: yInt };

  try {
    const res = await fetch(`${SOS_URL}/rest/v1/rpc/${rpcFn}`, {
      method: 'POST',
      headers: {
        'apikey': SOS_ANON,
        'Authorization': `Bearer ${SOS_ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rpcBody),
    });

    if (!res.ok) {
      // Retry with anon key if service key failed (e.g. stale env var)
      if (res.status === 401 && SOS_ANON_KEY && SOS_ANON !== SOS_ANON_KEY) {
        const retry = await fetch(`${SOS_URL}/rest/v1/rpc/${rpcFn}`, {
          method: 'POST',
          headers: {
            'apikey': SOS_ANON_KEY,
            'Authorization': `Bearer ${SOS_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rpcBody),
        });
        if (retry.ok) {
          const buf = await retry.arrayBuffer();
          return new NextResponse(buf, {
            status: 200,
            headers: {
              'Content-Type': 'application/x-protobuf',
              'Cache-Control': 'public, max-age=300',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
      const errText = await res.text();
      console.error('[map-tiles] RPC error:', res.status, errText);
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
    console.error('[map-tiles] Unexpected error:', err?.message || err);
    return NextResponse.json({ error: 'Internal server error', detail: err?.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
}
