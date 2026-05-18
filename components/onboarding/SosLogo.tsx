interface SosLogoProps {
  size?: number;
  glow?: boolean;
}

export function SosLogo({ size = 64, glow = false }: SosLogoProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#EF4E4B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: glow
          ? '0 0 0 8px rgba(137,207,240,0.15), 0 0 24px rgba(137,207,240,0.25)'
          : undefined,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logomark-red.svg"
        alt="SOS"
        style={{ width: size * 0.55, height: size * 0.55, filter: 'brightness(0) invert(1)' }}
      />
    </div>
  );
}
