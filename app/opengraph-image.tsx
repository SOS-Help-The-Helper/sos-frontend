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
          background: '#0F1E2B',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '60px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EF4E4B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: '20px', fontWeight: 800, letterSpacing: '0.1em' }}>S</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>SOS</span>
        </div>
        <div style={{ fontSize: '56px', fontWeight: 400, color: '#fff', textAlign: 'center' as const, lineHeight: 1.15, marginBottom: '24px', display: 'flex' }}>
          Everyone is a helper.
        </div>
        <div style={{ fontSize: '22px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' as const, maxWidth: '700px', lineHeight: 1.5, display: 'flex' }}>
          When disasters strike, people respond — they just can't see each other. SOS is coordination infrastructure that connects help with the people who need it.
        </div>
        <div style={{ marginTop: '40px', fontSize: '14px', color: '#89CFF0', letterSpacing: '0.05em', display: 'flex' }}>
          sosconnect.org
        </div>
      </div>
    ),
    { ...size }
  );
}
