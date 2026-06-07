import { NextRequest, NextResponse } from 'next/server';

const SOS_URL = 'https://rtduqguwhkczexnoawej.supabase.co';
const SOS_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0ZHVxZ3V3aGtjemV4bm9hd2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2Njg1ODAsImV4cCI6MjA2NzI0NDU4MH0.1QZ5ofS-ND_OI71igPlxxMTyZJJRlATSSC0djccWR8o';

/**
 * Serves MVT vector tiles from PostGIS via Supabase RPC.
 * Public endpoint — calls map_tiles_public with anon key.
 * GET /api/map/tiles/{z}/{x}/{y}
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params;
  const zInt = parseInt(z, 10);
  const xInt = parseInt(x, 10);
  const yInt = parseInt(y, 10);

  if (isNaN(zInt) || isNaN(xInt) || isNaN(yInt) || zInt < 0 || zInt > 22) {
    return NextResponse.json({ error: 'Invalid tile coordinates' }, { status: 400 });
  }

  try {
    const res = await fetch(`${SOS_URL}/rest/v1/rpc/map_tiles_public`, {
      method: 'POST',
      headers: {
        'apikey': SOS_ANON,
        'Authorization': `Bearer ${SOS_ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ z: zInt, x: xInt, y: yInt }),
    });

    if (!res.ok) {
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
