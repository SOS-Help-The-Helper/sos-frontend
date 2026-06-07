import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VoteVerify — Civic Trust Through Community Attestation';
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
          position: 'relative',
        }}
      >
        {/* Subtle gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(137,207,240,0.08) 0%, transparent 50%, rgba(239,78,75,0.06) 100%)',
          }}
        />

        {/* SOS logomark */}
        <img
          src={logoBase64}
          width={100}
          height={100}
          style={{ marginBottom: 32 }}
        />

        {/* VoteVerify title */}
        <div style={{ color: 'white', fontSize: 64, fontWeight: 700, letterSpacing: -1, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#89CFF0' }}>Vote</span>
          <span>Verify</span>
        </div>

        {/* Tagline */}
        <div style={{ color: '#89CFF0', fontSize: 28, marginTop: 16, fontWeight: 500, opacity: 0.9 }}>
          Civic Trust Through Community Attestation
        </div>

        {/* Divider line */}
        <div style={{ width: 80, height: 2, background: '#EF4E4B', marginTop: 28, marginBottom: 28, borderRadius: 1 }} />

        {/* Description */}
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 22, maxWidth: 700, textAlign: 'center', lineHeight: 1.5 }}>
          Citizens verify their vote was cast as intended. No partisanship. No blockchain. Just neighbors confirming democracy works.
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16 }}>Powered by</div>
          <div style={{ color: '#89CFF0', fontSize: 16, fontWeight: 600 }}>SOS Connect</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
