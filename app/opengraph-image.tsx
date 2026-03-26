import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SOS Connect — Community Coordination Platform';
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
        {/* Red accent bar at top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: '#EF4E4B' }} />
        
        {/* Logo circle */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#EF4E4B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <span style={{ color: 'white', fontSize: 40, fontWeight: 800 }}>S</span>
        </div>

        {/* Title */}
        <div style={{ color: 'white', fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>
          SOS | Connect
        </div>

        {/* Subtitle */}
        <div style={{ color: '#89CFF0', fontSize: 24, marginTop: 12, fontWeight: 500 }}>
          Community Coordination Platform
        </div>

        {/* Tagline */}
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 20, marginTop: 24 }}>
          Everyone is a helper. We help the helpers.
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            marginTop: 40,
            padding: '16px 32px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#89CFF0', fontSize: 28, fontWeight: 700 }}>Signal</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Intake</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 28 }}>→</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#EF4E4B', fontSize: 28, fontWeight: 700 }}>Match</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>AI Engine</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 28 }}>→</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#89CFF0', fontSize: 28, fontWeight: 700 }}>Route</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Coordinate</span>
          </div>
        </div>

        {/* URL */}
        <div style={{ position: 'absolute', bottom: 24, color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>
          sosconnect.org
        </div>
      </div>
    ),
    { ...size }
  );
}
