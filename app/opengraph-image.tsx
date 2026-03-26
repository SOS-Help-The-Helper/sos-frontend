import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SOS — Everyone is a helper';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
        {/* Logomark — prominent */}
        <img
          src={logoBase64}
          width={180}
          height={180}
          style={{ marginBottom: 48 }}
        />

        {/* Core tagline */}
        <div style={{ color: 'white', fontSize: 52, fontWeight: 700, letterSpacing: -0.5 }}>
          Everyone Is a Helper
        </div>

        {/* Secondary tagline */}
        <div style={{ color: '#89CFF0', fontSize: 30, marginTop: 20, fontWeight: 500 }}>
          We Help the Helpers
        </div>
      </div>
    ),
    { ...size }
  );
}
