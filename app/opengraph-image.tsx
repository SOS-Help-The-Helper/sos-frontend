import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'edge';
export const alt = 'SOS — Everyone is a helper';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  // Read the logomark as base64 for embedding
  const logoData = await fetch(new URL('/logomark.png', 'https://sosconnect.org')).then(r => r.arrayBuffer());
  const logoBase64 = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#1A3850',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Actual logomark */}
        <img
          src={logoBase64}
          width={160}
          height={160}
          style={{ marginBottom: 36 }}
        />

        {/* Core tagline */}
        <div style={{ color: 'white', fontSize: 48, fontWeight: 700 }}>
          Everyone Is a Helper
        </div>

        {/* Secondary tagline */}
        <div style={{ color: '#89CFF0', fontSize: 28, marginTop: 16, fontWeight: 500 }}>
          We Help the Helpers
        </div>

        {/* URL */}
        <div style={{ position: 'absolute', bottom: 32, color: 'rgba(255,255,255,0.3)', fontSize: 18 }}>
          sosconnect.org
        </div>
      </div>
    ),
    { ...size }
  );
}
