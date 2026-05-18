'use client';

interface ProgressDotsProps {
  total?: number;
  current: number; // 0-indexed
}

export function ProgressDots({ total = 5, current }: ProgressDotsProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const filled = i <= current;
        return (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: filled ? '#fff' : 'transparent',
              border: filled ? 'none' : '1.5px solid rgba(255,255,255,0.3)',
              transition: 'background 0.2s',
            }}
          />
        );
      })}
    </div>
  );
}
