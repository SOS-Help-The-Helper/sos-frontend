import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SOS_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
const SOS_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0ZHVxZ3V3aGtjemV4bm9hd2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2Njg1ODAsImV4cCI6MjA2NzI0NDU4MH0.1QZ5ofS-ND_OI71igPlxxMTyZJJRlATSSC0djccWR8o';

const supabase = createClient(SOS_URL, SOS_ANON);

/**
 * Serves MVT vector tiles from PostGIS via Supabase RPC.
 * Public endpoint — no auth required (map_tiles_public uses anon role).
 * Tiles are cached by Vercel Edge for 60s, stale-while-revalidate for 5min.
 *
 * GET /api/map/tiles/{z}/{x}/{y}
 * Optional query param: org_id (for partner-scoped tiles)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params;
  const zInt = parseInt(z, 10);
  const xInt = parseInt(x, 10);
  const yInt = parseInt(y, 10);

  if (isNaN(zInt) || isNaN(xInt) || isNaN(yInt)) {
    return NextResponse.json({ error: 'Invalid tile coordinates' }, { status: 400 });
  }

  // Clamp zoom to reasonable range
  if (zInt < 0 || zInt > 22) {
    return NextResponse.json({ error: 'Zoom out of range' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.rpc('map_tiles_public', {
      z: zInt,
      x: xInt,
      y: yInt,
    });

    if (error) {
      console.error('[map-tiles] RPC error:', error.message, 'code:', error.code, 'details:', error.details);
      return NextResponse.json({ error: 'Tile generation failed', detail: error.message, code: error.code }, { status: 500 });
    }

    // data is base64-encoded MVT
    if (!data || data === '') {
      // Empty tile — return 204 (standard for empty vector tiles)
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'Access-Control-Allow-Origin': '*',
        },
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
  } catch (err) {
    console.error('[map-tiles] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Support CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
