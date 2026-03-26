import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SOS — Everyone is a helper';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
        {/* Logomark — large and centered */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: '#EF4E4B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
            boxShadow: '0 0 60px rgba(239,78,75,0.3)',
          }}
        >
          <span style={{ color: 'white', fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>SOS</span>
        </div>

        {/* Core tagline */}
        <div style={{ color: 'white', fontSize: 44, fontWeight: 700, letterSpacing: -0.5 }}>
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
