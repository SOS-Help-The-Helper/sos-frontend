'use client';

import { useRouter } from 'next/navigation';
import { SosLogo } from './SosLogo';
import { PrimaryButton } from './PrimaryButton';
import { ORG_TYPE_LABEL, type OnboardingData } from './types';

interface Props { data: OnboardingData; }

const CONFETTI_COLORS = ['#EF4E4B', '#89CFF0', '#FFD700', '#4CAF50', '#FF69B4'];

const dots = Array.from({ length: 20 }, (_, i) => ({
  left: `${5 + (i * 4.75) % 90}%`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: `${(i * 0.15) % 2}s`,
  size: 6 + (i % 3) * 3,
  duration: `${1.8 + (i % 4) * 0.3}s`,
}));

export function Screen5Done({ data }: Props) {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>
      {/* Confetti */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {dots.map((d, i) => (
          <div key={i} style={{
            position: 'absolute', top: -20, left: d.left,
            width: d.size, height: d.size, borderRadius: '50%',
            background: d.color,
            animation: `confettiFall ${d.duration} ${d.delay} ease-in infinite`,
          }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <SosLogo size={72} glow />
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginTop: 20, marginBottom: 6, textAlign: 'center' }}>
          You&apos;re all set!
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 28, textAlign: 'center' }}>
          Your workspace is ready to go.
        </p>

        {/* Summary card */}
        <div style={{
          width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.1)', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28,
        }}>
          {[
            ['Organization', data.orgName || '—'],
            ['Type', data.orgType ? ORG_TYPE_LABEL[data.orgType] : '—'],
            ['Modules', `${data.modules.length} enabled`],
            ['Contacts imported', data.importedCount > 0 ? `${data.importedCount}` : 'None'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{label}</span>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>

        <PrimaryButton onClick={() => router.push('/matching')} style={{ background: '#EF4E4B', color: '#fff', marginBottom: 16 }}>
          Open your dashboard
        </PrimaryButton>

        <button style={{ background: 'none', border: 'none', color: '#89CFF0', fontSize: 14, cursor: 'pointer', padding: 4 }}>
          Invite a team member
        </button>
      </div>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
