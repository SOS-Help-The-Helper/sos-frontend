import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SOS_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SOS_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Serves org-scoped MVT vector tiles from PostGIS.
 * Requires org_id query parameter.
 * Uses service role key server-side (org membership should be verified by caller).
 *
 * GET /api/map/tiles/org/{z}/{x}/{y}?org_id=UUID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params;
  const orgId = req.nextUrl.searchParams.get('org_id');
  const zInt = parseInt(z, 10);
  const xInt = parseInt(x, 10);
  const yInt = parseInt(y, 10);

  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 });
  }

  if (isNaN(zInt) || isNaN(xInt) || isNaN(yInt) || zInt < 0 || zInt > 22) {
    return NextResponse.json({ error: 'Invalid tile coordinates' }, { status: 400 });
  }

  // Use service role key for org-scoped queries
  const supabase = createClient(SOS_URL, SOS_SERVICE_KEY);

  try {
    const { data, error } = await supabase.rpc('map_tiles_org', {
      z: zInt,
      x: xInt,
      y: yInt,
      p_org_id: orgId,
    });

    if (error) {
      console.error('[map-tiles-org] RPC error:', error.message);
      return NextResponse.json({ error: 'Tile generation failed' }, { status: 500 });
    }

    if (!data || data === '') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=60',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.mapbox-vector-tile',
        'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[map-tiles-org] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
