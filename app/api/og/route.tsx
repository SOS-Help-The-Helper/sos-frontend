import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const TYPE_COLORS: Record<string, { bg: string; accent: string; label: string }> = {
  request: { bg: '#1A3850', accent: '#EF4E4B', label: 'SOS REQUEST' },
  resource: { bg: '#1A3850', accent: '#89CFF0', label: 'RESOURCE AVAILABLE' },
  report: { bg: '#1A3850', accent: '#FFFFFF', label: 'FIELD REPORT' },
};

const URGENCY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#6B7280',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pinId = searchParams.get('pin');
  const pinType = searchParams.get('type') || 'request';
  const cfg = TYPE_COLORS[pinType] || TYPE_COLORS.request;

  let description = '';
  let urgency = '';
  let location = '';
  let category = '';

  if (pinId) {
    try {
      const SOS_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
      const SOS_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const table = pinType === 'resource' ? 'resources' : pinType === 'report' ? 'reports' : 'requests';
      const res = await fetch(
        `${SOS_URL}/rest/v1/${table}?id=eq.${pinId}&select=description,public_display_text,urgency,location_text,taxonomy_code,category,household_size`,
        { headers: { apikey: SOS_KEY, Authorization: `Bearer ${SOS_KEY}` } }
      );
      const rows = await res.json();
      if (rows?.[0]) {
        const r = rows[0];
        description = r.public_display_text || r.description || '';
        urgency = r.urgency || '';
        location = r.location_text || '';
        category = (r.taxonomy_code || r.category || '').replace(/\./g, ' · ');
        if (r.household_size) description += ` · Family of ${r.household_size}`;
      }
    } catch { /* use defaults */ }
  }

  const logoUrl = new URL('/logomark.png', 'https://sosconnect.org').toString();
  const logoData = await fetch(logoUrl).then(r => r.arrayBuffer());
  const logoBase64 = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: cfg.bg,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '60px 80px',
        }}
      >
        <img src={logoBase64} width={100} height={100} style={{ marginBottom: 32 }} />

        <div
          style={{
            color: cfg.accent,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 4,
            textTransform: 'uppercase' as const,
            marginBottom: 16,
          }}
        >
          {cfg.label}
        </div>

        {category && (
          <div
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 28,
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: 2,
              marginBottom: 20,
            }}
          >
            {category}
          </div>
        )}

        {description && (
          <div
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 36,
              fontWeight: 500,
              textAlign: 'center' as const,
              lineHeight: 1.4,
              maxWidth: 900,
              marginBottom: 24,
            }}
          >
            {description.slice(0, 120)}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 8 }}>
          {urgency && (
            <div
              style={{
                background: URGENCY_COLORS[urgency] || URGENCY_COLORS.medium,
                color: 'white',
                fontSize: 18,
                fontWeight: 700,
                padding: '6px 20px',
                borderRadius: 20,
                textTransform: 'uppercase' as const,
                letterSpacing: 1,
              }}
            >
              {urgency}
            </div>
          )}
          {location && (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22, fontWeight: 500 }}>
              📍 {location}
            </div>
          )}
        </div>

        <div
          style={{
            position: 'absolute' as const,
            bottom: 30,
            color: 'rgba(255,255,255,0.25)',
            fontSize: 18,
            fontWeight: 500,
          }}
        >
          sosconnect.org
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
